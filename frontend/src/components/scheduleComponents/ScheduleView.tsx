import type { ScheduleBlock } from "../../types/ScheduleBlock";
import ScheduleBlockComponent from "./ScheduleBlock";

type Props = {
    schedule: ScheduleBlock[];
    onClickBlock?: (block: ScheduleBlock) => void;
};

export default function ScheduleView({ schedule, onClickBlock }: Props) {
    return (
        <div>
            {schedule.map(block => (
                <ScheduleBlockComponent
                    key={block.id}
                    block={block}
                    onClick={() => onClickBlock?.(block)}
                />
            ))}
        </div>
    );
}