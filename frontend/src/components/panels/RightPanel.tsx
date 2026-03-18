import styled from "styled-components";

const ManualEntry = styled.div`
display: flex;
;`

const ScheduleView = styled.div`
display: flex;
;`

export function RightPanel({viewMode}: {
    viewMode: "manual" | "schedule"; interactionMode: "edit" | "read"; })
{
    if (viewMode === "manual") {
        return <ManualEntry />;
    }

    if (viewMode === "schedule") {
        return (
            <ScheduleView/>
            // <ScheduleView mode={interactionMode} />
        );
    }

    return null;
}