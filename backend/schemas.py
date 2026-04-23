from pydantic import BaseModel, EmailStr, Field, field_validator
import re

class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=5, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator('email')
    @classmethod
    def email_domain_check(cls, v: str) -> str:
        if not v.endswith('@arel.edu.tr'):
            raise ValueError('Only @arel.edu.tr emails are accepted.')
        return v

    @field_validator('password')
    @classmethod
    def password_complexity_check(cls, v: str) -> str:
        if not any(char.isupper() for char in v):
            raise ValueError('Must contain an uppercase letter.')
        if not any(char.islower() for char in v):
            raise ValueError('Must contain a lowercase letter.')
        if not any(char.isdigit() for char in v):
            raise ValueError('Must contain a digit.')
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError('Must contain a special character.')
        return v

class UserResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role_id: int

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str