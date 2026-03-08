from pydantic import BaseModel

class StickyNoteCreate(BaseModel):
    title: str
    content: str
    position: Position

class Position(BaseModel):
    x: int
    y: int
    z: int
