from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, database

router = APIRouter(prefix="/clubs", tags=["Clubs"])

@router.get("/")
def get_all_clubs(db: Session = Depends(database.get_db)):
    return db.query(models.Club).all()