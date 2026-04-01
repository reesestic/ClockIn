import styled from "styled-components";
import CalendarIcon from "../icons/CalendarIcon.tsx";

const Wrapper = styled.div<{ $hovered: boolean }>`
    width: 64px;
    height: 64px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 14px;

    transition: all 0.2s ease;

    background: ${({ $hovered }) =>
    $hovered ? "rgba(59,130,246,0.15)" : "transparent"};

    box-shadow: ${({ $hovered }) =>
    $hovered ? "0 0 20px rgba(59,130,246,0.4)" : "none"};

    transform: ${({ $hovered }) =>
    $hovered ? "scale(1.08)" : "scale(1)"};
`;

type Props = {
    isHovered: boolean;
};

export default function CalendarDropZone({ isHovered }: Props) {
    return (
        <Wrapper $hovered={isHovered}>
            <CalendarIcon/>
        </Wrapper>
    );
}