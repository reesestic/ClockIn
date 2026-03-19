from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware #whitelists what frontends are allowed
from supabase_client import supabase
from controllers.calendar_controller import router as calendar_router

app = FastAPI()
app.include_router(calendar_router)

# ✅ ADD THIS
origins = [
    "http://localhost:5173",
    "https://clock-in-orcin.vercel.app" #the whitelisted frontends
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # only these frontends can talk to us
    allow_credentials=True, # allow cookies/auth headers 
    allow_methods=["*"], # allow GET, POST, DELETE, etc. 
    allow_headers=["*"], # allow any HTTP headers 
)

@app.get("/")
def root(): 
    return {"message": "backend running"}
