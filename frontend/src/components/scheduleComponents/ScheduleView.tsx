import type {ScheduleViewProps} from "./ScheduleViewProps";
import ScheduleContent from "./ScheduleContent.tsx";
import ScheduleViewHeader from "./ScheduleViewHeader";
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
  overflow: hidden; /* important */
`;

export default function ScheduleView({ schedule, onGenerate, onBlockClick }: ScheduleViewProps) {

    return (
        <Wrapper>
            <HeaderSection>
                <ScheduleViewHeader
                    onGenerate={onGenerate!}
                />
            </HeaderSection>

            <ContentSection>
                {schedule ? (
                    <ScheduleContent
                        schedule={schedule}
                        onBlockClick={onBlockClick}
                    />
                ) : (
                    <div style={{ padding: "1rem" }}>No schedule yet</div>
                )}
            </ContentSection>
        </Wrapper>
    );
}