import { useState, useRef } from "react";
import styled from "styled-components";
import type { Preference, ScheduleFilters } from "../../types/ScheduleFilters";
import type { Schedule } from "../../types/Schedule";
import type { ScheduleBlock } from "../../types/ScheduleBlock";
import type { Task } from "../../types/Task";
import { generateSchedule, confirmSchedule, acceptBlock, rejectBlock } from "../../api/scheduleApi";
import DraggableWeekGrid from "../scheduleComponents/DraggableWeekGrid";

const TASK_COLORS = [
    { bg: "#FFF59A", text: "#1a1a1a" },
    { bg: "#F6C98A", text: "#1a1a1a" },
    { bg: "#FFAFB1", text: "#1a1a1a" },
    { bg: "#FFC7E8", text: "#1a1a1a" },
    { bg: "#C0E8AA", text: "#1a1a1a" },
    { bg: "#AFDBFF", text: "#1a1a1a" },
    { bg: "#C5AFFF", text: "#1a1a1a" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }

function getWeekDays() {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        const dayNum = d.getDate();
        return { date, label, dayNum };
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

type Props = {
    onClose: () => void;
    onConfirm: (schedule: Schedule) => void;
    allTasks: Task[];
    userId: string;
};

/* ── Overlay / Modal shell ── */
const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const Modal = styled.div`
    display: flex;
    width: min(1100px, 94vw);
    height: min(780px, 90vh);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
`;

/* ── Left panel ── */
const LeftPanel = styled.div`
    width: 300px;
    flex-shrink: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const LeftScroll = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 24px 20px 12px;
`;

const PanelTitle = styled.h2`
    font-size: 18px;
    font-weight: 700;
    font-style: italic;
    margin: 0 0 14px 0;
    color: #1a1a1a;
`;

const TaskCard = styled.div<{ $bg: string }>`
    border-radius: 10px;
    margin-bottom: 8px;
    background: ${({ $bg }) => $bg};
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
`;

const TaskCardInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const TaskCardTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const TaskCardDate = styled.div`
    font-size: 11px;
    color: #555;
    margin-top: 3px;
`;

const RemoveBtn = styled.button`
    flex-shrink: 0;
    background: rgba(0, 0, 0, 0.12);
    border: none;
    color: #333;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    &:hover { background: rgba(0, 0, 0, 0.25); }
`;

const AddTaskLink = styled.button`
    background: none;
    border: none;
    color: #888;
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    padding: 4px 0;
    margin-bottom: 4px;
    &:hover { color: #333; }
`;

const TaskPickerDropdown = styled.div`
    background: #f9f9f9;
    border: 1px solid #e8e8e8;
    border-radius: 10px;
    margin-bottom: 8px;
    max-height: 160px;
    overflow-y: auto;
`;

const TaskPickerItem = styled.button`
    width: 100%;
    background: none;
    border: none;
    text-align: left;
    padding: 8px 12px;
    font-size: 12px;
    cursor: pointer;
    color: #333;
    &:hover { background: #f0f0f0; }
    &:first-child { border-radius: 10px 10px 0 0; }
    &:last-child { border-radius: 0 0 10px 10px; }
`;

const SectionDivider = styled.div`
    height: 1px;
    background: #eee;
    margin: 16px 0 14px;
`;

const FilterRow = styled.div`
    margin-bottom: 12px;
`;

const FilterLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: #888;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const TogglePair = styled.div`
    display: flex;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 7px 6px;
    border: none;
    background: ${({ $active }) => ($active ? "#1a1a1a" : "#fafafa")};
    color: ${({ $active }) => ($active ? "white" : "#555")};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s;
    &:not(:last-child) { border-right: 1px solid #e0e0e0; }
`;

const LeftFooter = styled.div`
    padding: 14px 20px;
    border-top: 1px solid #eee;
`;

const CreateBtn = styled.button<{ $loading: boolean }>`
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    border: none;
    background: ${({ $loading }) => ($loading ? "#ccc" : "#f5d94e")};
    color: ${({ $loading }) => ($loading ? "#888" : "#1a1a1a")};
    font-size: 14px;
    font-weight: 800;
    cursor: ${({ $loading }) => ($loading ? "not-allowed" : "pointer")};
    transition: background 0.15s;
    &:hover:not(:disabled) { background: #e8c84a; }
`;

/* ── Right panel ── */
const RightPanel = styled.div`
    flex: 1;
    background: #d6e8f5;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 24px 20px 16px;
    min-width: 0;
`;

const RightTitle = styled.h2`
    font-size: 20px;
    font-weight: 700;
    font-style: italic;
    margin: 0 0 4px 0;
    color: #1a1a1a;
    flex-shrink: 0;
`;

const RightSubtitle = styled.p`
    font-size: 13px;
    font-weight: 400;
    font-style: italic;
    color: #4a6580;
    margin: 0 0 14px 0;
    flex-shrink: 0;
`;

const DayPillRow = styled.div`
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
    flex-shrink: 0;
    flex-wrap: wrap;
`;

const DayPill = styled.button<{ $selected: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 10px;
    border-radius: 20px;
    border: 2px solid ${({ $selected }) => ($selected ? "#3a7bd5" : "#b0c8e0")};
    background: ${({ $selected }) => ($selected ? "#3a7bd5" : "transparent")};
    color: ${({ $selected }) => ($selected ? "white" : "#4a6580")};
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.12s;
    line-height: 1.3;
    &:hover {
        background: ${({ $selected }) => ($selected ? "#2e6abf" : "rgba(58,123,213,0.1)")};
    }
`;

const DayPillNum = styled.span`
    font-size: 13px;
    font-weight: 800;
`;

const GridArea = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
`;

const EmptyState = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #7a96b0;
    font-size: 14px;
`;

const ErrorText = styled.div`
    color: #c0392b;
    background: rgba(192,57,43,0.08);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    margin-bottom: 10px;
    flex-shrink: 0;
`;

const RightFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
    flex-shrink: 0;
`;

const DoneBtn = styled.button`
    padding: 10px 28px;
    border-radius: 12px;
    border: none;
    background: #3a7bd5;
    color: white;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.15s;
    &:hover { background: #2e6abf; }
`;

/* ── Filter toggle helper ── */
function ToggleFilter({
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
            <TogglePair>
                <ToggleBtn
                    $active={value === optA.value}
                    onClick={() => onChange(value === optA.value ? "none" : optA.value)}
                >
                    {optA.label}
                </ToggleBtn>
                <ToggleBtn
                    $active={value === optB.value}
                    onClick={() => onChange(value === optB.value ? "none" : optB.value)}
                >
                    {optB.label}
                </ToggleBtn>
            </TogglePair>
        </FilterRow>
    );
}

export default function ScheduleFilterModal({ onClose, onConfirm, allTasks, userId }: Props) {
    const weekDays = getWeekDays();

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

    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const prevBlocksRef = useRef<ScheduleBlock[]>([]);

    function getTaskColor(taskId: string): { bg: string; text: string } {
        const idx = selectedTaskIds.indexOf(taskId);
        return TASK_COLORS[idx % TASK_COLORS.length] ?? TASK_COLORS[0];
    }

    function addTask(taskId: string) {
        if (!selectedTaskIds.includes(taskId)) {
            setSelectedTaskIds((prev) => [...prev, taskId]);
        }
        setShowTaskPicker(false);
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
            const result = await generateSchedule(selectedTaskIds, filtersWithDays, userId);
            // Assign task colors to blocks
            const coloredBlocks = result.blocks.map((b) => ({
                ...b,
                color: getTaskColor(b.task_id ?? "").bg,
            }));
            const coloredSchedule = { ...result, blocks: coloredBlocks };
            setSchedule(coloredSchedule);
            setBlocks(coloredBlocks);
            prevBlocksRef.current = coloredBlocks;
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
            const old = prev.find((b) => b.id === nb.id);
            return old && (old.start !== nb.start || old.date !== nb.date);
        });
        if (movedBlock) {
            const old = prev.find((b) => b.id === movedBlock.id)!;
            if (old.task_id) {
                rejectBlock(old.task_id, `${old.date}T${old.start}:00`, userId).catch(console.error);
            }
        }
        prevBlocksRef.current = newBlocks;
        setBlocks(newBlocks);
    }

    async function handleConfirm() {
        if (!schedule || blocks.length === 0) return;
        const confirmed = { ...schedule, blocks };
        await confirmSchedule(blocks, userId).catch(console.error);
        await Promise.all(
            blocks
                .filter((b) => b.task_id)
                .map((b) =>
                    acceptBlock(
                        b.task_id!,
                        `${b.date}T${b.start}:00`,
                        `${b.date}T${b.end}:00`,
                        userId
                    ).catch(console.error)
                )
        );
        onConfirm(confirmed);
        onClose();
    }

    const selectedTasks = allTasks.filter((t) => selectedTaskIds.includes(t.id!));
    const unselectedTasks = allTasks.filter((t) => !selectedTaskIds.includes(t.id!));

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                {/* ── Left panel ── */}
                <LeftPanel>
                    <LeftScroll>
                        <PanelTitle>Selected Tasks</PanelTitle>

                        {selectedTasks.map((task) => {
                            const color = getTaskColor(task.id!);
                            const due = formatDueDate(task.due_date);
                            return (
                                <TaskCard key={task.id} $bg={color.bg}>
                                    <TaskCardInfo>
                                        <TaskCardTitle>{task.title}</TaskCardTitle>
                                        {due && <TaskCardDate>Due {due}</TaskCardDate>}
                                    </TaskCardInfo>
                                    <RemoveBtn onClick={() => removeTask(task.id!)}>✕</RemoveBtn>
                                </TaskCard>
                            );
                        })}

                        {showTaskPicker && unselectedTasks.length > 0 && (
                            <TaskPickerDropdown>
                                {unselectedTasks.map((task) => (
                                    <TaskPickerItem key={task.id} onClick={() => addTask(task.id!)}>
                                        {task.title}
                                    </TaskPickerItem>
                                ))}
                            </TaskPickerDropdown>
                        )}

                        <AddTaskLink onClick={() => setShowTaskPicker((v) => !v)}>
                            {showTaskPicker ? "Cancel" : "+ Add an existing task"}
                        </AddTaskLink>

                        <SectionDivider />
                        <PanelTitle>Filters</PanelTitle>

                        <ToggleFilter
                            label="Length"
                            optA={{ label: "Short", value: "asc" }}
                            optB={{ label: "Long", value: "desc" }}
                            value={filters.time}
                            onChange={(v) => update("time", v)}
                        />
                        <ToggleFilter
                            label="Difficulty"
                            optA={{ label: "Easy", value: "asc" }}
                            optB={{ label: "Hard", value: "desc" }}
                            value={filters.difficulty ?? "none"}
                            onChange={(v) => update("difficulty", v)}
                        />
                        <ToggleFilter
                            label="Importance"
                            optA={{ label: "Low", value: "asc" }}
                            optB={{ label: "High", value: "desc" }}
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
                    <RightSubtitle>Select days for your new schedule</RightSubtitle>

                    <DayPillRow>
                        {weekDays.map((d) => (
                            <DayPill
                                key={d.date}
                                $selected={allowedDays.includes(d.date)}
                                onClick={() => toggleDay(d.date)}
                            >
                                <span>{d.label}</span>
                                <DayPillNum>{d.dayNum}</DayPillNum>
                            </DayPill>
                        ))}
                    </DayPillRow>

                    {error && <ErrorText>{error}</ErrorText>}

                    <GridArea>
                        {loading ? (
                            <EmptyState>Generating your schedule…</EmptyState>
                        ) : blocks.length > 0 ? (
                            <DraggableWeekGrid
                                blocks={blocks}
                                onBlocksChange={handleBlocksChange}
                                lightBg
                                enabledDays={allowedDays}
                                scrollToHour={7}
                            />
                        ) : (
                            <EmptyState>
                                {selectedTaskIds.length === 0
                                    ? "Add tasks and click Create."
                                    : "Click Create to generate your schedule."}
                            </EmptyState>
                        )}
                    </GridArea>

                    {blocks.length > 0 && (
                        <RightFooter>
                            <DoneBtn onClick={handleConfirm}>Done ✓</DoneBtn>
                        </RightFooter>
                    )}
                </RightPanel>
            </Modal>
        </Overlay>
    );
}