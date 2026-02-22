from fastapi import FastAPI
from supabase_client import supabase


app = FastAPI()

@app.get("/")
def root():
    return {"message": "Backend running"}

@app.get("/test-supabase")
def test_supabase():
    response = supabase.table("tasks").select("*").execute()
    return response.data