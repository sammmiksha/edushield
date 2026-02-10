from database import SessionLocal
from models import Users

db = SessionLocal()
users = db.query(Users).all()

for user in users:
    print(f"ID: {user.id} | Email: {user.email}")

db.close()
