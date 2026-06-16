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

    if event_date >= event_end_date:
        raise HTTPException(status_code=400, detail="End date and time must be after the start date and time.")

    now = datetime.utcnow()
    if event_date.tzinfo:
        now = datetime.now(event_date.tzinfo)
    if event_date < now:
        raise HTTPException(status_code=400, detail="Event start date cannot be in the past.")

    conflict = db.query(models.Event).filter(
        models.Event.club_id == manager_record.club_id,
        models.Event.event_date < event_end_date,
        models.Event.event_end_date > event_date,
        models.Event.event_state != 'Cancelled',
        models.Event.approval_status != 2
    ).first()

    if conflict:
        raise HTTPException(status_code=400, detail="Time conflict: Your club already has an active event whose duration overlaps with this new event.")

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
    events = db.query(
        models.Event, 
        models.User.full_name.label("creator_name"),
        models.User.email.label("creator_email"),
        models.Club.club_name
    ).join(
        models.User, models.Event.creator_id == models.User.user_id
    ).join(
        models.Club, models.Event.club_id == models.Club.club_id
    ).filter(
        models.Event.approval_status == 0
    ).order_by(models.Event.event_date.asc()).all()
    
    result = []
    for e, creator_name, creator_email, club_name in events:
        result.append({
            "event_id": e.event_id,
            "title": e.title,
            "description": e.description,
            "location": e.location,
            "event_date": e.event_date.isoformat(),
            "event_end_date": e.event_end_date.isoformat(),
            "max_attendees": e.max_attendees,
            "category": e.category,
            "is_members_only": e.is_members_only,
            "creator_id": e.creator_id,
            "creator_name": creator_name,
            "creator_email": creator_email,
            "club_name": club_name,
            "approval_status": e.approval_status
        })
    return result

@router.get("/history", dependencies=[Depends(security.check_is_admin)])
def get_events_history(db: Session = Depends(database.get_db)):
    events = db.query(
        models.Event, 
        models.User.full_name.label("creator_name"),
        models.User.email.label("creator_email"),
        models.Club.club_name
    ).join(
        models.User, models.Event.creator_id == models.User.user_id
    ).join(
        models.Club, models.Event.club_id == models.Club.club_id
    ).filter(
        models.Event.approval_status != 0
    ).all()
    
    result = []
    for e, creator_name, creator_email, club_name in events:
        result.append({
            "event_id": e.event_id,
            "title": e.title,
            "description": e.description,
            "location": e.location,
            "event_date": e.event_date.isoformat(),
            "event_end_date": e.event_end_date.isoformat(),
            "max_attendees": e.max_attendees,
            "category": e.category,
            "is_members_only": e.is_members_only,
            "creator_id": e.creator_id,
            "creator_name": creator_name,
            "creator_email": creator_email,
            "club_name": club_name,
            "approval_status": e.approval_status
        })
    return result

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
    return db.query(models.Event).filter(models.Event.creator_id == user.user_id).order_by(models.Event.event_date.asc()).all()

@router.get("/upcoming")
def get_upcoming_events(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user)
):
    events = db.query(
        models.Event, 
        models.Club.club_name,
        models.User.full_name.label("creator_name"),
        models.User.email.label("creator_email")
    ).join(
        models.Club, models.Event.club_id == models.Club.club_id
    ).join(
        models.User, models.Event.creator_id == models.User.user_id
    ).filter(
        models.Event.approval_status == 1
    ).order_by(models.Event.event_date.asc()).all()
    
    result = []
    for event, club_name, creator_name, creator_email in events:
        reg_count = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == event.event_id
        ).count()
        
        event_dict = {
            "event_id": event.event_id,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "event_end_date": event.event_end_date.isoformat() if event.event_end_date else None,
            "category": event.category,
            "max_attendees": event.max_attendees,
            "is_members_only": event.is_members_only,
            "current_capacity": reg_count,
            "event_state": event.event_state,
            "club_id": event.club_id,
            "club_name": club_name,
            "creator_name": creator_name,
            "creator_email": creator_email
        }
        result.append(event_dict)
    return result

@router.post("/{event_id}/register")
def register_for_event(
    event_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    
    event = db.query(models.Event).filter(models.Event.event_id == event_id, models.Event.approval_status == 1).first()
    if not event:
        raise HTTPException(status_code=404, detail="Approved event not found.")
        
    # Check duplicate
    existing_reg = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.user_id == user.user_id
    ).first()
    if existing_reg:
        raise HTTPException(status_code=400, detail="You are already registered for this event.")
        
    # Check Capacity
    current_count = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id
    ).count()
    if current_count >= event.max_attendees:
        raise HTTPException(status_code=400, detail="Event capacity is full.")
        
    # Check Members Only rule
    if event.is_members_only:
        is_member = db.query(models.ClubMember).filter(
            models.ClubMember.club_id == event.club_id,
            models.ClubMember.user_id == user.user_id
        ).first()
        if not is_member:
            raise HTTPException(status_code=403, detail="This event is exclusively for club members. Please join the club first.")
            
    # Success, insert registration
    new_reg = models.EventRegistration(event_id=event_id, user_id=user.user_id)
    db.add(new_reg)
    db.commit()
    return {"message": "Successfully registered for the event!"}

@router.get("/registrations/me")
def get_my_registrations(
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.get_current_user)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    regs = db.query(
        models.EventRegistration, 
        models.Event,
        models.User.full_name.label("creator_name"),
        models.User.email.label("creator_email")
    ).join(
        models.Event, models.EventRegistration.event_id == models.Event.event_id
    ).join(
        models.User, models.Event.creator_id == models.User.user_id
    ).filter(
        models.EventRegistration.user_id == user.user_id
    ).all()
    
    return [
        {
            "event_id": r[0].event_id,
            "registered_at": r[0].registered_at.isoformat(),
            "title": r[1].title,
            "description": r[1].description,
            "category": r[1].category,
            "is_members_only": r[1].is_members_only,
            "max_attendees": r[1].max_attendees,
            "location": r[1].location,
            "event_date": r[1].event_date.isoformat(),
            "event_end_date": r[1].event_end_date.isoformat(),
            "creator_name": r.creator_name,
            "creator_email": r.creator_email,
            "event_state": r[1].event_state,
            "computed_state": "Cancelled" if r[1].approval_status == 2 or r[1].event_state == "Cancelled" else ("Completed" if r[1].event_end_date < datetime.utcnow() else ("Ongoing" if r[1].event_date <= datetime.utcnow() <= r[1].event_end_date else "Upcoming"))
        }
        for r in regs
    ]

from pydantic import BaseModel

class EventUpdate(BaseModel):
    title: str
    description: str
    location: str
    event_date: datetime
    event_end_date: datetime
    max_attendees: int
    is_members_only: bool

@router.put("/{event_id}")
def update_event(
    event_id: int,
    event_data: EventUpdate,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.check_is_manager)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    event = db.query(models.Event).filter(models.Event.event_id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
        
    if event.creator_id != user.user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own events.")
        
    now = datetime.utcnow()
    if event.approval_status == 2 or event.event_state == "Cancelled":
        raise HTTPException(status_code=400, detail="Cannot modify a cancelled event.")
    if event.approval_status == 1:
        if event.event_end_date and event.event_end_date < now:
            raise HTTPException(status_code=400, detail="Cannot modify a completed event.")
        if event.event_date and event.event_date <= now <= (event.event_end_date or now):
            raise HTTPException(status_code=400, detail="Cannot modify an ongoing event.")
            
    if event_data.event_date >= event_data.event_end_date:
        raise HTTPException(status_code=400, detail="End date and time must be after the start date and time.")
        
    now = datetime.utcnow()
    if event_data.event_date.tzinfo:
        now = datetime.now(event_data.event_date.tzinfo)
    if event_data.event_date < now:
        raise HTTPException(status_code=400, detail="Event start date cannot be in the past.")

    conflict = db.query(models.Event).filter(
        models.Event.club_id == event.club_id,
        models.Event.event_date < event_data.event_end_date,
        models.Event.event_end_date > event_data.event_date,
        models.Event.event_id != event_id,
        models.Event.event_state != 'Cancelled',
        models.Event.approval_status != 2
    ).first()

    if conflict:
        raise HTTPException(status_code=400, detail="Time conflict: Your club already has an active event whose duration overlaps with this new time.")
            
    event.title = event_data.title
    event.description = event_data.description
    event.location = event_data.location
    event.event_date = event_data.event_date
    event.event_end_date = event_data.event_end_date
    event.max_attendees = event_data.max_attendees
    event.is_members_only = event_data.is_members_only
    
    db.commit()
    return {"message": "Event updated successfully!"}

@router.patch("/{event_id}/cancel")
def cancel_event(
    event_id: int,
    db: Session = Depends(database.get_db),
    current_user: dict = Depends(security.check_is_manager)
):
    user = db.query(models.User).filter(models.User.email == current_user["email"]).first()
    event = db.query(models.Event).filter(models.Event.event_id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
        
    if event.creator_id != user.user_id:
        raise HTTPException(status_code=403, detail="You can only cancel your own events.")
        
    now = datetime.utcnow()
    if event.approval_status == 2 or event.event_state == "Cancelled":
        raise HTTPException(status_code=400, detail="Event is already cancelled.")
    if event.approval_status == 1:
        if event.event_end_date and event.event_end_date < now:
            raise HTTPException(status_code=400, detail="Cannot cancel a completed event.")
        if event.event_date and event.event_date <= now <= (event.event_end_date or now):
            raise HTTPException(status_code=400, detail="Cannot cancel an ongoing event.")
            
    event.event_state = "Cancelled"
    db.commit()
    return {"message": "Event has been cancelled successfully."}

