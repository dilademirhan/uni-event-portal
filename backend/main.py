from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from . import models, database
from .routes import auth, applications,events,clubs
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Uni-Event Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(events.router)
app.include_router(clubs.router)

@app.get("/", tags=["General"])
def read_root():
    return {
        "project": "Uni-Event Portal",
        "version": "1.0.0",
        "status": "Backend is running"
    }

@app.get("/health", tags=["Diagnostic"])
def health_check(db: Session = Depends(database.get_db)):
    try:
        db.execute(models.User.__table__.select().limit(1))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB Connection Error: {str(e)}")