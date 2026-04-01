import { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes, createGlobalStyle } from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { BackButton } from "../navigation/BackButton.tsx";
import { ROUTES } from "../../constants/Routes.ts";
import { createTimerSession } from "../../api/timerApi.ts";
import type { TimerSession } from "../../types/TimerSession.ts"; // adjust path to your type
import digital7 from "../../assets/fonts/digital-7.ttf";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

type Status = "idle" | "running" | "paused";

interface Session {
    startTime: number;
    lastActive: number;
    paused: boolean;
    activeTabId?: string;        // which tab "owns" this session
    endTime?: number;
    remainingOnPause?: number;
    activeSeconds?: number;      // accumulated running seconds (not wall-clock)
    hasStartedWork?: boolean;    // true once timer has actually ticked ≥ 1s
}

/* ═══════════════════════════════════════════════════════
   SESSION ENGINE
   Responsible for: lifecycle, activity tracking,
   localStorage persistence, session gap logic.
═══════════════════════════════════════════════════════ */

/** Stable tab ID for this browser tab (survives re-renders, lost on tab close) */
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

/** Returns true if this tab currently owns the session */
function isController(session: Session | null): boolean {
    if (!session) return true; // no session → we'll create one → we own it
    return !session.activeTabId || session.activeTabId === TAB_ID;
}

/** Claim control of the session for this tab */
function claimControl(session: Session): Session {
    session.activeTabId = TAB_ID;
    saveSession(session);
    return session;
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

    // No existing session → don't create one yet (created on timer start)
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

    // ── Restore timer state ──
    let timerStatus: Status = "idle";
    let timerSeconds = 0;
    let timerDigits = "000000";

    if (existing.paused && existing.remainingOnPause != null) {
        timerStatus = "paused";
        timerSeconds = existing.remainingOnPause;
        timerDigits = secondsToDigits(timerSeconds);
    } else if (!existing.paused && existing.endTime != null) {
        const remaining = Math.floor((existing.endTime - now) / 1000);
        if (remaining > 0) {
            timerStatus = "running";
            timerSeconds = remaining;
        } else {
            delete existing.endTime;
            saveSession(existing);
            timerStatus = "idle";
        }
    }

    // ── Tab ownership check ──
    const owner = isController(existing);

    // ── Gap → action ──
    let resumeAction: ResumeAction = "continue";
    if (gapHours <= 2) {
        existing.lastActive = now;
        if (owner) existing.activeTabId = TAB_ID; // re-assert ownership
        saveSession(existing);
        resumeAction = "continue";
    } else if (gapHours <= 8) {
        resumeAction = "reuse_prompt";
    } else {
        resumeAction = "force_end";
    }

    return {
        session: existing,
        resumeAction,
        timerStatus,
        timerSeconds,
        timerDigits,
        isOwner: owner,
    };
}

/* ═══════════════════════════════════════════════════════
   TIMER ENGINE
   Responsible for: countdown logic, pause/resume,
   duration tracking, digit formatting.
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

/* ═══════════════════════════════════════════════════════
   SYNC ENGINE
   Responsible for: saving to backend, unload safety
   (sendBeacon), tab control via BroadcastChannel.
═══════════════════════════════════════════════════════ */

const SESSION_BEACON_URL = "/api/timer-sessions/beacon"; // adjust to your endpoint

/**
 * Save session to DB via sendBeacon (fire-and-forget, survives tab close).
 * Falls back to fetch if beacon unavailable.
 */
function beaconSession(payload: object) {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (navigator.sendBeacon) {
        navigator.sendBeacon(SESSION_BEACON_URL, blob);
    }
    // fetch fallback handled in saveSessionToDB
}

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */

/* Digital 7 font for the timer display */
const GlobalFont = createGlobalStyle`
    @font-face {
        font-family: 'Digital7';
        src: url(${digital7}) format('truetype');
        font-weight: normal;
        font-style: normal;
    }
`;

/* ── Page shell: blue background fills viewport ── */
const Outer = styled.div`
    width: 100vw;
    height: 100vh;
    background: #4B94DB;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
`;

/* ── Scrolling sky behind everything ── */
const SkyBackground = styled.div`
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    background: red;
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
    background-size: cover;   // 🔥 fills perfectly
    background-repeat: no-repeat;
    flex-shrink: 0;
`;

/* ── White frame: sits centered, provides the window border ── */
const Frame = styled.div`
    position: relative;
    width: 90%;
    height: 100%;
    border: 40px solid #F1F1F1;  // 🔥 THIS IS THE FRAME
    border-top: none;
    border-bottom: none;
    display: flex;
    align-items: center;
    justify-content: center;
`;

/* ── Window pane: inset from frame, contains the sky + timer ── */
const Window = styled.div`
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: transparent; /* 🔥 IMPORTANT */
`;

/* ── Windowsill: flat rectangle bottom, rounded rectangle on top ── */
const Sill = styled.div`
    position: absolute;
    bottom: 0;
    width: 95%;
    z-index: 10;
    

    /* Top rounded bar */
    &::before {
        content: "";
        display: block;
        width: 100%;
        height: 28px;
        border-radius: 8px 8px 0 0;
        background: #F1F1F1;

    }

    /* Bottom flat base */
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

/* ── Digital timer: large, white, Digital 7 font ── */
const TimerInputRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0;
    outline: none;

    font-family: 'Digital7', monospace;
    font-size: clamp(5rem, 14vw, 10rem);

    color: rgba(255,255,255,0.62);   // 🔥 FIXED
    text-shadow: 0 0 10px rgba(255,255,255,0.2); // 🔥 REDUCED

    margin-bottom: 2.5rem;
    letter-spacing: 0.02em;
`;

/* No underline — just plain spans */
const DigitGroup = styled.span<{ $active?: boolean }>`
    color: inherit;   // 🔥 IMPORTANT
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

    color: rgba(255,255,255,0.62);  // 🔥 FIXED
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

/* ── Overlays ── */
const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
`;

const OverlayCard = styled.div`
    background: white;
    padding: 2rem;
    border-radius: 16px;
    text-align: center;
    min-width: 260px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);

    h3 { margin-top: 0; color: #1a1a2e; }
    p { font-size: 0.9rem; color: #555; }

    .actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        margin-top: 1.25rem;
    }
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

const DangerBtn = styled(OverlayBtn)`
    border-color: #e53935;
    color: #e53935;
    &:hover { background: #fff0f0; }
`;

/* ── Tab control banner ── */
const BlockedBanner = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
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

/* ── Sidebar ── */
const Sidebar = styled.div<{ $open: boolean }>`
    position: absolute;
    top: 0;
    right: 0;
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
        width: 6px;
        height: 6px;
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

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */

export default function TimerScreen() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, item, hasPlan } = (location.state as any) || {};

    const currentTask = mode === "task" ? item : null;

    // ── Digit input (idle mode)
    const [digits, setDigits] = useState("000000");

    // ── Timer countdown
    const [seconds, setSeconds] = useState(0);
    const [status, setStatus] = useState<Status>("idle");

    // ── Tab ownership
    const [isOwner, setIsOwner] = useState(true);

    // ── Overlays
    const [confirmQuit, setConfirmQuit] = useState(false);
    const [showTaskComplete, setShowTaskComplete] = useState(false);
    const [showReusePrompt, setShowReusePrompt] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState<any>(null);

    // ── Sidebar
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // ── Stable refs for callbacks that outlive renders
    const summaryRef   = useRef<any>(null);
    const statusRef    = useRef<Status>("idle");
    const secondsRef   = useRef(0);
    const lastTickRef  = useRef<number>(0);       // wall-clock timestamp of last tick
    const channelRef   = useRef<BroadcastChannel | null>(null);

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { secondsRef.current = seconds; }, [seconds]);

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
        if (timerStatus === "running") lastTickRef.current = Date.now();

        if (resumeAction === "reuse_prompt") {
            setShowReusePrompt(true);
        } else if (resumeAction === "force_end") {
            const session = loadSession();
            // Save if timer actually ran, then navigate away either way
            const savePromise = session ? forceEndSession(session) : Promise.resolve();
            savePromise.then(() => navigate(ROUTES.TIMER_ENTRY_PAGE));
        }
    }, []);

    /* ══════════════════════════════════════════
       SYNC ENGINE — TAB CONTROL (BroadcastChannel)
       Other tabs broadcast their TAB_ID when they
       become active. We watch for that and yield/reclaim.
    ══════════════════════════════════════════ */
    useEffect(() => {
        const channel = new BroadcastChannel("timer_tab_control");
        channelRef.current = channel;

        channel.onmessage = (event) => {
            const { type, tabId } = event.data ?? {};

            if (type === "CLAIM" && tabId !== TAB_ID) {
                // Another tab claimed control — yield
                setIsOwner(false);
                // Update localStorage so the new owner is authoritative
                const session = loadSession();
                if (session) {
                    session.activeTabId = tabId;
                    saveSession(session);
                }
            }

            if (type === "RELEASE" && tabId !== TAB_ID) {
                // Controlling tab closed/navigated away — we can reclaim if we interact
                // (don't auto-claim; wait for user interaction in THIS tab)
            }
        };

        // Announce ourselves if we're the controller on mount
        const session = loadSession();
        if (!session || isController(session)) {
            channel.postMessage({ type: "CLAIM", tabId: TAB_ID });
        }

        return () => {
            channel.postMessage({ type: "RELEASE", tabId: TAB_ID });
            channel.close();
        };
    }, []);

    /** Called on any meaningful user interaction. If we're not owner, silently claim. */
    const ensureControl = useCallback(() => {
        if (isOwner) return true;

        // Silently take over
        const session = loadSession();
        if (session) {
            claimControl(session);
        }
        channelRef.current?.postMessage({ type: "CLAIM", tabId: TAB_ID });
        setIsOwner(true);
        return true;
    }, [isOwner]);

    /* ══════════════════════════════════════════
       SESSION ENGINE — ACTIVITY TRACKING
       Throttled to every 5s; covers all interaction types.
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

        // visibilitychange: user switched back to this tab
        function handleVisibility() {
            if (document.visibilityState === "visible") {
                updateActivity();
            }
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
       Also accumulates activeSeconds while running.
    ══════════════════════════════════════════ */
    useEffect(() => {
        if (status !== "running") return;

        const interval = setInterval(() => {
            const session = loadSession();
            if (!session || session.paused || !session.endTime) return;

            const now = Date.now();
            const remaining = Math.max(0, Math.floor((session.endTime - now) / 1000));

            // ── Accumulate active seconds (delta since last tick) ──
            if (lastTickRef.current > 0) {
                const deltaSeconds = Math.round((now - lastTickRef.current) / 1000);
                if (deltaSeconds > 0 && deltaSeconds < 10) { // ignore huge gaps (tab sleep)
                    session.activeSeconds = (session.activeSeconds ?? 0) + deltaSeconds;
                    session.hasStartedWork = true;
                }
            }
            lastTickRef.current = now;
            saveSession(session);

            setSeconds(remaining);
            secondsRef.current = remaining;

            if (remaining <= 0) {
                delete session.endTime;
                saveSession(session);
                setStatus("idle");
                setSeconds(0);
                setDigits("000000");
                // Timer finished naturally — session stays open, user can start another
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [status]);

    /* ══════════════════════════════════════════
       SYNC ENGINE — UNLOAD SAFETY (sendBeacon)
       Saves session on tab close / navigation.
       sendBeacon is fire-and-forget and survives tab close.
    ══════════════════════════════════════════ */
    useEffect(() => {
        function handleUnload() {
            const session = loadSession();
            if (!session || !session.hasStartedWork) {
                clearSession();
                return;
            }
            const now = Date.now();
            const elapsed = Math.floor((now - session.startTime) / 1000);
            if (elapsed < 10) { clearSession(); return; }

            // task_completed is always false on tab close — we can't ask the user
            const payload: TimerSession = {
                ...(currentTask?.id ? { task_id: currentTask.id } : {}),
                mode: currentTask ? "task" : "free",
                started_at: new Date(session.startTime).toISOString(),
                ended_at: new Date(now).toISOString(),
                elapsed_seconds: elapsed,
                active_seconds: session.activeSeconds ?? 0,
                task_completed: false,
            };

            beaconSession(payload);
            clearSession();
        }

        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, [currentTask]);

    /* ══════════════════════════════════════════
       TIMER ENGINE — DIGIT INPUT (iOS-style)
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

        // Session is created here (not on mount)
        let session = loadSession();
        if (!session) {
            session = {
                startTime: now,
                lastActive: now,
                paused: false,
                activeTabId: TAB_ID,
                activeSeconds: 0,
                hasStartedWork: false,
            };
        }

        session.endTime = now + totalSeconds * 1000;
        session.paused = false;
        session.activeTabId = TAB_ID;
        if (session.activeSeconds == null) session.activeSeconds = 0;

        saveSession(session);
        lastTickRef.current = now;

        setSeconds(totalSeconds);
        setStatus("running");
    }

    function pause() {
        ensureControl();
        const session = loadSession();
        if (!session || !session.endTime) return;
        const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
        session.paused = true;
        session.remainingOnPause = remaining;
        delete session.endTime;
        saveSession(session);
        lastTickRef.current = 0;
        setStatus("paused");
    }

    function resume() {
        ensureControl();
        const session = loadSession();
        if (!session || session.remainingOnPause == null) return;
        const now = Date.now();
        session.paused = false;
        session.endTime = now + session.remainingOnPause * 1000;
        delete session.remainingOnPause;
        saveSession(session);
        lastTickRef.current = now;
        setStatus("running");
    }

    function reset() {
        ensureControl();
        const session = loadSession();
        if (session) {
            delete session.endTime;
            delete session.remainingOnPause;
            session.paused = false;
            saveSession(session);
        }
        lastTickRef.current = 0;
        setStatus("idle");
        setSeconds(0);
        setDigits("000000");
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
            active_seconds: session.activeSeconds ?? 0,
            task_completed: taskCompleted,
        };

        try {
            const res = await createTimerSession(payload);
            summaryRef.current = res.data;
            return res.data;
        } catch (e) {
            console.error("Failed to save session", e);
            return null;
        }
    }

    async function forceEndSession(session: Session) {
        const now = Date.now();
        await saveSessionToDB(session, now);
        clearSession();
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
        setConfirmQuit(false);
        setShowTaskComplete(false);
        lastTickRef.current = 0;

        if (data) {
            setSummaryData(data);
            setShowSummary(true);
        } else {
            navigate(ROUTES.HOME);
        }
    }

    /** Called when user clicks "End Session" — routes to task question or straight to save */
    function handleEndSessionClick() {
        if (currentTask) {
            setConfirmQuit(false);
            setShowTaskComplete(true);
        } else {
            setConfirmQuit(true);
        }
    }

    function handleReuseYes() {
        const session = loadSession()!;
        session.lastActive = Date.now();
        claimControl(session);
        setIsOwner(true);
        channelRef.current?.postMessage({ type: "CLAIM", tabId: TAB_ID });
        setShowReusePrompt(false);
    }

    function handleReuseNo() {
        clearSession();
        // Don't create session yet — wait for timer start
        setShowReusePrompt(false);
        setIsOwner(true);
        setStatus("idle");
        setSeconds(0);
        setDigits("000000");
    }

    /* ─────────────────────────────────────
       RENDER
    ───────────────────────────────────── */

    const { h, mm, ss } = formatDigits(digits);
    const totalTyped = digitsToSeconds(digits);
    const canStart = totalTyped > 0;

    // If not owner, interactions should claim control (handled in ensureControl)
    // We show a subtle banner so user knows another tab was active
    const showControlBanner = !isOwner;

    return (
        <>
            <GlobalFont />
            <Outer>

                {/* ── White frame (window border) ── */}
                <Frame>
                    {/* ── Window pane (sky + timer content) ── */}
                    <Window>

                        <SkyBackground>
                            <SkyScroller>
                                <SkyTile/>
                                <SkyTile/>
                            </SkyScroller>
                        </SkyBackground>

                        {/* ── Tab control banner ── */}
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
                            {currentTask && (
                                <TaskLabel>{currentTask.title}</TaskLabel>
                            )}

                            {/* ── Idle: digit input ── */}
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

                            {/* ── Running / paused: countdown ── */}
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
                                {status === "running" && (
                                    <Btn onClick={pause}>Pause</Btn>
                                )}
                                {status === "paused" && (
                                    <>
                                        <Btn onClick={resume}>Resume</Btn>
                                        <Btn onClick={reset}>Reset</Btn>
                                    </>
                                )}
                            </Controls>
                        </Main>

                        {/* ── Atomized sidebar ── */}
                        {hasPlan && (
                            <>
                                <SidebarHandle
                                    $open={sidebarOpen}
                                    onClick={() => setSidebarOpen(o => !o)}
                                    aria-label={sidebarOpen ? "Close plan" : "Open plan"}
                                />
                                <Sidebar $open={sidebarOpen}>
                                    <SidebarTitle>Study Plan</SidebarTitle>
                                    <SidebarEmpty>Your atomized plan will appear here.</SidebarEmpty>
                                </Sidebar>
                            </>
                        )}

                    </Window>
                </Frame>

                {/* ── Windowsill (highest z-index, sits over window bottom) ── */}
                <Sill />

                {/* ── Reuse session prompt ── */}
                {showReusePrompt && (
                    <Overlay>
                        <OverlayCard>
                            <h3>Welcome back!</h3>
                            <p>You have a session from earlier. Continue it?</p>
                            <div className="actions">
                                <OverlayBtn onClick={handleReuseYes}>Continue</OverlayBtn>
                                <OverlayBtn onClick={handleReuseNo}>Start fresh</OverlayBtn>
                            </div>
                        </OverlayCard>
                    </Overlay>
                )}

                {/* ── Did you finish your task? ── */}
                {showTaskComplete && (
                    <Overlay>
                        <OverlayCard>
                            <h3>Did you finish your task?</h3>
                            <p style={{ fontWeight: 600, color: "#333" }}>{currentTask?.title}</p>
                            <div className="actions">
                                <OverlayBtn onClick={() => confirmEndSession(true)}>Yes ✓</OverlayBtn>
                                <OverlayBtn onClick={() => confirmEndSession(false)}>Not yet</OverlayBtn>
                            </div>
                        </OverlayCard>
                    </Overlay>
                )}

                {/* ── Confirm end session (no-task path) ── */}
                {confirmQuit && (
                    <Overlay>
                        <OverlayCard>
                            <h3>End session?</h3>
                            <p>Your session will be saved and closed.</p>
                            <div className="actions">
                                <DangerBtn onClick={() => confirmEndSession()}>Yes, end it</DangerBtn>
                                <OverlayBtn onClick={() => setConfirmQuit(false)}>Cancel</OverlayBtn>
                            </div>
                        </OverlayCard>
                    </Overlay>
                )}

                {/* ── Session summary ── */}
                {showSummary && (
                    <Overlay>
                        <OverlayCard>
                            <h3>Session Complete</h3>
                            <pre style={{ textAlign: "left", fontSize: "0.8rem" }}>
                            {JSON.stringify(summaryData, null, 2)}
                        </pre>
                            <div className="actions">
                                <OverlayBtn onClick={() => navigate(ROUTES.HOME)}>Close</OverlayBtn>
                            </div>
                        </OverlayCard>
                    </Overlay>
                )}
            </Outer>
        </>
    );
}