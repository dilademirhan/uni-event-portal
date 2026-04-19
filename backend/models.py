from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from .database import Base 

class Role(Base):
    __tablename__ = "Roles"
    role_id = Column(Integer, primary_key=True)
    role_name = Column(String(20), nullable=False)

class User(Base):
    __tablename__ = "Users"
    user_id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("Roles.role_id"), default=1) 
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())