from flask import Flask, request, send_from_directory, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import sqlite3
import bcrypt
import jwt
import smtplib
from email.mime.text import MIMEText
from cryptography.fernet import Fernet
import base64
import os
import datetime
import pytz
import dotenv
import secrets
import logging
import random

# Initialize Flask app
app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
dotenv.load_dotenv()

# Configuration
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY').encode()
JWT_SECRET = os.getenv('JWT_SECRET')
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASS = os.getenv('EMAIL_PASS')
SALT_ROUNDS = 10

if not all([ENCRYPTION_KEY, JWT_SECRET, EMAIL_USER, EMAIL_PASS]):
    raise ValueError("Missing required environment variables")

# Initialize Fernet for encryption
fernet = Fernet(ENCRYPTION_KEY)

# Database Setup
def init_db():
    with sqlite3.connect('database.db') as conn:
        conn.execute('PRAGMA foreign_keys = ON;')
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                dob TEXT NOT NULL,
                favorite_color TEXT NOT NULL,
                password TEXT NOT NULL,
                secret_code TEXT NOT NULL
            )
        ''')
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS otps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                purpose TEXT NOT NULL, -- 'login' or 'reset'
                timestamp TEXT NOT NULL
            )
        ''')
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS vault (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                data TEXT NOT NULL,
                FOREIGN KEY(userId) REFERENCES users(id)
            )
        ''')  # ✅ fixed: added closing parenthesis for vault
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY(userId) REFERENCES users(id)
            )
        ''')  # ✅ fixed: removed extra closing parenthesis
        
        conn.commit()  # ✅ normal line, no closing parenthesis here

init_db()


# Helper Functions
def is_valid_email(email):
    return bool(email and '@' in email and '.' in email and '.' in email)

def get_eat_timestamp():
    return datetime.datetime.now(pytz.timezone('Africa/Nairobi')).strftime('%m/%d/%Y, %I:%M:%S %p')

def generate_secret_code():
    return secrets.token_hex(8)

def generate_otp():
    return ''.join(random.choices('0123456789', k=6))

def encrypt_data(text):
    return fernet.encrypt(text.encode()).decode()

def decrypt_data(text):
    return fernet.decrypt(text.encode()).decode()

def send_email(to, subject, body):
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = EMAIL_USER
    msg['To'] = to
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)

def authenticate_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        logger.warning("No Authorization header provided")
        return jsonify({'error': 'No token provided'}), 401

    token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else auth_header
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return data
    except Exception as e:
        logger.warning(f"Invalid token: {e}")
        return jsonify({'error': 'Invalid token'}), 403


# Routes
@app.route('/')
@app.route('/login')
def serve_login():
    return send_from_directory('public', 'index.html')

@app.route('/register')
def serve_register():
    return send_from_directory('public', 'register.html')

@app.route('/otp')
def serve_otp():
    return send_from_directory('public', 'otp.html')

@app.route('/forgot-password')
def serve_forgot_password():
    return send_from_directory('public', 'forgot-password.html')

@app.route('/reset-password')
def serve_reset_password():
    return send_from_directory('public', 'reset-password.html')

@app.route('/home')
@app.route('/home.html')
def serve_home():
    return send_from_directory('public', 'home.html')

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email').lower().strip()
        dob = data.get('dob')
        favorite_color = data.get('favorite_color')
        password = data.get('password')
        repeat_password = data.get('repeat_password')

        if not all([name, email, dob, favorite_color, password, repeat_password]):
            return jsonify({'error': 'All fields are required'}), 400
        if not is_valid_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        if password != repeat_password:
            return jsonify({'error': 'Passwords do not match'}), 400
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt(SALT_ROUNDS)).decode()
        secret_code = generate_secret_code()
        otp = generate_otp()

        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('''
                    INSERT INTO users (name, email, dob, favorite_color, password, secret_code)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (name, email, dob, favorite_color, hashed_password, secret_code))
                user_id = cursor.lastrowid
                cursor.execute('''
                    INSERT INTO otps (email, otp, purpose, timestamp)
                    VALUES (?, ?, ?, ?)
                ''', (email, otp, 'login', get_eat_timestamp()))
                cursor.execute('''
                    INSERT INTO logs (userId, action, timestamp)
                    VALUES (?, ?, ?)
                ''', (user_id, 'Registered', get_eat_timestamp()))
                conn.commit()
            except sqlite3.IntegrityError:
                return jsonify({'error': 'Email already exists'}), 400

        send_email(email, 'Your Secret Code and OTP', f'Your secret code is: {secret_code}\nYour OTP is: {otp}')
        return jsonify({'message': 'Registration successful. OTP sent to your email'}), 200
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'error': 'Failed to register user'}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email').lower().strip()
        password = data.get('password')

        if not all([email, password]):
            return jsonify({'error': 'Email and password are required'}), 400
        if not is_valid_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, password FROM users WHERE email = ?', (email,))
            user = cursor.fetchone()
            if not user or not bcrypt.checkpw(password.encode(), user[1].encode()):
                return jsonify({'error': 'Invalid credentials'}), 401

            otp = generate_otp()
            cursor.execute('INSERT INTO otps (email, otp, purpose, timestamp) VALUES (?, ?, ?, ?)',
                           (email, otp, 'login', get_eat_timestamp()))
            conn.commit()

        send_email(email, 'Your OTP', f'Your OTP is: {otp}')
        return jsonify({'message': 'OTP sent to your email'}), 200
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Failed to send OTP'}), 500

@app.route('/resend-otp', methods=['POST'])
def resend_otp():
    try:
        data = request.json
        email = data.get('email').lower().strip()
        is_password_reset = data.get('isPasswordReset', False)
        purpose = 'reset' if is_password_reset else 'login'
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        if not is_valid_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            user = cursor.fetchone()
            if not user:
                return jsonify({'error': 'User not found'}), 401
            otp = generate_otp()
            cursor.execute('INSERT INTO otps (email, otp, purpose, timestamp) VALUES (?, ?, ?, ?)',
                           (email, otp, purpose, get_eat_timestamp()))
            conn.commit()
        send_email(email, 'Your New OTP', f'Your new OTP is: {otp}')
        return jsonify({'message': 'OTP resent successfully'}), 200
    except Exception as e:
        logger.error(f"Resend OTP error: {e}")
        return jsonify({'error': 'Failed to resend OTP'}), 500

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.json
        email = data.get('email').lower().strip()
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        if not is_valid_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            user = cursor.fetchone()
            if not user:
                return jsonify({'error': 'User not found'}), 401
            otp = generate_otp()
            cursor.execute('INSERT INTO otps (email, otp, purpose, timestamp) VALUES (?, ?, ?, ?)',
                           (email, otp, 'reset', get_eat_timestamp()))
            conn.commit()
        send_email(email, 'Password Reset OTP', f'Your password reset OTP is: {otp}')
        return jsonify({'message': 'Reset OTP sent to your email'}), 200
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        return jsonify({'error': 'Failed to send reset OTP'}), 500

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.json
        email = data.get('email').lower().strip()
        otp = data.get('otp')
        is_password_reset = data.get('isPasswordReset', False)
        purpose = 'reset' if is_password_reset else 'login'
        if not all([email, otp]):
            return jsonify({'error': 'Email and OTP are required'}), 400
        if not is_valid_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, email FROM users WHERE email = ?', (email,))
            user = cursor.fetchone()
            if not user:
                return jsonify({'error': 'User not found'}), 401
            user_id, user_email = user
            cursor.execute('SELECT otp, timestamp FROM otps WHERE email = ? AND purpose = ? ORDER BY timestamp DESC LIMIT 1',
                           (email, purpose))
            otp_record = cursor.fetchone()
            if not otp_record:
                return jsonify({'error': 'No OTP found'}), 401
            stored_otp, timestamp = otp_record
            otp_time = datetime.datetime.strptime(timestamp, '%m/%d/%Y, %I:%M:%S %p')
            eat_tz = pytz.timezone('Africa/Nairobi')
            otp_time = eat_tz.localize(otp_time)
            if (datetime.datetime.now(eat_tz) - otp_time).total_seconds() > 300:  # 5 minutes
                return jsonify({'error': 'OTP expired'}), 401
            if stored_otp != otp:
                logger.info(f"Invalid OTP for {email}: expected {stored_otp}, got {otp}")
                return jsonify({'error': 'Invalid OTP'}), 401
            cursor.execute('DELETE FROM otps WHERE email = ? AND purpose = ?', (email, purpose))
            if not is_password_reset:
                token = jwt.encode({
                    'id': user_id,
                    'email': user_email,
                    'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
                }, JWT_SECRET, algorithm='HS256')
                cursor.execute('INSERT INTO logs (userId, action, timestamp) VALUES (?, ?, ?)',
                               (user_id, 'Logged in', get_eat_timestamp()))
                conn.commit()
                return jsonify({'token': token}), 200
            else:
                cursor.execute('INSERT INTO logs (userId, action, timestamp) VALUES (?, ?, ?)',
                               (user_id, 'Verified password reset OTP', get_eat_timestamp()))
                conn.commit()
                return jsonify({'message': 'OTP verified for password reset'}), 200
    except Exception as e:
        logger.error(f"OTP verification error: {e}")
        return jsonify({'error': 'Failed to verify OTP'}), 500

@app.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.json
        email = data.get('email').lower().strip()
        password = data.get('password')
        if not all([email, password]):
            return jsonify({'error': 'Email and password are required'}), 400
        if not is_valid_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt(SALT_ROUNDS)).decode()
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            user = cursor.fetchone()
            if not user:
                return jsonify({'error': 'User not found'}), 401
            user_id = user[0]
            cursor.execute('UPDATE users SET password = ? WHERE email = ?', (hashed_password, email))
            cursor.execute('DELETE FROM otps WHERE email = ? AND purpose = ?', (email, 'reset'))
            cursor.execute('INSERT INTO logs (userId, action, timestamp) VALUES (?, ?, ?)',
                           (user_id, 'Password reset', get_eat_timestamp()))
            conn.commit()
        return jsonify({'message': 'Password reset successfully'}), 200
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        return jsonify({'error': 'Failed to reset password'}), 500

@app.route('/vault/store', methods=['POST'])
def vault_store():
    user = authenticate_token()
    if isinstance(user, tuple):
        return user
    try:
        type_ = request.form.get('type')
        title = request.form.get('title')
        key_value = request.form.get('key_value')
        file = request.files.get('document')
        if not type_ or not title or not (key_value or file):
            return jsonify({'error': 'Type, title, and data are required'}), 400
        data = base64.b64encode(file.read()).decode() if type_ == 'document' and file else key_value
        encrypted_data = encrypt_data(data)
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO vault (userId, type, title, data)
                VALUES (?, ?, ?, ?)
            ''', (user['id'], type_, title, encrypted_data))
            cursor.execute('INSERT INTO logs (userId, action, timestamp) VALUES (?, ?, ?)',
                           (user['id'], f'Stored {type_}', get_eat_timestamp()))
            conn.commit()
        return jsonify({'message': 'Data stored'}), 200
    except Exception as e:
        logger.error(f"Vault store error: {e}")
        return jsonify({'error': 'Failed to store data'}), 500

@app.route('/vault/verify', methods=['POST'])
def vault_verify():
    user = authenticate_token()
    if isinstance(user, tuple):
        return user
    try:
        data = request.json
        answer = data.get('answer')
        type_ = data.get('type')
        if not answer or not type_:
            return jsonify({'error': 'Answer and type are required'}), 400
        if type_ not in ['dob', 'favorite_color', 'password', 'secret_code']:
            return jsonify({'error': 'Invalid verification type'}), 400
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute(f'SELECT {type_} FROM users WHERE id = ?', (user['id'],))
            row = cursor.fetchone()
            if not row:
                return jsonify({'error': 'Verification failed'}), 500
            is_valid = bcrypt.checkpw(answer.encode(), row[0].encode()) if type_ == 'password' else answer == row[0]
            if not is_valid:
                return jsonify({'error': 'Invalid answer'}), 401
            cursor.execute('INSERT INTO logs (userId, action, timestamp) VALUES (?, ?, ?)',
                           (user['id'], f'Verified {type_}', get_eat_timestamp()))
            conn.commit()
        return jsonify({'message': 'Verified'}), 200
    except Exception as e:
        logger.error(f"Vault verify error: {e}")
        return jsonify({'error': 'Failed to verify'}), 500

@app.route('/vault/retrieve', methods=['GET'])
def vault_retrieve():
    user = authenticate_token()
    if isinstance(user, tuple):
        return user
    try:
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, type, title FROM vault WHERE userId = ?', (user['id'],))
            rows = cursor.fetchall()
        items = [{'id': row[0], 'type': row[1], 'title': row[2]} for row in rows]
        return jsonify({'items': items}), 200
    except Exception as e:
        logger.error(f"Vault retrieve error: {e}")
        return jsonify({'error': 'Failed to retrieve data'}), 500

@app.route('/vault/item/<int:id>', methods=['GET'])
def vault_item(id):
    user = authenticate_token()
    if isinstance(user, tuple):
        return user
    try:
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT type, title, data FROM vault WHERE id = ? AND userId = ?', (id, user['id']))
            row = cursor.fetchone()
            if not row:
                return jsonify({'error': 'Item not found'}), 404
            decrypted_data = decrypt_data(row[2])
            cursor.execute('INSERT INTO logs (userId, action, timestamp) VALUES (?, ?, ?)',
                           (user['id'], f'Retrieved {row[0]}', get_eat_timestamp()))
            conn.commit()
        return jsonify({'type': row[0], 'title': row[1], 'data': decrypted_data}), 200
    except Exception as e:
        logger.error(f"Vault item error: {e}")
        return jsonify({'error': 'Failed to retrieve item'}), 500

@app.route('/vault/modify/<int:id>', methods=['PUT'])
def vault_modify(id):
    user = authenticate_token()
    if isinstance(user, tuple):
        return user
    try:
        type_ = request.form.get('type')
        title = request.form.get('title')
        key_value = request.form.get('key_value')
        file = request.files.get('document')
        if not type_ or not title or not (key_value or file):
            return jsonify({'error': 'Type, title, and data are required'}), 400
        data = base64.b64encode(file.read()).decode() if type_ == 'document' and file else key_value
        encrypted_data = encrypt_data(data)
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE vault SET type = ?, title = ?, data = ? WHERE id = ? AND userId = ?',
                           (type_, title, encrypted_data, id, user['id']))
            if cursor.rowcount == 0:
                return jsonify({'error': 'Item not found'}), 404
            cursor.execute('INSERT INTO logs (userId, action, timestamp) VALUES (?, ?, ?)',
                           (user['id'], f'Modified {type_}', get_eat_timestamp()))
            conn.commit()
        return jsonify({'message': 'Data modified'}), 200
    except Exception as e:
        logger.error(f"Vault modify error: {e}")
        return jsonify({'error': 'Failed to modify data'}), 500

@app.route('/logs', methods=['GET'])
def logs():
    user = authenticate_token()
    if isinstance(user, tuple):
        logger.warning(f"Authentication failed: {user[0].get('error')}")
        return user
    try:
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT action, timestamp FROM logs WHERE userId = ?', (user['id'],))
            cursor.execute('SELECT * FROM logs WHERE userId = ?', (user['id'],))
            raw_logs = cursor.fetchall()
            logger.info(f"Fetched {len(raw_logs)} raw logs for user {user['id']}: {raw_logs}")  # Debug
            logs = [{'action': row[2], 'timestamp': row[3]} for row in raw_logs]  # Adjust indices
            cursor.execute('SELECT COUNT(*) FROM vault WHERE userId = ?', (user['id'],))
            item_count = cursor.fetchone()[0]
            logger.info(f"Vault item count for user {user['id']}: {item_count}")
        last_login = next((log['timestamp'] for log in logs if log['action'] == 'Logged in'), None)
        response = {
            'logs': logs,
            'analytics': {'itemCount': item_count, 'lastLogin': last_login}
        }
        logger.info(f"Returning response for user {user['id']}: {response}")
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"Logs error: {e}")
        return jsonify({'error': 'Failed to retrieve logs'}), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True)