import pyodbc
from .config import settings

def get_db_connection():
    conn_str = (
        f'DRIVER={settings.db_driver};'
        f'SERVER={settings.db_server};'
        f'DATABASE={settings.db_database};'
        f'Trusted_Connection=yes;'
    )
    
    try:
        conn = pyodbc.connect(conn_str)
        return conn
    except Exception as e:
        print(f"Connection failed: {e}")
        return None

if __name__ == "__main__":
    connection = get_db_connection()
    if connection:
        print("Connected successfully!")
        connection.close()