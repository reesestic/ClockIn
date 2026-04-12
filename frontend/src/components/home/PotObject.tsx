import styled from "styled-components"
import PotIcon from "../icons/PotIcon"

const Wrapper = styled.div`
    position: absolute;
    width: 8%;
    top: 5%;
    left: 72%;
    transform: scale(2);
`;

const StyledPot = styled(PotIcon)`
    width: 100%;
    height: auto;
    display: block;
`;

export default function PotObject() {
    return (
        <Wrapper data-tutorial="pot">
            <StyledPot />
        </Wrapper>
    );
}