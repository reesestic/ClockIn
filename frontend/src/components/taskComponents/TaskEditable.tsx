import { useRef, useState, useEffect } from "react";
import styled from "styled-components";
import type { Task } from "../../types/Task.ts";
import { useDebounce } from "../../hooks/useDebounce.ts";

// ── Styled Components ────────────────────────────────────────────────────────

const Container = styled.div<{ isEditing: boolean; isSelected: boolean }>`
    max-width: 80%;
    display: flex;
    margin: 7% auto;
    flex-direction: column;
    position: relative;
    border: 2px solid ${({ isSelected }) => (isSelected ? "#3b82f6" : "lightgray")};
    box-shadow: ${({ isSelected }) =>
            isSelected ? "0 0 0 3px rgba(59,130,246,0.15), -3px 3px 10px 0px #b5b5b5" : "-3px 3px 10px 0px #b5b5b5"};
    background-color: white;
    cursor: ${({ isEditing }) => (isEditing ? "text" : "pointer")};
    transition: border-color 0.15s, box-shadow 0.15s;
`;

const TitleInput = styled.input<{ isEditing: boolean }>`
    background-color: #fff59a;
    color: black;
    font-weight: bold;
    font-size: 1rem;
    border: none;
    outline: none;
    padding: 4px 6px;
    width: 100%;
    box-sizing: border-box;
    cursor: ${({ isEditing }) => (isEditing ? "text" : "pointer")};
    user-select: ${({ isEditing }) => (isEditing ? "auto" : "none")};
    &:focus {
        outline: ${({ isEditing }) => (isEditing ? "2px solid #f0d800" : "none")};
    }
`;

const TitleRow = styled.div`
    display: flex;
    background-color: #fff59a;
    width: 100%;
`;

const Checkbox = styled.input<{ isSelected: boolean }>`
    margin: 0 6px;
    cursor: pointer;
    accent-color: ${({ isSelected }) => (isSelected ? "#3b82f6" : "#555")};
    flex-shrink: 0;
    position: relative;
    z-index: 11;
`;

const MenuButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    color: #636363;
    font-size: 1.1rem;
    padding: 0 6px;
    flex-shrink: 0;
    position: relative;
    z-index: 11;
    &:hover {
        color: black;
    }
`;

const ContextMenu = styled.div`
    position: absolute;
    top: 32px;
    right: 0;
    background: #ffffff;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 100;
    min-width: 180px;
    overflow: hidden;
    padding-left: 2%;
    padding-right: 2%;
`;

const MenuItem = styled.button<{ danger?: boolean }>`
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 14px;
    background: none;
    border: none;
    cursor: pointer;
    color: ${({ danger }) => (danger ? "#d9534f" : "#333")};
    font-size: 0.9rem;
    &:hover {
        background-color: #f5f5f5;
    }
`;

const DescriptionTextarea = styled.textarea<{ isEditing: boolean }>`
    min-height: 48px;
    background-color: #ffffff;
    color: #636363;
    border: 1px solid transparent;
    resize: ${({ isEditing }) => (isEditing ? "vertical" : "none")};
    font-size: 0.9rem;
    padding: 4px 6px;
    width: 100%;
    box-sizing: border-box;
    cursor: ${({ isEditing }) => (isEditing ? "text" : "pointer")};
    user-select: ${({ isEditing }) => (isEditing ? "auto" : "none")};
    &:focus {
        outline: ${({ isEditing }) => (isEditing ? "2px solid #d0d0d0" : "none")};
        border-color: ${({ isEditing }) => (isEditing ? "#d0d0d0" : "transparent")};
    }
`;

const FieldRow = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px auto;
    width: 100%;
`;

const FieldLabel = styled.label`
    font-size: 0.8rem;
    color: #888;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 80px;
`;

const FieldInput = styled.input<{ isEditing: boolean }>`
    background-color: #ffffff;
    color: #636363;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    padding: 3px 6px;
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;
    cursor: ${({ isEditing }) => (isEditing ? "text" : "pointer")};
    user-select: ${({ isEditing }) => (isEditing ? "auto" : "none")};
    &:focus {
        outline: ${({ isEditing }) => (isEditing ? "2px solid #d0d0d0" : "none")};
    }
`;

const RadioGroup = styled.div`
    display: flex;
    gap: 6px;
    margin-top: 2px;
    justify-content: flex-start;
`;

const RadioOption = styled.button<{ selected: boolean }>`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid ${({ selected }) => (selected ? "#555" : "#ccc")};
    background-color: ${({ selected }) => (selected ? "#555" : "#fff")};
    color: ${({ selected }) => (selected ? "#fff" : "#888")};
    font-size: 0.8rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    &:hover {
        border-color: #555;
    }
`;

const CollapseButton = styled.button`
    color: black;
    background: none;
    border: none;
    margin: 0 auto;
    padding: 2%;
    cursor: pointer;
    display: block;
    position: relative;
    z-index: 11;
    &:hover {
        color: #888;
    }
`;

const CollapsedFieldContainer = styled.div`
    padding-left: 2%;
    padding-right: 2%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
`;

const EditingHint = styled.span`
    font-size: 0.7rem;
    color: #aaa;
    padding: 2px 6px;
    align-self: center;
`;

// ── Absorbs clicks over inputs when not editing so selection always fires ──
const ClickOverlay = styled.div`
    position: absolute;
    inset: 0;
    z-index: 10;
    cursor: pointer;
`;

// ── Component ────────────────────────────────────────────────────────────────

type TaskEditableProps = {
    task: Task;
    isSelected?: boolean;
    isEditable?: boolean; // false = timer mode: no menu, no editing
    onClick?: () => void;
    onChange?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    onAddToSchedule?: (taskId: string) => void;
};

export default function TaskEditable({
                                         task,
                                         isSelected,
                                         isEditable = true,
                                         onClick,
                                         onChange,
                                         onDelete,
                                         onAddToSchedule,
                                     }: TaskEditableProps) {
    const [collapsed, setCollapsed] = useState<boolean>(true);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [local, setLocal] = useState<Task>({ ...task });

    const containerRef = useRef<HTMLDivElement>(null);
    const isDirty = useRef(false);

    useDebounce(local, 800, (updatedTask) => {
        if (updatedTask.id && isDirty.current) {
            onChange?.(updatedTask);
        }
    });

    // ── Exit edit mode when clicking outside ──
    useEffect(() => {
        if (!isEditing) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsEditing(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isEditing]);

    const handleImportanceSelect = (value: number) => {
        if (!isEditing) return;
        isDirty.current = true;
        setLocal({ ...local, importance: value });
    };

    const handleDifficultySelect = (value: number) => {
        if (!isEditing) return;
        isDirty.current = true;
        setLocal({ ...local, difficulty: value });
    };

    return (
        <Container
            ref={containerRef}
            isEditing={isEditing}
            isSelected={isSelected ?? false}
        >
            {/* ── Overlay: absorbs clicks over inputs when not editing ── */}
            {!isEditing && (
                <ClickOverlay onClick={onClick} />
            )}

            {/* ── Title Row ── */}
            <TitleRow>
                <Checkbox
                    type="checkbox"
                    checked={isSelected ?? false}
                    isSelected={isSelected ?? false}
                    onChange={onClick}
                    onClick={(e) => e.stopPropagation()}
                />
                <TitleInput
                    isEditing={isEditing}
                    value={local.title}
                    readOnly={!isEditing}
                    onChange={(e) => {
                        isDirty.current = true;
                        setLocal({ ...local, title: e.target.value });
                    }}
                    placeholder="Task title"
                />
                {isEditing && <EditingHint>editing</EditingHint>}
                {isEditable && (
                    <MenuButton
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((prev) => !prev);
                        }}
                        title="Options"
                    >
                        ⋮
                    </MenuButton>
                )}
            </TitleRow>

            {/* ── Context Menu ── */}
            {isEditable && menuOpen && (
                <ContextMenu>
                    <MenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            setIsEditing(true);
                        }}
                    >
                        Edit task
                    </MenuItem>
                    <MenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onAddToSchedule?.(task.id!);
                        }}
                    >
                        Add to existing schedule
                    </MenuItem>
                    <MenuItem
                        danger
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onDelete?.(task.id!);
                        }}
                    >
                        Delete task
                    </MenuItem>
                </ContextMenu>
            )}

            {/* ── Expanded Fields ── */}
            {!collapsed && (
                <CollapsedFieldContainer>
                    <DescriptionTextarea
                        isEditing={isEditing}
                        value={local.description}
                        readOnly={!isEditing}
                        onChange={(e) => {
                            isDirty.current = true;
                            setLocal({ ...local, description: e.target.value });
                        }}
                        placeholder="Description"
                    />

                    <FieldRow>
                        <FieldLabel>
                            Due Date
                            <FieldInput
                                isEditing={isEditing}
                                type="date"
                                value={local.due_date ?? ""}
                                readOnly={!isEditing}
                                onChange={(e) => {
                                    isDirty.current = true;
                                    setLocal({ ...local, due_date: e.target.value });
                                }}
                            />
                        </FieldLabel>

                        <FieldLabel>
                            Duration (min)
                            <FieldInput
                                isEditing={isEditing}
                                type="number"
                                min={1}
                                value={local.task_duration ?? ""}
                                readOnly={!isEditing}
                                onChange={(e) => {
                                    isDirty.current = true;
                                    setLocal({ ...local, task_duration: Number(e.target.value) });
                                }}
                                placeholder="e.g. 30"
                            />
                        </FieldLabel>
                    </FieldRow>

                    <FieldRow style={{ justifyContent: "flex-start" }}>
                        <FieldLabel style={{ flex: "none" }}>
                            Importance
                            <RadioGroup>
                                {[1, 2, 3].map((val) => (
                                    <RadioOption
                                        key={val}
                                        selected={local.importance === val}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleImportanceSelect(val);
                                        }}
                                        type="button"
                                    >
                                        {val}
                                    </RadioOption>
                                ))}
                            </RadioGroup>
                        </FieldLabel>

                        <FieldLabel style={{ flex: "none" }}>
                            Difficulty
                            <RadioGroup>
                                {[1, 2, 3].map((val) => (
                                    <RadioOption
                                        key={val}
                                        selected={local.difficulty === val}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDifficultySelect(val);
                                        }}
                                        type="button"
                                    >
                                        {val}
                                    </RadioOption>
                                ))}
                            </RadioGroup>
                        </FieldLabel>
                    </FieldRow>
                </CollapsedFieldContainer>
            )}

            {/* ── Collapse Toggle ── */}
            <CollapseButton
                onClick={(e) => {
                    e.stopPropagation();
                    setCollapsed((prev) => !prev);
                }}
            >
                {collapsed ? "∨" : "∧"}
            </CollapseButton>
        </Container>
    );
}