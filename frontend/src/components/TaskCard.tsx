import type Task from "../interfaces/task";
import type { Priority } from "../interfaces/task";

interface Props {
    task: Task;
    onSchedule: (taskId: string) => void;
    onComplete: (taskId: string) => void;
    scheduling: boolean;
}

const PRIORITY_STYLES: Record<Priority, string> = {
    HIGH: "priority-high",
    MED: "priority-med",
    LOW: "priority-low",
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TaskCard({ task, onSchedule, onComplete, scheduling }: Props) {
    return (
        <div className={`task-card ${task.is_complete ? "task-complete" : ""}`}>
            <div className="task-card-header">
                <span className={`priority-badge ${PRIORITY_STYLES[task.priority]}`}>
                    {task.priority}
                </span>
                {task.is_complete && <span className="done-badge">Done</span>}
                {task.scheduled_start && !task.is_complete && (
                    <span className="scheduled-badge">Scheduled</span>
                )}
            </div>

            <h2 className="task-title">{task.title}</h2>

            {task.description && (
                <p className="task-description">{task.description}</p>
            )}

            <div className="task-meta">
                <span>Due: {formatDate(task.due_date)}</span>
                <span>Duration: {formatDuration(task.task_duration)}</span>
            </div>

            {task.scheduled_start && (
                <p className="task-scheduled-time">
                    Scheduled for: {new Date(task.scheduled_start).toLocaleString()}
                </p>
            )}

            {!task.is_complete && (
                <div className="task-actions">
                    {!task.scheduled_start && (
                        <button
                            className="btn-schedule"
                            onClick={() => onSchedule(task.task_id)}
                            disabled={scheduling}
                        >
                            {scheduling ? "Scheduling..." : "Schedule"}
                        </button>
                    )}
                    <button
                        className="btn-complete"
                        onClick={() => onComplete(task.task_id)}
                    >
                        Mark Complete
                    </button>
                </div>
            )}
        </div>
    );
}
