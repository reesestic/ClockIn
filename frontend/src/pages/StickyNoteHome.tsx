import StickyNoteContainer from "./stickyNoteComponents/StickyNoteContainer.tsx";
import styled from "styled-components";

const PageTitle = styled.h1`
    text-align: center;
    text-decoration: underline;
`
const StyledStickyNoteContainer = styled(StickyNoteContainer)`
    
`
export default function StickyNoteHome() {

    return (
        <>
            <PageTitle>Your Tasks Silly!</PageTitle>

            {/*COLUMN 1*/}
            {/*<StyledAddStickyNoteButton />*/}

            {/*COLUMN 2*/}
            <StyledStickyNoteContainer />

            {/*COLUMN 3*/}
            {/*<StyledSendStickyNoteButton />*/}
            {/*<StyledDeleteStickyNoteButton />*/}
        </>
    );
}