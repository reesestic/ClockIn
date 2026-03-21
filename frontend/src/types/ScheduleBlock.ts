export type ScheduleBlock = {
    id: string;
    title: string;

    start: string;
    end: string;

    duration?: number;
    task_id?: string;
    // future extensibility
    color?: string;
};