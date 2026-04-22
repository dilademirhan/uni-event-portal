from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from .. import models, schemas, security, database

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.post("/apply-club-manager")
def apply_club_manager(
    club_id: int, 
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user) 
):
    
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    
    existing_app = db.query(models.ClubManager).filter(
        models.ClubManager.user_id == user.user_id,
        models.ClubManager.club_id == club_id
    ).first()

    if existing_app:
        raise HTTPException(
            status_code=400, 
            detail="You have already applied for this club or you are already a manager."
        )

    new_application = models.ClubManager(
        user_id=user.user_id,
        club_id=club_id,
        request_status=0  # 0 = Pending 
    )
    
    try:
        db.add(new_application)
        db.commit()
        return {"message": "Your club manager application has been sent! Waiting for Admin approval."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error occurred.")
    
    
@router.get("/pending", dependencies=[Depends(security.check_is_admin)])
def get_pending_applications(db: Session = Depends(database.get_db)):
    applications = db.query(models.ClubManager).filter(models.ClubManager.request_status == 0).all()
    return applications

@router.put("/approve/{manager_id}", dependencies=[Depends(security.check_is_admin)])
def approve_application(
    manager_id: int, 
    approve: bool, 
    db: Session = Depends(database.get_db)
):
    app = db.query(models.ClubManager).filter(models.ClubManager.manager_id == manager_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if approve:
        app.request_status = 1
        user = db.query(models.User).filter(models.User.user_id == app.user_id).first()
        user.role_id = 2 
        msg = "Application approved! User is now a Club Manager."
    else:
        app.request_status = 2
        msg = "Application rejected."

    db.commit()
    return {"message": msg}