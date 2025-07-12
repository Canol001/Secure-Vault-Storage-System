# 🔐 Secure Vault Management System

> **Author:** [Venom](https://github.com/venomdev)  
> **Email:** hello@venomgroup.co.ke  
> **GitHub:** [https://github.com/venomdev](https://github.com/venomdev)  
> **License:** MIT  
> **Version:** 1.0.0

A powerful and user-centric password and secrets manager built with Flask and SQLite. The system is designed to allow users to securely store sensitive information such as passwords, secret notes, keys, and digital credentials — all backed by OTP authentication, secret codes, and personal encryption.

---

## 📌 Project Objectives

- ✅ Build a lightweight, full-stack **secrets management system**.
- ✅ Allow **user registration and authentication** via OTP and secret code.
- ✅ Enable users to **store, update, and delete** confidential data.
- ✅ Provide **audit logs** for actions performed by each user.
- ✅ Make it easily deployable using **Render** with a **persistent SQLite DB**.
- ✅ Emphasize **data privacy**, **security**, and **usability**.

---

## 💡 Significance

In an era where data breaches and identity thefts are at an all-time high, this system provides a simple, secure, and efficient way for individuals to store their most sensitive digital information.

> This is especially useful for:
- Students managing login credentials across platforms.
- Developers storing API keys, tokens, and secrets.
- Individuals seeking an alternative to commercial vault apps like LastPass or Bitwarden.

---

## 🚀 Features

- 🔒 Secure User Registration with:
  - Name, Email, Password, Favorite Color & Secret Code
  - OTP verification via WhatsApp or SMS
- 🔐 Login with OTP
- 💾 Secure Vault Storage:
  - Store passwords, notes, keys, links, etc.
  - Each item is associated with a `type`, `title`, and `data`
- 🧾 Logs:
  - Track user actions like login, creation, update, deletion
- 🧠 Lightweight Backend:
  - Flask + SQLite
  - SQLite stored on **Render persistent disk** for data persistence across deployments
- 🔄 RESTful API Structure (easy to integrate frontend later)
- 💅 Clean, Responsive Frontend using Tailwind CSS

---

## 🏗️ Tech Stack

| Layer        | Tech Used                |
|--------------|--------------------------|
| Backend      | Python Flask             |
| Database     | SQLite (on persistent disk) |
| Frontend     | HTML, Tailwind CSS       |
| Hosting      | Render.com               |
| Auth         | OTP + Secret Code        |
| Logging      | Custom audit logs        |

---

## 🧩 Database Schema Overview

### `users` table
| Field         | Type      |
|---------------|-----------|
| id            | INTEGER (PK) |
| name          | TEXT      |
| email         | TEXT (unique) |
| dob           | TEXT      |
| favorite_color| TEXT      |
| password      | TEXT      |
| secret_code   | TEXT      |
| lastlogin     | TEXT      |

### `otps` table
| Field    | Type |
|----------|------|
| id       | INTEGER (PK) |
| email    | TEXT |
| otp      | TEXT |
| purpose  | TEXT (`login` or `reset`) |
| timestamp| TEXT |

### `vault` table
| Field    | Type |
|----------|------|
| id       | INTEGER (PK) |
| userId   | INTEGER (FK to users) |
| type     | TEXT |
| title    | TEXT |
| data     | TEXT |

### `logs` table
| Field    | Type |
|----------|------|
| id       | INTEGER (PK) |
| userId   | INTEGER (FK to users) |
| action   | TEXT |
| timestamp| TEXT |

---

## 📥 Local Installation & Setup (for Developers)

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/secure-vault.git
   cd secure-vault
   ```

2. **Create and activate a virtual environment**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file (optional but recommended)**
   ```env
   FLASK_ENV=development
   JWT_SECRET=your_secret_key
   DATABASE_PATH=database.db
   ```

5. **Run the app**
   ```bash
   flask run
   ```

6. **Access the app**
   ```
   http://127.0.0.1:3000
   ```

![image](https://github.com/user-attachments/assets/d5e2b92a-c5e4-437c-a3dd-edecd2a45251)

---

## 🌐 Deployment Instructions (Render)

1. **Create a Web Service** on [Render](https://render.com) connected to your GitHub repository.

2. **Add a Persistent Disk**
   - Go to your Render service dashboard  
   - Add a **Disk** with mount path:  
     ```
     /mnt/data
     ```  
   - Recommended size: **512MB or more**

3. **Set Build Command** to:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set Start Command** to:
   ```bash
   gunicorn app:app
   ```

5. **Add Environment Variables** in the Render dashboard:

   | Key             | Value (Example)                 | Description                         |
   |------------------|-------------------------------|-------------------------------------|
   | `FLASK_ENV`       | `production`                   | Run in production mode              |
   | `JWT_SECRET`      | `your_super_secret_key`        | JWT signing key                     |
   | `DATABASE_PATH`   | `/mnt/data/database.db`        | Path to SQLite DB on persistent disk |

6. **Update your app to use the Persistent Disk** for SQLite:
   ```python
   import os
   db_path = os.getenv("DATABASE_PATH", "database.db")
   with sqlite3.connect(db_path) as conn:
       # your DB setup here
   ```

7. **Push your code to GitHub**, and Render will automatically deploy it.

---
