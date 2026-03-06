import StickyNoteContainer from "../components/stickyNoteComponents/StickyNoteContainer";
import StickyNote from "../components/stickyNoteComponents/StickyNote";
import styled from "styled-components";
import {Link} from "react-router-dom";

import { useState } from "react";
import type { Note } from "../types/Note";

const PageTitle = styled.h1`
    text-align: center;
    text-decoration: underline;
    margin: 0 auto;
`
const StyledStickyNoteContainer = styled(StickyNoteContainer)`
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    padding: 40px;
    border: 2px solid black;
    min-height: 60vh;
`;

const PageWrapper = styled.div`
  min-height: 100vh;

  display: flex;
  flex-direction: column;

  align-items: center;   /* horizontal center */
`;

const NotesAndButtonsLayout = styled.div`
    display: flex;
    width: 100%;
    min-height: 60vh;
    align-items: flex-start;
    gap: 20px;
`;

const NotesBoard = styled.div`
    flex: 4;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: flex-start;

    gap: 30px;
    padding: 40px;
    border: 2px solid black;
`;

const ActionColumn = styled.div`
    flex: 1;
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    gap: 20px;
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;

    height: 100vh;
    width: 50vw;

    background: rgba(0,0,0,0.5);

    display: flex;
    justify-content: center;
    align-items: center;
    
    z-index: 1000;
`;

const StyledButton = styled(Link)`
    display: inline-block;
    width: 300px;
    height: 50px;
    background-color: black;
    color: white;
    border: 2px solid white;
    text-align: center;
    line-height: 50px;
    text-decoration: none;
    position: absolute;
    top: 5px;
    left: 5px;
`;

const StyledAddStickyNoteButton = styled.button`
    display: inline-block;
    width: 50px;
    height: 50px;
    background-color: orange;
    color: black;
    font-size: clamp(0.5vw, 1.3vw, 2.5vw);
    border: 2px solid black;
    text-align: center;
    text-decoration: none;
    border-radius: 50%;
`;

const ExpandedStickyNote = styled(StickyNote)`
  transform: scale(1.4);
  
  width: clamp(320px, 45vw, 600px);
  height: auto;

  transition: transform 0.2s ease;
`;

const AddAndSelectWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;

  width: 100%;
  margin: 20px 0;
`;

export default function StickyNoteHome() {

    const [notes, setNotes] = useState<Note[]>([
        { id: 0, title: "Bio Midterm", content: "bitch i need to study!!" },
        { id: 1, title: "Calc Midterm", content: "bitch i need to study MORE!!" },
        { id: 2, title: "pOP MY Pussy Midterm", content: "bitch i need to POP MY PUSSY!!" }
    ]);

    const [activeNote, setActiveNote] = useState<Note | null>(null);

    const updateNote = (id: number, title: string, content: string) => {
        setNotes(prev =>
            prev.map(note =>
                note.id === id ? { ...note, title, content } : note
            )
        );
    };

    const handleSendNote = async () => {
        if (!activeNote) return;

        try {
            console.log(" Active Note: ", activeNote);
            const response = await fetch("http://localhost:8000/sticky-notes/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(activeNote)
            });

            const data = await response.json();
            console.log("Note saved:", data);

        } catch (error) {
            console.error("Error sending note:", error);
        }
    };

    return (
        <PageWrapper>
            <StyledButton to="/">
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