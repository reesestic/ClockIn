from fastapi import APIRouter
from models.sticky_note_model import StickyNoteCreate
from services.sticky_note_service import create_note_service
from constants.routes import STICKY_NOTES

router = APIRouter(prefix=STICKY_NOTES)

@router.get("")
def get_notes():
    return {"message": "notes"}

@router.post("")
def create_note_controller(note : StickyNoteCreate):
    print("Note", note)
    sticky_note = create_note_service(note.title, note.content, note.id)
    return {
        "message": "Note created",
        "note": sticky_note
    }

# @router.post("/send")
# def send:

