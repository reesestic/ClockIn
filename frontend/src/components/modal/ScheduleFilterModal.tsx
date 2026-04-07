import { useState, useEffect } from "react";
import styled from "styled-components";
import type { Preference, ScheduleFilters } from "../../types/ScheduleFilters";
import type { Schedule } from "../../types/Schedule";
import type { ScheduleBlock } from "../../types/ScheduleBlock";
import type { Task } from "../../types/Task";
import { generateSchedule } from "../../api/ScheduleApi";
import DraggableWeekGrid from "../scheduleComponents/DraggableWeekGrid";

type Props = {
    onClose: () => void;
    onConfirm: (schedule: Schedule) => void;
    selectedTasks: Task[];
    userId: string;
};

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
  height: min(780px, 88vh);
  border-radius: 16px;
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
  font-size: 22px;
  font-weight: 800;
  font-style: italic;
  margin: 0 0 14px 0;
  color: #1a1a1a;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background: #f5f5f5;
  font-size: 12px;
  box-sizing: border-box;
  margin-bottom: 10px;
  outline: none;
  &::placeholder { color: #aaa; }
  &:focus { border-color: #bbb; background: #fff; }
`;

const TaskCard = styled.div<{ $index: number }>`
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
  border: 1.5px solid ${({ $index }) => ($index % 2 === 0 ? "#e8c84a" : "#7db8e8")};
`;

const TaskCardHeader = styled.div<{ $index: number }>`
  background: ${({ $index }) => ($index % 2 === 0 ? "#f5d94e" : "#8fc7ef")};
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #1a1a1a;
`;

const SectionDivider = styled.div`
  height: 1px;
  background: #eee;
  margin: 18px 0 14px;
`;

const FilterRow = styled.div`
  margin-bottom: 10px;
`;

const FilterLabel = styled.div`
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
`;

const FilterBtns = styled.div`
  display: flex;
  gap: 5px;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 5px 4px;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => ($active ? "#1a1a1a" : "#ddd")};
  background: ${({ $active }) => ($active ? "#1a1a1a" : "#fafafa")};
  color: ${({ $active }) => ($active ? "white" : "#555")};
  font-size: 11px;
  cursor: pointer;
  transition: all 0.1s;
`;

const LeftFooter = styled.div`
  padding: 14px 20px;
  border-top: 1px solid #eee;
`;

const GenerateBtn = styled.button<{ $loading: boolean }>`
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: ${({ $loading }) => ($loading ? "#999" : "#1a1a1a")};
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: ${({ $loading }) => ($loading ? "not-allowed" : "pointer")};
  transition: background 0.15s;
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
  font-size: 22px;
  font-weight: 800;
  font-style: italic;
  margin: 0 0 16px 0;
  color: #1a1a1a;
  flex-shrink: 0;
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
  color: #e74c3c;
  font-size: 13px;
  margin-bottom: 10px;
  flex-shrink: 0;
`;

const ConfirmBtn = styled.button`
  margin-top: 12px;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: #6c5ce7;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  letter-spacing: 0.3px;
  transition: background 0.15s;
  &:hover { background: #5a4fd9; }
`;

function PreferenceRow({
    label,
    value,
    setValue,
}: {
    label: string;
    value: Preference;
    setValue: (v: Preference) => void;
}) {
    return (
        <FilterRow>
            <FilterLabel>{label}</FilterLabel>
            <FilterBtns>
                <FilterBtn $active={value === "desc"} onClick={() => setValue("desc")}>
                    First
                </FilterBtn>
                <FilterBtn $active={value === "none"} onClick={() => setValue("none")}>
                    N/A
                </FilterBtn>
                <FilterBtn $active={value === "asc"} onClick={() => setValue("asc")}>
                    Last
                </FilterBtn>
            </FilterBtns>
        </FilterRow>
    );
}

export default function ScheduleFilterModal({
    onClose,
    onConfirm,
    selectedTasks,
    userId,
}: Props) {
    const [filters, setFilters] = useState<ScheduleFilters>({
        deadline: "none",
        importance: "none",
        value: "none",
        time: "none",
        subject: "none",
    });
    const [search, setSearch] = useState("");
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function update<K extends keyof ScheduleFilters>(key: K, value: Preference) {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }

    async function doGenerate(currentFilters: ScheduleFilters) {
        if (selectedTasks.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const taskIds = selectedTasks.map((t) => t.id).filter(Boolean) as string[];
            const result = await generateSchedule(taskIds, currentFilters, userId);
            setSchedule(result);
            setBlocks(result.blocks);
        } catch {
            setError("Failed to generate schedule. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Auto-generate with default filters when modal opens
    useEffect(() => {
        doGenerate({
            deadline: "none",
            importance: "none",
            value: "none",
            time: "none",
            subject: "none",
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Enter key to confirm
    useEffect(() => {
        if (!schedule || blocks.length === 0) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Enter") handleConfirm();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schedule, blocks]);

    function handleConfirm() {
        if (!schedule) return;
        onConfirm({ ...schedule, blocks });
        onClose();
    }

    const filteredTasks = selectedTasks.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={(e) => e.stopPropagation()}>
                {/* ── Left ── */}
                <LeftPanel>
                    <LeftScroll>
                        <PanelTitle>Selected Tasks</PanelTitle>

                        <SearchInput
                            placeholder="find a task"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        {filteredTasks.map((task, i) => (
                            <TaskCard key={task.id} $index={i}>
                                <TaskCardHeader $index={i}>
                                    {task.title}
                                    <span style={{ fontSize: 16, opacity: 0.6 }}>⋮</span>
                                </TaskCardHeader>
                            </TaskCard>
                        ))}

                        <SectionDivider />
                        <PanelTitle>Filters</PanelTitle>

                        <PreferenceRow
                            label="Deadline"
                            value={filters.deadline}
                            setValue={(v) => update("deadline", v)}
                        />
                        <PreferenceRow
                            label="Importance"
                            value={filters.importance}
                            setValue={(v) => update("importance", v)}
                        />
                        <PreferenceRow
                            label="Most Value"
                            value={filters.value}
                            setValue={(v) => update("value", v)}
                        />
                        <PreferenceRow
                            label="Time"
                            value={filters.time}
                            setValue={(v) => update("time", v)}
                        />
                        <PreferenceRow
                            label="Subject"
                            value={filters.subject}
                            setValue={(v) => update("subject", v)}
                        />
                    </LeftScroll>

                    <LeftFooter>
                        <GenerateBtn
                            $loading={loading}
                            disabled={loading}
                            onClick={() => doGenerate(filters)}
                        >
                            {loading ? "Generating…" : schedule ? "Regenerate" : "Generate Schedule"}
                        </GenerateBtn>
                    </LeftFooter>
                </LeftPanel>

                {/* ── Right ── */}
                <RightPanel>
                    <RightTitle>Possible Schedule</RightTitle>

                    {error && <ErrorText>{error}</ErrorText>}

                    {loading ? (
                        <EmptyState>Generating your schedule…</EmptyState>
                    ) : blocks.length > 0 ? (
                        <DraggableWeekGrid blocks={blocks} onBlocksChange={setBlocks} />
                    ) : (
                        <EmptyState>
                            {selectedTasks.length === 0
                                ? "Select tasks to generate a schedule."
                                : "Click Generate Schedule to get started."}
                        </EmptyState>
                    )}

                    {blocks.length > 0 && (
                        <ConfirmBtn onClick={handleConfirm}>
                            Confirm Schedule ↵
                        </ConfirmBtn>
                    )}
                </RightPanel>
            </Modal>
        </Overlay>
    );
}
