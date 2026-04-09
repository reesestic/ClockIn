import styled, { keyframes } from "styled-components";
import CalendarIcon from "../icons/CalendarIcon.tsx";

const rippleFast = keyframes`
    0%   { transform: scale(1);    opacity: 0.5; }
    100% { transform: scale(2.2);  opacity: 0;   }
`;

const rippleSlow = keyframes`
    0%   { transform: scale(1);    opacity: 0.4; }
    100% { transform: scale(2.2);  opacity: 0;   }
`;

const ICON_SIZE = 90;
const INNER_SIZE = ICON_SIZE * 1.1;   // just barely covers the icon
const OUTER_SIZE = INNER_SIZE * 0.95;  // 90% bigger than inner

const Wrapper = styled.div`
    position: relative;
    width: ${OUTER_SIZE}px;
    height: ${OUTER_SIZE}px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: ${ICON_SIZE}px;
        height: ${ICON_SIZE}px;
        position: relative;
        z-index: 1;
    }
`;

const Ring = styled.div<{ $visible: boolean; $size: number; $duration: string }>`
    position: absolute;
    width: ${({ $size }) => $size}px;
    height: ${({ $size }) => $size}px;
    border-radius: 50%;
    background: ${({ $duration }) =>
            $duration === "slow"
                    ? "rgba(255, 255, 255, 0.38)"   // inner — slightly brighter
                    : "rgba(255, 255, 255, 0.25)"}; // outer — as specified
    animation: ${({ $duration }) => $duration === "fast" ? rippleFast : rippleSlow}
    ${({ $duration }) => $duration === "fast" ? "1.2s" : "1.8s"}
    ease-out infinite;
    animation-play-state: ${({ $visible }) => ($visible ? "running" : "paused")};
    visibility: ${({ $visible }) => ($visible ? "visible" : "hidden")};  /* ← fixes always-visible bug */
    z-index: 0;
`;

type Props = { isHovered: boolean };

export default function CalendarDropZone({ isHovered }: Props) {
    return (
        <Wrapper>
            <Ring $visible={isHovered} $size={OUTER_SIZE} $duration="fast" />
            <Ring $visible={isHovered} $size={INNER_SIZE} $duration="slow" />
            <CalendarIcon />
        </Wrapper>
    );
}