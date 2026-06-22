"""
Run once after loading seed.sql to set real bcrypt passwords.

Usage:
    cd backend
    python create_admin.py
"""
import os, sys
from pathlib import Path

# Load .env before importing config
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

import bcrypt
from sqlalchemy import create_engine, text

DB_URL = (
    f"mysql+pymysql://{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}"
    f"@{os.environ.get('DB_HOST','localhost')}:{os.environ.get('DB_PORT','3306')}"
    f"/{os.environ['DB_NAME']}?charset=utf8mb4"
)

USERS = [
    {"email": "admin@rtl-poultry.com",   "password": "admin123",   "name": "Ahmad Al-Rashidi"},
    {"email": "manager@rtl-poultry.com", "password": "manager123", "name": "Mariam Khalil"},
    {"email": "worker1@rtl-poultry.com", "password": "worker123",  "name": "Yusuf Salam"},
    {"email": "vet@rtl-poultry.com",     "password": "vet123",     "name": "Dr. Lina Haddad"},
]

engine = create_engine(DB_URL)
with engine.begin() as conn:
    for u in USERS:
        hashed = bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode()
        conn.execute(
            text("UPDATE users SET password_hash = :h WHERE email = :e"),
            {"h": hashed, "e": u["email"]},
        )
        print(f"  OK {u['name']} ({u['email']})  password: {u['password']}")

print("\nDone. You can now log in at http://localhost:5173")
