import styled from "styled-components";
import type { ScheduleBlock } from "../../types/ScheduleBlock";

const BlockWrapper = styled.div<{ $clickable: boolean; $color?: string }>`
    position: absolute; /* 🔥 needed for timeline positioning later */

    left: 8px;
    right: 8px;

    border-radius: 12px;
    padding: 0.5rem 1rem 3rem 1rem;

    background: ${({ $color }) => $color || "#6366f1"};
    color: white;

    cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};

    box-shadow: 0 4px 12px rgba(0,0,0,0.15);

    transition: all 0.15s ease;

    &:hover {
        transform: ${({ $clickable }) => ($clickable ? "scale(1.02)" : "none")};
        box-shadow: ${({ $clickable }) =>
                $clickable ? "0 6px 16px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.15)"};
    }
`;

const Title = styled.div`
    font-weight: 600;
    font-size: 0.9rem;
`;

const Time = styled.div`
    font-size: 0.7rem;
    opacity: 0.9;
    margin-top: 2px;
`;

type Props = {
    block: ScheduleBlock;
    onClick?: () => void;
};

export default function ScheduleBlock({ block, onClick }: Props) {

    function getPosition(start: string, end: string) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
        const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

        const duration = endMinutes - startMinutes;

        const pixelsPerMinute = 50 / 60; // 80px per hour (matches Row height)

        return {
            top: startMinutes * pixelsPerMinute,
            height: duration * pixelsPerMinute,
        };
    }
    const { top, height } = getPosition(block.start, block.end);

    function formatTime(iso: string) {
        const date = new Date(iso);

        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    return (
        <BlockWrapper
            $clickable={!!onClick}
            $color={block.color}
            onClick={onClick}
            style={{
                top,
                height,
            }}
        >
            <Title>{block.title}</Title>
            <Time>
                {formatTime(block.start)} – {formatTime(block.end)}
            </Time>
        </BlockWrapper>
    );
}