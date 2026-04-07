import {
    DndContext,
    MouseSensor,
    TouchSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import styled from "styled-components";
import type { ScheduleBlock } from "../../types/ScheduleBlock";

const HOUR_HEIGHT = 44;   // px per hour
const GRID_START = 6;     // 6am
const GRID_END = 22;      // 10pm
const SNAP_MINUTES = 15;
const TIME_COL_WIDTH = 46;

function pad(n: number) { return String(n).padStart(2, "0"); }

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(mins: number): string {
    const clamped = Math.max(GRID_START * 60, Math.min(GRID_END * 60, mins));
    return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

function getWeekDays() {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        return { date, label, isToday: i === 0 };
    });
}

const GridWrapper = styled.div`
  display: flex;
  overflow-y: auto;
  overflow-x: auto;
  flex: 1;
`;

const TimeCol = styled.div`
  width: ${TIME_COL_WIDTH}px;
  flex-shrink: 0;
  padding-top: 28px;
`;

const TimeLabel = styled.div`
  height: ${HOUR_HEIGHT}px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: 8px;
  padding-top: 3px;
  font-size: 10px;
  color: #7a8fa6;
  box-sizing: border-box;
`;

const DaysContainer = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
`;

const DayCol = styled.div<{ $isToday: boolean; $isOver: boolean; $lightBg?: boolean }>`
  flex: 1;
  min-width: 88px;
  border-left: 1px solid ${({ $lightBg }) => ($lightBg ? "#e8e8e8" : "rgba(255,255,255,0.5)")};
  background: ${({ $isOver }) => ($isOver ? "rgba(108,92,231,0.07)" : "transparent")};
  transition: background 0.1s;
`;

const DayHeader = styled.div<{ $isToday: boolean; $lightBg?: boolean }>`
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $isToday }) => ($isToday ? "#6c5ce7" : "transparent")};
  color: ${({ $isToday }) => ($isToday ? "white" : "#4a6580")};
  border-bottom: 1px solid ${({ $lightBg }) => ($lightBg ? "#e8e8e8" : "rgba(255,255,255,0.5)")};
  text-transform: uppercase;
  letter-spacing: 0.6px;
  position: sticky;
  top: 0;
  z-index: 2;
`;

const DayBody = styled.div`
  position: relative;
  height: ${(GRID_END - GRID_START) * HOUR_HEIGHT}px;
`;

const HourLine = styled.div<{ $index: number; $lightBg?: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  top: ${({ $index }) => $index * HOUR_HEIGHT}px;
  border-top: 1px solid ${({ $lightBg }) => ($lightBg ? "#eeeeee" : "rgba(255,255,255,0.55)")};
  pointer-events: none;
`;

const BlockEl = styled.div<{ $top: number; $height: number; $isDragging: boolean }>`
  position: absolute;
  left: 4px;
  right: 4px;
  top: ${({ $top }) => $top}px;
  height: ${({ $height }) => Math.max(22, $height)}px;
  background: #7c6df3;
  border: 1.5px solid #5a4fd9;
  color: white;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: grab;
  user-select: none;
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  z-index: 3;
  transition: opacity 0.1s;
  &:active { cursor: grabbing; }
`;

function DraggableBlock({ block }: { block: ScheduleBlock }) {
    const startMins = timeToMinutes(block.start) - GRID_START * 60;
    const duration = timeToMinutes(block.end) - timeToMinutes(block.start);
    const top = (startMins / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: block.id,
        data: { block },
    });

    return (
        <BlockEl
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform) }}
            $top={top}
            $height={height}
            $isDragging={isDragging}
            {...listeners}
            {...attributes}
        >
            {block.title}
        </BlockEl>
    );
}

function DroppableDay({
    date,
    label,
    isToday,
    blocks,
    lightBg,
}: {
    date: string;
    label: string;
    isToday: boolean;
    blocks: ScheduleBlock[];
    lightBg?: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: date });
    const hourCount = GRID_END - GRID_START;

    return (
        <DayCol $isToday={isToday} $isOver={isOver} $lightBg={lightBg}>
            <DayHeader $isToday={isToday} $lightBg={lightBg}>{label}</DayHeader>
            <DayBody ref={setNodeRef}>
                {Array.from({ length: hourCount }, (_, i) => (
                    <HourLine key={i} $index={i} $lightBg={lightBg} />
                ))}
                {blocks.map((b) => (
                    <DraggableBlock key={b.id} block={b} />
                ))}
            </DayBody>
        </DayCol>
    );
}

type Props = {
    blocks: ScheduleBlock[];
    onBlocksChange: (blocks: ScheduleBlock[]) => void;
    lightBg?: boolean;
};

export default function DraggableWeekGrid({ blocks, onBlocksChange, lightBg }: Props) {
    const weekDays = getWeekDays();
    const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

    const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } });
    const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
    const sensors = useSensors(mouseSensor, touchSensor);

    function handleDragEnd(event: DragEndEvent) {
        const { active, delta, over } = event;
        const block = active.data.current?.block as ScheduleBlock | undefined;
        if (!block) return;

        const minutesDelta =
            Math.round(((delta.y / HOUR_HEIGHT) * 60) / SNAP_MINUTES) * SNAP_MINUTES;
        const duration = timeToMinutes(block.end) - timeToMinutes(block.start);
        const newStartMins = Math.max(
            GRID_START * 60,
            Math.min(GRID_END * 60 - duration, timeToMinutes(block.start) + minutesDelta)
        );
        const newDate = (over?.id as string) ?? block.date;

        onBlocksChange(
            blocks.map((b) =>
                b.id === block.id
                    ? {
                          ...b,
                          start: minutesToTime(newStartMins),
                          end: minutesToTime(newStartMins + duration),
                          date: newDate,
                      }
                    : b
            )
        );
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <GridWrapper>
                <TimeCol>
                    {hours.map((h) => (
                        <TimeLabel key={h}>
                            {h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
                        </TimeLabel>
                    ))}
                </TimeCol>
                <DaysContainer>
                    {weekDays.map((day) => (
                        <DroppableDay
                            key={day.date}
                            date={day.date}
                            label={day.label}
                            isToday={day.isToday}
                            blocks={blocks.filter((b) => b.date === day.date)}
                            lightBg={lightBg}
                        />
                    ))}
                </DaysContainer>
            </GridWrapper>
        </DndContext>
    );
}
