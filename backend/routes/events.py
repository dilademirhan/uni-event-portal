from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from .. import models, security, database
from datetime import datetime

router = APIRouter(prefix="/events", tags=["Events"])

@router.post("/create")
def create_event(
    title: str,
    description: str,
    location: str,
    event_date: datetime,
    event_end_date: datetime,
    category: str,
    max_attendees: int = 100,
    is_members_only: bool = False,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.check_is_manager)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    
    manager_record = db.query(models.ClubManager).filter(
        models.ClubManager.user_id == user.user_id,
        models.ClubManager.request_status == 1 
    ).first()

    if not manager_record:
        raise HTTPException(
            status_code=403, 
            detail="You are not authorized to manage any club."
        )

    target_date_start = event_date.replace(hour=0, minute=0, second=0, microsecond=0)
    target_date_end = event_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    daily_count = db.query(models.Event).filter(
        models.Event.creator_id == user.user_id,
        models.Event.event_date >= target_date_start,
        models.Event.event_date <= target_date_end
    ).count()

    if daily_count >= 2:
        raise HTTPException(status_code=400, detail="Daily limit reached: You can only schedule a maximum of 2 events per day.")

    conflict = db.query(models.Event).filter(
        models.Event.club_id == manager_record.club_id,
        models.Event.event_date < event_end_date,
        models.Event.event_end_date > event_date
    ).first()

    if conflict:
        raise HTTPException(status_code=400, detail="Time conflict: Your club already has an event whose duration overlaps with this new event.")

    new_event = models.Event(
        title=title,
        description=description,
        location=location,
        event_date=event_date, 
        event_end_date=event_end_date,
        category=category,
        max_attendees=max_attendees,
        is_members_only=is_members_only,
        club_id=manager_record.club_id, 
        creator_id=user.user_id,
        approval_status=0 
    )
    
    db.add(new_event)
    db.commit()
    return {"message": "Event created successfully! Waiting for Admin approval."}

@router.get("/pending", dependencies=[Depends(security.check_is_admin)])
def get_pending_events(db: Session = Depends(database.get_db)):
    return db.query(models.Event).filter(models.Event.approval_status == 0).all()

@router.put("/approve/{event_id}", dependencies=[Depends(security.check_is_admin)])
def approve_event(event_id: int, approve: bool, db: Session = Depends(database.get_db)):
    event = db.query(models.Event).filter(models.Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    
    if approve:
        event.approval_status = 1  # Approved
    else:
        event.approval_status = 2  # Rejected
        event.event_state = 'Cancelled' 
    
    db.commit()
    return {"message": "Event approved!" if approve else "Event rejected and cancelled!"}

@router.get("/my-events")
def get_my_events(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.check_is_manager)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    return db.query(models.Event).filter(models.Event.creator_id == user.user_id).all()

@router.get("/upcoming")
def get_upcoming_events(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user)
):
    events = db.query(
        models.Event, 
        models.Club.club_name
    ).join(
        models.Club, models.Event.club_id == models.Club.club_id
    ).filter(
        models.Event.approval_status == 1
    ).all()
    
    result = []
    for event, club_name in events:
        event_dict = {
            "event_id": event.event_id,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "club_id": event.club_id,
            "club_name": club_name
        }
        result.append(event_dict)
    return result

@router.get("/registrations/me")
def get_my_registrations(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user)
):
    # Placeholder for Issue 35
    return []