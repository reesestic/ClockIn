import styled from "styled-components";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 16px;
  width: 500px;
  max-width: 90%;
`;

const Title = styled.h2`
  margin-bottom: 1.5rem;
`;

const CardContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const Card = styled.div`
  flex: 1;
  border: 2px solid #ddd;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  text-align: center;
  transition: 0.2s ease;

  &:hover {
    border-color: black;
    transform: translateY(-2px);
  }
`;

const CardTitle = styled.h3`
  margin-bottom: 0.5rem;
`;

const Icon = styled.div`
  font-size: 2rem;
  margin: 0.5rem 0;
`;

const Description = styled.p`
  font-size: 0.9rem;
  color: #666;
`;

type Props = {
    onFree: () => void;
    onTask: () => void;
};

export default function TaskOpenModal({ onFree, onTask }: Props) {
    return (
        <Overlay>
            <Modal onClick={(e) => e.stopPropagation()}>
                <Title>Start Timer</Title>

                <CardContainer>
                    <Card onClick={onFree}>
                        <CardTitle>Free Timer</CardTitle>
                        <Icon>🪽</Icon>
                        <Description>Set a timer and study freely</Description>
                    </Card>

                    <Card onClick={onTask}>
                        <CardTitle>Task Timer</CardTitle>
                        <Icon>📋</Icon>
                        <Description>Pick a task and get it done</Description>
                    </Card>
                </CardContainer>
            </Modal>
        </Overlay>
    );
}