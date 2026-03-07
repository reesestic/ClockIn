import styled from "styled-components";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants/Routes";

const DivWrapper = styled.div`
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
`;
const StyledButton = styled(Link)`
    display: inline-block;
    width: 300px;
    height: 50px;
    background-color: black;
    color: white;
    border: 2px solid white;
    text-align: center;
    line-height: 50px;
    text-decoration: none;
`;

export default function Home() {
    return (
        <DivWrapper>
            <StyledButton to={ROUTES.STICKY_NOTES}>
                Open Sticky Notes
            </StyledButton>

            <p> Open Tasks (?? Not in yet) </p>
        </DivWrapper>
    );
}