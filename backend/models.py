from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from .database import Base

class Role(Base):
    __tablename__ = "Roles"
    role_id = Column(Integer, primary_key=True)
    role_name = Column(String(20), nullable=False) # student, club_manager, admin

class User(Base):
    __tablename__ = "Users"
    user_id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("Roles.role_id"), default=1)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class Club(Base):
    __tablename__ = "Clubs"
    club_id = Column(Integer, primary_key=True, index=True)
    club_name = Column(String(150), unique=True, nullable=False)
    category = Column(String(50))
    description = Column(Text)
    max_quota = Column(Integer, default=100)
    max_managers = Column(Integer, default=3)

class ClubManager(Base):
    __tablename__ = "Club_Managers"
    manager_id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("Clubs.club_id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("Users.user_id", ondelete="CASCADE"))
    request_status = Column(Integer, default=0) # 0: Pending, 1: Approved, 2: Rejected
    request_date = Column(DateTime, server_default=func.now())
    application_message = Column(Text, nullable=True)

class ClubMember(Base):
    __tablename__ = "Club_Members"
    membership_id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("Clubs.club_id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("Users.user_id", ondelete="CASCADE"))
    joined_at = Column(DateTime, server_default=func.now())

class Event(Base):
    __tablename__ = "Events"
    event_id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("Clubs.club_id", ondelete="CASCADE"))
    creator_id = Column(Integer, ForeignKey("Users.user_id"))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    event_date = Column(DateTime, nullable=False)
    event_end_date = Column(DateTime, nullable=True)
    category = Column(String(50), nullable=True)
    location = Column(String(255))
    is_members_only = Column(Boolean, default=False)
    approval_status = Column(Integer, default=0) # 0: Pending, 1: Approved, 2: Rejected
    event_state = Column(String(20), default="Upcoming")
    max_attendees = Column(Integer, default=100)

class EventRegistration(Base):
    __tablename__ = "Event_Registrations"
    registration_id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("Events.event_id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("Users.user_id"))
    registered_at = Column(DateTime, server_default=func.now())