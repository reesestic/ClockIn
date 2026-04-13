    import styled from "styled-components";
    import TaskList from "./TaskList";
    import type { TaskSidebarProps } from "./TaskSidebarProps.ts";
    import type { Task } from "../../types/Task.ts";

    // ── Styled Components ────────────────────────────────────────────────────────

    const SidebarContainer = styled.div`
        position: relative;
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;

    const Header = styled.div`
        padding: 12px 16px;
    `;

    const Heading = styled.h4`
        text-align: center;
        font-size: calc(2px + 3.5vh);
        font-family: "clother", sans-serif;
        font-weight: 700;
        font-style: italic;
        color: white;
    `;


    const SubHeader = styled.h4`
        font-size: calc(2px + 1vh);
        font-family: "clother", sans-serif;
        font-weight: 400;
        font-style: italic;
        color: white;
        margin: 0;
        text-align: center;
    `;

    const ScrollableTaskList = styled.div`
        flex: 1;
        overflow-y: auto;
        width: 80%;
        border-radius: 5px;
        margin: 1% auto;
        scrollbar-width: none; /* Firefox */
        &::-webkit-scrollbar {
            display: none; /* Chrome, Safari */
    `;

    // ── Component ────────────────────────────────────────────────────────────────

    type TaskSidebarFullProps = {
        props: TaskSidebarProps;
        onAddTask: (task: Omit<Task, "id" | "can_schedule">) => Promise<void>;
        onDeleteTask?: (taskId: string) => void;
        onAddToSchedule?: (taskId: string) => void;
        onSplitTask?: (task: Task) => void;
    };

    export default function TaskSidebar({
                                            props,
                                            onAddTask,
                                            onDeleteTask,
                                            onAddToSchedule,
                                            onSplitTask,
                                        }: TaskSidebarFullProps) {

        const handleAdd = async () => {
            await onAddTask({
                title: "",
                description: "",
                due_date: null,
                task_duration: 0,
                importance: 0,
                difficulty: 0,
                status: "to do",
            });
        };

        return (
            <SidebarContainer>
                {/* ── Header ── */}
                <Header>
                    <Heading>Your Task List</Heading>
                    <SubHeader>things you need to get done...</SubHeader>
                </Header>

                {/* ── Task List ── */}
                <ScrollableTaskList>
                    <TaskList
                        tasks={props.tasks ?? []}
                        selectedTaskIds={props.selectedTaskIds}
                        onToggleSelect={props.onToggleSelect}
                        onUpdateTask={props.onUpdateTask}
                        onSelectTask={props.onSelectTask}
                        onDeleteTask={onDeleteTask}
                        onAddToSchedule={onAddToSchedule}
                        onAddTask={handleAdd}
                        mode={props.mode}
                        onSplitTask={onSplitTask}
                    />
                </ScrollableTaskList>
            </SidebarContainer>
        );
    }