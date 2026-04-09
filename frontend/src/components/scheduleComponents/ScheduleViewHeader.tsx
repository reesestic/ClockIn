import styled from "styled-components";
import CalendarIcon from "../icons/CalendarIcon";

type Props = {
    onGenerate: () => void;
};

const Wrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.5rem 0 2rem 0;
`;

const Left = styled.div`
    display: flex;
    align-items: center;
    gap: 1.7rem;
    margin-left: 1rem;
`;

const StyledCalendarIcon = styled(CalendarIcon)`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
`;

const IconWrapper = styled.div`
  width: clamp(36px, 4vw, 64px);
  height: clamp(36px, 4vw, 64px);
  flex-shrink: 0;

  svg {
    width: 100%;
    height: 100%;
  }
`;


const TitleBlock = styled.div`
    display: flex;
    flex-direction: column;
`;

const Title = styled.h2`
    margin: 0;
    white-space: nowrap;
    font-size: clamp(0.8rem, 3rem, 4rem);
    font-weight: 700;
`;

const Subtitle = styled.p`
    margin: 2px 0 0 0;
    font-size: clamp(0.5rem, 0.9rem, 1.7rem);
    font-weight: 700;
    color: #636363;
`;

const Right = styled.div`
    display: flex;
    align-items: flex-start;
    flex: 1;
    margin: 1rem 3rem;
    justify-content: space-between;
    gap: 4rem;
`;

const Actions = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
`;

const DateText = styled.div`
  font-size: 2rem;
  color: #9ca3af;
`;

const CreateButton = styled.button`
  border: 2px black solid;
  color: gray;
  border-radius: 10px;
`;

export default function ScheduleViewHeader({ onGenerate }: Props) {

    return (
        <Wrapper>
            <Left>
                <IconWrapper>
                    <StyledCalendarIcon />
                </IconWrapper>
                <TitleBlock>
                    <Title>Your Schedule</Title>
                    <Subtitle>catered to what’s most important to you...</Subtitle>
                </TitleBlock>
            </Left>

            <Right>
                <Actions>
                    <CreateButton onClick={() => onGenerate()}>
                        Create Schedule
                    </CreateButton>
                </Actions>

                <DateText>
                    {new Date().toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                    })}
                </DateText>
            </Right>
        </Wrapper>
    );
}