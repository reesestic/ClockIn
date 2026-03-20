import { useState } from "react";
import styled from "styled-components";
import type { Task } from "../../types/Task.ts";

// ── Styled Components ────────────────────────────────────────────────────────

const Container = styled.div`
  max-width: 80%;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const TitleInput = styled.input`
  background-color: #fff59a;
  color: black;
  font-weight: bold;
  font-size: 1rem;
  border: none;
  outline: none;
  padding: 4px 6px;
  width: 100%;
  box-sizing: border-box;
  &:focus {
    outline: 2px solid #f0d800;
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  background-color: #fff59a;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #636363;
  font-size: 1.1rem;
  padding: 0 6px;
  flex-shrink: 0;
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

const DescriptionTextarea = styled.textarea`
  min-height: 48px;
  background-color: #ffffff;
  color: #636363;
  border: 1px solid transparent;
  resize: vertical;
  font-size: 0.9rem;
  padding: 4px 6px;
  width: 100%;
  box-sizing: border-box;
  &:focus {
    outline: 2px solid #d0d0d0;
    border-color: #d0d0d0;
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

const FieldInput = styled.input`
  background-color: #ffffff;
  color: #636363;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 0.9rem;
  width: 100%;
  box-sizing: border-box;
  &:focus {
    outline: 2px solid #d0d0d0;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 2px;
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
  color: #cfcfcf;
  background: none;
  border: none;
  margin: 0 auto;
  padding: 2%;
  cursor: pointer;
  display: block;
  &:hover {
    color: #888;
  }
`;

// ── Component ────────────────────────────────────────────────────────────────

type TaskEditableProps = {
    task: Task;
    isSelected?: boolean;
    onClick?: () => void;
    onChange?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    onAddToSchedule?: (taskId: string) => void;
};

export default function TaskEditable({
                                         task,
                                         onClick,
                                         onChange,
                                         onDelete,
                                         onAddToSchedule,
                                     }: TaskEditableProps) {
    const [collapsed, setCollapsed] = useState<boolean>(true);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [local, setLocal] = useState<Task>({...task});


    // Commit a single field change to parent on blur
    const handleBlur = (field: keyof Task, value: Task[keyof Task]) => {
        const updated = {...local, [field]: value};
        setLocal(updated);
        onChange?.(updated);
    };

    const handleImportanceSelect = (value: number) => {
        const updated = {...local, importance: value};
        setLocal(updated);
        onChange?.(updated); // immediate for radio-style click
    };

    return (
        <Container onClick={onClick}>
            {/* ── Title Row ── */}
            <TitleRow>
                <TitleInput
                    value={local.title}
                    onChange={(e) => setLocal({...local, title: e.target.value})}
                    onBlur={(e) => handleBlur("title", e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Task title"
                />
                <MenuButton
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen((prev) => !prev);
                    }}
                    title="Options"
                >
                    ⋮
                </MenuButton>
            </TitleRow>

            {/* ── Context Menu ── */}
            {menuOpen && (
                <ContextMenu>
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
                <>
                    <DescriptionTextarea
                        value={local.description}
                        onChange={(e) => setLocal({...local, description: e.target.value})}
                        onBlur={(e) => handleBlur("description", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Description"
                    />

                    <FieldRow>
                        <FieldLabel>
                            Due Date
                            <FieldInput
                                type="date"
                                value={local.due_date ?? ""}
                                onChange={(e) => setLocal({...local, due_date: e.target.value})}
                                onBlur={(e) => handleBlur("due_date", e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </FieldLabel>

                        <FieldLabel>
                            Duration (min)
                            <FieldInput
                                type="number"
                                min={1}
                                value={local.task_duration ?? ""}
                                onChange={(e) =>
                                    setLocal({...local, task_duration: Number(e.target.value)})
                                }
                                onBlur={(e) => handleBlur("task_duration", Number(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="e.g. 30"
                            />
                        </FieldLabel>
                    </FieldRow>

                    <FieldRow>
                        <FieldLabel>
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
                    </FieldRow>
                </>
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