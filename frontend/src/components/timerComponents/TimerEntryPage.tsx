import { useNavigate } from "react-router-dom";
import TaskOpenModal from "../modal/TaskOpenModal.tsx"
import styled from "styled-components";
import BackButton from "../navigation/BackButton.tsx";
import { ROUTES } from "../../constants/Routes.ts";

const PageBackButton = styled(BackButton)`
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    z-index: 1100;
`;

export default function TimerEntryPage() {
    const navigate = useNavigate();

    return (
        <>
            <PageBackButton to={ROUTES.HOME}/>
            <TaskOpenModal
                onFree={() =>
                    navigate(ROUTES.TIMER_SCREEN, {
                        state: { mode: "free" }
                    })
                }
                onTask={() =>
                    navigate(ROUTES.TIMER_TASK_SELECTION_PAGE)
                }
            />
        </>
    );
}