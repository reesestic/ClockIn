//import styled from "styled-components";
//import {Link} from "react-router-dom";
import { ROUTES } from "../constants/Routes";

import { useState, useEffect } from "react";
import { sendNote, saveNote, getNotes } from "../api/StickyNoteApi";

import type { Note } from "../types/Note";

import {
    PageTitle, StyledStickyNoteContainer, PageWrapper, NotesAndButtonsLayout,
    NotesBoard, ActionColumn, StyledButton,
    StyledAddStickyNoteButton, AddAndSelectWrapper,
} from "./StickyNoteHome.styles";

import StickyNoteOverlay from "../components/stickyNoteComponents/StickyNoteOverlay";

export function StickyNoteHome() {

    // // Notes currently in Supabase created by user
    // const [notes, setNotes] = useState<Note[]>([
    //     {
    //         id: 0,
    //         title: "Bio Midterm",
    //         content: "Study mitochondria and how powerful its house is",
    //         position: {x: 0, y: 0, z: 0}
    //     },
    //     {id: 1, title: "Calc Midterm", content: "Find the integral of my grocery list", position: {x: 0, y: 0, z: 0}},
    //     {
    //         id: 2,
    //         title: "Make Presentation",
    //         content: "My group didn't even make a slide deck",
    //         position: {x: 0, y: 0, z: 0}
    //     }
    // ]);
    const [notes, setNotes] = useState<Note[]>([]);

    // Function to determine the note that is editable & overlayed
    const [activeNote, setActiveNote] = useState<Note | null>(null);

    useEffect(() => {
        async function loadNotes() {
            try {
                const notesFromDB = await getNotes();

                const formatted = notesFromDB.map((n: any) => ({
                    id: n.id,
                    title: n.title,
                    content: n.text,
                    position: {
                        x: n.posX,
                        y: n.posY,
                        z: n.posZ
                    }
                }));

                setNotes(formatted);

            } catch (error) {
                console.error("Failed to load notes", error);
            }
        }

        loadNotes();
    }, []);

    // Prop method passed down to Editable sticky note to edit title and content (StickyNote.tsx)
    const updateNote = (title: string, content: string) => {
        setActiveNote(prev =>
            prev ? {...prev, title, content} : prev
        );
    };

    const handleSendNote = async () => {
        if (!activeNote) return;
        await sendNote(activeNote);
    };

    const handleSaveNote = async () => {
        if (!activeNote) return;

        try {
            const saved = await saveNote(activeNote);

            const formatted = {
                id: saved.id,
                title: saved.title,
                content: saved.text,
                position: {
                    x: saved.posX,
                    y: saved.posY,
                    z: saved.posZ
                }
            };

            setNotes(prev => {
                const other = prev.filter(n => n.id !== formatted.id);
                return [...other, formatted];
            });

            setActiveNote(null);

        } catch (err) {
            console.error("Failed to save note", err);
        }
    };

    const handleCancelNote = () => {
        setActiveNote(null);
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
                            title: "",
                            content: "",
                            position: {x: 0, y: 0, z: 0}
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
                <StickyNoteOverlay
                    note={activeNote}
                    onChange={updateNote}
                    onSave={handleSaveNote}
                    onCancel={handleCancelNote}
                />
            )}

        </PageWrapper>
    );
}