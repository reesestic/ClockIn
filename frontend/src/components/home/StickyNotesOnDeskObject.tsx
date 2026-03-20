import styled from "styled-components";
import { Link } from "react-router-dom";
import StickyNotesOnDeskIcon from "../icons/StickyNotesOnDeskIcon";
import { ROUTES } from "../../constants/Routes";

const StyledLink = styled(Link)`
    position: absolute;
    bottom: 5%;
    left: 10%;
    width: 20%;
    display: block;
`;

const StyledStickyNotes = styled(StickyNotesOnDeskIcon)`
    width: 100%;
    height: auto;
`

export default function StickyNotesOnDeskObject() {
    return (
        <StyledLink to={ROUTES.STICKY_NOTES}>
            <StyledStickyNotes />
        </StyledLink>
    );
}