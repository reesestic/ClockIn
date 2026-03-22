import { useMemo } from "react";
import styled from "styled-components";
import type { ScheduleViewProps } from "./ScheduleViewProps";
import ScheduleBlock from "./ScheduleBlock";

// task houser (fills vertical + scrolls + not horizontal + relative to anchour tasks)
const Container = styled.div`
    position: relative;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
`;

// Row = hour block height, line to show it
const Row = styled.div`
  display: flex;
  height: 50px;
  border-top: 1px solid #e5e7eb;
`;

// time of the row label, + padding to move more in
const TimeLabel = styled.div`
  width: 60px;
  font-size: 0.75rem;
  color: #9ca3af;
  padding-left: 8px;
`;

// doesnt do stuff yet
const GridArea = styled.div`
  flex: 1;
  position: relative;
`;

// floating layer over the grid/rows/etc
const BlocksLayer = styled.div`
  position: absolute;
  top: 0;
  left: 60px;
  right: 0;
`;

export default function ScheduleContent({ schedule, onBlockClick }: ScheduleViewProps) {

    const hours = useMemo(() => {
        return Array.from({ length: 24 }, (_, i) => i);
    }, []);
    // array for the next 24 numbers of hours rendered

    if (!schedule) {
        return <div style={{ padding: "1rem" }}>No schedule yet</div>;
    }

    function formatHour(hour: number) {
        const suffix = hour >= 12 ? "pm" : "am";
        const display = hour % 12 === 0 ? 12 : hour % 12;
        return `${display}${suffix}`;
    }

    return (
        <Container>
            {/* 🔥 GRID */}
            {hours.map((hour, i) => (
                <Row key={i}>
                    <TimeLabel>{formatHour(hour)}</TimeLabel>
                    <GridArea />
                </Row>
            ))}

            {/* 🔥 BLOCKS OVERLAY */}
            <BlocksLayer>
                {schedule.blocks.map(block => (
                    <ScheduleBlock
                        key={block.id}
                        block={block}
                        onClick={() => onBlockClick?.(block)}
                    />
                ))}
            </BlocksLayer>
        </Container>
    );
}