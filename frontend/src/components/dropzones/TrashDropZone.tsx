import styled from "styled-components";
import TrashIcon from "../icons/TrashIcon.tsx";
import OpenTrashIcon from "../icons/OpenTrashIcon.tsx";

const Wrapper = styled.div`
    position: relative;
    width: 90px;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 90px;
        height: 90px;
    }
`;

const IconSlot = styled.div<{ $visible: boolean }>`
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    transform: ${({ $visible }) => ($visible ? "scale(1)" : "scale(0.85)")};
    transition: opacity 0.2s ease, transform 0.2s ease;
`;

type Props = { isHovered: boolean };

export default function TrashDropZone({ isHovered }: Props) {
    return (
        <Wrapper>
            <IconSlot $visible={!isHovered}>
                <TrashIcon />
            </IconSlot>
            <IconSlot $visible={isHovered}>
                <OpenTrashIcon />
            </IconSlot>
        </Wrapper>
    );
}