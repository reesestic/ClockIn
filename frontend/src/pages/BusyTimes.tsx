import styled from "styled-components";
import BackButton from "../components/navigation/BackButton";
import { ROUTES } from "../constants/Routes";
import { useState } from "react";
import BusyTimeItem from "../components/profileComponents/BusyTimeItem";
import BusyTimeModal from "../components/profileComponents/BusyTimeModal";

/* ── Types ───────────────────────── */

interface BusyTime {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    days: string[];
}

/* ── Sample Data ─────────────────── */

const SAMPLE: BusyTime[] = [
    { id: 1, title: "Gym",    startTime: "6:00 PM",  endTime: "7:30 PM",  days: ["MON", "WED", "FRI"] },
    { id: 2, title: "Class",  startTime: "2:00 PM",  endTime: "4:00 PM",  days: ["TUE", "THU"] },
    { id: 3, title: "Dinner", startTime: "7:00 PM",  endTime: "8:00 PM",  days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] },
    { id: 4, title: "Sleep",  startTime: "11:00 PM", endTime: "7:00 AM",  days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] },
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const BLOCK_COLORS = ["#AFDBFF", "#FFD6A5", "#CAFFBF", "#FFC6FF", "#FDFFB6", "#BDB2FF", "#FFB3C1"];
const colorMap: Record<number, string> = {};
SAMPLE.forEach((b, i) => { colorMap[b.id] = BLOCK_COLORS[i % BLOCK_COLORS.length]; });

/* ── Helpers ─────────────────────── */

function formatTimeRange(start: string, end: string) {
    return `${start} → ${end}`;
}

function daysLabel(days: string[]) {
    if (days.length === 7) return "DAILY";
    return days.join(" • ");
}

/* ── Styles — Page ───────────────── */

const Page = styled.div`
    width: 100vw;
    min-height: 100vh;
    background: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 60px;
    position: relative;
`;

const TopBar = styled.div`
    width: 100%;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    position: relative;
`;

const PageTitle = styled.div`
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: clamp(0.7rem, 1rem, 1.3rem);
    font-weight: 600;
    color: #4B94DB;
    letter-spacing: 0.04em;
`;

const PageBackButton = styled(BackButton)`
    color: #AFDBFF;
`;

const AddBtn = styled.button`
    margin-top: 24px;
    padding: 10px 24px;
    background: #4B94DB;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    align-self: flex-start;
    margin-left: calc((100vw - min(960px, 95vw)) / 2);

    &:hover { background: #3a7fc1; }
`;

const SectionLabel = styled.div`
    width: min(960px, 95vw);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #aaa;
    text-transform: uppercase;
    margin-top: 32px;
    margin-bottom: 10px;
`;

/* ── Styles — Grid ───────────────── */

const GridWrapper = styled.div`
    width: min(960px, 95vw);
    border: 1.5px solid #e8e8e8;
    border-radius: 14px;
    overflow: hidden;
`;

const GridHeader = styled.div`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: #f5f5f5;
    border-bottom: 1.5px solid #e8e8e8;
`;

const DayHeader = styled.div`
    padding: 10px 0;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #555;
    letter-spacing: 0.06em;
`;

const GridBody = styled.div`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    min-height: 120px;
    align-items: start;
`;

const DayCol = styled.div`
    padding: 10px 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-right: 1px solid #f0f0f0;

    &:last-child { border-right: none; }
`;

const GridBlock = styled.button`
    width: 100%;
    padding: 6px 8px;
    border-radius: 8px;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;

    &:hover { opacity: 0.8; transform: scale(1.02); }
`;

const BlockTitle = styled.div`
    font-size: 0.75rem;
    font-weight: 700;
    color: #222;
`;

const BlockTime = styled.div`
    font-size: 0.65rem;
    color: #555;
    margin-top: 2px;
`;

/* ── Styles — List ───────────────── */

const ListWrapper = styled.div`
    width: min(960px, 95vw);
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const DayGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const DayGroupLabel = styled.div`
    font-size: 0.8rem;
    font-weight: 700;
    color: #4B94DB;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #AFDBFF;
`;

/* ── Component ───────────────────── */

export default function BusyTimes() {
    const [busyTimes, setBusyTimes] = useState<BusyTime[]>(SAMPLE);
    const [editing, setEditing] = useState<null | number>(null);

    function handleDelete(id: number) {
        setBusyTimes(prev => prev.filter(b => b.id !== id));
    }

    return (
        <Page>
            <TopBar>
                <PageBackButton to={ROUTES.AVAILABILITY} label="Availability" />
                <PageTitle>ClockIn</PageTitle>
            </TopBar>

            <AddBtn onClick={() => setEditing(-1)}>+ Add Busy Time</AddBtn>

            {/* ══════════════════════════════════════
                SECTION 1 — 7-COLUMN GRID
            ══════════════════════════════════════ */}
            <SectionLabel>Weekly Overview</SectionLabel>

            <GridWrapper>
                <GridHeader>
                    {DAYS.map(d => <DayHeader key={d}>{d}</DayHeader>)}
                </GridHeader>

                <GridBody>
                    {DAYS.map(day => (
                        <DayCol key={day}>
                            {busyTimes
                                .filter(b => b.days.includes(day))
                                .map(b => (
                                    <GridBlock
                                        key={b.id}
                                        onClick={() => setEditing(b.id)}
                                        title={`${b.title} — click to edit`}
                                    >
                                        <BlockTitle>{b.title}</BlockTitle>
                                        <BlockTime>{b.startTime}</BlockTime>
                                        <BlockTime>{b.endTime}</BlockTime>
                                    </GridBlock>
                                ))
                            }
                        </DayCol>
                    ))}
                </GridBody>
            </GridWrapper>

            {/* ══════════════════════════════════════
                SECTION 2 — GROUPED LIST
            ══════════════════════════════════════ */}
            <SectionLabel>By Day</SectionLabel>

            <ListWrapper>
                {DAYS.map(day => {
                    const items = busyTimes.filter(b => b.days.includes(day));
                    if (items.length === 0) return null;
                    return (
                        <DayGroup key={day}>
                            <DayGroupLabel>{day}</DayGroupLabel>
                            {items.map(b => (
                                <BusyTimeItem
                                    key={b.id}
                                    title={b.title}
                                    time={formatTimeRange(b.startTime, b.endTime)}
                                    days={daysLabel(b.days)}
                                    onEdit={() => setEditing(b.id)}
                                    onDelete={() => handleDelete(b.id)}
                                />
                            ))}
                        </DayGroup>
                    );
                })}
            </ListWrapper>

            {/* ── Edit / Add Modal ── */}
            {editing !== null && (
                <BusyTimeModal onClose={() => setEditing(null)} />
            )}
        </Page>
    );
}