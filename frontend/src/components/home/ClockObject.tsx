import styled from "styled-components";
import ClockIcon from "../icons/ClockIcon";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/Routes";

const StyledClock = styled(ClockIcon)`
    position: absolute;
    width: 13%;
    top: 77%;
    left: 75%;
    cursor: pointer;
`;

const StyledLink = styled(Link)`
    display: contents; /* keeps layout EXACTLY the same */
`;

export default function ClockObject() {
    return (
        <StyledLink to={ROUTES.TIMER}>
            <StyledClock />
        </StyledLink>
    );
}