import styled from "styled-components"
import PlannerIcon from "../icons/PlannerIcon"

const StyledPlanner = styled(PlannerIcon)`
    position: absolute;
    width: 17%;

    
    top: 60%;
    left: 55%;
`

export default function PlannerObject() {
    return <StyledPlanner />
}