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
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ScheduleBlock } from "../../types/ScheduleBlock";

const HOUR_HEIGHT = 36;   // px per hour
const GRID_START = 0;     // 12am — allows scrolling above 6am
const GRID_END = 24;      // midnight
const SNAP_MINUTES = 15;
export const TIME_COL_WIDTH = 42;

function pad(n: number) { return String(n).padStart(2, "0"); }

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(mins: number): string {
    const clamped = Math.max(0, Math.min(GRID_END * 60, mins));
    return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function getWeekDays() {
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
    align-items: flex-start;
`;

const TimeCol = styled.div<{ $noHeaderPad?: boolean }>`
    width: ${TIME_COL_WIDTH}px;
    flex-shrink: 0;
    padding-top: ${({ $noHeaderPad }) => ($noHeaderPad ? "0" : "22px")};
`;

const TimeLabel = styled.div`
    height: ${HOUR_HEIGHT}px;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding-right: 8px;
    padding-top: 2px;
    font-size: 10px;
    color: #9aabb8;
    box-sizing: border-box;
`;

const DaysContainer = styled.div`
    display: flex;
    flex: 1;
    min-width: 0;
`;

const DayCol = styled.div<{ $isOver: boolean; $lightBg?: boolean }>`
    flex: 1;
    min-width: 80px;
    border-left: 1px solid ${({ $lightBg }) => ($lightBg ? "#e8e8e8" : "#ebebeb")};
    background: ${({ $isOver }) => ($isOver ? "rgba(58,123,213,0.04)" : "transparent")};
    transition: background 0.1s;
`;

const DayHeaderArea = styled.div<{ $lightBg?: boolean }>`
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid ${({ $lightBg }) => ($lightBg ? "#e8e8e8" : "#e8eef4")};
    position: sticky;
    top: 0;
    background: #ffffff;
    z-index: 10;
`;

const TodayPill = styled.div`
    background: #3a7bd5;
    color: white;
    border-radius: 10px;
    padding: 1px 8px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const DayLabel = styled.div`
    font-size: 9px;
    font-weight: 600;
    color: #aab8c8;
    text-transform: uppercase;
    letter-spacing: 0.4px;
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
    border-top: 1px solid ${({ $lightBg }) => ($lightBg ? "#e8eaee" : "#e8eaee")};
    pointer-events: none;
`;

const BlockEl = styled.div<{
    $top: number;
    $height: number;
    $isDragging: boolean;
    $bg?: string;
    $textColor?: string;
}>`
    position: absolute;
    left: 1px;
    right: 1px;
    top: ${({ $top }) => $top}px;
    height: ${({ $height }) => Math.max(20, $height)}px;
    background: ${({ $bg }) => $bg ?? "#C5AFFF"};
    border: 1.5px solid rgba(0, 0, 0, 0.1);
    color: ${({ $textColor }) => $textColor ?? "white"};
    border-radius: 0;
    padding: 2px 7px;
    font-size: 11px;
    font-weight: 300;
    cursor: grab;
    user-select: none;
    box-sizing: border-box;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
    z-index: 3;
    transition: opacity 0.1s;
    display: flex;
    align-items: center;
    justify-content: space-between;
    &:active { cursor: grabbing; }
`;

const DeleteBtn = styled.button<{ $textColor?: string }>`
    flex-shrink: 0;
    margin-left: 4px;
    background: rgba(0,0,0,0.12);
    border: none;
    color: ${({ $textColor }) => $textColor ?? "white"};
    border-radius: 4px;
    font-size: 9px;
    line-height: 1;
    padding: 1px 3px;
    cursor: pointer;
    &:hover { background: rgba(0,0,0,0.25); }
`;

const Tooltip = styled.div`
    position: fixed;
    z-index: 9999;
    background: #1e1e2e;
    color: #f0f0f0;
    border-radius: 8px;
    padding: 10px 13px;
    min-width: 180px;
    max-width: 280px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    pointer-events: none;
`;

const TooltipTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 4px;
    word-break: break-word;
`;

const TooltipDesc = styled.div`
    font-size: 11px;
    color: #b0b8c8;
    margin-bottom: 6px;
    white-space: pre-wrap;
    word-break: break-word;
`;

const TooltipTime = styled.div`
    font-size: 11px;
    color: #8899aa;
    font-weight: 600;
`;

function DraggableBlock({ block, onDelete }: { block: ScheduleBlock; onDelete?: (id: string) => void }) {
    const startMins = timeToMinutes(block.start) - GRID_START * 60;
    const duration = timeToMinutes(block.end) - timeToMinutes(block.start);
    const top = (startMins / 60) * HOUR_HEIGHT;
    const height = (duration / 60) * HOUR_HEIGHT;

    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: block.id,
        data: { block },
    });

    const bg = block.color;
    const isDarkBg = !bg || bg === "#C5AFFF" || bg.startsWith("#5") || bg.startsWith("#3");
    const textColor = isDarkBg ? "black" : "#000000";

    return (
        <>
            <BlockEl
                ref={setNodeRef}
                style={{ transform: CSS.Translate.toString(transform) }}
                $top={top}
                $height={height}
                $isDragging={isDragging}
                $bg={bg}
                $textColor={textColor}
                onMouseEnter={(e) => { if (!isDragging) setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => { if (!isDragging) setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                onMouseLeave={() => setTooltipPos(null)}
                {...listeners}
                {...attributes}
            >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {block.title}
                </span>
                {onDelete && (
                    <DeleteBtn
                        $textColor={textColor}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
                    >
                        ✕
                    </DeleteBtn>
                )}
            </BlockEl>

            {tooltipPos && !isDragging && createPortal(
                <Tooltip style={{ top: tooltipPos.y + 14, left: tooltipPos.x + 14 }}>
                    <TooltipTitle>{block.title}</TooltipTitle>
                    {block.description && <TooltipDesc>{block.description}</TooltipDesc>}
                    <TooltipTime>{block.start} – {block.end}</TooltipTime>
                </Tooltip>,
                document.body
            )}
        </>
    );
}

function DroppableDay({
                          date,
                          label,
                          isToday,
                          blocks,
                          lightBg,
                          onDelete,
                          hideHeader,
                      }: {
    date: string;
    label: string;
    isToday: boolean;
    blocks: ScheduleBlock[];
    lightBg?: boolean;
    onDelete?: (id: string) => void;
    hideHeader?: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: date });
    const hourCount = GRID_END - GRID_START;

    return (
        <DayCol $isOver={isOver} $lightBg={lightBg}>
            {!hideHeader && (
                <DayHeaderArea $lightBg={lightBg}>
                    {isToday ? <TodayPill>{label}</TodayPill> : <DayLabel>{label}</DayLabel>}
                </DayHeaderArea>
            )}
            <DayBody ref={setNodeRef}>
                {Array.from({ length: hourCount }, (_, i) => (
                    <HourLine key={i} $index={i} $lightBg={lightBg} />
                ))}
                {blocks.map((b) => (
                    <DraggableBlock key={b.id} block={b} onDelete={onDelete} />
                ))}
            </DayBody>
        </DayCol>
    );
}

type Props = {
    blocks: ScheduleBlock[];
    onBlocksChange: (blocks: ScheduleBlock[]) => void;
    lightBg?: boolean;
    readOnly?: boolean;
    enabledDays?: string[];
    hideHeaders?: boolean;
    scrollToHour?: number;

};

export default function DraggableWeekGrid({ blocks, onBlocksChange, lightBg, readOnly, enabledDays, hideHeaders, scrollToHour }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Default scroll to 6am on mount
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = (scrollToHour ?? 6) * HOUR_HEIGHT;
        }
    }, []);

    const allWeekDays = getWeekDays();
    const weekDays = enabledDays
        ? allWeekDays.filter((d) => enabledDays.includes(d.date))
        : allWeekDays;
    const hours = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: readOnly ? { distance: Infinity } : { distance: 5 },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: readOnly ? { delay: Infinity, tolerance: 0 } : { delay: 200, tolerance: 5 },
    });
    const sensors = useSensors(mouseSensor, touchSensor);

    function handleDelete(id: string) {
        onBlocksChange(blocks.filter((b) => b.id !== id));
    }

    function handleDragEnd(event: DragEndEvent) {
        if (readOnly) return;
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
        const newEndMins = newStartMins + duration;
        const newDate = (over?.id as string) ?? block.date;

        const hasOverlap = blocks.some((b) => {
            if (b.id === block.id || b.date !== newDate) return false;
            const bStart = timeToMinutes(b.start);
            const bEnd = timeToMinutes(b.end);
            return newStartMins < bEnd && bStart < newEndMins;
        });
        if (hasOverlap) return;

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
            <GridWrapper ref={scrollRef}>
                <TimeCol $noHeaderPad={hideHeaders}>
                    {hours.map((h) => (
                        <TimeLabel key={h}>
                            {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
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
                            onDelete={readOnly ? undefined : handleDelete}
                            hideHeader={hideHeaders}
                        />
                    ))}
                </DaysContainer>
            </GridWrapper>
        </DndContext>
    );
}