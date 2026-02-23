from fastapi import FastAPI
from supabase_client import supabase

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Backend is running"}

@app.get("/bertha")
def get_bertha():
    response = supabase.table("Bertha") \
        .select("id, Task, Importance") \
        .execute()

    return response.data