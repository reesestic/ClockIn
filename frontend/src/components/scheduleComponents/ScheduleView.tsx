import styled from "styled-components";
import type {ScheduleViewProps} from "./ScheduleViewProps";
import ScheduleContent from "./ScheduleContent.tsx";

const ScheduleHeaderWrapper = styled.div`
    margin: 1rem;
`

export default function ScheduleView({ schedule, onBlockClick }: ScheduleViewProps) {
    if (!schedule) {
        return <div style={{ padding: "1rem" }}>No schedule yet</div>;
    }

    return (
        <>
            <ScheduleHeaderWrapper>
                Wrapper Content
            {/*title, caldnear componet, menu, refresh, dd/DD/MM    */}
            </ScheduleHeaderWrapper>
            <ScheduleContent schedule={schedule} onBlockClick={onBlockClick}/>
        </>
    );
}