from pydantic import BaseModel
from typing import Optional

class Position(BaseModel):
    x: int
    y: int
    z: int

class StickyNoteCreate(BaseModel):
    title: str
    content: str
    position: Position


class StickyNoteSave(BaseModel):
    id: Optional[int] = None
    title: str
    content: str
    position: Position