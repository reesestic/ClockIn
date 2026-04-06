import styled from "styled-components";
import { Link } from "react-router-dom";
import StickyNotesOnDeskIcon from "../icons/StickyNotesOnDeskIcon";
import { ROUTES } from "../../constants/Routes";

const StyledLink = styled(Link)`
    position: absolute;
    top: 10%;
    left: 35%;
    width: 28%;
    display: block;
    transform: scale(0.7);
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