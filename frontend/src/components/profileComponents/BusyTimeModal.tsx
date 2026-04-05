import styled from "styled-components";
import BusyTimeCard from "./BusyTimeCard.tsx";

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Modal = styled.div`
    background: white;
    border-radius: 12px;
    padding: 20px;
    width: 400px;
`;

type Props = {
    onClose: () => void;
}

export default function BusyTimeModal({ onClose } : Props) {
    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <BusyTimeCard />
            </Modal>
        </Overlay>
    );
}