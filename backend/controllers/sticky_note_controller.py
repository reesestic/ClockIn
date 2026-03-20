from fastapi import APIRouter
from models.sticky_note_model import StickyNoteCreate, StickyNoteSave, StickyNoteColorUpdate
from constants.routes import STICKY_NOTES

from dependencies import sticky_note_service

router = APIRouter(prefix=STICKY_NOTES)

@router.post("/send/{note_id}")
async def send_to_planner(note_id: str):
    await sticky_note_service.note_to_task(note_id)


@router.post("/save")
def save_note_controller(note: StickyNoteSave):

    if note.id is not None:
        sticky = sticky_note_service.update_note(note.id, note.title, note.content)

    else:
        sticky = sticky_note_service.create_note( note.title, note.content, note.color,
            note.position.x, note.position.y, note.position.z )

    return sticky


# Endpoint to load sticky notes for user
# In the future, add it to work for different users
@router.get("")
def get_notes():
    user_id = "11111111-1111-1111-1111-111111111111"
    return sticky_note_service.get_notes(user_id)

@router.delete("/delete/{note_id}")
def delete_note(note_id: str):
    deleted_id = sticky_note_service.delete_note(note_id)
    return {"deleted_id": deleted_id}

# Color updater
@router.patch("/{note_id}/color")
def update_note_color(note_id: str, update: StickyNoteColorUpdate):
    sticky_note_service.update_color(note_id, update.color)
    print("it worked!")