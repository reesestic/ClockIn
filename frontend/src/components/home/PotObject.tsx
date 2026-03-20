import styled from "styled-components"
import PotIcon from "../icons/PotIcon"

const StyledPot = styled(PotIcon)`
    position: absolute;
    width: 8%;

    top: 5.8%;
    left: 13%;
`

export default function PotObject() {
    return <StyledPot />
}