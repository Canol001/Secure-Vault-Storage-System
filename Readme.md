# 🔐 Secure Vault Management System

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

## 🌐 Deployment Instructions (Render)

1. **Create a Web Service** on [Render](https://render.com) connected to your GitHub repository.

2. **Add a Persistent Disk**
   - Go to your Render service dashboard  
   - Add a **Disk** with mount path:  
     ```
     /mnt/data
     ```  
   - Recommended size: **512MB or more** depending on expected database growth

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

   Modify your database initialization logic:
   ```python
   import os
   db_path = os.getenv("DATABASE_PATH", "database.db")
   with sqlite3.connect(db_path) as conn:
       # your DB setup here
   ```

7. **Push your code to GitHub**, and Render will automatically deploy it.
