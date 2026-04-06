import styled from "styled-components";
import TaskBookIcon from "../icons/TaskBookIcon";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/Routes";

const StyledLink = styled(Link)`
    display: contents;
`

const StyledTaskBook= styled(TaskBookIcon)`
    position: absolute;
    cursor: pointer;
    left: 18%;
    top: 75%;
    width: 20%;
    transform: scale(1.7);
    
`

export default function TaskBookObject() {
    return (
        <StyledLink to={ROUTES.TASKS}>
            <StyledTaskBook />
        </StyledLink>
    )
}