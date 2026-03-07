//import styled from "styled-components";
//import {Link} from "react-router-dom";
import { ROUTES } from "../constants/Routes";

import { useState } from "react";
import type { Note } from "../types/Note";

import {
    PageTitle, StyledStickyNoteContainer, PageWrapper, NotesAndButtonsLayout,
    NotesBoard, ActionColumn, Overlay, StyledButton,
    StyledAddStickyNoteButton, ExpandedStickyNote, AddAndSelectWrapper
} from "./StickyNoteHome.styles";

import { sendNote } from "../api/StickyNoteApi";

export default function StickyNoteHome() {

    // Notes currently in Supabase created by user
    const [notes, setNotes] = useState<Note[]>([
        { id: 0, title: "Bio Midterm", content: "bitch i need to study!!" },
        { id: 1, title: "Calc Midterm", content: "bitch i need to study MORE!!" },
        { id: 2, title: "pOP MY Pussy Midterm", content: "bitch i need to POP MY PUSSY!!" }
    ]);

    // Function to determine the note that is editable & overlayed
    const [activeNote, setActiveNote] = useState<Note | null>(null);

    // Prop method passed down to Editable sticky note to edit title and content (StickyNote.tsx)
    const updateNote = (id: number, title: string, content: string) => {
        setNotes(prev =>
            prev.map(note =>
                note.id === id ? { ...note, title, content } : note
            )
        );
    };

    const handleSendNote = async () => {
        if (!activeNote) return;
        await sendNote(activeNote);
    };

    return (
        <PageWrapper>
            <StyledButton to={ROUTES.HOME}>
                Home
            </StyledButton>

            <PageTitle>Your Tasks Silly!</PageTitle>

            <AddAndSelectWrapper>
                <StyledAddStickyNoteButton
                    onClick={() =>
                        setActiveNote({
                            id: Date.now(),
                            title: "",
                            content: ""
                        })
                    }>
                    +
                </StyledAddStickyNoteButton>
                <button>Select</button>
            </AddAndSelectWrapper>

                <NotesAndButtonsLayout>
                    <NotesBoard>
                        <StyledStickyNoteContainer
                            notes={notes}
                            onNoteClick={setActiveNote}
                        />
                    </NotesBoard>

                    <ActionColumn>
                        <button onClick={handleSendNote}>
                            Send Button
                        </button>
                        <button>Delete Button</button>
                    </ActionColumn>
                </NotesAndButtonsLayout>

            {activeNote && (
                <Overlay onClick={() => setActiveNote(null)}>                        <ExpandedStickyNote
                    note={activeNote}
                    onChange={updateNote}
                />
                </Overlay>
            )}

        </PageWrapper>
    );
}