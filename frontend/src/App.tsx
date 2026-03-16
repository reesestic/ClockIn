import { useEffect, useState } from "react";
import styled from "styled-components";
import type { Task } from "./interfaces/task";
import { getTasksForUser, scheduleTask, markTaskComplete } from "./api/taskApi";
import HomepageBlankIcon from "./components/icons/HomepageBlankIcon";
import TaskCard from "./components/taskComponents/TaskCard";

const USER_ID = "11111111-1111-1111-1111-111111111111";

const TASK_COLORS = ["#f0e06e", "#b8d0f0", "#f0b8c8", "#c0e0a0", "#d0c0f0"];

const START_HOUR = 6;
const END_HOUR = 23;
const ROW_HEIGHT = 44;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

function formatHour(h: number) {
    if (h === 12) return "12pm";
    if (h < 12) return `${h}am`;
    return `${h - 12}pm`;
}

function getTopOffset(iso: string): number {
    const d = new Date(iso);
    return (d.getHours() - START_HOUR) * ROW_HEIGHT + (d.getMinutes() / 60) * ROW_HEIGHT;
}

export default function App() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [schedulingId, setSchedulingId] = useState<string | null>(null);

    useEffect(() => {
        getTasksForUser(USER_ID)
            .then(setTasks)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    async function handleSchedule(taskId: string) {
        const oauthToken = prompt("Enter your Google OAuth access token:");
        const refreshToken = prompt("Enter your Google refresh token:");
        if (!oauthToken || !refreshToken) return;

        setSchedulingId(taskId);
        try {
            const result = await scheduleTask(taskId, oauthToken, refreshToken, USER_ID);
            setTasks(prev =>
                prev.map(t =>
                    t.task_id === taskId
                        ? { ...t, calendar_event_id: result.calendar_event_id, scheduled_start: result.scheduled_start }
                        : t
                )
            );
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to schedule task");
        } finally {
            setSchedulingId(null);
        }
    }

    async function handleComplete(taskId: string) {
        try {
            const updated = await markTaskComplete(taskId);
            setTasks(prev => prev.map(t => (t.task_id === taskId ? updated : t)));
        } catch {
            alert("Failed to mark task complete");
        }
    }

    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = today.getDate();
    const monthName = today.toLocaleDateString("en-US", { month: "short" });

    const colorMap = new Map(tasks.map((t, i) => [t.task_id, TASK_COLORS[i % TASK_COLORS.length]]));
    const pendingTasks = tasks.filter(t => !t.is_complete);
    const scheduledTasks = tasks.filter(t => t.scheduled_start && !t.is_complete);

    return (
        <>
            <Background />
            <BackgroundOverlay />

            <PageWrapper>
                <BackBtn onClick={() => window.location.href = "https://clock-in-orcin.vercel.app"}>
                    <svg width="32" height="32" viewBox="0 0 35 35" fill="none">
                        <path d="M17.0625 0C26.4859 0 34.125 7.63914 34.125 17.0625C34.125 26.4859 26.4859 34.125 17.0625 34.125C7.63914 34.125 0 26.4859 0 17.0625C0 7.63914 7.63914 0 17.0625 0ZM20.6426 10.4023C20.1056 9.7716 19.1582 9.69554 18.5273 10.2324L10.4023 17.1475C10.0552 17.4431 9.86178 17.8811 9.87598 18.3369C9.89027 18.7925 10.1108 19.2169 10.4756 19.4902L18.6006 25.5752C19.2635 26.0717 20.2035 25.9372 20.7002 25.2744C21.1967 24.6115 21.0622 23.6715 20.3994 23.1748L13.7773 18.2148L20.4727 12.5176C21.1034 11.9806 21.1795 11.0332 20.6426 10.4023Z" fill="#eeeeee"/>
                    </svg>
                </BackBtn>

                <MainCard>
                    {/* LEFT: Tasks panel */}
                    <TaskPanel>
                        <PanelHeading>
                            <PanelTitle>Tasks</PanelTitle>
                            <PanelSubtitle>things you need to get done...</PanelSubtitle>
                        </PanelHeading>

                        <TaskList>
                            {loading && <StatusMsg>Loading...</StatusMsg>}
                            {!loading && pendingTasks.length === 0 && (
                                <StatusMsg>No tasks yet! Send a sticky note to get started.</StatusMsg>
                            )}
                            {pendingTasks.map(task => (
                                <TaskCard
                                    key={task.task_id}
                                    task={task}
                                    color={colorMap.get(task.task_id) ?? TASK_COLORS[0]}
                                    onSchedule={handleSchedule}
                                    onComplete={handleComplete}
                                    scheduling={schedulingId === task.task_id}
                                />
                            ))}
                        </TaskList>
                    </TaskPanel>

                    <Divider />

                    {/* RIGHT: Schedule panel */}
                    <SchedulePanel>
                        <ScheduleHeader>
                            <ScheduleHeaderLeft>
                                <CalendarEmoji>📅</CalendarEmoji>
                                <ScheduleTitleGroup>
                                    <ScheduleTitle>Your Schedule</ScheduleTitle>
                                    <ScheduleSubtitle>catered to what's most important to you...</ScheduleSubtitle>
                                </ScheduleTitleGroup>
                            </ScheduleHeaderLeft>
                            <DateBadge>
                                <DateSmall>{dayName}</DateSmall>
                                <DateLarge>{dayNum}</DateLarge>
                                <DateSmall>{monthName}</DateSmall>
                            </DateBadge>
                        </ScheduleHeader>

                        <TimelineScroll>
                            <Timeline>
                                {HOURS.map(h => (
                                    <HourRow key={h}>
                                        <HourLabel>{formatHour(h)}</HourLabel>
                                        <HourLine />
                                    </HourRow>
                                ))}

                                {scheduledTasks.map(task => (
                                    <EventDot
                                        key={task.task_id}
                                        style={{ top: getTopOffset(task.scheduled_start!) }}
                                        $color={colorMap.get(task.task_id) ?? "#e040b0"}
                                    >
                                        {task.title.charAt(0).toUpperCase()}
                                    </EventDot>
                                ))}
                            </Timeline>
                        </TimelineScroll>
                    </SchedulePanel>
                </MainCard>
            </PageWrapper>
        </>
    );
}

// ── Background ─────────────────────────────────────────────

const Background = styled(HomepageBlankIcon)`
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: -2;
`;

const BackgroundOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.25);
    z-index: -1;
`;

// ── Page ───────────────────────────────────────────────────

const PageWrapper = styled.div`
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    position: relative;
`;

const BackBtn = styled.button`
    position: fixed;
    top: 1.5rem;
    left: 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    z-index: 10;

    &:hover svg path { fill: #fff; }
`;

// ── Main Card ──────────────────────────────────────────────

const MainCard = styled.div`
    background: white;
    border-radius: 20px;
    width: 100%;
    max-width: 1200px;
    height: calc(100vh - 4rem);
    display: flex;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
`;

const Divider = styled.div`
    width: 1px;
    background: #e8e8e8;
    flex-shrink: 0;
`;

// ── Left: Task Panel ───────────────────────────────────────

const TaskPanel = styled.div`
    width: 340px;
    flex-shrink: 0;
    background: #f5f5f5;
    display: flex;
    flex-direction: column;
    border-radius: 20px 0 0 20px;
`;

const PanelHeading = styled.div`
    padding: 1.5rem 1.25rem 0.75rem;
`;

const PanelTitle = styled.h1`
    font-size: 2rem;
    font-weight: 800;
    font-style: italic;
    color: #111;
    margin: 0;
`;

const PanelSubtitle = styled.p`
    font-size: 0.85rem;
    color: #888;
    font-style: italic;
    margin: 4px 0 0;
`;

const TaskList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 1rem 1rem;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
`;

const StatusMsg = styled.p`
    color: #aaa;
    font-size: 0.875rem;
    text-align: center;
    padding: 2rem 0;
`;

// ── Right: Schedule Panel ──────────────────────────────────

const SchedulePanel = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

const ScheduleHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
`;

const ScheduleHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const CalendarEmoji = styled.span`
    font-size: 2rem;
`;

const ScheduleTitleGroup = styled.div``;

const ScheduleTitle = styled.h2`
    font-size: 1.75rem;
    font-weight: 800;
    font-style: italic;
    color: #111;
    margin: 0;
`;

const ScheduleSubtitle = styled.p`
    font-size: 0.8rem;
    color: #aaa;
    font-style: italic;
    margin: 2px 0 0;
`;

const DateBadge = styled.div`
    display: flex;
    align-items: baseline;
    gap: 2px;
    color: #bbb;
`;

const DateSmall = styled.span`
    font-size: 0.85rem;
`;

const DateLarge = styled.span`
    font-size: 3rem;
    font-weight: 300;
    line-height: 1;
    color: #ccc;
`;

// ── Timeline ───────────────────────────────────────────────

const TimelineScroll = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 1rem;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: #eee; border-radius: 4px; }
`;

const Timeline = styled.div`
    position: relative;
`;

const HourRow = styled.div`
    display: flex;
    align-items: center;
    height: ${ROW_HEIGHT}px;
`;

const HourLabel = styled.span`
    width: 40px;
    font-size: 0.75rem;
    color: #aaa;
    flex-shrink: 0;
`;

const HourLine = styled.div`
    flex: 1;
    height: 1px;
    background: #ebebeb;
`;

const EventDot = styled.div<{ $color: string }>`
    position: absolute;
    left: 200px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e040b0;
    color: white;
    font-weight: 700;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(-50%);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 2;
`;
