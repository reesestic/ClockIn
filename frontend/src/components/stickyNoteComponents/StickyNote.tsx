import styled from "styled-components";
import StickyNoteBackground from "./StickyNoteBackground";
import type { Note } from "../../types/Note.ts";

const NoteWrapper = styled.div`
    position: relative;
    width: clamp(200px, 20vw, 300px);
    aspect-ratio: 1;
`;

const NoteContent = styled.div`
    position: absolute;
    inset: 20% 15% 15% 15%;
    display: flex;
    flex-direction: column;
    gap: 8px;

`;

type StickyNoteProps = {
    note: Note;
    onChange: (title: string, content: string) => void;
};

export default function StickyNote({ note, onChange }: StickyNoteProps) {

    const handleTitleChange = (value: string) => {
        onChange(value, note.content);
    };

    const handleContentChange = (value: string) => {
        onChange(note.title, value);
    };

    return (
        <NoteWrapper onClick={(e) => e.stopPropagation()}>
            <StickyNoteBackground />

            <NoteContent>

                <input
                    value={note.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                />

                <textarea
                    value={note.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                />

            </NoteContent>
        </NoteWrapper>
    );
}