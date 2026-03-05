from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers import sticky_note_controller

app = FastAPI()

app.include_router(sticky_note_controller.router)


# Only allows FASTAPI to take requests from these frontends (security)
# If new domains are deployed, update this list
origins = [
    "http://localhost:5173",
    "https://clock-in-orcin.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#@app.get("/")
#def root():
#    return {"message": "Backend is running"}

#@app.get("/bertha")
#def get_bertha():
#    response = supabase.table("Bertha") \
#        .select("id, Task, Importance") \
#        .execute()
#
#    return response.data