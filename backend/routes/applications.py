from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from .. import models, schemas, security, database

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.post("/apply-club-manager")
def apply_club_manager(
    req: schemas.ManagerApplicationRequest, 
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user) 
):
    
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    
    if user.role_id == 2:
        raise HTTPException(
            status_code=400,
            detail="You are already a club manager. A user can only represent one club."
        )

    existing_app = db.query(models.ClubManager).filter(
        models.ClubManager.user_id == user.user_id,
        models.ClubManager.club_id == req.club_id
    ).first()

    if existing_app:
        raise HTTPException(
            status_code=400, 
            detail="You have already applied for this club."
        )

    existing_pending = db.query(models.ClubManager).filter(
        models.ClubManager.user_id == user.user_id,
        models.ClubManager.request_status == 0 
    ).first()

    if existing_pending:
        raise HTTPException(
            status_code=400,
            detail="You already have a pending manager application. You cannot apply for another club."
        )

    if not req.application_message or not req.application_message.strip():
        raise HTTPException(
            status_code=400,
            detail="Motivation message cannot be empty. Please explain why you want to be a manager."
        )

    new_application = models.ClubManager(
        user_id=user.user_id,
        club_id=req.club_id,
        application_message=req.application_message.strip(),
        request_status=0  # 0 = Pending
    )
    
    try:
        db.add(new_application)
        db.commit()
        return {"message": "Your club manager application with your motivation message has been sent! Waiting for Admin approval."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error occurred.")
    
    
@router.get("/pending", dependencies=[Depends(security.check_is_admin)])
def get_pending_applications(db: Session = Depends(database.get_db)):
    
    pending_apps = (
        db.query(models.ClubManager, models.Club.club_name)
        .join(models.Club, models.ClubManager.club_id == models.Club.club_id)
        .filter(models.ClubManager.request_status == 0)
        .all()
    )
    
    result = []
    for app, club_name in pending_apps:
        result.append({
            "manager_id": app.manager_id,
            "user_id": app.user_id,
            "club_id": app.club_id,       
            "club_name": club_name,       
            "application_message": app.application_message 
        })
        
    return result

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

@router.get("/me")
def get_my_applications(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    
    my_apps = (
        db.query(models.ClubManager, models.Club.club_name)
        .join(models.Club, models.ClubManager.club_id == models.Club.club_id)
        .filter(models.ClubManager.user_id == user.user_id)
        .order_by(models.ClubManager.request_date.desc())
        .all()
    )
    
    result = []
    for app, club_name in my_apps:
        result.append({
            "club_id": app.club_id,
            "club_name": club_name,
            "request_status": app.request_status,
            "application_message": app.application_message,
            "request_date": app.request_date
        })
        
    return result