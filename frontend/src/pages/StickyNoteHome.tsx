import { ROUTES } from "../constants/Routes";

import { useState, useEffect, useRef, useCallback } from "react";
import { sendNote, saveNote, deleteNote, getNotes, changeColor, updateNotePosition } from "../api/stickyNoteApi.ts";
import type {Note} from "../types/Note";

import {
    PageTitle, PageWrapper, NotesAndButtonsLayout,
    NotesBoard, ActionColumn, AddAndSelectWrapper, PageBackButton,
    Background, BackgroundOverlay
} from "./StickyNoteHome.styles";

import StickyNoteOverlay from "../components/stickyNoteComponents/StickyNoteOverlay";
import { AddButton } from "../components/navigation/AddButton";
import type {StickyNoteColor} from "../types/StickyNoteThemes.ts";
import DraggableStickyNote from "../components/stickyNoteComponents/DraggableStickyNote.tsx";
import DeleteConfirmModal from "../components/modal/DeleteConfirmModal.tsx";
import CalendarDropZone from "../components/dropzones/CalendarDropZone.tsx";
import TrashDropZone from "../components/dropzones/TrashDropZone.tsx";

//import {CalendarDropZone} from "../components/navigation/CalendarDropZone.tsx";
// import {TrashDropZone} from "../components/navigation/TrashDropZone";

// Claude start
// ─── Default grid placement for notes with no saved position ─────────────────
const NOTE_SIZE = 220;
const GRID_COLS = 3;
const GRID_PAD = 30;
const GRID_GAP = 24;
const DROP_RADIUS = 60;

function defaultPosition(index: number) {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    return {
        x: GRID_PAD + col * (NOTE_SIZE + GRID_GAP),
        y: GRID_PAD + row * (NOTE_SIZE + GRID_GAP),
    };
}


// ─── Types ────────────────────────────────────────────────────────────────────
type PendingDrop = { note: Note; zone: "trash" | "calendar" } | null;

// ─── Component ────────────────────────────────────────────────────────────────
export function StickyNoteHome() {

    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [pendingDrop, setPendingDrop] = useState<PendingDrop>(null);
    const [hoveredZone, setHoveredZone] = useState<"calendar" | "trash" | null>(null);

    // boardRef = the left notes column (drag is constrained to this)
    const boardRef = useRef<HTMLDivElement>(null);
    // These measure the action column icons so we know their centers
    const calendarRef = useRef<HTMLDivElement>(null);
    const trashRef = useRef<HTMLDivElement>(null);
    const numberOfNotes = notes.length;

    // Drop zones are measured relative to the board so DraggableStickyNote
    // can compare note position (also board-relative) against them directly.
    const [dropZones, setDropZones] = useState<
        Array<{ id: string; x: number; y: number; radius: number }>
    >([]);

    // ── Measure drop zone centers relative to the board ──────────────────────
    const recomputeZones = useCallback(() => {
        if (!boardRef.current || !calendarRef.current || !trashRef.current) return;
        const boardRect = boardRef.current.getBoundingClientRect();
        const calRect = calendarRef.current.getBoundingClientRect();
        const trashRect = trashRef.current.getBoundingClientRect();

        setDropZones([
            {
                id: "calendar",
                x: calRect.left + calRect.width / 2 - boardRect.left,
                y: calRect.top + calRect.height / 2 - boardRect.top,
                radius: DROP_RADIUS,
            },
            {
                id: "trash",
                x: trashRect.left + trashRect.width / 2 - boardRect.left,
                y: trashRect.top + trashRect.height / 2 - boardRect.top,
                radius: DROP_RADIUS,
            },
        ]);
    }, []);

    useEffect(() => {
        const t = setTimeout(recomputeZones, 50);
        window.addEventListener("resize", recomputeZones);
        return () => {
            clearTimeout(t);
            window.removeEventListener("resize", recomputeZones);
        };
    }, [recomputeZones]);

    // ── Listen for hovered zone events to glow the icons ────────────────────
    useEffect(() => {
        const handler = (e: CustomEvent<{ zoneId: string | null }>) => {
            setHoveredZone(e.detail.zoneId as "calendar" | "trash" | null);
        };
        window.addEventListener("noteHoverZone" as any, handler);
        return () => window.removeEventListener("noteHoverZone" as any, handler);
    }, []);

    // Claude end

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

    // ── Notes with guaranteed positions (fallback grid for new/unpositioned) ─ CLAUDE
    const notesWithPositions = notes.map((note, i) => ({
        ...note,
        position: {
            x: note.position?.x ?? defaultPosition(i).x,
            y: note.position?.y ?? defaultPosition(i).y,
            z: note.position?.z ?? i + 1,
        },
    }));

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

    // Claude until return
    // Drag released inside board → persist new position

    const handleDragEnd = useCallback(async (noteId: string, x: number, y: number) => {
        let newZ = 1;
        setNotes(prev => {
            const maxZ = Math.max(...prev.map(n => n.position?.z ?? 1));
            newZ = maxZ + 1;

            return prev.map(n =>
                n.id === noteId
                    ? { ...n, position: { x: Math.round(x), y: Math.round(y), z: newZ } }
                    : n
            );
        });

        try {
            await updateNotePosition(noteId, Math.floor(x), Math.floor(y), newZ);
        } catch (err) {
            console.error(err);
        }
    }, []); // Remvoed notes dependency

    // ── Drop zone release ─────────────────────────────────────────────────────
    const handleDropZoneRelease = useCallback((zoneId: string, note: Note) => {
        setPendingDrop({ note, zone: zoneId as "trash" | "calendar" });
    }, []);

    const confirmTrashDrop = async () => {
        if (!pendingDrop?.note.id) return;

        const result = await deleteNote(pendingDrop.note.id);

        setNotes(prev =>
            prev.filter(n => n.id !== result.deleted_id)
        );

        setPendingDrop(null);
    };

    const confirmCalendarDrop = async () => {
        if (!pendingDrop) return;
        try {
            await sendNote(pendingDrop.note.id!);
        } catch (err) {
            console.error("Failed to send note to planner", err);
        }
        setNotes(prev => prev.filter(n => n.id !== pendingDrop.note.id));
        setPendingDrop(null);
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
                                position: {
                                    x: defaultPosition(numberOfNotes).x,
                                    y: defaultPosition(numberOfNotes).y,
                                    z: numberOfNotes + 1
                                }
                            })}
                    />
                    {/*Commenting out select until later*/}
                    {/*<button>Select</button>*/}
                </AddAndSelectWrapper>

                {/*// notes board changed*/}
                <NotesAndButtonsLayout>
                    <NotesBoard ref={boardRef}>
                        {notesWithPositions.map((note) => (
                            <DraggableStickyNote
                                key={note.id}
                                note={note}
                                boardRef={boardRef}
                                dropZones={dropZones}
                                onDragEnd={handleDragEnd}
                                onNoteClick={setActiveNote}
                                onDropZoneRelease={handleDropZoneRelease}
                            />
                        ))}
                    </NotesBoard>

                    <ActionColumn>
                        <div ref={calendarRef} style={{ display: "inline-flex" }}>
                            <CalendarDropZone isHovered={hoveredZone === "calendar"} />
                        </div>
                        <div ref={trashRef} style={{ display: "inline-flex" }}>
                            <TrashDropZone isHovered={hoveredZone === "trash"} />
                        </div>
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

                {/* ── Trash drop confirm ───────────────────────────────────── */}
                {pendingDrop?.zone === "trash" && (
                    <DeleteConfirmModal
                        noteTitle={pendingDrop.note.title}
                        onConfirm={confirmTrashDrop}
                        onCancel={() => setPendingDrop(null)}
                    />
                )}

                {/* ── Calendar drop confirm ────────────────────────────────── */}
                {pendingDrop?.zone === "calendar" && (
                    <DeleteConfirmModal
                        noteTitle={`Send "${pendingDrop.note.title}" to your planner?`}
                        onConfirm={confirmCalendarDrop}
                        onCancel={() => setPendingDrop(null)}
                    />
                )}

            </PageWrapper>
        </>
    );
}