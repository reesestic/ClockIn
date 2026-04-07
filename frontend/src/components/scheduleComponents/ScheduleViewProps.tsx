import type {Schedule} from "../../types/Schedule.ts";
import type {ScheduleBlock} from "../../types/ScheduleBlock.ts";
import type {Task} from "../../types/Task";

export type ScheduleViewProps = {
    schedule?: Schedule;
    onBlockClick?: (item: ScheduleBlock | Task | null) => void;
    onEdit?: () => void;
    onBlocksChange?: (blocks: ScheduleBlock[]) => void;
}
