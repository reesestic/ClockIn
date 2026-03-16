import { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import type { Task } from "../../interfaces/task";

interface Props {
    task: Task;
    color: string;
    onSchedule: (taskId: string) => void;
    onComplete: (taskId: string) => void;
    scheduling: boolean;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TaskCard({ task, color, onSchedule, onComplete, scheduling }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const avatar = task.title.charAt(0).toUpperCase();

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <Card>
            <CardHeader $color={color}>
                <HeaderTitle>{task.title}</HeaderTitle>
                <MenuWrapper ref={menuRef}>
                    <DotsButton onClick={() => setMenuOpen(v => !v)}>⋮</DotsButton>
                    {menuOpen && (
                        <DropMenu>
                            <DropItem onClick={() => { onSchedule(task.task_id); setMenuOpen(false); }} disabled={scheduling}>
                                <span>📅 →</span> Schedule
                            </DropItem>
                            <DropDivider />
                            <DropItem onClick={() => { onComplete(task.task_id); setMenuOpen(false); }} $danger>
                                <span>🗑</span> Delete
                            </DropItem>
                        </DropMenu>
                    )}
                </MenuWrapper>
            </CardHeader>

            <CardBody>
                <Description>{task.description || "Description..."}</Description>

                {expanded && (
                    <Details>
                        <DetailRow>
                            <DetailItem>
                                <DetailLabel>Due:</DetailLabel>
                                <DetailValue>{task.due_date ? formatDate(task.due_date) : "—"}</DetailValue>
                            </DetailItem>
                            <DetailItem>
                                <DetailLabel>Time est.:</DetailLabel>
                                <DetailValue>{task.task_duration ? formatDuration(task.task_duration) : "—"}</DetailValue>
                            </DetailItem>
                        </DetailRow>
                        <DetailRow>
                            <DetailItem>
                                <DetailLabel>Priority:</DetailLabel>
                                <DetailValue>{task.priority}</DetailValue>
                            </DetailItem>
                            <AvatarCircle $color={color}>{avatar}</AvatarCircle>
                        </DetailRow>
                        {task.scheduled_start && (
                            <ScheduledBadge>
                                Scheduled: {new Date(task.scheduled_start).toLocaleString()}
                            </ScheduledBadge>
                        )}
                    </Details>
                )}

                <ExpandBtn onClick={() => setExpanded(v => !v)}>
                    {expanded ? "∧" : "∨"}
                </ExpandBtn>
            </CardBody>
        </Card>
    );
}

const Card = styled.div`
    border-radius: 10px;
    overflow: visible;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    background: white;
    margin-bottom: 12px;
`;

const CardHeader = styled.div<{ $color: string }>`
    background: ${p => p.$color};
    border-radius: 10px 10px 0 0;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
`;

const HeaderTitle = styled.span`
    font-size: 1rem;
    font-weight: 600;
    color: #222;
`;

const MenuWrapper = styled.div`
    position: relative;
`;

const DotsButton = styled.button`
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #444;
    padding: 0 4px;
    line-height: 1;

    &:hover { color: #000; }
`;

const DropMenu = styled.div`
    position: absolute;
    right: 0;
    top: 120%;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    min-width: 160px;
    z-index: 100;
    overflow: hidden;
    padding: 6px 0;
`;

const DropItem = styled.button<{ $danger?: boolean; disabled?: boolean }>`
    width: 100%;
    background: none;
    border: none;
    text-align: left;
    padding: 8px 16px;
    font-size: 0.875rem;
    cursor: ${p => p.disabled ? "not-allowed" : "pointer"};
    color: ${p => p.$danger ? "#e53e3e" : "#333"};
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: ${p => p.disabled ? 0.5 : 1};

    &:hover:not(:disabled) { background: #f5f5f5; }
`;

const DropDivider = styled.hr`
    border: none;
    border-top: 1px solid #eee;
    margin: 4px 0;
`;

const CardBody = styled.div`
    padding: 10px 14px 6px;
    background: white;
    border-radius: 0 0 10px 10px;
`;

const Description = styled.p`
    font-size: 0.875rem;
    color: #777;
    font-style: italic;
    margin: 0 0 8px;
`;

const Details = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
`;

const DetailRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const DetailItem = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`;

const DetailLabel = styled.span`
    font-size: 0.78rem;
    color: #aaa;
`;

const DetailValue = styled.span`
    font-size: 0.78rem;
    color: #555;
`;

const AvatarCircle = styled.div<{ $color: string }>`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #e040b0;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 700;
`;

const ScheduledBadge = styled.p`
    font-size: 0.75rem;
    color: #1a56a0;
    margin: 0;
`;

const ExpandBtn = styled.button`
    display: block;
    width: 100%;
    background: none;
    border: none;
    color: #aaa;
    font-size: 1rem;
    cursor: pointer;
    padding: 2px 0 4px;
    text-align: center;

    &:hover { color: #666; }
`;
