import styled from "styled-components"
import ClockIcon from "../icons/ClockIcon"

const StyledClock = styled(ClockIcon)`
    position: absolute;
    width: 13%;


    top: 77%;
    left: 75%;
`

export default function ClockObject() {
    return <StyledClock />
}