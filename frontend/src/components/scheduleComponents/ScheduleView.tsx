import styled from "styled-components";
import type { ScheduleViewProps } from "./ScheduleViewProps";
import DraggableWeekGrid from "./DraggableWeekGrid";

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: #ffffff;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px 10px;
    flex-shrink: 0;
    border-bottom: 1px solid #f0f0f0;
`;

const TitleBlock = styled.div``;

const Title = styled.h2`
    font-size: 22px;
    font-weight: 800;
    font-style: italic;
    margin: 0 0 2px 0;
    color: #1a1a1a;
`;

const Subtitle = styled.div`
    font-size: 11px;
    color: #999;
`;

const EditBtn = styled.button`
    padding: 7px 16px;
    border-radius: 20px;
    border: 1.5px solid #1a1a1a;
    background: #ffffff;
    color: #1a1a1a;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    &:hover {
        background: #1a1a1a;
        color: #ffffff;
    }
`;

const Empty = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #bbb;
    font-size: 14px;
    text-align: center;
    padding: 20px;
`;

const GridWrapper = styled.div`
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

export default function ScheduleView({ schedule, onEdit, onBlocksChange }: ScheduleViewProps) {
    return (
        <Wrapper>
            <Header>
                <TitleBlock>
                    <Title>Your Schedule</Title>
                    <Subtitle>catered to what's most important to you…</Subtitle>
                </TitleBlock>
                {onEdit && schedule && (
                    <EditBtn onClick={onEdit} title="Edit or regenerate schedule">
                        Edit schedule
                    </EditBtn>
                )}
            </Header>

            {!schedule ? (
                <Empty>No schedule yet — check tasks on the left and click Create Schedule!</Empty>
            ) : (
                <GridWrapper>
                    <DraggableWeekGrid
                        blocks={schedule.blocks}
                        onBlocksChange={onBlocksChange ?? (() => {})}
                        lightBg
                    />
                </GridWrapper>
            )}
        </Wrapper>
    );
}
