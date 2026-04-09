import { ROUTES } from "../constants/Routes";

import { useState, useEffect, useRef, useCallback } from "react";
import {saveNote, deleteNote, getNotes, changeColor, noteToTask, sendTasksToList, updateNotePosition } from "../api/stickyNoteApi.ts";
import type {Note} from "../types/Note";
import type {Task} from "../types/Task";
import BackButton from "../components/navigation/BackButton.tsx";


import {
    PageTitle, PageWrapper, NotesAndButtonsLayout,
    NotesBoard, ActionColumn, AddAndSelectWrapper,
    Background, BackgroundOverlay
} from "./StickyNoteHome.styles";

import StickyNoteOverlay from "../components/stickyNoteComponents/StickyNoteOverlay";
import { AddButton } from "../components/navigation/AddButton";
import DraggableStickyNote from "../components/stickyNoteComponents/DraggableStickyNote.tsx";
import DeleteConfirmModal from "../components/modal/DeleteConfirmModal.tsx";
import CalendarDropZone from "../components/dropzones/CalendarDropZone.tsx";
import TrashDropZone from "../components/dropzones/TrashDropZone.tsx";
import type {StickyNoteColor} from "../types/StickyNoteThemes.ts";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";


// Code for drag/drop
// ─── Default grid placement for notes with no saved position ─────────────────
const NOTE_SIZE = 220;
const GRID_COLS = 3;
const GRID_PAD = 30;
const GRID_GAP = 24;
const DROP_RADIUS = 120;

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


// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

// ─── Modal Styled Components ───────────────────────────────────────────────────

const ModalBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: ${fadeIn} 0.2s ease;
`;

const ModalCard = styled.div`
    background: #fffdf5;
    border-radius: 16px;
    padding: 32px;
    width: min(600px, 90vw);
    max-height: 85vh;
    overflow-y: auto;
    box-shadow:
            0 4px 6px rgba(0,0,0,0.05),
            0 20px 60px rgba(0,0,0,0.18);
    animation: ${slideUp} 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const ModalTitle = styled.h2`
    font-size: 1.25rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
    letter-spacing: -0.02em;
`;

const ModalSubtitle = styled.p`
    font-size: 0.875rem;
    color: #888;
    margin: 8px 0 0;
`;

const TaskList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ModalActions = styled.div`
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 4px;
`;

const ConfirmButton = styled.button<{ disabled?: boolean }>`
    background: ${p => p.disabled ? "#ccc" : "#1a1a1a"};
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 22px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: ${p => p.disabled ? "not-allowed" : "pointer"};
    transition: background 0.15s, transform 0.1s;

    &:hover {
        background: ${p => p.disabled ? "#ccc" : "#333"};
        transform: ${p => p.disabled ? "none" : "translateY(-1px)"};
    }

    &:active {
        transform: translateY(0);
    }
`;

const CancelButton = styled.button`
    background: transparent;
    color: #888;
    border: 1.5px solid #e8e4d8;
    border-radius: 8px;
    padding: 10px 22px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;

    &:hover {
        border-color: #bbb;
        color: #555;
    }
`;

const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border: 3px solid #f0ece0;
    border-top-color: #1a1a1a;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
    margin: 24px auto;
`;

// ─── Modal Task Editable Styled Components ─────────────────────────────────────
// Mirrors TaskEditable but stripped of checkbox, menu, collapse, and edit toggle

const TaskEditableContainer = styled.div`
    display: flex;
    flex-direction: column;
    border: 2px solid lightgray;
    box-shadow: -3px 3px 10px 0px #b5b5b5;
    background-color: white;
    border-radius: 4px;
`;

const TitleRow = styled.div<{ colorHex: string }>`
    display: flex;
    background-color: ${({ colorHex }) => colorHex};
    width: 100%;
`;

const TitleInput = styled.input<{ colorHex: string }>`
    background-color: ${({ colorHex }) => colorHex};
    color: black;
    font-weight: bold;
    font-size: 1rem;
    border: none;
    outline: none;
    padding: 4px 6px;
    width: 100%;
    box-sizing: border-box;
    cursor: text;
`;

const CollapsedFieldContainer = styled.div`
    padding: 8px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-sizing: border-box;
`;

const DescriptionTextarea = styled.textarea`
    min-height: 48px;
    background-color: #ffffff;
    color: #636363;
    border: 1px solid transparent;
    resize: vertical;
    font-size: 0.9rem;
    padding: 4px 6px;
    width: 100%;
    box-sizing: border-box;
    cursor: text;
    font-family: inherit;

    &:focus {
        outline: 2px solid #d0d0d0;
        border-color: #d0d0d0;
    }
`;

const FieldRow = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px auto;
    width: 100%;
`;

const RatingHints = styled.div`
    display: flex;
    justify-content: space-between;
    width: 90px;
`;

const RatingHint = styled.span`
    font-size: 0.6rem;
    color: #bbb;
    font-style: italic;
`;


const FieldLabel = styled.label`
    font-size: 0.8rem;
    color: #888;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 80px;
`;

const FieldInput = styled.input`
    background-color: #ffffff;
    color: #636363;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    padding: 3px 6px;
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;
    cursor: text;

    &:focus {
        outline: 2px solid #d0d0d0;
    }
`;

const RadioGroup = styled.div`
    display: flex;
    gap: 6px;
    margin-top: 2px;
    justify-content: flex-start;
`;

const RadioOption = styled.button<{ selected: boolean }>`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid ${({ selected }) => (selected ? "#555" : "#ccc")};
    background-color: ${({ selected }) => (selected ? "#555" : "#fff")};
    color: ${({ selected }) => (selected ? "#fff" : "#888")};
    font-size: 0.8rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;

    &:hover {
        border-color: #555;
    }
`;

// Toast Styled Components
const ToastWrapper = styled.div`
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: #fff;
    border-radius: 12px;
    padding: 12px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    animation: ${slideUp} 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 2000;
    min-width: 220px;
    text-align: center;
`;

const ToastTop = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 600;
`;

const ToastLink = styled.button`
    background: none;
    border: none;
    color: #aaa;
    font-size: 0.8rem;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;

    &:hover { color: #fff; }
`;

// ─── Modal Task Editable Component ────────────────────────────────────────────

interface ModalTaskEditableProps {
    task: Task;
    onChange: (updated: Task) => void;
}

const colors: Record<string, string> = {
    red: "#FFAFB1",
    orange: "#F6C98A",
    yellow: "#FFF59A",
    green: "#C0E8AA",
    blue: "#AFDBFF",
    purple: "#C5AFFF",
    pink: "#FFC7E8",
};

const getColorHex = (colorName?: string) =>
    colors[colorName ?? "yellow"] ?? colors["yellow"];

function ModalTaskEditable({ task, onChange }: ModalTaskEditableProps) {
    const [local, setLocal] = useState<Task>({ ...task });
    const colorHex = getColorHex(local.color);

    const update = (fields: Partial<Task>) => {
        const updated = { ...local, ...fields };
        setLocal(updated);
        onChange(updated);
    };


    return (
        <TaskEditableContainer>
            <TitleRow colorHex={colorHex}>
                <TitleInput
                    colorHex={colorHex}
                    value={local.title}
                    onChange={e => update({ title: e.target.value })}
                    placeholder="Task title"
                />
            </TitleRow>

            <CollapsedFieldContainer>
                <DescriptionTextarea
                    value={local.description}
                    onChange={e => update({ description: e.target.value })}
                    placeholder="Description"
                />

                <FieldRow>
                    <FieldLabel>
                        Due Date
                        <FieldInput
                            type="date"
                            value={local.due_date ?? ""}
                            onChange={e => update({ due_date: e.target.value || null })}
                        />
                    </FieldLabel>

                    <FieldLabel>
                        Duration (min)
                        <FieldInput
                            type="number"
                            min={1}
                            value={local.task_duration ?? ""}
                            onChange={e => update({ task_duration: Number(e.target.value) })}
                            placeholder="e.g. 30"
                        />
                    </FieldLabel>
                </FieldRow>

                <FieldRow style={{ justifyContent: "flex-start" }}>
                    <FieldLabel style={{ flex: "none" , margin: "2%"}}>
                        Importance
                        <RadioGroup>
                            {[1, 2, 3].map(val => (
                                <RadioOption
                                    key={val}
                                    selected={local.importance === val}
                                    onClick={e => { e.stopPropagation(); update({ importance: val }); }}
                                    type="button"
                                >
                                    {val}
                                </RadioOption>
                            ))}
                        </RadioGroup>
                        <RatingHints>
                            <RatingHint>low</RatingHint>
                            <RatingHint>critical</RatingHint>
                        </RatingHints>
                    </FieldLabel>

                    <FieldLabel style={{ flex: "none", margin: "2%" }}>
                        Difficulty
                        <RadioGroup>
                            {[1, 2, 3].map(val => (
                                <RadioOption
                                    key={val}
                                    selected={local.difficulty === val}
                                    onClick={e => { e.stopPropagation(); update({ difficulty: val }); }}
                                    type="button"
                                >
                                    {val}
                                </RadioOption>
                            ))}
                        </RadioGroup>
                        <RatingHints>
                            <RatingHint>easy</RatingHint>
                            <RatingHint>hard</RatingHint>
                        </RatingHints>
                    </FieldLabel>
                </FieldRow>
            </CollapsedFieldContainer>
        </TaskEditableContainer>
    );
}

// ─── Task Confirmation Modal ───────────────────────────────────────────────────

interface TaskConfirmModalProps {
    tasks: Task[];
    isLoading: boolean;
    onUpdateTask: (index: number, updated: Task) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

function TaskConfirmModal({ tasks, isLoading, onUpdateTask, onConfirm, onCancel }: TaskConfirmModalProps) {
    return (
        <ModalBackdrop onClick={onCancel}>
            <ModalCard onClick={e => e.stopPropagation()}>
                <div>
                    <ModalTitle>Confirm Tasks</ModalTitle>
                    <ModalSubtitle>
                        {isLoading
                            ? "Extracting tasks from your note..."
                            : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} — edit before confirming`}
                    </ModalSubtitle>
                </div>

                {isLoading ? (
                    <Spinner />
                ) : (
                    <TaskList>
                        {tasks.map((task, i) => (
                            <ModalTaskEditable
                                key={i}
                                task={task}
                                onChange={updated => onUpdateTask(i, updated)}
                            />
                        ))}
                    </TaskList>
                )}

                <ModalActions>
                    <CancelButton onClick={onCancel}>Cancel</CancelButton>
                    <ConfirmButton onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? "Loading..." : "Add to List"}
                    </ConfirmButton>
                </ModalActions>
            </ModalCard>
        </ModalBackdrop>
    );
}


export function StickyNoteHome() {

    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [proposedTasks, setProposedTasks] = useState<Task[]>([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [pendingDrop, setPendingDrop] = useState<PendingDrop>(null);
    const [hoveredZone, setHoveredZone] = useState<"calendar" | "trash" | null>(null);

    // ── CHANGE: new state to track which note spawned the task modal ────────
    const [sourceNote, setSourceNote] = useState<Note | null>(null);

    const [toast, setToast] = useState<{ count: number } | null>(null);
    const navigate = useNavigate();



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

    // Replaces sendNote, called by confirmCalendarDrop
    const generateTasksFromNote = async (note: Note) => {
        if (!note?.id) return;

        setShowTaskModal(true);
        setIsLoadingTasks(true);
        setSourceNote(note); // remember which note to delete on confirm


        // follow noteToTask pipeline through abckend
        try {
            const tasks = await noteToTask(note.id);
            setProposedTasks(tasks);
        } catch (err) {
            console.error("Failed to generate tasks", err);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    const handleUpdateTask = (index: number, updated: Task) => {
        setProposedTasks(prev =>
            prev.map((task, i) => i === index ? updated : task)
        );
    };

    const handleConfirmTasks = async () => {
        const count = proposedTasks.length; // ← capture FIRST before clearing

        await sendTasksToList(proposedTasks);

        // Delete the original note only after the user confirms tasks
        if (sourceNote?.id) {
            await deleteNote(sourceNote.id);
            setNotes(prev => prev.filter(n => n.id !== sourceNote.id));
        }

        setShowTaskModal(false);
        setProposedTasks([]);
        setActiveNote(null);

        // ── show toast ──
        setToast({ count });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCancelTasks = () => {
        setShowTaskModal(false);
        setProposedTasks([]);
        setIsLoadingTasks(false);
        setSourceNote(null); // clear sourceNote
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
            prev && (prev.id === noteId || (!prev.id && !noteId))
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

        const note = pendingDrop.note;
        setPendingDrop(null); // close the "send to planner?" confirm modal

        await generateTasksFromNote(note); // pipeline starts here
    };

    return (
        <>
            <Background />
            <BackgroundOverlay />

            <PageWrapper>

                <BackButton to={ROUTES.HOME} style={{ color: "#eeeeee" }} />

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

                {showTaskModal && (
                    <TaskConfirmModal
                        tasks={proposedTasks}
                        isLoading={isLoadingTasks}
                        onUpdateTask={handleUpdateTask}
                        onConfirm={handleConfirmTasks}
                        onCancel={handleCancelTasks}
                    />
                )}

                {toast && (
                    <ToastWrapper>
                        <ToastTop>
                            ✓ Sent {toast.count} task{toast.count !== 1 ? "s" : ""} to Task List!
                        </ToastTop>
                        <ToastLink onClick={() => navigate(ROUTES.PLANNER)}>
                            View My Tasks
                        </ToastLink>
                    </ToastWrapper>
                )}

            </PageWrapper>
        </>
    );
}