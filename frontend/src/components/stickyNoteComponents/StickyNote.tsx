import styled from "styled-components";
import StickyNoteBackground from "./StickyNoteBackground";
import { useState } from "react";
import type { Note } from "../../types/Note.ts";

const NoteWrapper = styled.div`
    position: relative;
    width: clamp(200px, 20vw, 300px);
    aspect-ratio: 1;
`;

const NoteContent = styled.div`
    position: absolute;
    top: 50px;
    left: 50px;
`;

type StickyNoteProps = {
    note: Note;
    onChange: (id: number, title: string, content: string) => void;
};

export default function StickyNote({ note, onChange }: StickyNoteProps) {

    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content);

    const handleTitleChange = (value: string) => {
        setTitle(value);
        onChange(note.id, value, content);
    };

    const handleContentChange = (value: string) => {
        setContent(value);
        onChange(note.id, title, value);
    };

    return (
        <NoteWrapper onClick={(e) => e.stopPropagation()}>
            <StickyNoteBackground />

            <NoteContent>

                <input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                />

                <textarea
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                />

            </NoteContent>

        </NoteWrapper>
    );
}