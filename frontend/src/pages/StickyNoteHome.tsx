//import styled from "styled-components";
//import {Link} from "react-router-dom";
import { ROUTES } from "../constants/Routes";

import { useState, useEffect } from "react";
import { sendNote, saveNote, deleteNote, getNotes, changeColor } from "../api/stickyNoteApi.ts";
import type {Note} from "../types/Note";

import {
    PageTitle, StyledStickyNoteContainer, PageWrapper, NotesAndButtonsLayout,
    NotesBoard, ActionColumn, AddAndSelectWrapper, PageBackButton,
    Background, BackgroundOverlay
} from "./StickyNoteHome.styles";

import StickyNoteOverlay from "../components/stickyNoteComponents/StickyNoteOverlay";
import { AddButton } from "../components/navigation/AddButton";
import {CalendarDropZone} from "../components/navigation/CalendarDropZone.tsx";
import {TrashDropZone} from "../components/navigation/TrashDropZone";
import type {StickyNoteColor} from "../types/StickyNoteThemes.ts";

export function StickyNoteHome() {

    const [notes, setNotes] = useState<Note[]>([]);

    // Function to determine the note that is editable & overlayed
    const [activeNote, setActiveNote] = useState<Note | null>(null);

    useEffect(() => {
        async function loadNotes() {
            try {
                // check normalization in StickyNoteServices to find syntax
                const normalizedNotesFromDB = await getNotes();
                console.log(normalizedNotesFromDB);
                setNotes(normalizedNotesFromDB);

            } catch (error) {
                console.error("Failed to load notes", error);
            }
        }

        loadNotes();
    }, []);

    // Prop method passed down to Editable sticky note to edit title and content (StickyNoteEditable.tsx)
    const updateNote = (title: string, content: string) => {
        setActiveNote(prev =>
            prev ? {...prev, title, content} : prev
        );
    };

    const handleSendNote = async () => {
        if (!activeNote?.id) return;

        await sendNote(activeNote.id);
    };

    const handleDeleteNote = async () => {
        if (!activeNote?.id) return;

        const result = await deleteNote(activeNote.id);

        setNotes(prev =>
            prev.filter(n => n.id !== result.deleted_id)
        );

        setActiveNote(null);
    };

    const handleSaveNote = async () => {
        if (!activeNote) return;

        try {
            const normalizedNote = await saveNote(activeNote);

            setNotes(prev => {
                const other = prev.filter(n => n.id !== normalizedNote.id);
                return [...other, normalizedNote];
            });

            setActiveNote(null);

        } catch (err) {
            console.error("Failed to save note", err);
        }
    };

    const handleCancelNote = () => {
        setActiveNote(null);
    };

    const handleColorChange = async (noteId: string, color: StickyNoteColor) => {

        setNotes(prev =>
            prev.map(n =>
                n.id === noteId
                    ? { ...n, color }
                    : n
            )
        );

        // update the open editable note
        setActiveNote(prev =>
            prev && prev.id === noteId
                ? { ...prev, color }
                : prev
        );

        if (!noteId) {
            console.warn("No noteId — skipping backend call");
            return;
        }

        try {
            await changeColor(noteId, color);
        } catch (error) {
            console.error("Failed to update color", error);
        }

    };

    return (
        <>
            <Background />
            <BackgroundOverlay />

            <PageWrapper>

                <PageBackButton to={ROUTES.HOME} label="Home" />

                <PageTitle>Your Sticky Notes</PageTitle>

                <AddAndSelectWrapper>
                    <AddButton
                        label="New Note"
                        onClick={() =>
                            setActiveNote({
                                title: "",
                                content: "",
                                color: "yellow",
                                position: { x: 0, y: 0, z: 0 }
                            })}
                    />
                    {/*Commenting out select until later*/}
                    {/*<button>Select</button>*/}
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
                        <CalendarDropZone/>
                        <TrashDropZone/>
                    </ActionColumn>
                </NotesAndButtonsLayout>

                {activeNote && (
                    <StickyNoteOverlay
                        note={activeNote}
                        onChange={updateNote}
                        onSave={handleSaveNote}
                        onCancel={handleCancelNote}
                        onDelete={handleDeleteNote}
                        onColorChange={handleColorChange}
                    />
                )}

            </PageWrapper>
        </>
    );
}