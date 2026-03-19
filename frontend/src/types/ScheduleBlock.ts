export type ScheduleBlock = {
    id: string;

    taskId: string;

    title: string; // denormalized for easy UI

    start: string; // "10:00"
    end: string;   // "10:30"

    duration?: number;

    // future extensibility
    color?: string;
};