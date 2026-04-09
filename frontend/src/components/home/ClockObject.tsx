import styled from "styled-components";
import ClockIcon from "../icons/ClockIcon";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/Routes";

const StyledClock = styled(ClockIcon)`
    position: absolute;
    width: 13%;
    top: 55%;
    left: 11%;   /* was left: 75% — clock is bottom-left */
    cursor: pointer;
    transform: scale(1.2);
`;

const StyledLink = styled(Link)`
    display: contents; /* keeps layout EXACTLY the same */
`;

export default function ClockObject() {
    return (
        <StyledLink to={ROUTES.TIMER_ENTRY_PAGE}>
            <StyledClock />
        </StyledLink>
    );
}