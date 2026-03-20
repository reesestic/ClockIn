import type { ScheduleViewProps } from "./ScheduleViewProps";
import ScheduleBlock from "./ScheduleBlock";

export default function ScheduleContent({ schedule, onBlockClick }: ScheduleViewProps) {
    return (
        <>
            {schedule.map(block => (
                <ScheduleBlock
                    key={block.id}
                    block={block}
                    onClick={() => onBlockClick?.(block)}
                />
            ))}
        </>
    );
}