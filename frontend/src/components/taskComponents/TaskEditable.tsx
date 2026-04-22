import { useRef, useState, useEffect } from "react";
import styled from "styled-components";
import type { Task } from "../../types/Task.ts";
import { useDebounce } from "../../hooks/useDebounce.ts";

// ── Color Map ────────────────────────────────────────────────────────────────

const colors: Record<string, string> = {
    red: "#FFAFB1",
    orange: "#F6C98A",
    yellow: "#FFF59A",
    green: "#C0E8AA",
    blue: "#AFDBFF",
    purple: "#C5AFFF",
    pink: "#FFC7E8",
};

const getColorHex = (colorName?: string) =>
    colors[colorName ?? "yellow"] ?? colors["yellow"];

// ── Styled Components ────────────────────────────────────────────────────────

const Container = styled.div<{ isEditing: boolean }>`
    max-width: 60%;
    display: flex;
    border-radius: 12px;
    margin: 3% auto;
    flex-direction: column;
    position: relative;
    background-color: white;
    cursor: ${({ isEditing }) => (isEditing ? "text" : "pointer")};
    transition: border-color 0.15s, box-shadow 0.15s;
    border: 2px solid ${({ isEditing }) => (isEditing ? "#3b82f6" : "lightgray")};
    box-shadow: ${({ isEditing }) =>
            isEditing
                    ? "0 0 0 3px rgba(59, 130, 246, 0.2), -3px 3px 10px 0px #b5b5b5"
                    : "-3px 3px 10px 0px #b5b5b5"};
    overflow: visible;
`;

const TitleInput = styled.input<{ isEditing: boolean; colorHex: string }>`
    background-color: ${({ colorHex }) => colorHex};
    color: black;
    font-weight: bold;
    font-size: 1rem;
    margin-left: 1%;
    border: none;
    outline: none;
    padding: 4px 6px;
    width: 100%;
    box-sizing: border-box;
    cursor: ${({ isEditing }) => (isEditing ? "text" : "pointer")};
    user-select: ${({ isEditing }) => (isEditing ? "auto" : "none")};
`;

const TitleRow = styled.div<{ colorHex: string }>`
    display: flex;
    background-color: ${({ colorHex }) => colorHex};
    width: 100%;
    border-radius: 9px 9px 0 0;
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
    overflow: visible;
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

const ColorMenuItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 0.9rem;
    color: #333;
    position: relative;
    &:hover {
        background-color: #f5f5f5;
    }
`;

const ColorDot = styled.button<{ hex: string }>`
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: ${({ hex }) => hex};
    border: 1.5px solid rgba(0, 0, 0, 0.1);
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    transition: transform 0.1s;
    &:hover {
        transform: scale(1.2);
    }
`;

const ColorSubmenu = styled.div`
    position: absolute;
    left: 100%;
    top: 0;
    background: #ffffff;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 101;
    padding: 8px;
    display: flex;
    gap: 6px;
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

const RatingRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
    margin: 4px auto;
    align-items: start;
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
    justify-content: center;
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
    color: #888;
    background: none;
    border: none;
    margin: 0 auto;
    padding: 6px 40px;
    cursor: pointer;
    display: block;
    position: relative;
    z-index: 11;
    font-size: 1.2rem;
    letter-spacing: 4px;
    width: 100%;
    border-top: 1px solid #f0f0f0;
    border-radius: 12px;

    &:hover {
        color: #333;
        background-color: #fafafa;
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

const ClickOverlay = styled.div`
    position: absolute;
    inset: 0;
    z-index: 10;
    cursor: pointer;
`;

const RatingHints = styled.div`
    display: flex;
    justify-content: space-between;
    width: 90px;
    margin: 0 auto;
`;

const RatingHint = styled.span`
    font-size: 0.6rem;
    color: #bbb;
    font-style: italic;
`;

// ── Component ────────────────────────────────────────────────────────────────

type TaskEditableProps = {
    task: Task;
    isEditable?: boolean;
    initialEditing?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
    onChange?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    onAddToSchedule?: (taskId: string) => void;
    onSplit?: (task: Task) => void;
};

export default function TaskEditable({
                                         task,
                                         isEditable = true,
                                         initialEditing = false,
                                         onClick,
                                         onChange,
                                         onDelete,
                                         onSplit,
                                     }: TaskEditableProps) {
    const [collapsed, setCollapsed] = useState<boolean>(!initialEditing);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [colorSubmenuOpen, setColorSubmenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState<boolean>(initialEditing);
    const [local, setLocal] = useState<Task>({ ...task });

    // ── Refs ──
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const dueDateRef = useRef<HTMLInputElement>(null);
    const durationRef = useRef<HTMLInputElement>(null);
    const isDirty = useRef(false);

    const currentColorHex = getColorHex(local.color);

    useDebounce(local, 800, (updatedTask) => {
        if (updatedTask.id && isDirty.current) {
            onChange?.(updatedTask);
        }
    });

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

    useEffect(() => {
        if (initialEditing) {
            setTimeout(() => titleRef.current?.focus(), 0);
        }
    }, [initialEditing]);

    const handleColorChange = (colorName: string) => {
        const updated = { ...local, color: colorName };
        setLocal(updated);
        isDirty.current = true;
        onChange?.(updated);
        setColorSubmenuOpen(false);
        setMenuOpen(false);
    };

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
        <Container ref={containerRef} isEditing={isEditing}>
            {!isEditing && <ClickOverlay onClick={onClick} />}

            {/* ── Title Row ── */}
            <TitleRow colorHex={currentColorHex}>
                <TitleInput
                    ref={titleRef}
                    isEditing={isEditing}
                    colorHex={currentColorHex}
                    value={local.title}
                    readOnly={!isEditing}
                    onChange={(e) => {
                        isDirty.current = true;
                        setLocal({ ...local, title: e.target.value });
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            setCollapsed(false);
                            setTimeout(() => descriptionRef.current?.focus(), 0);
                        }
                    }}
                    placeholder="Task title"
                />
                {isEditing && <EditingHint>editing</EditingHint>}
                {isEditable && (
                    <MenuButton
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((prev) => !prev);
                            setColorSubmenuOpen(false);
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
                    {/* Color */}
                    <ColorMenuItem
                        onMouseEnter={() => setColorSubmenuOpen(true)}
                        onMouseLeave={() => setColorSubmenuOpen(false)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        Color
                        <ColorDot
                            hex={currentColorHex}
                            onClick={(e) => {
                                e.stopPropagation();
                                setColorSubmenuOpen((prev) => !prev);
                            }}
                        />
                        {colorSubmenuOpen && (
                            <ColorSubmenu>
                                {Object.entries(colors).map(([name, hex]) => (
                                    <ColorDot
                                        key={name}
                                        hex={hex}
                                        title={name}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleColorChange(name);
                                        }}
                                    />
                                ))}
                            </ColorSubmenu>
                        )}
                    </ColorMenuItem>

                    {/* Edit */}
                    <MenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            setIsEditing(true);
                        }}
                    >
                        Edit task
                    </MenuItem>

                    {/* Split — only show if task is long enough to split */}
                    {(task.task_duration ?? 0) >= 120 && (
                        <MenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(false);
                                onSplit?.(task);
                            }}
                        >
                            Split task
                        </MenuItem>
                    )}

                    {/* Delete */}
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
                        ref={descriptionRef}
                        isEditing={isEditing}
                        value={local.description}
                        readOnly={!isEditing}
                        onChange={(e) => {
                            isDirty.current = true;
                            setLocal({ ...local, description: e.target.value });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                dueDateRef.current?.focus();
                            }
                        }}
                        placeholder="Description"
                    />

                    {/* ── Due Date + Duration ── */}
                    <FieldRow>
                        <FieldLabel>
                            Due Date
                            <FieldInput
                                ref={dueDateRef}
                                isEditing={isEditing}
                                type="datetime-local"
                                value={local.due_date ? (local.due_date.length === 10 ? local.due_date + "T00:00" : local.due_date.slice(0, 16)) : ""}
                                readOnly={!isEditing}
                                onChange={(e) => {
                                    isDirty.current = true;
                                    setLocal({ ...local, due_date: e.target.value });
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        durationRef.current?.focus();
                                    }
                                }}
                            />
                        </FieldLabel>

                        <FieldLabel>
                            Duration (min)
                            <FieldInput
                                ref={durationRef}
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

                    {/* ── Importance + Difficulty ── */}
                    <RatingRow>
                        <FieldLabel style={{ alignItems: "center" }}>
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
                            <RatingHints>
                                <RatingHint>low</RatingHint>
                                <RatingHint>critical</RatingHint>
                            </RatingHints>
                        </FieldLabel>

                        <FieldLabel style={{ alignItems: "center" }}>
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
                            <RatingHints>
                                <RatingHint>easy</RatingHint>
                                <RatingHint>hard</RatingHint>
                            </RatingHints>
                        </FieldLabel>
                    </RatingRow>
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