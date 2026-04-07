export type ScheduleBlock = {
    id: string;

    taskId: string;

    title: string; // denormalized for easy UI

    start: string; // "HH:MM" 24h format
    end: string;   // "HH:MM" 24h format

    date?: string; // "YYYY-MM-DD" for calendar week positioning

    duration?: number;

    // future extensibility
    color?: string;
};