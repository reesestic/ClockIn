import type {ScheduleViewProps} from "./ScheduleViewProps";
import ScheduleViewHeader from "./ScheduleViewHeader";
import DraggableWeekGrid from "./DraggableWeekGrid";
import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const HeaderSection = styled.div`
  height: 20%;
  min-height: 80px;
`;

const ContentSection = styled.div`
  height: 80%;
  overflow: hidden;
`;

export default function ScheduleView({ schedule, onGenerate, onBlocksChange }: ScheduleViewProps) {
    return (
        <Wrapper>
            <HeaderSection>
                <ScheduleViewHeader onGenerate={onGenerate ?? (() => {})} />
            </HeaderSection>

            <ContentSection>
                {schedule ? (
                    <DraggableWeekGrid
                        blocks={schedule.blocks}
                        onBlocksChange={onBlocksChange ?? (() => {})}
                    />
                ) : (
                    <div style={{ padding: "1rem", color: "#999" }}>
                        No schedule yet — select tasks and click Create Schedule!
                    </div>
                )}
            </ContentSection>
        </Wrapper>
    );
}
