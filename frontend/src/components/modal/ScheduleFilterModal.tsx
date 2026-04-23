import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import type { Preference, ScheduleFilters } from "../../types/ScheduleFilters";
import type { Schedule } from "../../types/Schedule";
import type { ScheduleBlock } from "../../types/ScheduleBlock";
import type { Task } from "../../types/Task";
import { generateSchedule, confirmSchedule, acceptBlock, rejectBlock } from "../../api/scheduleApi";
import { getBusyTimes } from "../../api/busyTimesApi";
import type { BusyTimeRecord } from "../../api/busyTimesApi";
import { syncGoogleCalendar, getGoogleStatus } from "../../api/googleApi";
import DraggableWeekGrid from "../scheduleComponents/DraggableWeekGrid";
import { TIME_COL_WIDTH } from "../../utils/weekGridUtils";
import { StickyNoteThemes } from "../../types/StickyNoteThemes";

const TASK_COLORS = [
    { bg: "#FFF59A", text: "#1a1a1a" },
    { bg: "#4B94DB", text: "#1a1a1a" },
    { bg: "#FFAFB1", text: "#1a1a1a" },
    { bg: "#C0E8AA", text: "#1a1a1a" },
    { bg: "#C5AFFF", text: "#1a1a1a" },
    { bg: "#F6C98A", text: "#1a1a1a" },
    { bg: "#FFC7E8", text: "#1a1a1a" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }

function getWeekDays() {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        return { date, label };
    });
}

function formatDueDate(due: string | null | undefined): string | null {
    if (!due) return null;
    try {
        const d = new Date(due.length <= 10 ? due + "T00:00" : due);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
        return null;
    }
}

function busyTimesToBlocks(busyTimes: BusyTimeRecord[], allowedDates: string[]): ScheduleBlock[] {
    const DAY_ABBR: Record<number, string> = { 0: "SUN", 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };
    const blocks: ScheduleBlock[] = [];

    for (const bt of busyTimes) {
        if (!bt.start_time || !bt.end_time) continue;

        for (const date of allowedDates) {
            const day = new Date(date + "T00:00");
            const dayAbbr = DAY_ABBR[day.getDay()];

            if (bt.days_of_week?.length > 0 && !bt.days_of_week.includes(dayAbbr)) continue;

            blocks.push({
                id: `cal:${bt.id}:${date}`,
                title: bt.title,
                date,
                start: bt.start_time.slice(0, 5),
                end: bt.end_time.slice(0, 5),
                isCalendarEvent: true,
            });
        }
    }

    return blocks;
}

function calBlockToBusyTimeId(blockId: string): string | null {
    if (!blockId.startsWith("cal:")) return null;
    return blockId.split(":")[1] ?? null;
}

type Props = {
    onClose: () => void;
    onConfirm: (schedule: Schedule) => void;
    allTasks: Task[];
    userId: string;
};

// ── Overlay / Modal shell ──────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const Modal = styled.div`
    display: flex;
    width: min(1200px, 94vw);
    height: min(920px, 95vh);
    border-radius: 9px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
    background: #ffffff;
`;

// ── Left panel ─────────────────────────────────────────────────────────────────

const LeftPanel = styled.div`
    width: 420px;
    flex-shrink: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid #f0f0f0;
`;

const LeftHeader = styled.div`
    padding: 24px 22px 0;
    flex-shrink: 0;
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
`;

const PanelTitle = styled.h2`
    font-size: 18px;
    font-weight: 800;
    margin: 0;
    color: #1a1a1a;
`;

const AddTaskBtn = styled.button`
    background: none;
    border: none;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #777;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
    &:hover { color: #444; }
`;

const AddTaskPlus = styled.div`
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #4B94DB;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 1;
    color: #ffffff;
    flex-shrink: 0;
`;

// Task picker dropdown (stays open until explicitly closed)
const PickerDropdown = styled.div`
    background: #ffffff;
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    margin-bottom: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    overflow: hidden;
`;

const PickerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 8px;
    border-bottom: 1px solid #f0f0f0;
`;

const PickerTitle = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const PickerCloseBtn = styled.button`
    background: none;
    border: none;
    color: #bbb;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    &:hover { color: #555; }
`;

const PickerList = styled.div`
    max-height: 180px;
    overflow-y: auto;
`;

const PickerItem = styled.button`
    width: 100%;
    background: none;
    border: none;
    text-align: left;
    padding: 9px 12px;
    font-size: 13px;
    cursor: pointer;
    color: #333;
    font-family: inherit;
    &:hover { background: #f7f7f7; }
`;

const PickerEmpty = styled.div`
    padding: 12px;
    font-size: 13px;
    color: #bbb;
    text-align: center;
`;

const LeftScroll = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0 22px 12px;
`;

// Task card row: X sits OUTSIDE the colored card, to its left
const TaskRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
`;

const TaskCard = styled.div<{ $bg: string }>`
    flex: 1;
    min-width: 0;
    border-radius: 12px;
    background: ${({ $bg }) => $bg};
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const RemoveBtn = styled.button`
    flex-shrink: 0;
    background: rgba(0, 0, 0, 0.13);
    border: none;
    color: #444;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    &:hover { background: rgba(0, 0, 0, 0.25); }
`;

const TaskCardTitle = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const TaskCardDue = styled.div`
    font-size: 12px;
    color: #777;
    flex-shrink: 0;
`;

const SectionDivider = styled.div`
    height: 1px;
    background: #f0f0f0;
    margin: 16px 0 14px;
`;

const FilterSectionTitle = styled.h3`
    font-size: 18px;
    font-weight: 800;
    color: #1a1a1a;
    margin: 0 0 16px 0;
`;

const FilterRow = styled.div`
    margin-bottom: 16px;
`;

const FilterLabel = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 8px;
`;

const PillGroup = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const FilterPill = styled.button<{ $active: boolean }>`
    padding: 3px 12px;
    border-radius: 20px;
    border: 1.5px solid ${({ $active }) => ($active ? "#1a1a1a" : "transparent")};
    background: ${({ $active }) => ($active ? "#e8e8e8" : "#eeeeee")};
    color: ${({ $active }) => ($active ? "#1a1a1a" : "#555")};
    font-size: 13px;
    font-weight: ${({ $active }) => ($active ? "700" : "500")};
    cursor: pointer;
    font-family: inherit;
    transition: all 0.12s;
    &:hover {
        background: #e0e0e0;
        color: #333;
    }
`;

const LeftFooter = styled.div`
    padding: 14px 22px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
`;

const CreateBtn = styled.button<{ $loading: boolean }>`
    width: auto;
    min-width: 160px;
    padding: 11px 44px;
    border-radius: 50px;
    border: none;
    background: ${({ $loading }) => ($loading ? "#e8e8e8" : "#FFF59A")};
    color: ${({ $loading }) => ($loading ? "#aaa" : "#1a2035")};
    font-size: 15px;
    font-weight: 700;
    cursor: ${({ $loading }) => ($loading ? "not-allowed" : "pointer")};
    font-family: inherit;
    transition: background 0.15s;
    &:hover:not(:disabled) { background: #F6C98A; }
`;

// ── Right panel ────────────────────────────────────────────────────────────────

const RightPanel = styled.div`
    flex: 1;
    background: #f9f9f9;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px 18px 12px;
    min-width: 0;
`;

const RightTitle = styled.h2`
    font-size: 22px;
    font-weight: 800;
    margin: 0 0 4px 0;
    color: #1a1a1a;
    text-align: center;
    flex-shrink: 0;
`;

const RightSubtitle = styled.p`
    font-size: 12px;
    color: #999;
    margin: 0 0 8px 0;
    text-align: center;
    flex-shrink: 0;
`;

// ── Aligned day pill row (sits above grid columns) ────────────────────────────

const AlignedPillHeader = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    flex-shrink: 0;
    overflow: hidden;
`;

const TimeColSpacer = styled.div`
    width: ${TIME_COL_WIDTH}px;
    flex-shrink: 0;
`;

const PillsWrapper = styled.div`
    flex: 1;
    display: flex;
    min-width: 0;
`;

const DayPillCell = styled.div`
    flex: 1;
    min-width: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const DayPill = styled.button<{ $selected: boolean }>`
    padding: 2px 10px;
    border-radius: 20px;
    border: 1.5px solid ${({ $selected }) => ($selected ? "#4B94DB" : "#d8d8d8")};
    background: ${({ $selected }) => ($selected ? "#4B94DB" : "#ffffff")};
    color: ${({ $selected }) => ($selected ? "#ffffff" : "#1a1a1a")};
    font-size: 12px;
    font-weight: 300;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.12s;
    white-space: nowrap;
    &:hover {
        background: ${({ $selected }) => ($selected ? "#2e6abf" : "#f5f5f5")};
        border-color: ${({ $selected }) => ($selected ? "#2e6abf" : "#4B94DB")};
    }
`;

const GridArea = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
`;

const EmptyState = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #bbb;
    font-size: 14px;
    text-align: center;
`;

const ErrorText = styled.div`
    color: #c0392b;
    background: rgba(192, 57, 43, 0.07);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    margin-bottom: 10px;
    flex-shrink: 0;
`;

const CalendarLegend = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #999;
    margin-bottom: 10px;
    flex-shrink: 0;
`;

const LegendDot = styled.div`
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: rgba(58, 123, 213, 0.12);
    border: 1.5px dashed #4B94DB;
    flex-shrink: 0;
`;

const ResyncBtn = styled.button<{ $syncing: boolean }>`
    margin-left: auto;
    flex-shrink: 0;
    background: none;
    border: 1px solid #d0d8e4;
    border-radius: 8px;
    color: ${({ $syncing }) => ($syncing ? "#aaa" : "#4B94DB")};
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    cursor: ${({ $syncing }) => ($syncing ? "not-allowed" : "pointer")};
    font-family: inherit;
    transition: all 0.12s;
    &:hover:not(:disabled) {
        background: rgba(58, 123, 213, 0.07);
        border-color: #4B94DB;
    }
`;

const RightFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
    flex-shrink: 0;
`;

const DoneBtn = styled.button`
    padding: 4px 14px;
    border-radius: 50px;
    border: 2px solid rgba(58, 123, 213, 0.4);
    background: #ffffff;
    color: #1a2035;
    font-size: 20px;
    font-weight: 100;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
    &:hover {
        border-color: #4B94DB;
        background: rgba(58,123,213,0.05);
    }
    &:hover .done-check-circle {
        background: #4B94DB;
    }
`;

const DoneCheckCircle = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #AFDBFF;
    color: #ffffff;
    font-size: 11px;
    font-weight: 900;
    flex-shrink: 0;
    transition: all 0.15s;
`;

// filter pill helper 

function FilterToggle({
    label,
    optA,
    optB,
    value,
    onChange,
}: {
    label: string;
    optA: { label: string; value: Preference };
    optB: { label: string; value: Preference };
    value: Preference;
    onChange: (v: Preference) => void;
}) {
    return (
        <FilterRow>
            <FilterLabel>{label}</FilterLabel>
            <PillGroup>
                <FilterPill
                    $active={value === optA.value}
                    onClick={() => onChange(value === optA.value ? "none" : optA.value)}
                >
                    {optA.label}
                </FilterPill>
                <FilterPill
                    $active={value === optB.value}
                    onClick={() => onChange(value === optB.value ? "none" : optB.value)}
                >
                    {optB.label}
                </FilterPill>
            </PillGroup>
        </FilterRow>
    );
}

// Main Component 

export default function ScheduleFilterModal({ onClose, onConfirm, allTasks, userId }: Props) {
    const weekDays = useMemo(() => getWeekDays(), []);

    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [allowedDays, setAllowedDays] = useState<string[]>(weekDays.map((d) => d.date));
    const [showTaskPicker, setShowTaskPicker] = useState(false);

    const [filters, setFilters] = useState<ScheduleFilters>({
        deadline: "none",
        importance: "none",
        value: "none",
        time: "none",
        subject: "none",
        difficulty: "none",
    });

    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [hasCalendarEvents, setHasCalendarEvents] = useState(false);
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const prevBlocksRef = useRef<ScheduleBlock[]>([]);

    const loadCalendarBlocks = useCallback(() => {
        const allowedDates = weekDays.map((d) => d.date);
        const savedIgnored: string[] = JSON.parse(
            localStorage.getItem(`clockin_ignored_cal:${userId}`) ?? "[]"
        );
        return getBusyTimes().then((all) => {
            const googleEvents = all.filter((bt) => bt.source === "google");
            if (googleEvents.length === 0) return;
            const calBlocks = busyTimesToBlocks(googleEvents, allowedDates).map((b) => {
                const btId = calBlockToBusyTimeId(b.id);
                return btId && savedIgnored.includes(btId) ? { ...b, isIgnored: true } : b;
            });
            setBlocks((prev) => {
                const taskBlocks = prev.filter((b) => !b.isCalendarEvent);
                return [...calBlocks, ...taskBlocks];
            });
            setHasCalendarEvents(true);
        });
    }, [weekDays, userId]);

    useEffect(() => {
        getGoogleStatus()
            .then((s: { connected: boolean }) => setIsGoogleConnected(s.connected))
            .catch(() => {});
        loadCalendarBlocks().catch((e: unknown) => {
            console.error("[CalendarSync] Failed to load busy times:", e);
        });
    }, [loadCalendarBlocks]);

    async function handleResync() {
        setSyncing(true);
        setError(null);
        try {
            await syncGoogleCalendar();
            await loadCalendarBlocks();
        } catch {
            setError("Failed to resync Google Calendar. Try again.");
        } finally {
            setSyncing(false);
        }
    }

    // Intentionally not filtering blocks by allowedDays — deselecting a day
    // only affects scheduling (column dims) but all events stay visible.

    function getTaskColor(taskId: string): { bg: string; text: string } {
        const task = allTasks.find((t) => t.id === taskId);
        if (task?.color && StickyNoteThemes[task.color]) {
            return { bg: StickyNoteThemes[task.color].background, text: "#1a1a1a" };
        }
        // fallback: index-based color
        const idx = selectedTaskIds.indexOf(taskId);
        return TASK_COLORS[idx % TASK_COLORS.length] ?? TASK_COLORS[0];
    }

    // Add task to the TOP of the list; picker stays open
    function addTask(taskId: string) {
        if (!selectedTaskIds.includes(taskId)) {
            setSelectedTaskIds((prev) => [taskId, ...prev]);
        }
    }

    function removeTask(taskId: string) {
        setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId));
    }

    function toggleDay(date: string) {
        setAllowedDays((prev) =>
            prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
        );
    }

    function update<K extends keyof ScheduleFilters>(key: K, value: Preference) {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }

    function getIgnoredBusyTimeIds(): string[] {
        const ids = new Set<string>();
        for (const b of blocks) {
            if (b.isCalendarEvent && b.isIgnored) {
                const btId = calBlockToBusyTimeId(b.id);
                if (btId) ids.add(btId);
            }
        }
        return Array.from(ids);
    }

    function saveIgnoredIds(updatedBlocks: ScheduleBlock[]) {
        const ids = new Set<string>();
        for (const b of updatedBlocks) {
            if (b.isCalendarEvent && b.isIgnored) {
                const btId = calBlockToBusyTimeId(b.id);
                if (btId) ids.add(btId);
            }
        }
        localStorage.setItem(`clockin_ignored_cal:${userId}`, JSON.stringify(Array.from(ids)));
    }

    function handleBlockDelete(blockId: string) {
        const busyTimeId = calBlockToBusyTimeId(blockId);
        if (busyTimeId) {
            setBlocks((prev) => {
                const currentlyIgnored =
                    prev.find((b) => b.id.startsWith(`cal:${busyTimeId}:`))?.isIgnored ?? false;
                const updated = prev.map((b) =>
                    b.isCalendarEvent && b.id.startsWith(`cal:${busyTimeId}:`)
                        ? { ...b, isIgnored: !currentlyIgnored }
                        : b
                );
                saveIgnoredIds(updated);
                return updated;
            });
        } else {
            setBlocks((prev) => prev.filter((b) => b.id !== blockId));
        }
    }

    async function doGenerate() {
        if (selectedTaskIds.length === 0) {
            setError("Select at least one task to schedule.");
            return;
        }
        if (allowedDays.length === 0) {
            setError("Select at least one day.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const filtersWithDays: ScheduleFilters = { ...filters, allowed_days: allowedDays };
            const result = await generateSchedule(
                selectedTaskIds,
                filtersWithDays,
                userId,
                getIgnoredBusyTimeIds()
            );
            const coloredTaskBlocks = result.blocks.map((b) => ({
                ...b,
                color: getTaskColor(b.task_id ?? "").bg,
            }));
            const calBlocks = blocks.filter((b) => b.isCalendarEvent);
            const newBlocks = [...calBlocks, ...coloredTaskBlocks];
            const coloredSchedule = { ...result, blocks: newBlocks };
            setSchedule(coloredSchedule);
            setBlocks(newBlocks);
            prevBlocksRef.current = newBlocks;
            if (result.skipped?.length) {
                setError(
                    `Could not find a slot for: ${result.skipped.join(", ")}. Try adjusting their due dates or duration.`
                );
            }
        } catch {
            setError("Failed to generate schedule. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function handleBlocksChange(newBlocks: ScheduleBlock[]) {
        const prev = prevBlocksRef.current;
        const movedBlock = newBlocks.find((nb) => {
            if (nb.isCalendarEvent) return false;
            const old = prev.find((b) => b.id === nb.id);
            return old && (old.start !== nb.start || old.date !== nb.date);
        });
        if (movedBlock) {
            const old = prev.find((b) => b.id === movedBlock.id)!;
            if (old.task_id) {
                rejectBlock(old.task_id, `${old.date}T${old.start}:00`, userId).catch(
                    (err: unknown) => console.error(err)
                );
            }
        }
        prevBlocksRef.current = newBlocks;
        setBlocks(newBlocks);
    }

    async function handleConfirm() {
        const taskBlocks = blocks.filter((b) => !b.isCalendarEvent);
        if (!schedule || taskBlocks.length === 0) {
            onClose();
            return;
        }
        const confirmed = { ...schedule, blocks };
        await confirmSchedule(taskBlocks, userId).catch((err: unknown) =>
            console.error(err)
        );
        await Promise.all(
            taskBlocks
                .filter((b) => b.task_id)
                .map((b) =>
                    acceptBlock(
                        b.task_id!,
                        `${b.date}T${b.start}:00`,
                        `${b.date}T${b.end}:00`,
                        userId
                    ).catch((err: unknown) => console.error(err))
                )
        );
        onConfirm(confirmed);
        onClose();
    }

    const isSchedulable = (t: Task) =>
        !!t.title?.trim() &&
        !!t.due_date &&
        !!t.task_duration && t.task_duration > 0;

    const selectedTasks = allTasks.filter((t) => selectedTaskIds.includes(t.id!));
    const unselectedTasks = allTasks.filter(
        (t) => !selectedTaskIds.includes(t.id!) && isSchedulable(t)
    );
    const hasTaskBlocks = blocks.some((b) => !b.isCalendarEvent);
    const showGrid = blocks.length > 0;

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                {/* ── Left panel ── */}
                <LeftPanel>
                    <LeftHeader>
                        <HeaderRow>
                            <PanelTitle>Selected Tasks</PanelTitle>
                            <AddTaskBtn onClick={() => setShowTaskPicker((v) => !v)}>
                                Add an existing task
                                <AddTaskPlus>+</AddTaskPlus>
                            </AddTaskBtn>
                        </HeaderRow>

                        {/* Picker stays open until user closes it */}
                        {showTaskPicker && (
                            <PickerDropdown>
                                <PickerHeader>
                                    <PickerTitle>Your tasks</PickerTitle>
                                    <PickerCloseBtn onClick={() => setShowTaskPicker(false)}>
                                        ✕
                                    </PickerCloseBtn>
                                </PickerHeader>
                                <PickerList>
                                    {unselectedTasks.length === 0 ? (
                                        <PickerEmpty>All tasks added!</PickerEmpty>
                                    ) : (
                                        unselectedTasks.map((task) => (
                                            <PickerItem
                                                key={task.id}
                                                onClick={() => addTask(task.id!)}
                                            >
                                                {task.title}
                                            </PickerItem>
                                        ))
                                    )}
                                </PickerList>
                            </PickerDropdown>
                        )}
                    </LeftHeader>

                    <LeftScroll>
                        {selectedTasks.map((task) => {
                            const color = getTaskColor(task.id!);
                            const due = formatDueDate(task.due_date);
                            return (
                                <TaskRow key={task.id}>
                                    <RemoveBtn onClick={() => removeTask(task.id!)}>✕</RemoveBtn>
                                    <TaskCard $bg={color.bg}>
                                        <TaskCardTitle>{task.title}</TaskCardTitle>
                                        <TaskCardDue>Due: {due ?? "—"}</TaskCardDue>
                                    </TaskCard>
                                </TaskRow>
                            );
                        })}

                        <SectionDivider />
                        <FilterSectionTitle>Filters</FilterSectionTitle>

                        <FilterToggle
                            label="Length:"
                            optA={{ label: "Longest first", value: "desc" }}
                            optB={{ label: "Shortest first", value: "asc" }}
                            value={filters.time}
                            onChange={(v) => update("time", v)}
                        />
                        <FilterToggle
                            label="Difficulty:"
                            optA={{ label: "Hardest first", value: "desc" }}
                            optB={{ label: "Easiest first", value: "asc" }}
                            value={filters.difficulty ?? "none"}
                            onChange={(v) => update("difficulty", v)}
                        />
                        <FilterToggle
                            label="Importance:"
                            optA={{ label: "Most important first", value: "desc" }}
                            optB={{ label: "Least important first", value: "asc" }}
                            value={filters.importance}
                            onChange={(v) => update("importance", v)}
                        />
                    </LeftScroll>

                    <LeftFooter>
                        <CreateBtn $loading={loading} disabled={loading} onClick={doGenerate}>
                            {loading ? "Generating…" : schedule ? "Regenerate" : "Create"}
                        </CreateBtn>
                    </LeftFooter>
                </LeftPanel>

                {/* ── Right panel ── */}
                <RightPanel>
                    <RightTitle>Generated Schedule</RightTitle>
                    <RightSubtitle>
                        Select days for your new schedule
                    </RightSubtitle>

                    {(hasCalendarEvents || isGoogleConnected) && (
                        <CalendarLegend>
                            <LegendDot />
                            Google Calendar events — click to exclude from scheduling
                            <ResyncBtn $syncing={syncing} disabled={syncing} onClick={handleResync}>
                                {syncing ? "Syncing…" : "↺ Resync"}
                            </ResyncBtn>
                        </CalendarLegend>
                    )}

                    {error && <ErrorText>{error}</ErrorText>}

                    {/* Aligned pill row — each pill sits directly above its calendar column */}
                    <AlignedPillHeader>
                        <TimeColSpacer />
                        <PillsWrapper>
                            {weekDays.map((d) => (
                                <DayPillCell key={d.date}>
                                    <DayPill
                                        $selected={allowedDays.includes(d.date)}
                                        onClick={() => toggleDay(d.date)}
                                    >
                                        {d.label}
                                    </DayPill>
                                </DayPillCell>
                            ))}
                        </PillsWrapper>
                    </AlignedPillHeader>

                    <GridArea>
                        {loading ? (
                            <EmptyState>Generating your schedule…</EmptyState>
                        ) : showGrid ? (
                            <DraggableWeekGrid
                                blocks={blocks}
                                onBlocksChange={handleBlocksChange}
                                onBlockDelete={handleBlockDelete}
                                lightBg
                                enabledDays={allowedDays}
                                hideHeaders
                                scrollToHour={7}
                            />
                        ) : (
                            <EmptyState>
                                Add tasks and click Create to generate your schedule.
                            </EmptyState>
                        )}
                    </GridArea>

                    <RightFooter>
                        <DoneBtn onClick={handleConfirm}>
                            Done <DoneCheckCircle className="done-check-circle">✓</DoneCheckCircle>
                        </DoneBtn>
                    </RightFooter>
                </RightPanel>
            </Modal>
        </Overlay>
    );
}
