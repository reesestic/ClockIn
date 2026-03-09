import styled from "styled-components";
import StickyNoteBackground from "./StickyNoteBackground";
import type { Note } from "../../types/Note.ts";

const NoteWrapper = styled.div`
    position: relative;
    width: clamp(200px, 17vw, 300px);
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
    onClick?: () => void;
};

export default function StickyNoteViewOnly({ note, onClick }: StickyNoteProps) {

    return (
        <NoteWrapper onClick={onClick}>

            <StickyNoteBackground />

            <NoteContent>
                <h3>{note.title}</h3>
                <p>{note.content}</p>
            </NoteContent>

        </NoteWrapper>
    );
}
