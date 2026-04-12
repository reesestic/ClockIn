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

export default function PlannerPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [trackEdits, setTrackEdits] = useState(false);

    useEffect(() => {
        getTasks().then(setTasks).catch(console.error);
        if (user?.id) {
            getSchedule(user.id)
                .then((s) => {
                    setSchedule(s);
                    if (s.blocks.length > 0) setIsLocked(true);
                })
                .catch(() => setSchedule(null));
        }
    }, [user?.id]);

    function handleConfirm(confirmed: Schedule) {
        setSchedule(confirmed);
        setIsLocked(true);
        setShowFilters(false);
        setTrackEdits(true);
    }

    function handleBlocksChange(newBlocks: ScheduleBlock[]) {
        if (!schedule || !user) return;

        const movedBlock = newBlocks.find((nb) => {
            const old = schedule.blocks.find((b) => b.id === nb.id);
            return old && (old.start !== nb.start || old.date !== nb.date);
        });

        if (movedBlock && trackEdits) {
            const old = schedule.blocks.find((b) => b.id === movedBlock.id)!;
            rejectBlock(movedBlock.task_id!, `${old.date}T${old.start}:00`, user.id).catch(console.error);
        }

        setSchedule({ ...schedule, blocks: newBlocks });
        confirmSchedule(newBlocks, user.id).catch(console.error);
    }

    return (
        <PageBg>
            <BlurredBg />
            <BgDim />
            <BackBtnWrapper>
                <BackButton to={ROUTES.HOME} style={{ color: "#fff" }} />
            </BackBtnWrapper>
            <Card>
                <ScheduleView
                    schedule={schedule}
                    onGenerate={() => setShowFilters(true)}
                    onEdit={() => {
                        setIsLocked(false);
                        setTrackEdits(true);
                    }}
                    onDoneEditing={() => setIsLocked(true)}
                    onBlocksChange={handleBlocksChange}
                    isLocked={isLocked}
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