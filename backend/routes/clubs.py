from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, database, security

router = APIRouter(prefix="/clubs", tags=["Clubs"])

from sqlalchemy import func

@router.get("/")
def get_all_clubs(db: Session = Depends(database.get_db)):
    clubs = db.query(models.Club).all()
    
    result = []
    for club in clubs:
        approved_managers = db.query(models.User).join(
            models.ClubManager, models.User.user_id == models.ClubManager.user_id
        ).filter(
            models.ClubManager.club_id == club.club_id,
            models.ClubManager.request_status == 1
        ).all()
        
        managers_info = [{"name": m.full_name, "email": m.email} for m in approved_managers]
        manager_count = len(managers_info)
        
        member_count = db.query(models.ClubMember).filter(
            models.ClubMember.club_id == club.club_id
        ).count()
        
        result.append({
            "club_id": club.club_id,
            "club_name": club.club_name,
            "category": club.category,
            "description": club.description,
            "max_quota": club.max_quota,
            "max_managers": club.max_managers,
            "manager_count": manager_count,
            "member_count": member_count,
            "managers_info": managers_info
        })
    return result

@router.get("/memberships/me")
def get_my_memberships(db: Session = Depends(database.get_db), current_user: dict = Depends(security.get_current_user)):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    memberships = db.query(models.ClubMember).filter(models.ClubMember.user_id == user.user_id).all()
    return [{"club_id": m.club_id} for m in memberships]

@router.post("/{club_id}/join")
def join_club(club_id: int, db: Session = Depends(database.get_db), current_user: dict = Depends(security.get_current_user)):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    club = db.query(models.Club).filter(models.Club.club_id == club_id).first()
    
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
        
    existing_membership = db.query(models.ClubMember).filter(
        models.ClubMember.club_id == club_id,
        models.ClubMember.user_id == user.user_id
    ).first()
    
    if existing_membership:
        raise HTTPException(status_code=400, detail="You are already a member of this club")
        
    member_count = db.query(models.ClubMember).filter(models.ClubMember.club_id == club_id).count()
    if member_count >= club.max_quota:
        raise HTTPException(status_code=400, detail="Club member quota is full")
        
    new_member = models.ClubMember(club_id=club_id, user_id=user.user_id)
    db.add(new_member)
    db.commit()
    return {"message": "Successfully joined the club"}