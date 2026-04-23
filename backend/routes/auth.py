from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from .. import models, schemas, security, database

router = APIRouter(tags=["Auth"])

@router.post("/register", response_model=schemas.UserResponse)
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

@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = security.create_access_token(data={"sub": user.email, "role": user.role_id})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(
    db: Session = Depends(database.get_db), 
    current_user: dict = Depends(security.get_current_user)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    return user