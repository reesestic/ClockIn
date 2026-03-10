import StickyNoteContainer from "../components/stickyNoteComponents/StickyNoteContainer";
import StickyNoteEditable from "../components/stickyNoteComponents/StickyNoteEditable";
import styled from "styled-components";
import { BackButton } from "../components/navigation/BackButton";
import HomepageBlankIcon from "../components/icons/HomepageBlankIcon";


export const PageBackButton = styled(BackButton)`
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
`;

export const PageTitle = styled.h1`
    text-align: center;
    font-size: clamp(0.8rem, 3rem, 4rem);
    margin: 2rem 0 0rem;
    color: white;
`
export const StyledStickyNoteContainer = styled(StickyNoteContainer)`
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    padding: 40px;
    min-height: 60vh;
`;


export const PageWrapper = styled.div`
    min-height: 100vh;
    
    display: flex;
    flex-direction: column;
    align-items: center;
`;

export const NotesAndButtonsLayout = styled.div`
    display: flex;
    width: 100%;
    min-height: 60vh;
    align-items: flex-start;
    gap: 20px;
`;

export const NotesBoard = styled.div`
    flex: 7;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: flex-start;

    gap: 30px;
    padding: 2rem 0.5rem;
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

export const ExpandedStickyNote = styled(StickyNoteEditable)`
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

export const Background = styled(HomepageBlankIcon)`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -2;
`;

export const BackgroundOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: -1;
`;