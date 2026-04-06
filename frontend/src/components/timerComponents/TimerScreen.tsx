import { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes, createGlobalStyle } from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import BackButton from "../navigation/BackButton.tsx";
import { ROUTES } from "../../constants/Routes.ts";
import { createTimerSession, generateWorkflow } from "../../api/timerApi.ts";
import type { TimerSession } from "../../types/TimerSession.ts";
import digital7 from "../../assets/fonts/digital-7.ttf";
import type { ScheduleBlock } from "../../types/ScheduleBlock.ts";
import type { Task } from "../../types/Task.ts";
import { getTask } from "../../api/taskApi.ts";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

type Status = "idle" | "running" | "paused";

interface Session {
    startTime: number;
    lastActive: number;
    paused: boolean;
    activeTabId?: string;
    endTime?: number;
    remainingOnPause?: number;
    totalPausedMs?: number;
    pausedAt?: number;
    hasStartedWork?: boolean;
}

interface WorkflowStep {
    label: string;
    duration_seconds: number;
}

/* ═══════════════════════════════════════════════════════
   SESSION ENGINE
═══════════════════════════════════════════════════════ */

const TAB_ID = (() => {
    const existing = sessionStorage.getItem("tabId");
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem("tabId", id);
    return id;
})();

function loadSession(): Session | null {
    const raw = localStorage.getItem("activeSession");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function saveSession(session: Session) {
    localStorage.setItem("activeSession", JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem("activeSession");
}

function isController(session: Session | null): boolean {
    if (!session) return true;
    return !session.activeTabId || session.activeTabId === TAB_ID;
}

function claimControl(session: Session): Session {
    session.activeTabId = TAB_ID;
    saveSession(session);
    return session;
}

function computeActiveSeconds(session: Session, now: number): number {
    const totalPausedMs = session.totalPausedMs ?? 0;
    const currentPauseMs = session.pausedAt ? (now - session.pausedAt) : 0;
    return Math.max(0, Math.floor((now - session.startTime - totalPausedMs - currentPauseMs) / 1000));
}

type ResumeAction = "fresh" | "continue" | "reuse_prompt" | "force_end";

interface MountResolution {
    session: Session | null;
    resumeAction: ResumeAction;
    timerStatus: Status;
    timerSeconds: number;
    timerDigits: string;
    isOwner: boolean;
}

function resolveSessionOnMount(): MountResolution {
    const existing = loadSession();
    const now = Date.now();

    if (!existing) {
        return {
            session: null,
            resumeAction: "fresh",
            timerStatus: "idle",
            timerSeconds: 0,
            timerDigits: "000000",
            isOwner: true,
        };
    }

    const gapMs = now - (existing.lastActive ?? existing.startTime);
    const gapHours = gapMs / (1000 * 60 * 60);

    let timerStatus: Status = "idle";
    let timerSeconds = 0;
    let timerDigits = "000000";

    if (existing.paused && existing.remainingOnPause != null) {
        timerStatus = "paused";
        timerSeconds = existing.remainingOnPause;
        timerDigits = secondsToDigits(timerSeconds);
    } else if (!existing.paused && existing.endTime != null) {
        const remaining = Math.ceil((existing.endTime - now) / 1000);
        if (remaining > 0) {
            timerStatus = "running";
            timerSeconds = remaining;
        } else {
            delete existing.endTime;
            saveSession(existing);
            timerStatus = "idle";
        }
    }

    const owner = isController(existing);

    let resumeAction: ResumeAction = "continue";
    if (gapHours <= 2) {
        existing.lastActive = now;
        if (owner) existing.activeTabId = TAB_ID;
        saveSession(existing);
        resumeAction = "continue";
    } else if (gapHours <= 8) {
        resumeAction = "reuse_prompt";
    } else {
        resumeAction = "force_end";
    }

    return { session: existing, resumeAction, timerStatus, timerSeconds, timerDigits, isOwner: owner };
}

/* ═══════════════════════════════════════════════════════
   TIMER ENGINE
═══════════════════════════════════════════════════════ */

const DIGIT_COUNT = 6;

function digitsToSeconds(digits: string): number {
    const padded = digits.padStart(DIGIT_COUNT, "0");
    const h = parseInt(padded.slice(0, 2), 10);
    const m = parseInt(padded.slice(2, 4), 10);
    const s = parseInt(padded.slice(4, 6), 10);
    return h * 3600 + m * 60 + s;
}

function secondsToDigits(total: number): string {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h.toString().padStart(2, "0")}${m.toString().padStart(2, "0")}${s.toString().padStart(2, "0")}`;
}

function isValidDigits(digits: string): boolean {
    const padded = digits.padStart(DIGIT_COUNT, "0");
    const m = parseInt(padded.slice(2, 4), 10);
    const s = parseInt(padded.slice(4, 6), 10);
    return m <= 59 && s <= 59;
}

function formatDigits(digits: string): { h: string; mm: string; ss: string } {
    const padded = digits.padStart(DIGIT_COUNT, "0");
    return {
        h:  padded.slice(0, 2).replace(/^0/, "") || "0",
        mm: padded.slice(2, 4),
        ss: padded.slice(4, 6),
    };
}

function formatSeconds(total: number): string {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    return {
        h: h.toString().padStart(2, "0"),
        m: m.toString().padStart(2, "0"),
        s: s.toString().padStart(2, "0"),
    };
}

function formatStepDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (s === 0) return `${m}:00`;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ═══════════════════════════════════════════════════════
   SYNC ENGINE
═══════════════════════════════════════════════════════ */

const SESSION_BEACON_URL = "/api/timer-sessions/beacon";

function beaconSession(payload: object) {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (navigator.sendBeacon) {
        navigator.sendBeacon(SESSION_BEACON_URL, blob);
    }
}

/* ─────────────────────────────────────────
   HELPER
───────────────────────────────────────── */

function getTaskId(item: Task | ScheduleBlock): string | undefined {
    if ("task_id" in item) {
        return (item as ScheduleBlock).task_id;
    }
    return (item as Task).id;
}

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */

const GlobalFont = createGlobalStyle`
    @font-face {
        font-family: 'Digital7';
        src: url(${digital7}) format('truetype');
        font-weight: normal;
        font-style: normal;
    }
`;

const Outer = styled.div`
    width: 100vw;
    height: 100vh;
    background: #4B94DB;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
`;

const SkyBackground = styled.div`
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    margin: 0;
`;

const scrollSky = keyframes`
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
`;

const SkyScroller = styled.div`
    display: flex;
    width: 200%;
    height: 100%;
    animation: ${scrollSky} 120s linear infinite;
    will-change: transform;
`;

const SkyTile = styled.div`
    width: 100%;
    height: 100%;
    background-image: url('/timer_sky.svg');
    background-size: cover;
    background-repeat: no-repeat;
    flex-shrink: 0;
`;

const Frame = styled.div`
    position: relative;
    width: 90%;
    height: 100%;
    border: 40px solid #F1F1F1;
    border-top: none;
    border-bottom: none;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Window = styled.div`
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: transparent;
`;

const Sill = styled.div`
    position: absolute;
    bottom: 0;
    width: 95%;
    z-index: 10;

    &::before {
        content: "";
        display: block;
        width: 100%;
        height: 28px;
        border-radius: 8px 8px 0 0;
        background: #F1F1F1;
    }

    &::after {
        content: "";
        display: block;
        width: 100%;
        height: 20px;
        background: #F1F1F1;
        border-radius: 0;
    }
`;

const Main = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-bottom: 60px;
    position: relative;
    z-index: 4;
`;

const TaskLabel = styled.div`
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-shadow: 0 1px 4px rgba(0,0,0,0.15);
`;

const TimerInputRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0;
    outline: none;
    font-family: 'Digital7', monospace;
    font-size: clamp(5rem, 14vw, 10rem);
    color: rgba(255,255,255,0.62);
    text-shadow: 0 0 10px rgba(255,255,255,0.2);
    margin-bottom: 2.5rem;
    letter-spacing: 0.02em;
`;

const DigitGroup = styled.span<{ $active?: boolean }>`
    color: inherit;
    opacity: 1;
`;

const Colon = styled.span`
    color: inherit;
    opacity: 0.6;
    margin: 0 0.08em;
`;

const TimeDisplay = styled.div`
    font-family: 'Digital7', monospace;
    font-size: clamp(5rem, 14vw, 10rem);
    color: rgba(255,255,255,0.62);
    text-shadow: 0 0 10px rgba(255,255,255,0.2);
    margin-bottom: 2.5rem;
    letter-spacing: 0.02em;
`;

const Controls = styled.div`
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
`;

const Btn = styled.button`
    padding: 0.7rem 1.6rem;
    border-radius: 10px;
    border: 2px solid rgba(255,255,255,0.9);
    background: rgba(255,255,255,0.18);
    backdrop-filter: blur(8px);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    color: white;
    letter-spacing: 0.04em;
    transition: background 0.15s, transform 0.1s;
    &:active { transform: scale(0.95); }
    &:hover { background: rgba(255,255,255,0.3); }
`;

const EndSessionButton = styled.button`
    position: absolute;
    top: 1.2rem;
    left: 4rem;
    padding: 0.4rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid rgba(255,80,80,0.8);
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(6px);
    cursor: pointer;
    color: rgba(255,100,100,1);
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    z-index: 10;
    transition: background 0.15s;
    &:hover { background: rgba(255,80,80,0.15); }
`;

const PageBackButton = styled(BackButton)`
    position: absolute;
    top: 1.2rem;
    left: 1rem;
    z-index: 10;
`;

const HintText = styled.div`
    font-size: 0.75rem;
    color: rgba(255,255,255,0.6);
    margin-top: -1.5rem;
    margin-bottom: 2rem;
    letter-spacing: 0.05em;
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(20, 40, 80, 0.35);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
`;

const OverlayContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 1.5rem;
    color: white;
`;

const PrimaryBtn = styled.button`
    padding: 0.96rem 2.4rem;
    border-radius: 999px;
    border: none;
    background: #FFF59A;
    color: #14406C;
    font-weight: 600;
    font-size: 1.14rem;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.15s;
    &:hover { opacity: 0.9; }
    &:active { transform: scale(0.96); }
`;

const SecondaryBtn = styled.button`
    padding: 0.6rem 1.6rem;
    border-radius: 999px;
    border: 3px solid #AFDBFF;
    background: white;
    color: #0E4F87;
    font-size: 0.9rem;
    cursor: pointer;
`;

const OverlayTitle = styled.h2`
    font-size: clamp(1.4rem, 2rem, 3rem);
    font-weight: 600;
    letter-spacing: 0.03em;
    margin: 0;
`;

const OverlayBtn = styled.button`
    padding: 0.7rem 1.4rem;
    border-radius: 10px;
    border: 2px solid #1a1a2e;
    background: white;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    color: #1a1a2e;
    transition: background 0.15s, transform 0.1s;
    &:active { transform: scale(0.95); }
    &:hover { background: #f0f4ff; }
`;

const SummaryCard = styled.div`
    background: #F5F5F5;
    border-radius: 20px;
    padding: 2.8rem 2.2rem;
    width: 460px;
    max-width: 92vw;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
`;

const SummaryTitle = styled.h2`
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0;
`;

const SummarySubtitle = styled.p`
    font-size: 0.9rem;
    color: #555;
    margin-top: 0.4rem;
    margin-bottom: 1.5rem;
`;

const PlantDisplay = styled.div`
    font-size: 3rem;
    margin: 1.5rem 0;
`;

const TimeBox = styled.div`
    background: #EAEAEA;
    border-radius: 16px;
    padding: 1.8rem 1.4rem;
    margin: 1.8rem 0;
    font-family: 'Digital7', monospace;
    font-size: 3.6rem;
    letter-spacing: 0.08em;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const ButtonStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
    margin-top: 1.5rem;
`;

const BlockedBanner = styled.div`
    position: absolute;
    top: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.7);
    color: white;
    text-align: center;
    padding: 0.5rem 1rem;
    font-size: 0.82rem;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    backdrop-filter: blur(4px);
    button {
        background: white;
        color: black;
        border: none;
        border-radius: 6px;
        padding: 0.2rem 0.7rem;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.78rem;
    }
`;

const Sidebar = styled.div<{ $open: boolean }>`
    position: absolute;
    top: 0; right: 0;
    height: 100%;
    width: 280px;
    background: rgba(15,15,35,0.92);
    backdrop-filter: blur(12px);
    color: white;
    transform: translateX(${({ $open }) => ($open ? "0" : "100%")});
    transition: transform 0.3s ease;
    z-index: 15;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    box-sizing: border-box;
    overflow-y: auto;
`;

const SidebarHandle = styled.button<{ $open: boolean }>`
    position: absolute;
    top: 50%;
    right: ${({ $open }) => ($open ? "280px" : "0px")};
    transform: translateY(-50%);
    transition: right 0.3s ease;
    z-index: 16;
    width: 22px;
    height: 56px;
    background: rgba(15,15,35,0.92);
    border: none;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    &::after {
        content: "";
        display: block;
        width: 6px; height: 6px;
        border-left: 2px solid white;
        border-bottom: 2px solid white;
        transform: ${({ $open }) => ($open ? "rotate(-45deg)" : "rotate(135deg)")};
        margin-left: ${({ $open }) => ($open ? "-2px" : "2px")};
        transition: transform 0.3s ease, margin-left 0.3s ease;
    }
`;

const SidebarTitle = styled.div`
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 1rem;
    opacity: 0.6;
    letter-spacing: 0.1em;
    text-transform: uppercase;
`;

const SidebarEmpty = styled.div`
    font-size: 0.82rem;
    opacity: 0.35;
    margin-top: 1rem;
`;

const PomodoroWarning = styled.div`
    font-size: 0.75rem;
    color: rgba(255, 200, 100, 0.85);
    margin-bottom: 0.75rem;
    line-height: 1.4;
`;

const StepItem = styled.div<{ $active: boolean; $done: boolean }>`
    padding: 0.6rem 0.75rem;
    margin-bottom: 0.5rem;
    border-radius: 8px;
    background: ${({ $active, $done }) =>
            $active ? "rgba(255,240,100,0.2)" : $done ? "rgba(255,255,255,0.05)" : "transparent"};
    border-left: 3px solid ${({ $active }) => ($active ? "#FFF59A" : "transparent")};
    opacity: ${({ $done }) => ($done ? 0.4 : 1)};
    transition: all 0.3s ease;
`;

const StepLabel = styled.div`
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
`;

const StepDuration = styled.div`
    font-size: 0.72rem;
    color: rgba(255,255,255,0.5);
    margin-top: 0.2rem;
`;

const StepProgressBar = styled.div<{ $pct: number }>`
    height: 2px;
    border-radius: 1px;
    background: rgba(255,255,255,0.1);
    margin-top: 0.4rem;
    overflow: hidden;

    &::after {
        content: "";
        display: block;
        height: 100%;
        width: ${({ $pct }) => $pct}%;
        background: #FFF59A;
        transition: width 1s linear;
    }
`;

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */

export default function TimerScreen() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, item, hasPlan } = (location.state as any) || {};
    const currentTask = mode === "task" ? item : null;

    const [digits, setDigits] = useState("000000");
    const [seconds, setSeconds] = useState(0);
    const [status, setStatus] = useState<Status>("idle");
    const [isOwner, setIsOwner] = useState(true);
    const [confirmQuit, setConfirmQuit] = useState(false);
    const [showTaskComplete, setShowTaskComplete] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Workflow state
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
    const [workflowLoading, setWorkflowLoading] = useState(false);
    const [isPomodoro, setIsPomodoro] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepElapsed, setStepElapsed] = useState(0);

    const channelRef = useRef<BroadcastChannel | null>(null);

    /* ══════════════════════════════════════════
       SESSION ENGINE — MOUNT RESOLUTION
    ══════════════════════════════════════════ */
    useEffect(() => {
        const { resumeAction, timerStatus, timerSeconds, timerDigits, isOwner: owner } =
            resolveSessionOnMount();

        setIsOwner(owner);
        setStatus(timerStatus);
        setSeconds(timerSeconds);
        if (timerStatus === "idle") setDigits(timerDigits);

        if (resumeAction === "force_end") {
            const session = loadSession();
            if (session) {
                forceEndSession(session).then(data => {
                    if (data) {
                        setSummaryData(data);
                        setShowSummary(true);
                    } else {
                        navigate(ROUTES.TIMER_ENTRY_PAGE);
                    }
                });
            } else {
                navigate(ROUTES.TIMER_ENTRY_PAGE);
            }
        }
    }, []);

    /* ══════════════════════════════════════════
       WORKFLOW ENGINE — LOAD ON MOUNT
    ══════════════════════════════════════════ */
    useEffect(() => {
        if (!hasPlan || !item) return;

        const taskId = getTaskId(item);
        if (!taskId) return;

        setWorkflowLoading(true);
        getTask(taskId)
            .then((task: Task) => generateWorkflow({ title: task.title, description: task.description }))
            .then((data: { steps: WorkflowStep[]; is_pomodoro: boolean }) => {
                setWorkflowSteps(data.steps);
                setIsPomodoro(data.is_pomodoro);
            })
            .catch(() => setWorkflowSteps([]))
            .finally(() => setWorkflowLoading(false));
    }, []);

    /* ══════════════════════════════════════════
       WORKFLOW ENGINE — AUTO-ADVANCE STEPS
    ══════════════════════════════════════════ */
    useEffect(() => {
        if (status !== "running" || workflowSteps.length === 0) return;

        const interval = setInterval(() => {
            setStepElapsed(prev => {
                const currentDuration = workflowSteps[currentStepIndex]?.duration_seconds ?? 0;
                const next = prev + 1;
                if (next >= currentDuration) {
                    setCurrentStepIndex(i => Math.min(i + 1, workflowSteps.length - 1));
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [status, workflowSteps, currentStepIndex]);

    /* ══════════════════════════════════════════
       SYNC ENGINE — TAB CONTROL
    ══════════════════════════════════════════ */
    useEffect(() => {
        const channel = new BroadcastChannel("timer_tab_control");
        channelRef.current = channel;

        channel.onmessage = (event) => {
            const { type, tabId } = event.data ?? {};
            if (type === "CLAIM" && tabId !== TAB_ID) {
                setIsOwner(false);
                const session = loadSession();
                if (session) { session.activeTabId = tabId; saveSession(session); }
            }
        };

        const session = loadSession();
        if (!session || isController(session)) {
            channel.postMessage({ type: "CLAIM", tabId: TAB_ID });
        }

        return () => {
            channel.postMessage({ type: "RELEASE", tabId: TAB_ID });
            channel.close();
        };
    }, []);

    const ensureControl = useCallback(() => {
        if (isOwner) return true;
        const session = loadSession();
        if (session) claimControl(session);
        channelRef.current?.postMessage({ type: "CLAIM", tabId: TAB_ID });
        setIsOwner(true);
        return true;
    }, [isOwner]);

    /* ══════════════════════════════════════════
       SESSION ENGINE — ACTIVITY TRACKING
    ══════════════════════════════════════════ */
    useEffect(() => {
        let lastUpdate = 0;

        function updateActivity() {
            const now = Date.now();
            if (now - lastUpdate < 5000) return;
            lastUpdate = now;
            const session = loadSession();
            if (!session) return;
            session.lastActive = now;
            saveSession(session);
        }

        function handleVisibility() {
            if (document.visibilityState === "visible") updateActivity();
        }

        window.addEventListener("click", updateActivity);
        window.addEventListener("keydown", updateActivity);
        window.addEventListener("mousemove", updateActivity, { passive: true });
        window.addEventListener("scroll", updateActivity, { passive: true });
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.removeEventListener("click", updateActivity);
            window.removeEventListener("keydown", updateActivity);
            window.removeEventListener("mousemove", updateActivity);
            window.removeEventListener("scroll", updateActivity);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    /* ══════════════════════════════════════════
       TIMER ENGINE — COUNTDOWN LOOP
    ══════════════════════════════════════════ */
    useEffect(() => {
        if (status !== "running") return;

        const interval = setInterval(() => {
            const session = loadSession();
            if (!session || session.paused || !session.endTime) return;

            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((session.endTime - now) / 1000));

            setSeconds(remaining);

            if (remaining <= 0) {
                const now = Date.now();
                session.paused = true;
                session.pausedAt = now;
                delete session.endTime;
                saveSession(session);
                setStatus("idle");
                setSeconds(0);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [status]);

    /* ══════════════════════════════════════════
       SYNC ENGINE — UNLOAD SAFETY
    ══════════════════════════════════════════ */
    useEffect(() => {
        function handleUnload() {
            const session = loadSession();
            if (!session || !session.hasStartedWork) { clearSession(); return; }
            const now = Date.now();
            const elapsed = Math.floor((now - session.startTime) / 1000);
            if (elapsed < 10) { clearSession(); return; }

            const payload: TimerSession = {
                ...(currentTask?.id ? { task_id: currentTask.id } : {}),
                mode: currentTask ? "task" : "free",
                started_at: new Date(session.startTime).toISOString(),
                ended_at: new Date(now).toISOString(),
                elapsed_seconds: elapsed,
                active_seconds: computeActiveSeconds(session, now),
                task_completed: false,
            };

            beaconSession(payload);
            clearSession();
        }

        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, [currentTask]);

    /* ══════════════════════════════════════════
       TIMER ENGINE — DIGIT INPUT
    ══════════════════════════════════════════ */
    const inputRef = useRef<HTMLDivElement>(null);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (status !== "idle") return;
        if (e.key >= "0" && e.key <= "9") {
            setDigits(prev => {
                const next = (prev + e.key).slice(-DIGIT_COUNT);
                if (!isValidDigits(next)) return prev;
                return next;
            });
        } else if (e.key === "Backspace") {
            setDigits(prev => ("0" + prev).slice(0, DIGIT_COUNT));
        }
    }

    /* ══════════════════════════════════════════
       TIMER ENGINE — ACTIONS
    ══════════════════════════════════════════ */

    function start() {
        ensureControl();
        const totalSeconds = digitsToSeconds(digits);
        if (!totalSeconds) return;

        const now = Date.now();
        let session = loadSession();

        if (!session) {
            session = {
                startTime: now,
                lastActive: now,
                paused: false,
                activeTabId: TAB_ID,
                totalPausedMs: 0,
                hasStartedWork: true,
            };
        }

        if (session.pausedAt) {
            session.totalPausedMs =
                (session.totalPausedMs ?? 0) + (now - session.pausedAt);
            delete session.pausedAt;
        }

        session.hasStartedWork = true;
        session.endTime = now + totalSeconds * 1000;
        session.paused = false;
        session.activeTabId = TAB_ID;

        if (session.totalPausedMs == null) session.totalPausedMs = 0;

        saveSession(session);
        setSeconds(totalSeconds);
        setStatus("running");
    }

    function pause() {
        ensureControl();
        const session = loadSession();
        if (!session || !session.endTime) return;
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((session.endTime - now) / 1000));
        session.paused = true;
        session.remainingOnPause = remaining;
        session.pausedAt = now;
        delete session.endTime;
        saveSession(session);
        setStatus("paused");
    }

    function resume() {
        ensureControl();
        const session = loadSession();
        if (!session || session.remainingOnPause == null) return;
        const now = Date.now();
        if (session.pausedAt) {
            session.totalPausedMs = (session.totalPausedMs ?? 0) + (now - session.pausedAt);
            delete session.pausedAt;
        }
        session.paused = false;
        session.endTime = now + session.remainingOnPause * 1000;
        delete session.remainingOnPause;
        saveSession(session);
        setStatus("running");
    }

    function reset() {
        ensureControl();
        const session = loadSession();
        if (session) {
            delete session.endTime;
            delete session.remainingOnPause;
            delete session.pausedAt;
            session.totalPausedMs = 0;
            session.paused = false;
            saveSession(session);
        }
        setStatus("idle");
        setSeconds(0);
        setDigits("000000");
        setCurrentStepIndex(0);
        setStepElapsed(0);
    }

    /* ══════════════════════════════════════════
       SYNC ENGINE — SESSION SAVE / END
    ══════════════════════════════════════════ */

    async function saveSessionToDB(session: Session, now: number, taskCompleted = false) {
        if (!session.hasStartedWork) return null;
        const elapsed = Math.floor((now - session.startTime) / 1000);
        if (elapsed < 10) return null;

        const payload: TimerSession = {
            ...(currentTask?.id ? { task_id: currentTask.id } : {}),
            mode: currentTask ? "task" : "free",
            started_at: new Date(session.startTime).toISOString(),
            ended_at: new Date(now).toISOString(),
            elapsed_seconds: elapsed,
            active_seconds: computeActiveSeconds(session, now),
            task_completed: taskCompleted,
        };

        try {
            const res = await createTimerSession(payload);
            return res.data;
        } catch (e) {
            console.error("Failed to save session", e);
            return null;
        }
    }

    async function forceEndSession(session: Session) {
        const now = Date.now();
        const data = await saveSessionToDB(session, now);
        clearSession();
        return data;
    }

    async function confirmEndSession(taskCompleted?: boolean) {
        const session = loadSession();
        if (!session) {
            setConfirmQuit(false);
            setShowTaskComplete(false);
            navigate(ROUTES.HOME);
            return;
        }

        const now = Date.now();
        const data = await saveSessionToDB(session, now, taskCompleted ?? false);

        clearSession();
        setStatus("idle");
        setSeconds(0);
        setDigits("000000");

        if (data) {
            setSummaryData(data);
            setShowSummary(true);
        } else {
            navigate(ROUTES.HOME);
        }
        setConfirmQuit(false);
        setShowTaskComplete(false);
    }

    function handleEndSessionClick() {
        if (currentTask) {
            setConfirmQuit(false);
            setShowTaskComplete(true);
        } else {
            setConfirmQuit(true);
        }
    }

    /* ─────────────────────────────────────
       RENDER
    ───────────────────────────────────── */

    const { h, mm, ss } = formatDigits(digits);
    const totalTyped = digitsToSeconds(digits);
    const canStart = totalTyped > 0;
    const showControlBanner = !isOwner;

    const currentStepDuration = workflowSteps[currentStepIndex]?.duration_seconds ?? 1;
    const stepProgressPct = Math.min(100, Math.round((stepElapsed / currentStepDuration) * 100));

    return (
        <>
            <GlobalFont />
            <Outer>
                <Frame>
                    <Window>
                        <SkyBackground>
                            <SkyScroller>
                                <SkyTile/>
                                <SkyTile/>
                            </SkyScroller>
                        </SkyBackground>

                        {showControlBanner && (
                            <BlockedBanner>
                                Timer is active in another tab.
                                <button onClick={() => { ensureControl(); setIsOwner(true); }}>
                                    Take control
                                </button>
                            </BlockedBanner>
                        )}

                        <PageBackButton to={ROUTES.HOME} />
                        <EndSessionButton onClick={handleEndSessionClick}>
                            End Session
                        </EndSessionButton>

                        <Main>
                            {currentTask && <TaskLabel>{currentTask.title}</TaskLabel>}

                            {status === "idle" && (
                                <>
                                    <TimerInputRow
                                        ref={inputRef}
                                        tabIndex={0}
                                        onKeyDown={handleKeyDown}
                                        onClick={() => inputRef.current?.focus()}
                                        title="Click then type digits — Backspace to clear"
                                    >
                                        <DigitGroup $active={digits.length >= 5}>{h}</DigitGroup>
                                        <Colon>:</Colon>
                                        <DigitGroup $active={digits.length >= 3 && digits.length < 5}>{mm}</DigitGroup>
                                        <Colon>:</Colon>
                                        <DigitGroup $active={digits.length < 3}>{ss}</DigitGroup>
                                    </TimerInputRow>
                                    <HintText>click &amp; type digits — backspace to clear</HintText>
                                </>
                            )}

                            {status !== "idle" && (
                                <TimeDisplay>{formatSeconds(seconds)}</TimeDisplay>
                            )}

                            <Controls>
                                {status === "idle" && (
                                    <Btn onClick={start} disabled={!canStart}
                                         style={{ opacity: canStart ? 1 : 0.35 }}>
                                        Start
                                    </Btn>
                                )}
                                {status === "running" && <Btn onClick={pause}>Pause</Btn>}
                                {status === "paused" && (
                                    <>
                                        <Btn onClick={resume}>Resume</Btn>
                                        <Btn onClick={reset}>Reset</Btn>
                                    </>
                                )}
                            </Controls>
                        </Main>

                        {hasPlan && (
                            <>
                                <SidebarHandle
                                    $open={sidebarOpen}
                                    onClick={() => setSidebarOpen(o => !o)}
                                    aria-label={sidebarOpen ? "Close plan" : "Open plan"}
                                />
                                <Sidebar $open={sidebarOpen}>
                                    <SidebarTitle>
                                        {isPomodoro ? "Pomodoro Workflow" : "Study Plan"}
                                    </SidebarTitle>

                                    {workflowLoading && (
                                        <SidebarEmpty>Generating your plan...</SidebarEmpty>
                                    )}

                                    {!workflowLoading && isPomodoro && (
                                        <PomodoroWarning>
                                            ⚠️ Not enough info for a custom plan — using Pomodoro instead.
                                            Add more to your task description for a tailored workflow.
                                        </PomodoroWarning>
                                    )}

                                    {!workflowLoading && workflowSteps.map((step, i) => (
                                        <StepItem
                                            key={i}
                                            $active={i === currentStepIndex}
                                            $done={i < currentStepIndex}
                                        >
                                            <StepLabel>{step.label}</StepLabel>
                                            <StepDuration>
                                                {formatStepDuration(step.duration_seconds)}
                                            </StepDuration>
                                            {i === currentStepIndex && (
                                                <StepProgressBar $pct={stepProgressPct} />
                                            )}
                                        </StepItem>
                                    ))}

                                    {!workflowLoading && workflowSteps.length === 0 && (
                                        <SidebarEmpty>Could not generate a plan.</SidebarEmpty>
                                    )}
                                </Sidebar>
                            </>
                        )}
                    </Window>
                </Frame>

                <Sill />

                {showTaskComplete && (
                    <Overlay>
                        <OverlayContent>
                            <h3>Did you finish your task?</h3>
                            <p style={{ fontWeight: 600, color: "#333" }}>{currentTask?.title}</p>
                            <div className="actions">
                                <OverlayBtn onClick={() => confirmEndSession(true)}>Yes ✓</OverlayBtn>
                                <OverlayBtn onClick={() => confirmEndSession(false)}>Not yet</OverlayBtn>
                            </div>
                        </OverlayContent>
                    </Overlay>
                )}

                {confirmQuit && (
                    <Overlay>
                        <OverlayContent>
                            <OverlayTitle>
                                End Timer Session?
                            </OverlayTitle>
                            <PrimaryBtn onClick={() => setConfirmQuit(false)}>
                                Continue
                            </PrimaryBtn>
                            <SecondaryBtn onClick={() => confirmEndSession()}>
                                End Timer
                            </SecondaryBtn>
                        </OverlayContent>
                    </Overlay>
                )}

                {showSummary && (
                    <Overlay>
                        <SummaryCard>
                            <SummaryTitle>Good Job!</SummaryTitle>
                            {true && (
                                <>
                                    <SummarySubtitle>You grew a plant!</SummarySubtitle>
                                    <PlantDisplay>🌱</PlantDisplay>
                                </>
                            )}
                            <div style={{ fontSize: "0.85rem", marginTop: "1rem", color: "#333" }}>
                                You studied for
                            </div>
                            {(() => {
                                const active = summaryData.active_seconds ?? 0;
                                const { h, m, s } = formatHMS(active);
                                return (
                                    <TimeBox>
                                        {h}:{m}:{s}
                                    </TimeBox>
                                );
                            })()}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-around",
                                    fontSize: "0.8rem",
                                    color: "#666",
                                    marginTop: "0.5rem"
                                }}
                            >
                                <span>hours</span>
                                <span>minutes</span>
                                <span>seconds</span>
                            </div>
                            <ButtonStack>
                                <PrimaryBtn onClick={() => navigate(ROUTES.TIMER_ENTRY_PAGE)}>
                                    Study Again
                                </PrimaryBtn>
                                <SecondaryBtn onClick={() => navigate(ROUTES.HOME)}>
                                    Leave Timer
                                </SecondaryBtn>
                            </ButtonStack>
                        </SummaryCard>
                    </Overlay>
                )}
            </Outer>
        </>
    );
}