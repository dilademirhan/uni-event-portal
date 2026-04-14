import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Establishes a secure and dynamic connection to the MSSQL database."""
    server = os.getenv('DB_SERVER')
    database = os.getenv('DB_DATABASE')
    driver = os.getenv('DB_DRIVER')
    
    # Connection string using Windows Authentication
    conn_str = (
        f'DRIVER={driver};'
        f'SERVER={server};'
        f'DATABASE={database};'
        f'Trusted_Connection=yes;'
    )
    
    try:
        conn = pyodbc.connect(conn_str)
        print("Database connection established successfully.")
        return conn
    except Exception as e:
        print(f"Connection failed: {e}")
        return None

if __name__ == "__main__":
    connection = get_db_connection()
    if connection:
        connection.close()