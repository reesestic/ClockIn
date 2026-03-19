import styled from "styled-components"
import PlannerIcon from "../icons/PlannerIcon"
import {Link} from "react-router-dom";
import {ROUTES} from "../../constants/Routes.ts";

const StyledPlanner = styled(PlannerIcon)`
    position: absolute;
    width: 17%;
    top: 60%;
    left: 55%;
`

const StyledLink = styled(Link)`
    position: absolute;
    width: 75%;
    top: 60%;
    left: 25%;
`;

export default function PlannerObject() {
    return (
        <StyledLink to={ROUTES.TASKS}>
            <StyledPlanner />
        </StyledLink>
    )
}