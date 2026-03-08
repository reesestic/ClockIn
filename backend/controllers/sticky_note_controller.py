from fastapi import APIRouter
from backend.models.sticky_note_model import StickyNoteCreate
from backend.constants.routes import STICKY_NOTES

from backend.dependencies import sticky_note_service

router = APIRouter(prefix=STICKY_NOTES)

@router.get("")
def get_notes():
    return {"message": "notes"}

@router.post("")
def create_note_controller(note: StickyNoteCreate):

    sticky = sticky_note_service.create_note(
        note.title,
        note.content,
        note.position.x,
        note.position.y,
        note.position.z
    )

    print("IT WORKED BITCH!!! Controller got response from service/repo/database")

    #return sticky