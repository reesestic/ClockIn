export type ScheduleBlock = {
    id: string;
    title: string;

    date: string;   // "YYYY-MM-DD"
    start: string;  // "HH:MM"
    end: string;    // "HH:MM"

    duration?: number;
    task_id?: string;
    color?: string;
};
