import { useState, useRef, useEffect } from "react";
import type Task from "../../interfaces/task";

interface Props {
    task: Task;
    color: string;
    onDelete: (taskId: string) => void;
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

export default function TaskCard({ task, color, onDelete }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    return (
        <div className="task-card">

            {/* Colored header bar */}
            <div className="card-header" style={{ background: color }}>
                <span className="card-header-title">{task.title}</span>

                {/* Three-dot menu */}
                <div className="menu-wrapper" ref={menuRef}>
                    <button className="dots-btn" onClick={() => setMenuOpen(v => !v)}>⋮</button>
                    {menuOpen && (
                        <div className="drop-menu">
                            <button
                                className="drop-item danger"
                                onClick={() => { onDelete(task.id); setMenuOpen(false); }}
                            >
                                <span>🗑</span> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Card body */}
            <div className="card-body">
                <p className="card-description">{task.description || "No description..."}</p>

                {expanded && (
                    <div className="card-details">
                        <div className="detail-row">
                            <div className="detail-item">
                                <span className="detail-label">Due:</span>
                                <span className="detail-value">{task.due_date ? formatDate(task.due_date) : "—"}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Time est.:</span>
                                <span className="detail-value">{task.task_duration ? formatDuration(task.task_duration) : "—"}</span>
                            </div>
                        </div>
                        <div className="detail-row">
                            <div className="detail-item">
                                <span className="detail-label">Priority:</span>
                                <span className="detail-value">{task.priority ?? "—"} / 5</span>
                            </div>
                            <div className="avatar-circle" style={{ background: color }}>
                                {task.title.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                )}

                <button className="expand-btn" onClick={() => setExpanded(v => !v)}>
                    {expanded ? "∧" : "∨"}
                </button>
            </div>

        </div>
    );
}
