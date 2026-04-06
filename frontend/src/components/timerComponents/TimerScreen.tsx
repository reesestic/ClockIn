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
   SESSION ENGINE — pure functions, no React
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
function saveSession(s: Session) { localStorage.setItem("activeSession", JSON.stringify(s)); }
function clearSession() { localStorage.removeItem("activeSession"); }
function isController(s: Session | null) { return !s || !s.activeTabId || s.activeTabId === TAB_ID; }
function claimControl(s: Session): Session { s.activeTabId = TAB_ID; saveSession(s); return s; }

function computeActiveSeconds(session: Session, now: number): number {
    const paused = session.totalPausedMs ?? 0;
    const currentPause = session.pausedAt ? (now - session.pausedAt) : 0;
    return Math.max(0, Math.floor((now - session.startTime - paused - currentPause) / 1000));
}

function resolveSessionOnMount(): {
    resumeAction: "fresh" | "continue" | "reuse_prompt" | "force_end";
    timerStatus: Status;
    timerSeconds: number;
    timerDigits: string;
    isOwner: boolean;
} {
    const existing = loadSession();
    const now = Date.now();

    if (!existing) return { resumeAction: "fresh", timerStatus: "idle", timerSeconds: 0, timerDigits: "000000", isOwner: true };

    const gapHours = (now - (existing.lastActive ?? existing.startTime)) / 3_600_000;
    let timerStatus: Status = "idle";
    let timerSeconds = 0;
    let timerDigits = "000000";

    if (existing.paused && existing.remainingOnPause != null) {
        timerStatus = "paused";
        timerSeconds = existing.remainingOnPause;
        timerDigits = secondsToDigits(timerSeconds);
    } else if (!existing.paused && existing.endTime != null) {
        const remaining = Math.ceil((existing.endTime - now) / 1000);
        if (remaining > 0) { timerStatus = "running"; timerSeconds = remaining; }
        else { delete existing.endTime; saveSession(existing); }
    }

    const isOwner = isController(existing);
    let resumeAction: "fresh" | "continue" | "reuse_prompt" | "force_end" = "continue";
    if (gapHours <= 2) {
        existing.lastActive = now;
        if (isOwner) existing.activeTabId = TAB_ID;
        saveSession(existing);
    } else if (gapHours <= 8) {
        resumeAction = "reuse_prompt";
    } else {
        resumeAction = "force_end";
    }

    return { resumeAction, timerStatus, timerSeconds, timerDigits, isOwner };
}

/* ═══════════════════════════════════════════════════════
   TIMER HELPERS
═══════════════════════════════════════════════════════ */

const DIGIT_COUNT = 6;

function digitsToSeconds(d: string): number {
    const p = d.padStart(DIGIT_COUNT, "0");
    return parseInt(p.slice(0,2),10)*3600 + parseInt(p.slice(2,4),10)*60 + parseInt(p.slice(4,6),10);
}
function secondsToDigits(t: number): string {
    const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = t%60;
    return `${String(h).padStart(2,"0")}${String(m).padStart(2,"0")}${String(s).padStart(2,"0")}`;
}
function isValidDigits(d: string): boolean {
    const p = d.padStart(DIGIT_COUNT,"0");
    return parseInt(p.slice(2,4),10) <= 59 && parseInt(p.slice(4,6),10) <= 59;
}
function formatDigits(d: string): { h: string; mm: string; ss: string } {
    const p = d.padStart(DIGIT_COUNT,"0");
    return { h: p.slice(0,2).replace(/^0/,"") || "0", mm: p.slice(2,4), ss: p.slice(4,6) };
}
function formatSeconds(t: number): string {
    const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = t%60;
    if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function formatHMS(t: number) {
    return {
        h: String(Math.floor(t/3600)).padStart(2,"0"),
        m: String(Math.floor((t%3600)/60)).padStart(2,"0"),
        s: String(t%60).padStart(2,"0"),
    };
}
function formatStepDuration(s: number): string {
    const m = Math.floor(s/60), sec = s%60;
    return `${m}:${String(sec).padStart(2,"0")}`;
}
function getTaskId(item: Task | ScheduleBlock): string | undefined {
    return "task_id" in item ? (item as ScheduleBlock).task_id : (item as Task).id;
}

/* ─────────────────────────────────────────
   BEACON
───────────────────────────────────────── */

function beaconSession(payload: object) {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon?.("/api/timer-sessions/beacon", blob);
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
    contain: strict;
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
    outline: none;
    font-family: 'Digital7', monospace;
    font-size: clamp(5rem, 14vw, 10rem);
    color: rgba(255,255,255,0.62);
    text-shadow: 0 0 10px rgba(255,255,255,0.2);
    margin-bottom: 2.5rem;
    letter-spacing: 0.02em;
`;

const DigitGroup = styled.span<{ $active?: boolean }>`color: inherit;`;

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
    background: rgba(20,40,80,0.35);
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

const SummaryTitle = styled.h2`font-size: 1.6rem; font-weight: 700; margin: 0;`;
const SummarySubtitle = styled.p`font-size: 0.9rem; color: #555; margin-top: 0.4rem; margin-bottom: 1.5rem;`;
const PlantDisplay = styled.div`font-size: 3rem; margin: 1.5rem 0;`;

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
        background: white; color: black; border: none;
        border-radius: 6px; padding: 0.2rem 0.7rem;
        font-weight: 600; cursor: pointer; font-size: 0.78rem;
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
    width: 22px; height: 56px;
    background: rgba(15,15,35,0.92);
    border: none;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
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
    font-size: 0.85rem; font-weight: 700; margin-bottom: 1rem;
    opacity: 0.6; letter-spacing: 0.1em; text-transform: uppercase;
`;

const SidebarEmpty = styled.div`font-size: 0.82rem; opacity: 0.35; margin-top: 1rem;`;

const PomodoroWarning = styled.div`
    font-size: 0.75rem;
    color: rgba(255,200,100,0.85);
    margin-bottom: 0.75rem;
    line-height: 1.4;
`;

const StepItem = styled.div<{ $active: boolean; $done: boolean }>`
    padding: 0.6rem 0.75rem;
    margin-bottom: 0.5rem;
    border-radius: 8px;
    background: ${({ $active, $done }) => $active ? "rgba(255,240,100,0.2)" : $done ? "rgba(255,255,255,0.05)" : "transparent"};
    border-left: 3px solid ${({ $active }) => $active ? "#FFF59A" : "transparent"};
    opacity: ${({ $done }) => $done ? 0.4 : 1};
    transition: background 0.3s ease, border-color 0.3s ease, opacity 0.3s ease;
`;

const StepLabel = styled.div`font-size: 0.8rem; font-weight: 600; color: white;`;
const StepDuration = styled.div`font-size: 0.72rem; color: rgba(255,255,255,0.5); margin-top: 0.2rem;`;

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

    // Timer state
    const [digits, setDigits] = useState("000000");
    const [seconds, setSeconds] = useState(0);
    const [status, setStatus] = useState<Status>("idle");
    const [isOwner, setIsOwner] = useState(true);

    // UI state
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
    const [stepProgressPct, setStepProgressPct] = useState(0);

    // Refs — mutable values that don't need to trigger renders
    const channelRef = useRef<BroadcastChannel | null>(null);
    const inputRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<Status>("idle");
    const stepIndexRef = useRef(0);
    const stepElapsedRef = useRef(0);
    const workflowStepsRef = useRef<WorkflowStep[]>([]);
    const lastActivityRef = useRef(0);

    // Keep refs in sync with state
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { workflowStepsRef.current = workflowSteps; }, [workflowSteps]);

    /* ══════════════════════════════════════════
       MOUNT — session resolution
    ══════════════════════════════════════════ */
    useEffect(() => {
        const { resumeAction, timerStatus, timerSeconds, timerDigits, isOwner: owner } = resolveSessionOnMount();
        setIsOwner(owner);
        setStatus(timerStatus);
        statusRef.current = timerStatus;
        setSeconds(timerSeconds);
        if (timerStatus === "idle") setDigits(timerDigits);

        if (resumeAction === "force_end") {
            const session = loadSession();
            if (session) {
                forceEndSession(session).then(data => {
                    if (data) { setSummaryData(data); setShowSummary(true); }
                    else navigate(ROUTES.TIMER_ENTRY_PAGE);
                });
            } else {
                navigate(ROUTES.TIMER_ENTRY_PAGE);
            }
        }
    }, []);

    /* ══════════════════════════════════════════
       MOUNT — workflow generation
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
                workflowStepsRef.current = data.steps;
                setIsPomodoro(data.is_pomodoro);
            })
            .catch(() => setWorkflowSteps([]))
            .finally(() => setWorkflowLoading(false));
    }, []);

    /* ══════════════════════════════════════════
       SINGLE UNIFIED TICK LOOP
       One interval handles: countdown + step advance + activity
       = one re-render per second max
    ══════════════════════════════════════════ */
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();

            // ── Activity heartbeat (no state update) ──
            if (now - lastActivityRef.current >= 5000) {
                lastActivityRef.current = now;
                const session = loadSession();
                if (session) { session.lastActive = now; saveSession(session); }
            }

            if (statusRef.current !== "running") return;

            // ── Countdown ──
            const session = loadSession();
            if (!session || session.paused || !session.endTime) return;

            const remaining = Math.max(0, Math.ceil((session.endTime - now) / 1000));
            setSeconds(remaining);

            if (remaining <= 0) {
                session.paused = true;
                session.pausedAt = now;
                delete session.endTime;
                saveSession(session);
                setStatus("idle");
                statusRef.current = "idle";
                setSeconds(0);
                return;
            }

            // ── Step auto-advance ──
            const steps = workflowStepsRef.current;
            if (steps.length === 0) return;

            stepElapsedRef.current += 1;
            const currentDuration = steps[stepIndexRef.current]?.duration_seconds ?? 0;

            if (stepElapsedRef.current >= currentDuration) {
                const nextIndex = Math.min(stepIndexRef.current + 1, steps.length - 1);
                stepIndexRef.current = nextIndex;
                stepElapsedRef.current = 0;
                setCurrentStepIndex(nextIndex);
                setStepProgressPct(0);
            } else {
                setStepProgressPct(Math.min(100, Math.round((stepElapsedRef.current / currentDuration) * 100)));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []); // runs once, reads live values via refs

    /* ══════════════════════════════════════════
       TAB CONTROL
    ══════════════════════════════════════════ */
    useEffect(() => {
        const channel = new BroadcastChannel("timer_tab_control");
        channelRef.current = channel;

        channel.onmessage = ({ data }) => {
            const { type, tabId } = data ?? {};
            if (type === "CLAIM" && tabId !== TAB_ID) {
                setIsOwner(false);
                const session = loadSession();
                if (session) { session.activeTabId = tabId; saveSession(session); }
            }
        };

        const session = loadSession();
        if (!session || isController(session)) channel.postMessage({ type: "CLAIM", tabId: TAB_ID });

        return () => {
            channel.postMessage({ type: "RELEASE", tabId: TAB_ID });
            channel.close();
        };
    }, []);

    /* ══════════════════════════════════════════
       UNLOAD SAFETY
    ══════════════════════════════════════════ */
    useEffect(() => {
        function handleUnload() {
            const session = loadSession();
            if (!session?.hasStartedWork) { clearSession(); return; }
            const now = Date.now();
            const elapsed = Math.floor((now - session.startTime) / 1000);
            if (elapsed < 10) { clearSession(); return; }
            beaconSession({
                ...(currentTask?.id ? { task_id: currentTask.id } : {}),
                mode: currentTask ? "task" : "free",
                started_at: new Date(session.startTime).toISOString(),
                ended_at: new Date(now).toISOString(),
                elapsed_seconds: elapsed,
                active_seconds: computeActiveSeconds(session, now),
                task_completed: false,
            } as TimerSession);
            clearSession();
        }
        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, [currentTask]);

    /* ══════════════════════════════════════════
       ACTIONS
    ══════════════════════════════════════════ */

    const ensureControl = useCallback(() => {
        const session = loadSession();
        if (session) claimControl(session);
        channelRef.current?.postMessage({ type: "CLAIM", tabId: TAB_ID });
        setIsOwner(true);
    }, []);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (statusRef.current !== "idle") return;
        if (e.key >= "0" && e.key <= "9") {
            setDigits(prev => {
                const next = (prev + e.key).slice(-DIGIT_COUNT);
                return isValidDigits(next) ? next : prev;
            });
        } else if (e.key === "Backspace") {
            setDigits(prev => ("0" + prev).slice(0, DIGIT_COUNT));
        }
    }

    function start() {
        ensureControl();
        const totalSeconds = digitsToSeconds(digits);
        if (!totalSeconds) return;

        const now = Date.now();
        let session = loadSession() ?? {
            startTime: now, lastActive: now, paused: false,
            activeTabId: TAB_ID, totalPausedMs: 0, hasStartedWork: true,
        };

        if (session.pausedAt) {
            session.totalPausedMs = (session.totalPausedMs ?? 0) + (now - session.pausedAt);
            delete session.pausedAt;
        }

        session.hasStartedWork = true;
        session.endTime = now + totalSeconds * 1000;
        session.paused = false;
        session.activeTabId = TAB_ID;
        session.totalPausedMs ??= 0;

        saveSession(session);
        setSeconds(totalSeconds);
        setStatus("running");
        statusRef.current = "running";
    }

    function pause() {
        ensureControl();
        const session = loadSession();
        if (!session?.endTime) return;
        const now = Date.now();
        session.paused = true;
        session.remainingOnPause = Math.max(0, Math.ceil((session.endTime - now) / 1000));
        session.pausedAt = now;
        delete session.endTime;
        saveSession(session);
        setStatus("paused");
        statusRef.current = "paused";
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
        statusRef.current = "running";
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
        statusRef.current = "idle";
        setSeconds(0);
        setDigits("000000");
        stepIndexRef.current = 0;
        stepElapsedRef.current = 0;
        setCurrentStepIndex(0);
        setStepProgressPct(0);
    }

    /* ══════════════════════════════════════════
       SESSION SAVE / END
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
        const data = await saveSessionToDB(session, Date.now());
        clearSession();
        return data;
    }

    async function confirmEndSession(taskCompleted?: boolean) {
        const session = loadSession();
        if (!session) { setConfirmQuit(false); setShowTaskComplete(false); navigate(ROUTES.HOME); return; }

        const data = await saveSessionToDB(session, Date.now(), taskCompleted ?? false);
        clearSession();
        setStatus("idle");
        statusRef.current = "idle";
        setSeconds(0);
        setDigits("000000");

        if (data) { setSummaryData(data); setShowSummary(true); }
        else navigate(ROUTES.HOME);

        setConfirmQuit(false);
        setShowTaskComplete(false);
    }

    function handleEndSessionClick() {
        if (currentTask) { setConfirmQuit(false); setShowTaskComplete(true); }
        else setConfirmQuit(true);
    }

    /* ─────────────────────────────────────
       RENDER
    ───────────────────────────────────── */

    const { h, mm, ss } = formatDigits(digits);
    const canStart = digitsToSeconds(digits) > 0;

    return (
        <>
            <GlobalFont />
            <Outer>
                <Frame>
                    <Window>
                        <SkyBackground>
                            <SkyScroller>
                                <SkyTile />
                                <SkyTile />
                            </SkyScroller>
                        </SkyBackground>

                        {!isOwner && (
                            <BlockedBanner>
                                Timer is active in another tab.
                                <button onClick={ensureControl}>Take control</button>
                            </BlockedBanner>
                        )}

                        <PageBackButton to={ROUTES.HOME} />
                        <EndSessionButton onClick={handleEndSessionClick}>End Session</EndSessionButton>

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
                                    <Btn onClick={start} disabled={!canStart} style={{ opacity: canStart ? 1 : 0.35 }}>
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
                                    <SidebarTitle>{isPomodoro ? "Pomodoro Workflow" : "Study Plan"}</SidebarTitle>

                                    {workflowLoading && <SidebarEmpty>Generating your plan...</SidebarEmpty>}

                                    {!workflowLoading && isPomodoro && (
                                        <PomodoroWarning>
                                            ⚠️ Not enough info for a custom plan — using Pomodoro instead.
                                            Add more to your task description for a tailored workflow.
                                        </PomodoroWarning>
                                    )}

                                    {!workflowLoading && workflowSteps.map((step, i) => (
                                        <StepItem key={i} $active={i === currentStepIndex} $done={i < currentStepIndex}>
                                            <StepLabel>{step.label}</StepLabel>
                                            <StepDuration>{formatStepDuration(step.duration_seconds)}</StepDuration>
                                            {i === currentStepIndex && <StepProgressBar $pct={stepProgressPct} />}
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
                            <OverlayTitle>End Timer Session?</OverlayTitle>
                            <PrimaryBtn onClick={() => setConfirmQuit(false)}>Continue</PrimaryBtn>
                            <SecondaryBtn onClick={() => confirmEndSession()}>End Timer</SecondaryBtn>
                        </OverlayContent>
                    </Overlay>
                )}

                {showSummary && summaryData && (
                    <Overlay>
                        <SummaryCard>
                            <SummaryTitle>Good Job!</SummaryTitle>
                            <SummarySubtitle>You grew a plant!</SummarySubtitle>
                            <PlantDisplay>🌱</PlantDisplay>
                            <div style={{ fontSize: "0.85rem", marginTop: "1rem", color: "#333" }}>You studied for</div>
                            {(() => {
                                const { h, m, s } = formatHMS(summaryData.active_seconds ?? 0);
                                return <TimeBox>{h}:{m}:{s}</TimeBox>;
                            })()}
                            <div style={{ display: "flex", justifyContent: "space-around", fontSize: "0.8rem", color: "#666", marginTop: "0.5rem" }}>
                                <span>hours</span>
                                <span>minutes</span>
                                <span>seconds</span>
                            </div>
                            <ButtonStack>
                                <PrimaryBtn onClick={() => navigate(ROUTES.TIMER_ENTRY_PAGE)}>Study Again</PrimaryBtn>
                                <SecondaryBtn onClick={() => navigate(ROUTES.HOME)}>Leave Timer</SecondaryBtn>
                            </ButtonStack>
                        </SummaryCard>
                    </Overlay>
                )}
            </Outer>
        </>
    );
}