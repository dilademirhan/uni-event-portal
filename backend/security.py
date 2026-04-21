import os
import bcrypt
from datetime import datetime, timedelta
from jose import jwt, JWTError
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 365 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the provided password matches the stored hash."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def create_access_token(data: dict) -> str:
    """Generate a JWT token with an expiration date."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# (MIDDLEWARE / DEPENDENCIES)
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role_id: int = payload.get("role")
        if email is None or role_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication token.")
        return {"email": email, "role_id": role_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials. Please log in.")

def check_is_manager(user: dict = Depends(get_current_user)):
    if user["role_id"] != 2:
        raise HTTPException(status_code=403, detail="Access denied. Only Club Representatives are authorized.")
    return user

def check_is_admin(user: dict = Depends(get_current_user)):
    if user["role_id"] != 3:
        raise HTTPException(status_code=403, detail="Access denied. Admin authority required.")
    return user