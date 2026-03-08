from pydantic import BaseModel

class Position(BaseModel):
    x: int
    y: int
    z: int

class StickyNoteCreate(BaseModel):
    title: str
    content: str
    position: Position

