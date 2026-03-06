from repositories.sticky_note_repository import create_note_repository

def create_note_service(title: str, content: str, user_id: int):
    # Business logic later
    return create_note_repository(title, content, user_id)