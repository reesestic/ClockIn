from pydantic import BaseModel
from typing import Optional
from enum import Enum

class StickyNoteColor(str, Enum):
    yellow = "yellow"
    pink = "pink"
    blue = "blue"

class Position(BaseModel):
    x: int
    y: int
    z: int


class StickyNoteCreate(BaseModel):
    title: str
    content: str
    color: StickyNoteColor
    position: Position


class StickyNoteSave(BaseModel):
    id: Optional[int] = None
    title: str
    content: str
    color: str
    position: Position

class StickyNoteColorUpdate(BaseModel):
    color: StickyNoteColor