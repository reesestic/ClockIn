import type {Schedule} from "../../types/Schedule.ts";
import type {ScheduleBlock} from "../../types/ScheduleBlock.ts";
import type {ScheduleFilters} from "../../types/ScheduleFilters.ts";
import type {Task} from "../../types/Task";
import React from "react";

export type ScheduleViewProps = {
    schedule: Schedule | null;
    onBlockClick?: (item: ScheduleBlock | Task | null) => void;
    onGenerate?: () => void;
    filters?: ScheduleFilters;
    setFilters?: React.Dispatch<React.SetStateAction<ScheduleFilters>>;
};