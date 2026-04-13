import { useState, useEffect } from "react";
import styled from "styled-components";
import ScheduleView from "../components/scheduleComponents/ScheduleView.tsx";
import ScheduleFilterModal from "../components/modal/ScheduleFilterModal.tsx";
import { useAuth } from "../context/AuthContext";
import HomepageBlankIcon from "../components/icons/HomepageBlankIcon";

import type { Task } from "../types/Task";
import type { Schedule } from "../types/Schedule";
import type { ScheduleBlock } from "../types/ScheduleBlock";

import { getTasks } from "../api/taskApi";
import { rejectBlock, getSchedule, confirmSchedule } from "../api/scheduleApi";
import { getBusyTimes } from "../api/busyTimesApi";
import { getGoogleStatus } from "../api/googleApi";
import { ROUTES } from "../constants/Routes.ts";
import BackButton from "../components/navigation/BackButton.tsx";

const PageBg = styled.div`
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
  overflow: hidden;
`;

const BlurredBg = styled(HomepageBlankIcon)`
  position: fixed;
  inset: -40px;
  width: calc(100% + 80px);
  height: calc(100% + 80px);
  z-index: 0;
  filter: blur(28px);
  transform: scale(1.05);
`;

const BgDim = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  z-index: 1;
`;

const BackBtnWrapper = styled.div`
  position: fixed;
  top: 1.2rem;
  left: 1.2rem;
  z-index: 10;
`;

const Card = styled.div`
  position: relative;
  z-index: 2;
  background: #ffffff;
  border-radius: 5px;
  width: 100%;
  max-width: 1100px;
  height: calc(100vh - 5rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 2rem 3rem 2rem 3rem;
  box-sizing: border-box;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.25);
`;

function pad(n: number) { return String(n).padStart(2, "0"); }

function getThisWeekDates(): string[] {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
}

function busyTimesToBlocks(busyTimes: { id: string; title: string; start_time: string | null; end_time: string | null; days_of_week: string[] }[], dates: string[]): ScheduleBlock[] {
    const DAY_ABBR: Record<number, string> = { 0: "SUN", 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };
    const blocks: ScheduleBlock[] = [];
    for (const bt of busyTimes) {
        if (!bt.start_time || !bt.end_time) continue;
        for (const date of dates) {
            const dayAbbr = DAY_ABBR[new Date(date + "T00:00").getDay()];
            if (bt.days_of_week?.length > 0 && !bt.days_of_week.includes(dayAbbr)) continue;
            blocks.push({
                id: `cal:${bt.id}:${date}`,
                title: bt.title,
                date,
                start: bt.start_time.slice(0, 5),
                end: bt.end_time.slice(0, 5),
                isCalendarEvent: true,
            });
        }
    }
    return blocks;
}

export default function PlannerPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [originalSchedule, setOriginalSchedule] = useState<Schedule | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [trackEdits, setTrackEdits] = useState(false);
    const [calendarBlocks, setCalendarBlocks] = useState<ScheduleBlock[]>([]);
    const [calendarMode, setCalendarMode] = useState<"off" | "active" | "all">("all");
    const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);

    useEffect(() => {
        getTasks().then(setTasks).catch(console.error);

        getGoogleStatus()
            .then((s) => {
                setHasGoogleCalendar(s.connected);
                if (s.connected) {
                    const dates = getThisWeekDates();
                    getBusyTimes()
                        .then((all) => {
                            const google = all.filter((bt) => bt.source === "google");
                            const ignoredIds: string[] = JSON.parse(
                                localStorage.getItem(`clockin_ignored_cal:${user?.id}`) ?? "[]"
                            );
                            const blocks = busyTimesToBlocks(google, dates).map((b) => {
                                const btId = b.id.split(":")[1] ?? null;
                                return btId && ignoredIds.includes(btId) ? { ...b, isIgnored: true } : b;
                            });
                            setCalendarBlocks(blocks);
                        })
                        .catch(console.error);
                }
            })
            .catch(console.error);

        if (user?.id) {
            getSchedule(user.id)
                .then((s) => {
                    // Strip calendar blocks — they're loaded separately
                    const taskOnly = { ...s, blocks: s.blocks.filter((b) => !b.isCalendarEvent) };
                    setSchedule(taskOnly);
                    if (taskOnly.blocks.length > 0) setIsLocked(true);
                })
                .catch(() => setSchedule(null));
        }
    }, [user?.id]);

    function handleConfirm(confirmed: Schedule) {
        const taskOnly = { ...confirmed, blocks: confirmed.blocks.filter((b) => !b.isCalendarEvent) };
        setSchedule(taskOnly);
        setOriginalSchedule(taskOnly);
        setIsLocked(true);
        setShowFilters(false);
        setTrackEdits(true);
    }

    function handleBlocksChange(newBlocks: ScheduleBlock[]) {
        if (!schedule || !user) return;

        // Strip calendar blocks — they're managed separately in calendarBlocks state
        const taskBlocks = newBlocks.filter((b) => !b.isCalendarEvent);

        const movedBlock = taskBlocks.find((nb) => {
            const old = originalSchedule?.blocks.find((b) => b.id === nb.id);
            return old && (old.start !== nb.start || old.date !== nb.date);
        });

        if (movedBlock && trackEdits) {
            const old = originalSchedule?.blocks.find((b) => b.id === movedBlock.id)!;
            rejectBlock(movedBlock.task_id!, `${old.date}T${old.start}:00`, user.id).catch(console.error);
        }

        setSchedule({ ...schedule, blocks: taskBlocks });
        confirmSchedule(taskBlocks, user.id).catch(console.error);
    }

    function handleCalendarBlockToggle(blockId: string) {
        const btId = blockId.startsWith("cal:") ? blockId.split(":")[1] : null;
        if (!btId) return;
        setCalendarBlocks((prev) => {
            const currentlyIgnored = prev.find((b) => b.id.startsWith(`cal:${btId}:`))?.isIgnored ?? false;
            const updated = prev.map((b) =>
                b.id.startsWith(`cal:${btId}:`) ? { ...b, isIgnored: !currentlyIgnored } : b
            );
            const ignoredIds = updated
                .filter((b) => b.isIgnored)
                .map((b) => b.id.split(":")[1])
                .filter(Boolean);
            localStorage.setItem(`clockin_ignored_cal:${user?.id}`, JSON.stringify([...new Set(ignoredIds)]));
            return updated;
        });
    }

    const visibleCalendarBlocks =
        calendarMode === "off"    ? [] :
        calendarMode === "active" ? calendarBlocks.filter((b) => !b.isIgnored) :
        calendarBlocks; // "all" — include ignored ones (rendered grey)

    const displaySchedule = schedule
        ? { ...schedule, blocks: [...schedule.blocks, ...visibleCalendarBlocks] }
        : visibleCalendarBlocks.length > 0
        ? { blocks: visibleCalendarBlocks }
        : null;

    return (
        <PageBg>
            <BlurredBg />
            <BgDim />
            <BackBtnWrapper>
                <BackButton to={ROUTES.HOME} style={{ color: "#fff" }} />
            </BackBtnWrapper>
            <Card>
                <ScheduleView
                    schedule={displaySchedule as Schedule | null}
                    onGenerate={() => setShowFilters(true)}
                    onEdit={() => {
                        setIsLocked(false);
                        setTrackEdits(true);
                    }}
                    onDoneEditing={() => setIsLocked(true)}
                    onBlocksChange={handleBlocksChange}
                    onCalendarBlockToggle={handleCalendarBlockToggle}
                    isLocked={isLocked}
                    calendarMode={calendarMode}
                    onSetCalendarMode={setCalendarMode}
                    hasGoogleCalendar={hasGoogleCalendar}
                />
            </Card>

            {showFilters && user && (
                <ScheduleFilterModal
                    onClose={() => setShowFilters(false)}
                    onConfirm={handleConfirm}
                    allTasks={tasks}
                    userId={user.id}
                />
            )}
        </PageBg>
    );
}
