import styled from "styled-components"
import PotIcon from "../icons/PotIcon"

const StyledPot = styled(PotIcon)`
    position: absolute;
    width: 8%;
    top: 5%;
    left: 72%;
    transform: scale(2);/* was 13% — pot is on the right shelf */
`;

export default function PotObject() {
    return <StyledPot />
}