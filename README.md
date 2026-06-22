# Arel Portal — University Club & Event Management System

A centralized, role-based web application designed to digitalize campus club and event management processes at universities.

The system provides a single platform where students can discover campus events, join clubs, apply for club manager positions, and participate in activities, while administrators maintain full oversight through an approval-based workflow.

## Overview

Many universities still rely on fragmented communication channels such as WhatsApp groups, Instagram posts, emails, and physical notice boards to manage extracurricular activities. This often results in:

- Poor event visibility
- Low student engagement
- Administrative inefficiencies
- Lack of centralized records
- Difficult club and event management

*Arel Portal* addresses these problems by providing a centralized, web-based management system that brings together students, club managers, and administrators under a single platform.

## Role-Based Access Control

The system implements three authorization levels:

| Role | Permissions |
|------|-------------|
| Student | Event discovery, club memberships, registrations, manager applications |
| Club Manager | Student permissions + event creation, editing, participant tracking |
| Administrator | Full approval and management privileges, audit trail access |

Authentication and authorization are implemented using **JWT (JSON Web Tokens)** with **bcrypt** password hashing. All sensitive endpoints are protected by backend role guards — frontend visibility controls are for UX only.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI |
| Database | Microsoft SQL Server |
| ORM | SQLAlchemy |
| Auth | JWT (python-jose) + bcrypt |
| Frontend | Vanilla JavaScript + Tailwind CSS |

## Business Rules

- Registration requires a valid `@arel.edu.tr` email
- Passwords must meet complexity requirements (uppercase, lowercase, digit, special char)
- Clubs and events have configurable capacity limits
- Managers can create up to 2 events per day; time conflicts are blocked
- Events marked "Members Only" are restricted to club members
- Both manager applications and events require admin approval before activation
- Approved managers are automatically added as club members

## Getting Started

**Prerequisites:** Python 3.10+, Microsoft SQL Server, ODBC Driver 17, VS Code + Live Server

```bash
# 1. Clone
git clone https://github.com/dilademirhan/uni-event-portal.git
cd uni-event-portal

# 2. Install backend dependencies
pip install fastapi uvicorn sqlalchemy pyodbc python-jose bcrypt pydantic pydantic-settings python-dotenv python-multipart

# 3. Configure .env
DB_SERVER=localhost
DB_DATABASE=uni_event_portal
DB_DRIVER={ODBC Driver 17 for SQL Server}
SECRET_KEY=your_secret_key_here

# 4. Create database and run schema in SSMS
# database/schema.sql

# 5. Start backend
uvicorn backend.main:app --reload
# API → http://127.0.0.1:8000
# Swagger docs → http://127.0.0.1:8000/docs

# 6. Open frontend with VS Code Live Server
# http://127.0.0.1:5500/frontend/index.html
```