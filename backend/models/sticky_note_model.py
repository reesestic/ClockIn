from pydantic import BaseModel

class StickyNoteCreate(BaseModel):
    content: str
    id: int
    title: str
