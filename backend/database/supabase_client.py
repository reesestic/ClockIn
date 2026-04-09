from supabase import create_client #connects to supabase
import os #reads .env
from dotenv import load_dotenv #loads .env

load_dotenv() #runs the .env

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = None

if url and key:
    supabase = create_client(url, key)
