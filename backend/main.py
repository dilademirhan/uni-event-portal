from fastapi import FastAPI, HTTPException, Depends, status
from sqlalchemy.orm import Session
from . import models, schemas, security, database

app = FastAPI(title="Uni-Event Portal API")

@app.get("/", tags=["General"])
def read_root():
    return {
        "project": "Uni-Event Portal",
        "version": "1.0.0",
        "status": "Backend is running"
    }

@app.get("/health", tags=["Diagnostic"])
def health_check(db: Session = Depends(database.get_db)):
    try:
        db.execute(models.User.__table__.select().limit(1))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB Connection Error: {str(e)}")

@app.post("/register", response_model=schemas.UserResponse, tags=["Auth"])
def register(user_in: schemas.UserCreate, db: Session = Depends(database.get_db)):
    try:
        if db.query(models.User).filter(models.User.email == user_in.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")

        new_user = models.User(
            full_name=user_in.full_name,
            email=user_in.email,
            password_hash=security.get_password_hash(user_in.password),
            role_id=1 
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"SYSTEM ERROR: {str(e)}")

@app.post("/login", response_model=schemas.Token, tags=["Auth"])
def login(user_in: schemas.UserLogin, db: Session = Depends(database.get_db)):
    try:
        user = db.query(models.User).filter(models.User.email == user_in.email).first()
        
        if not user or not security.verify_password(user_in.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = security.create_access_token(data={"sub": user.email, "role": user.role_id})
        return {"access_token": token, "token_type": "bearer"}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"SYSTEM ERROR: {str(e)}")