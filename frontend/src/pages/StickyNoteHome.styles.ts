import StickyNoteContainer from "../components/stickyNoteComponents/StickyNoteContainer";
import StickyNote from "../components/stickyNoteComponents/StickyNote";
import styled from "styled-components";
import {Link} from "react-router-dom";

export const PageTitle = styled.h1`
    text-align: center;
    text-decoration: underline;
    margin: 0 auto;
`
export const StyledStickyNoteContainer = styled(StickyNoteContainer)`
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    padding: 40px;
    border: 2px solid black;
    min-height: 60vh;
`;

export const PageWrapper = styled.div`
  min-height: 100vh;

  display: flex;
  flex-direction: column;

  align-items: center;   /* horizontal center */
`;

export const NotesAndButtonsLayout = styled.div`
    display: flex;
    width: 100%;
    min-height: 60vh;
    align-items: flex-start;
    gap: 20px;
`;

export const NotesBoard = styled.div`
    flex: 9;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: flex-start;

    gap: 30px;
    padding: 2rem 0.5rem;
    border: 1px dashed black;
`;

export const ActionColumn = styled.div`
    flex: 1;
    display: flex; 
    flex-direction: column;
    align-items: center; 
    justify-content: space-between;

    min-height: 60vh;

    padding: 2rem 0;
`

export const Overlay = styled.div`
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

export const StyledButton = styled(Link)`
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

export const StyledAddStickyNoteButton = styled.button`
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

export const ExpandedStickyNote = styled(StickyNote)`
  transform: scale(1.4);
  
  width: clamp(320px, 45vw, 600px);
  height: auto;

  transition: transform 0.2s ease;
`;

export const AddAndSelectWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;

  width: 100%;
  margin: 20px 0;
`;

export const OverlayButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
`;

export const SaveButton = styled.button`
  padding: 10px 18px;
  font-size: 1rem;
`;

export const CancelButton = styled.button`
  padding: 10px 18px;
  font-size: 1rem;
`;

export const DeleteButton = styled.button`
  padding: 10px 18px;
  font-size: 1rem;
`;