import type { ScheduleViewProps } from "./ScheduleViewProps";
import ScheduleBlock from "./ScheduleBlock";


export default function ScheduleContent({ schedule, onBlockClick }: ScheduleViewProps) {
    if (!schedule || !schedule.blocks?.length) {
        return <div style={{ padding: "1rem" }}>
            This is returned if no schedule exists. Style this properly later :)
        </div>;
    }

    return (
        <>
            {schedule.blocks.map(block => (
                <ScheduleBlock
                    key={block.id}
                    block={block}
                    onClick={() => onBlockClick?.(block)}
                />
            ))}
        </>
    );
}