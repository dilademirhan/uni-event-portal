from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from .config import settings

connection_url = (
    f"mssql+pyodbc:///?odbc_connect="
    f"DRIVER={settings.db_driver};SERVER={settings.db_server};"
    f"DATABASE={settings.db_database};Trusted_Connection=yes;"
)

engine = create_engine(connection_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()