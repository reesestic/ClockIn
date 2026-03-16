import StickyNoteFrame from "./StickyNoteFrame";
import type { Note } from "../../types/Note";
import styled from "styled-components"
import { StickyNoteThemes } from "../../types/StickyNoteThemes";
import React from "react";
import type {StickyNoteColor} from "../../types/StickyNoteThemes";

const TitleInput = styled.input`
    font-size: 1.35rem;
    font-weight: bold;
    margin: 1rem 0 0.6rem;
    
    border: none;
    background: transparent;
    
    &:focus {
    outline: none;
    }
`;

const ContentTextarea = styled.textarea`
    font-size: 1rem;
    line-height: 1.5;
    
    border: none;
    resize: none;
    background: transparent;

    padding-left: 1rem;

    &:focus {
    outline: none;
    }
`;

const EditMenu = ({
                      noteId,
                      onColorChange
                  }: {
    noteId: string;
    onColorChange: (noteId: string, color: StickyNoteColor) => void;
}) => {
    return (
        <div>
            <button>B</button>
            <button>I</button>

            <button onClick={() => onColorChange(noteId, "yellow")}>
                🟨
            </button>

            <button onClick={() => onColorChange(noteId, "pink")}>
                🩷
            </button>

            <button onClick={() => onColorChange(noteId, "blue")}>
                🟦
            </button>
        </div>
    );
};

type Props = {
    note: Note;
    onChange: (title: string, content: string) => void;
    onColorChange: (noteId: string, color: StickyNoteColor) => void;
};

export default function StickyNoteEditable({ note, onChange, onColorChange }: Props) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();

            const newContent = note.content + "\n• ";
            onChange(note.title, newContent);
        }
    };

    return (
        <StickyNoteFrame theme={StickyNoteThemes[note.color]}
             menu={<EditMenu noteId={note.id!} onColorChange={onColorChange}/>}
        >
            <TitleInput
                value={note.title}
                onChange={(e) => onChange(e.target.value, note.content)}
                placeholder=" Add a title..."
            />

            <ContentTextarea
                value={note.content}
                onChange={(e) => onChange(note.title, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="• Write a note..."
            />
        </StickyNoteFrame>
    );
}