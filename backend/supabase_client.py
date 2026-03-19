from supabase import create_client #connects to supabase
import os #reads .env
from dotenv import load_dotenv #loads .env

load_dotenv() #runs the .env

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY") #reads these specific keys from .env file

supabase = None #initialize as None if either doesnt have key and/or url (so it doesnt CRASSHHH)

if url and key:
    supabase = create_client(url, key) #if both exists, then it runs 
