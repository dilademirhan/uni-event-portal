from fastapi import FastAPI, HTTPException
from .db_connection import get_db_connection

app = FastAPI(title="Uni-Event Portal API")

@app.get("/")
def read_root():
    return {
        "project": "Uni-Event Portal",
        "version": "1.0.0",
        "status": "Backend is running"
    }

@app.get("/health-check")
def health_check():
    conn = get_db_connection()
    if conn:
        conn.close()
        return {"database": "Connected"}
    else:
        raise HTTPException(status_code=500, detail="Database connection failed")

@app.get("/user/me")
def get_mock_user():
    return {
        "id": 1,
        "username": "dila_demo",
        "role": "club_manager", 
        "permissions": ["create_event", "view_participants"]
    }