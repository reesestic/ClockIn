import styled from "styled-components";
import BackButton from "../components/navigation/BackButton";
import { ROUTES } from "../constants/Routes";
import { useState } from "react";
import BusyTimeItem from "../components/profileComponents/BusyTimeItem";
import BusyTimeModal from "../components/profileComponents/BusyTimeModal";
import { useNavigate } from "react-router-dom";


/* ── Layout ───────────────────────── */

const Page = styled.div`
    width: 100vw;
    height: 100vh;
    background: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
`;

const PageBackButton = styled(BackButton)`
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    color: #AFDBFF;
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
    margin-top: 0.3rem;
`;

const Card = styled.div`
    margin-top: 40px;
    width: 100%;
    max-width: 900px;
    background: #f5f5f5;
    border-radius: 16px;
    padding: 32px 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const CardTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 800;
    color: #222;
    margin-bottom: 12px;
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #ddd;
    width: 100%;
`;

const SettingRow = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
`;

const SettingLabel = styled.span`
    font-size: 0.9rem;
    color: #333;
`;

const Toggle = styled.button<{ $on: boolean }>`
    width: 44px;
    height: 24px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    background: ${p => (p.$on ? "#4a90d9" : "#ccc")};
    position: relative;
    transition: background 0.2s;

    &::after {
        content: "";
        position: absolute;
        top: 3px;
        left: ${p => (p.$on ? "23px" : "3px")};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        transition: left 0.2s;
    }
`;

const ActionBtn = styled.button`
    background: none;
    border: none;
    padding: 10px 0;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-size: 0.9rem;
    color: #333;
    font-weight: 600;

    &:hover { color: #111; }
`;

const BusyList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
`;

// Overlay that covers the whole page when busy times section is open
const BusyTimeOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
`;

const BusyTimePanel = styled.div`
    background: white;
    border-radius: 16px;
    padding: 28px;
    width: min(700px, 90vw);
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const PanelTitle = styled.h3`
    font-size: 1.1rem;
    font-weight: 700;
    color: #222;
    margin: 0 0 8px;
`;

const CloseBtn = styled.button`
    align-self: flex-end;
    background: none;
    border: none;
    font-size: 0.85rem;
    color: #888;
    cursor: pointer;
    &:hover { color: #333; }
`;

/* ── Component ───────────────────── */

export default function Availability() {
    const [syncOn, setSyncOn] = useState(false);
    const [showBusyPanel, setShowBusyPanel] = useState(false);
    const [editing, setEditing] = useState<null | number>(null);

    // CHANGED: useState so delete/edit actually updates the list
    const [busyTimes, setBusyTimes] = useState([
        { id: 1, title: "Gym",    time: "6:00 PM → 7:30 PM", days: "MON • WED • FRI" },
        { id: 2, title: "Class",  time: "2:00 PM → 4:00 PM", days: "TUE • THU" },
        { id: 3, title: "Dinner", time: "7:00 PM → 8:00 PM", days: "DAILY" },
    ]);

    const navigate = useNavigate();

    return (
        <Page>
            <PageBackButton to={ROUTES.SETTINGS} label="Account" />

            <TopBar>
                <PageTitle>ClockIn</PageTitle>
            </TopBar>

            <Card>
                <CardTitle>My Availability</CardTitle>

                {/* Row 1 — Edit Busy Times */}
                <ActionBtn onClick={() => navigate(ROUTES.BUSY_TIMES)}>
                    Edit Busy Times
                </ActionBtn>

                <Divider />

                {/* Row 2 — Sync Google Calendar */}
                <SettingRow>
                    <SettingLabel>Sync Google Calendar</SettingLabel>
                    <Toggle $on={syncOn} onClick={() => setSyncOn(p => !p)} />
                </SettingRow>

                <Divider />

                {/* Row 3 — Study Time Preferences */}
                <ActionBtn>
                    Edit Study Time Preferences
                </ActionBtn>

                <Divider />
            </Card>

            {/* ── Busy Times Panel ── */}
            {showBusyPanel && (
                <BusyTimeOverlay onClick={() => setShowBusyPanel(false)}>
                    <BusyTimePanel onClick={e => e.stopPropagation()}>
                        <PanelTitle>Busy Times</PanelTitle>

                        <ActionBtn onClick={() => setEditing(-1)}>
                            + Add Busy Time
                        </ActionBtn>

                        <Divider />

                        <BusyList>
                            {busyTimes.map(item => (
                                <BusyTimeItem
                                    key={item.id}
                                    title={item.title}
                                    time={item.time}
                                    days={item.days}
                                    onEdit={() => setEditing(item.id)}
                                    // CHANGED: actually removes from list
                                    onDelete={() => setBusyTimes(prev => prev.filter(b => b.id !== item.id))}
                                />
                            ))}
                        </BusyList>

                        <Divider />

                        <CloseBtn onClick={() => setShowBusyPanel(false)}>Close</CloseBtn>
                    </BusyTimePanel>
                </BusyTimeOverlay>
            )}

            {/* ── Edit Modal ── */}
            {editing !== null && (
                <BusyTimeModal onClose={() => setEditing(null)} />
            )}
        </Page>
    );
}