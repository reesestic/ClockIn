from fastapi import APIRouter
from models.sticky_note_model import StickyNoteCreate, StickyNoteSave
from constants.routes import STICKY_NOTES

from dependencies import sticky_note_service

router = APIRouter(prefix=STICKY_NOTES)

@router.post("/send")
def send_to_planner(note_id: int):
    sticky_note_service.note_to_task(note_id)
    print("IT WORKED BITCH!!!", note_id)


@router.post("/save")
def save_note_controller(note: StickyNoteSave):

    if note.id is not None:
        sticky = sticky_note_service.update_note(
            note.id,
            note.title,
            note.content
        )

    else:
        sticky = sticky_note_service.create_note(
            note.title,
            note.content,
            note.position.x,
            note.position.y,
            note.position.z
        )

    return sticky


# Endpoint to load sticky notes for user
# In the future, add it to work for different users
@router.get("")
def get_notes():
    user_id = 1
    return sticky_note_service.get_notes(user_id)