import styled from "styled-components"
import PotIcon from "../icons/PotIcon"
import {ROUTES} from "../../constants/Routes.ts";
import {Link} from "react-router-dom";

const Wrapper = styled.div`
    position: absolute;
    width: 8%;
    top: 5%;
    left: 72%;
    transform: scale(2);

    & * {
        pointer-events: none;
    }

    &:hover::after {
        content: "Garden";
        position: absolute;

        top: 105%;          /* place below */
        left: 50%;          /* center anchor */
        transform: translateX(-50%);

        background: white;
        color: #4B94DB;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;

        box-shadow:
                0 0 8px rgba(255, 255, 255, 1),
                0 0 16px rgba(255, 255, 255, 0.9),
                0 0 32px rgba(255, 255, 255, 0.7),
                0 2px 8px rgba(0, 0, 0, 0.15);

        z-index: 1000;
    }
`;

const StyledPot = styled(PotIcon)`
    width: 100%;
    height: auto;
    display: block;
`;

const StyledLink = styled(Link)`
    position: absolute;
    inset: 0;
    cursor: pointer;
    z-index: 100;
    pointer-events: all;
`;

export default function PotObject() {
    return (
        <Wrapper data-tutorial="pot">
            <StyledPot />
            <StyledLink to={ROUTES.GARDEN} />
        </Wrapper>
    );
}