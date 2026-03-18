import { useEffect, useRef, useState } from "react";
import type Task from "./interfaces/task";
import { getTasksForUser, markTaskComplete } from "./api/taskApi";
import HomepageBlankIcon from "./components/icons/HomepageBlankIcon";
import TaskCard from "./components/taskComponents/TaskCard";
const TASK_COLORS = ["#f0e06e", "#b8d0f0", "#f0b8c8", "#c0e0a0", "#d0c0f0"];

const START_HOUR = 6;
const END_HOUR = 23;
const ROW_HEIGHT = 44;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

function formatHour(h: number) {
    if (h === 12) return "12pm";
    if (h < 12) return `${h}am`;
    return `${h - 12}pm`;
}

function getTopOffset(iso: string): number {
    const d = new Date(iso);
    return (d.getHours() - START_HOUR) * ROW_HEIGHT + (d.getMinutes() / 60) * ROW_HEIGHT;
}

export default function App() {
    const USER_ID = "11111111-1111-1111-1111-111111111111";

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [leftPct, setLeftPct] = useState(50);
    const isDragging = useRef(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // ── Fetch tasks from Supabase ─────────────────────────────
    useEffect(() => {
        getTasksForUser(USER_ID)
            .then(setTasks)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // ── Draggable divider ────────────────────────────────────
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !cardRef.current) return;
            const rect = cardRef.current.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setLeftPct(Math.min(70, Math.max(15, pct)));
        };
        const onMouseUp = () => { isDragging.current = false; };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    async function handleComplete(taskId: string) {
        try {
            const updated = await markTaskComplete(taskId);
            setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        } catch {
            alert("Failed to mark task complete");
        }
    }

    // ── Date display ─────────────────────────────────────────
    const today = new Date();
    const dayName   = today.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum    = today.getDate();
    const monthName = today.toLocaleDateString("en-US", { month: "short" });

    const colorMap       = new Map(tasks.map((t, i) => [t.id, TASK_COLORS[i % TASK_COLORS.length]]));
    const pendingTasks   = tasks.filter(t => !t.is_complete);
    const scheduledTasks = tasks.filter(t => t.scheduled_start && !t.is_complete);

    return (
        <>
            {/* Background */}
            <HomepageBlankIcon className="bg-image" />
            <div className="bg-overlay" />

            <div className="page-wrapper">

                {/* Back button */}
                <button className="back-btn" onClick={() => window.location.href = "https://clock-in-orcin.vercel.app"}>
                    <svg width="32" height="32" viewBox="0 0 35 35" fill="none">
                        <path d="M17.0625 0C26.4859 0 34.125 7.63914 34.125 17.0625C34.125 26.4859 26.4859 34.125 17.0625 34.125C7.63914 34.125 0 26.4859 0 17.0625C0 7.63914 7.63914 0 17.0625 0ZM20.6426 10.4023C20.1056 9.7716 19.1582 9.69554 18.5273 10.2324L10.4023 17.1475C10.0552 17.4431 9.86178 17.8811 9.87598 18.3369C9.89027 18.7925 10.1108 19.2169 10.4756 19.4902L18.6006 25.5752C19.2635 26.0717 20.2035 25.9372 20.7002 25.2744C21.1967 24.6115 21.0622 23.6715 20.3994 23.1748L13.7773 18.2148L20.4727 12.5176C21.1034 11.9806 21.1795 11.0332 20.6426 10.4023Z" fill="#eeeeee"/>
                    </svg>
                </button>

                {/* Main card */}
                <div className="main-card" ref={cardRef}>

                    {/* ── Left: Task panel ── */}
                    <div className="task-panel" style={{ width: `${leftPct}%` }}>
                        <div className="panel-heading">
                            <h1 className="panel-title">Tasks</h1>
                            <p className="panel-subtitle">things you need to get done...</p>
                        </div>

                        <div className="task-list">
                            {loading && <p className="status-msg">Loading...</p>}
                            {!loading && pendingTasks.length === 0 && (
                                <p className="status-msg">No tasks yet! Send a sticky note to get started.</p>
                            )}
                            {pendingTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    color={colorMap.get(task.id) ?? TASK_COLORS[0]}
                                    onComplete={handleComplete}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ── Draggable divider ── */}
                    <div className="divider" onMouseDown={() => { isDragging.current = true; }} />

                    {/* ── Right: Schedule panel ── */}
                    <div className="schedule-panel" style={{ width: `${100 - leftPct}%` }}>

                        <div className="schedule-header">
                            <div className="schedule-header-left">
                                <span className="calendar-emoji">📅</span>
                                <div>
                                    <h2 className="schedule-title">Your Schedule</h2>
                                    <p className="schedule-subtitle">catered to what's most important to you...</p>
                                </div>
                            </div>
                            <div className="date-badge">
                                <span className="date-small">{dayName}</span>
                                <span className="date-large">{dayNum}</span>
                                <span className="date-small">{monthName}</span>
                            </div>
                        </div>

                        <div className="timeline-scroll">
                            <div className="timeline">

                                {/* Hour rows */}
                                {HOURS.map(h => (
                                    <div className="hour-row" key={h}>
                                        <span className="hour-label">{formatHour(h)}</span>
                                        <div className="hour-line" />
                                    </div>
                                ))}

                                {/* Scheduled event blocks */}
                                {scheduledTasks.map(task => {
                                    const color = colorMap.get(task.id) ?? "#e040b0";
                                    return (
                                        <div
                                            key={task.id}
                                            className="event-block"
                                            style={{
                                                top: getTopOffset(task.scheduled_start!),
                                                height: Math.max(((task.task_duration ?? 30) / 60) * ROW_HEIGHT, 22),
                                                background: color,
                                                borderLeft: `3px solid ${color}cc`,
                                            }}
                                        >
                                            <span className="event-block-title">{task.title}</span>
                                        </div>
                                    );
                                })}

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
