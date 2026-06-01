from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, database

router = APIRouter(prefix="/clubs", tags=["Clubs"])

from sqlalchemy import func

@router.get("/")
def get_all_clubs(db: Session = Depends(database.get_db)):
    clubs = db.query(models.Club).all()
    
    result = []
    for club in clubs:
        count = db.query(models.ClubManager).filter(
            models.ClubManager.club_id == club.club_id,
            models.ClubManager.request_status == 1
        ).count()
        
        result.append({
            "club_id": club.club_id,
            "club_name": club.club_name,
            "category": club.category,
            "description": club.description,
            "max_quota": club.max_quota,
            "max_managers": club.max_managers,
            "manager_count": count
        })
    return result