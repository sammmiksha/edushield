from database import engine
from models import Base, AssignmentResult, Users

Base.metadata.create_all(bind=engine)

print("table created successfully.")