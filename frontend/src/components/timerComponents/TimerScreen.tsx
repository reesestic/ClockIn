import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { BackButton } from "../navigation/BackButton.tsx";
import { ROUTES } from "../../constants/Routes.ts";
import { createTimerSession } from "../../api/timerApi.ts";

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

type Status = "idle" | "running" | "paused";

interface Session {
    startTime: number;
    lastActive: number;
    paused: boolean;
    endTime?: number;
    remainingOnPause?: number;
}

/* ─────────────────────────────────────────
   SESSION HELPERS
   - Row created in DB only on End Session / force-end
   - localStorage is source of truth while session is live
───────────────────────────────────────── */

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

type ResumeAction = "fresh" | "continue" | "reuse_prompt" | "force_end";

interface MountResolution {
    session: Session;
    resumeAction: ResumeAction;
    /** Restored timer status to set in React state */
    timerStatus: Status;
    /** Restored seconds remaining to set in React state (0 if idle) */
    timerSeconds: number;
    /** Restored digit string to show in idle input */
    timerDigits: string;
}

/**
 * Called on mount. Reads localStorage and figures out:
 * 1. Session lifecycle action (fresh / continue / reuse_prompt / force_end)
 * 2. Timer state to restore into React (running / paused / idle + seconds)
 *
 * Key insight: endTime is an absolute timestamp, so even if the user was away
 * for 10 minutes, we just recalculate remaining = endTime - Date.now().
 * If endTime is in the past, the timer finished while they were gone → idle.
 */
function resolveSessionOnMount(): MountResolution {
    const existing = loadSession();
    const now = Date.now();

    if (!existing) {
        const session: Session = { startTime: now, lastActive: now, paused: false };
        saveSession(session);
        return { session, resumeAction: "fresh", timerStatus: "idle", timerSeconds: 0, timerDigits: "000000" };
    }

    const gapMs = now - (existing.lastActive ?? existing.startTime);
    const gapHours = gapMs / (1000 * 60 * 60);

    // ── Restore timer state from session ──
    let timerStatus: Status = "idle";
    let timerSeconds = 0;
    let timerDigits = "000000";

    if (existing.paused && existing.remainingOnPause != null) {
        // Was paused — restore paused state
        timerStatus = "paused";
        timerSeconds = existing.remainingOnPause;
        timerDigits = secondsToDigits(timerSeconds);
    } else if (!existing.paused && existing.endTime != null) {
        const remaining = Math.floor((existing.endTime - now) / 1000);
        if (remaining > 0) {
            // Was running and still has time — resume automatically
            timerStatus = "running";
            timerSeconds = remaining;
        } else {
            // Timer finished while away — clean up endTime, go idle
            delete existing.endTime;
            saveSession(existing);
            timerStatus = "idle";
            timerSeconds = 0;
        }
    }

    // ── Session gap check ──
    let resumeAction: ResumeAction = "continue";

    if (gapHours <= 2) {
        existing.lastActive = now;
        saveSession(existing);
        resumeAction = "continue";
    } else if (gapHours <= 8) {
        resumeAction = "reuse_prompt";
    } else {
        resumeAction = "force_end";
    }

    return { session: existing, resumeAction, timerStatus, timerSeconds, timerDigits };
}

/* ─────────────────────────────────────────
   iOS-STYLE DIGIT INPUT HELPERS
   Format: H:MM:SS  (max 9:59:59 = 7 digits, but we'll cap at 9:59:59)
   Internally stored as a string of up to 6 digits (HMMSS, left-padded)
   Display: the last 6 digits formatted as H:MM:SS
───────────────────────────────────────── */

const DIGIT_COUNT = 6; // H MM SS

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

/** Returns true if the digit string represents a valid time (MM ≤ 59, SS ≤ 59) */
function isValidDigits(digits: string): boolean {
    const padded = digits.padStart(DIGIT_COUNT, "0");
    const m = parseInt(padded.slice(2, 4), 10);
    const s = parseInt(padded.slice(4, 6), 10);
    return m <= 59 && s <= 59;
}

/**
 * Format a 6-char digit string as H:MM:SS for display.
 * e.g. "000523" → "0:05:23"
 */
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

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */

const Outer = styled.div`
    width: 100vw;
    height: 100vh;
    background: #4B94DB;
    display: flex;
    position: relative;
`;

const Frame = styled.div`
    position: absolute;
    top: 0;
    left: 5%;
    width: 90%;
    height: 100%;
    background: white;
    z-index: 1;
`;

const Window = styled.div`
    position: absolute;
    top: 4vw;
    left: 7.5%;
    width: 85%;
    height: calc(100% - 4vw);
    background: linear-gradient(to bottom, #AFDBFF 20%, #FFFFFF 100%);
    z-index: 2;
    overflow: hidden;
`;

const BottomSill = styled.div`
    position: absolute;
    bottom: 0;
    left: 7.5%;
    width: 95%;
    height: 80px;
    background: white;
    z-index: 3;
`;

const Main = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-bottom: 80px;
`;

const TaskLabel = styled.div`
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
    opacity: 0.75;
`;

/** iOS-style digit display in idle mode */
const TimerInputRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 2px;
    font-size: 5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    cursor: default;
    user-select: none;
    margin-bottom: 2rem;
    outline: none;
`;

const DigitGroup = styled.span<{ $active?: boolean }>`
    border-bottom: ${({ $active }) => $active ? "3px solid #1a73e8" : "3px solid transparent"};
    padding-bottom: 2px;
    transition: border-color 0.15s;
`;

const Colon = styled.span`
    font-weight: 300;
    opacity: 0.5;
    padding: 0 2px;
`;

const TimeDisplay = styled.div`
    font-size: 5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    margin-bottom: 2rem;
`;

const Controls = styled.div`
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
`;

const Btn = styled.button`
    padding: 0.8rem 1.5rem;
    border-radius: 10px;
    border: 2px solid black;
    background: white;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;

    &:active { transform: scale(0.95); }
    &:hover { background: #f0f0f0; }
`;

const EndSessionButton = styled.button`
    position: absolute;
    top: 1.5rem;
    left: 7.5rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 2px solid red;
    background: white;
    cursor: pointer;
    color: red;
    font-weight: bold;
    z-index: 10;
`;

const PageBackButton = styled(BackButton)`
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    z-index: 10;
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
`;

const OverlayCard = styled.div`
    background: white;
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    min-width: 260px;

    h3 { margin-top: 0; }
    p { font-size: 0.9rem; color: #555; }

    .actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        margin-top: 1.25rem;
    }
`;

const DangerBtn = styled(Btn)`
    border-color: red;
    color: red;
`;

const HintText = styled.div`
    font-size: 0.8rem;
    color: #888;
    margin-top: 0.5rem;
`;

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */

export default function TimerScreen() {
    const location = useLocation();
    const navigate = useNavigate();
    const { mode, item } = (location.state as any) || {};

    const currentTask = mode === "task" ? item : null;

    // ── Digit input state (idle mode)
    // Raw digit string, max 6 chars, right-to-left fill
    const [digits, setDigits] = useState("000000");

    // ── Timer countdown
    const [seconds, setSeconds] = useState(0);
    const [status, setStatus] = useState<Status>("idle");

    // ── Overlays
    const [confirmQuit, setConfirmQuit] = useState(false);
    const [showReusePrompt, setShowReusePrompt] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState<any>(null);

    // keep a ref to summaryData for beforeunload
    const summaryRef = useRef<any>(null);
    const statusRef = useRef<Status>("idle");
    const secondsRef = useRef(0);

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { secondsRef.current = seconds; }, [seconds]);

    /* ── MOUNT: resolve existing session + restore timer state ── */
    useEffect(() => {
        const { resumeAction, session, timerStatus, timerSeconds, timerDigits } = resolveSessionOnMount();

        // Always restore timer UI from localStorage regardless of session action
        setStatus(timerStatus);
        setSeconds(timerSeconds);
        if (timerStatus === "idle") setDigits(timerDigits);

        if (resumeAction === "reuse_prompt") {
            setShowReusePrompt(true);
        } else if (resumeAction === "force_end") {
            forceEndSession(session).then(() => {
                const now = Date.now();
                const fresh: Session = { startTime: now, lastActive: now, paused: false };
                saveSession(fresh);
                setStatus("idle");
                setSeconds(0);
                setDigits("000000");
            });
        }
        // "fresh" and "continue" — timer state already applied above
    }, []);

    /* ── ACTIVITY TRACKING ── */
    useEffect(() => {
        function updateActivity() {
            const session = loadSession();
            if (!session) return;
            session.lastActive = Date.now();
            saveSession(session);
        }
        window.addEventListener("click", updateActivity);
        window.addEventListener("keydown", updateActivity);
        return () => {
            window.removeEventListener("click", updateActivity);
            window.removeEventListener("keydown", updateActivity);
        };
    }, []);

    /* ── INACTIVITY POLL (every 60s) ── */
    useEffect(() => {
        const interval = setInterval(() => {
            const session = loadSession();
            if (!session) return;
            const gapMs = Date.now() - (session.lastActive ?? session.startTime);
            const gapHours = gapMs / (1000 * 60 * 60);
            if (gapHours > 8) {
                // Force end
                forceEndSession(session).then(() => {
                    const now = Date.now();
                    const fresh: Session = { startTime: now, lastActive: now, paused: false };
                    saveSession(fresh);
                    setStatus("idle");
                    setSeconds(0);
                    setDigits("000000");
                });
            }
        }, 60_000);
        return () => clearInterval(interval);
    }, []);

    /* ── TIMER COUNTDOWN LOOP ── */
    useEffect(() => {
        if (status !== "running") return;

        const interval = setInterval(() => {
            const session = loadSession();
            if (!session || session.paused || !session.endTime) return;

            const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
            setSeconds(remaining);
            secondsRef.current = remaining;

            if (remaining <= 0) {
                // Timer done — update locally, session stays open
                delete session.endTime;
                saveSession(session);
                setStatus("idle");
                setSeconds(0);
                setDigits("000000");
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [status]);

    /* ── SAVE ON NAVIGATE AWAY / TAB CLOSE ── */
    useEffect(() => {
        async function handleUnload() {
            const session = loadSession();
            if (!session) return;
            const now = Date.now();
            const elapsed = Math.floor((now - session.startTime) / 1000);
            if (elapsed < 10) { clearSession(); return; }
            await saveSessionToDB(session, now);
            clearSession();
        }

        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, [currentTask, seconds]);

    /* ─────────────────────────────────────
       DIGIT INPUT (iOS-style keyboard)
    ───────────────────────────────────── */

    // We make the whole display keyboard-focusable
    const inputRef = useRef<HTMLDivElement>(null);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (status !== "idle") return;

        if (e.key >= "0" && e.key <= "9") {
            setDigits(prev => {
                const next = (prev + e.key).slice(-DIGIT_COUNT);
                // Validate — if invalid, reject
                if (!isValidDigits(next)) return prev;
                return next;
            });
        } else if (e.key === "Backspace") {
            setDigits(prev => ("0" + prev).slice(0, DIGIT_COUNT));
        }
    }

    /* ─────────────────────────────────────
       TIMER ACTIONS
    ───────────────────────────────────── */

    function start() {
        const totalSeconds = digitsToSeconds(digits);
        if (!totalSeconds) return;

        const session = loadSession()!;
        const now = Date.now();
        session.endTime = now + totalSeconds * 1000;
        session.paused = false;
        saveSession(session);

        setSeconds(totalSeconds);
        setStatus("running");
    }

    function pause() {
        const session = loadSession();
        if (!session || !session.endTime) return;
        const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
        session.paused = true;
        session.remainingOnPause = remaining;
        saveSession(session);
        setStatus("paused");
    }

    function resume() {
        const session = loadSession();
        if (!session || session.remainingOnPause == null) return;
        const now = Date.now();
        session.paused = false;
        session.endTime = now + session.remainingOnPause * 1000;
        delete session.remainingOnPause;
        saveSession(session);
        setStatus("running");
    }

    function reset() {
        const session = loadSession();
        if (session) {
            delete session.endTime;
            delete session.remainingOnPause;
            session.paused = false;
            saveSession(session);
        }
        setStatus("idle");
        setSeconds(0);
        setDigits("000000");
    }

    /* ─────────────────────────────────────
       SESSION END / SAVE
    ───────────────────────────────────── */

    async function saveSessionToDB(session: Session, now: number) {
        const elapsed = Math.floor((now - session.startTime) / 1000);
        if (elapsed < 10) return;
        try {
            const res = await createTimerSession({
                task_id: currentTask?.id ?? null,
                mode: currentTask ? "task" : "free",
                started_at: new Date(session.startTime).toISOString(),
                ended_at: new Date(now).toISOString(),
                elapsed_seconds: elapsed,
                task_completed: secondsRef.current === 0,
            });
            summaryRef.current = res.data;
            return res.data;
        } catch (e) {
            console.error("Failed to save session", e);
        }
    }

    async function forceEndSession(session: Session) {
        const now = Date.now();
        await saveSessionToDB(session, now);
        clearSession();
    }

    async function confirmEndSession() {
        const session = loadSession();
        if (!session) return;

        const now = Date.now();
        const data = await saveSessionToDB(session, now);

        clearSession();
        setStatus("idle");
        setSeconds(0);
        setDigits("000000");
        setConfirmQuit(false);

        if (data) {
            setSummaryData(data);
            setShowSummary(true);
        } else {
            navigate(ROUTES.HOME);
        }
    }

    function handleReuseYes() {
        // Continue same session — just update lastActive
        const session = loadSession()!;
        session.lastActive = Date.now();
        saveSession(session);
        setShowReusePrompt(false);
    }

    function handleReuseNo() {
        // Discard old session (no DB save since user is abandoning it), start fresh
        const now = Date.now();
        const fresh: Session = { startTime: now, lastActive: now, paused: false };
        clearSession();
        saveSession(fresh);
        setShowReusePrompt(false);
        setStatus("idle");
        setSeconds(0);
        setDigits("000000");
    }

    /* ─────────────────────────────────────
       RENDER HELPERS
    ───────────────────────────────────── */

    const { h, mm, ss } = formatDigits(digits);
    const totalTyped = digitsToSeconds(digits);
    const canStart = totalTyped > 0;

    return (
        <Outer>
            <Frame>
                <Window>

                    <PageBackButton to={ROUTES.HOME} />

                    <EndSessionButton onClick={() => setConfirmQuit(true)}>
                        End Session
                    </EndSessionButton>

                    <Main>

                        {currentTask && (
                            <TaskLabel>Task: {currentTask.title}</TaskLabel>
                        )}

                        {/* ── Idle: iOS-style digit input ── */}
                        {status === "idle" && (
                            <>
                                <TimerInputRow
                                    ref={inputRef}
                                    tabIndex={0}
                                    onKeyDown={handleKeyDown}
                                    onClick={() => inputRef.current?.focus()}
                                    title="Click then type digits (backspace to clear)"
                                >
                                    {/* H group — active when typing would affect hours */}
                                    <DigitGroup $active={digits.length >= 5}>
                                        {h}
                                    </DigitGroup>
                                    <Colon>:</Colon>
                                    <DigitGroup $active={digits.length >= 3 && digits.length < 5}>
                                        {mm}
                                    </DigitGroup>
                                    <Colon>:</Colon>
                                    <DigitGroup $active={digits.length < 3}>
                                        {ss}
                                    </DigitGroup>
                                </TimerInputRow>
                                <HintText>Click &amp; type digits — Backspace to clear</HintText>
                            </>
                        )}

                        {/* ── Running / paused: countdown display ── */}
                        {status !== "idle" && (
                            <TimeDisplay>{formatSeconds(seconds)}</TimeDisplay>
                        )}

                        <Controls>
                            {status === "idle" && (
                                <Btn onClick={start} disabled={!canStart}
                                     style={{ opacity: canStart ? 1 : 0.4 }}>
                                    Start
                                </Btn>
                            )}
                            {status === "running" && (
                                <Btn onClick={pause}>Pause</Btn>
                            )}
                            {status === "paused" && (
                                <>
                                    <Btn onClick={resume}>Resume</Btn>
                                    <Btn onClick={reset}>Reset Timer</Btn>
                                </>
                            )}
                        </Controls>

                    </Main>

                    <BottomSill />

                </Window>
            </Frame>

            {/* ── Reuse session prompt (2–8 hr gap) ── */}
            {showReusePrompt && (
                <Overlay>
                    <OverlayCard>
                        <h3>Welcome back!</h3>
                        <p>You have an existing session from earlier. Want to continue it?</p>
                        <div className="actions">
                            <Btn onClick={handleReuseYes}>Continue session</Btn>
                            <Btn onClick={handleReuseNo}>Start fresh</Btn>
                        </div>
                    </OverlayCard>
                </Overlay>
            )}

            {/* ── Confirm end session ── */}
            {confirmQuit && (
                <Overlay>
                    <OverlayCard>
                        <h3>End session?</h3>
                        <p>Your session will be saved and closed.</p>
                        <div className="actions">
                            <DangerBtn onClick={confirmEndSession}>Yes, end it</DangerBtn>
                            <Btn onClick={() => setConfirmQuit(false)}>Cancel</Btn>
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
                            <Btn onClick={() => navigate(ROUTES.HOME)}>Close</Btn>
                        </div>
                    </OverlayCard>
                </Overlay>
            )}
        </Outer>
    );
}