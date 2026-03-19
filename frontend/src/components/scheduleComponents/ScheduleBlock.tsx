import styled from "styled-components";
import type { ScheduleBlock } from "../../types/ScheduleBlock";

const BlockWrapper = styled.div`
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;

  cursor: pointer;
  background: #f8f8f8;

  transition: 0.2s;

  &:hover {
    background: #eee;
  }
`;

const Title = styled.div`
  font-weight: bold;
`;

const Time = styled.div`
  font-size: 0.85rem;
  opacity: 0.7;
`;

type Props = {
    block: ScheduleBlock;
    onClick?: () => void;
};

export default function ScheduleBlock({ block, onClick }: Props) {
    return (
        <BlockWrapper onClick={onClick}>
            <Title>{block.title}</Title>
            <Time>
                {block.start} - {block.end}
            </Time>
        </BlockWrapper>
    );
}