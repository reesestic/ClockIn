import type {ScheduleBlock} from "./ScheduleBlock";

export type Schedule = {
    id: string;
    name: string;
    blocks: ScheduleBlock[];
};