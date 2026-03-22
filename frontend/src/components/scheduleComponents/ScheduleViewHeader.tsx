import styled from "styled-components";
import CalendarIcon from "../icons/CalendarIcon";
import React from "react";
import type { ScheduleFilters } from "../../types/ScheduleFilters";

type Props = {
    onGenerate: () => void;
    filters: ScheduleFilters;
    setFilters: React.Dispatch<React.SetStateAction<ScheduleFilters>>;
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

const FilterContainer = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 2;
`;

const FilterHeader = styled.div`
  background: #e5e7eb;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-style: italic;
`;

const FilterPanel = styled.div`
    position: absolute;
    top: 110%;
    right: 0;
    
    background: #d1d5db;
    padding: 12px;
    border-radius: 16px;
    
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  border: none;
  background: ${({ $active }) => ($active ? "#c7d2fe" : "#f3f4f6")};
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    background: #FFF59A;
  }
`;

export default function ScheduleViewHeader({ onGenerate, filters, setFilters }: Props) {
    const [open, setOpen] = React.useState(false);

    function toggleFilter(key: keyof ScheduleFilters) {
        setFilters(prev => ({
            ...prev,
            [key]:
                prev[key] === "none"
                    ? "desc"
                    : prev[key] === "desc"
                        ? "asc"
                        : "none",
        }));
    }

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
                    <CreateButton onClick={onGenerate}>
                        Create Schedule
                    </CreateButton>

                    <FilterContainer>
                        <FilterHeader onClick={() => setOpen(p => !p)}>
                            <span>Filter</span>
                            <span>{open ? "⌃" : "⌄"}</span>
                        </FilterHeader>

                        {open && (
                            <FilterPanel>
                                <FilterChip
                                    $active={filters.importance !== "none"}
                                    onClick={() => toggleFilter("importance")}
                                >
                                    Importance +
                                </FilterChip>

                                <FilterChip
                                    $active={filters.deadline !== "none"}
                                    onClick={() => toggleFilter("deadline")}
                                >
                                    Due Date +
                                </FilterChip>

                                <FilterChip
                                    $active={filters.time === "desc"}
                                    onClick={() => toggleFilter("time")}
                                >
                                    Time: high → low +
                                </FilterChip>

                                <FilterChip
                                    $active={filters.time === "asc"}
                                    onClick={() => toggleFilter("time")}
                                >
                                    Time: low → high +
                                </FilterChip>

                                <FilterChip
                                    $active={filters.value !== "none"}
                                    onClick={() => toggleFilter("value")}
                                >
                                    Value +
                                </FilterChip>
                            </FilterPanel>
                        )}
                    </FilterContainer>
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