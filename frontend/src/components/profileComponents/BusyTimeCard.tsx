import styled, { keyframes } from "styled-components";
import { useState, useEffect, useRef } from "react";

/* ── Types ───────────────────────── */

interface TimeValue {
    hour: string;
    minute: string;
    ampm: "AM" | "PM";
}

export interface BusyTimeData {
    id?: number;
    title: string;
    start: TimeValue;
    end: TimeValue;
    days: string[];
}

/* ── Helpers ─────────────────────── */

const HOURS   = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = ["00", "15", "30", "45"];
const DAYS    = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];


function toMinutes(t: TimeValue): number {
    let h = parseInt(t.hour);
    if (t.ampm === "PM" && h !== 12) h += 12;
    if (t.ampm === "AM" && h === 12) h = 0;
    return h * 60 + parseInt(t.minute);
}

function isEndBeforeStart(start: TimeValue, end: TimeValue): boolean {
    return toMinutes(end) <= toMinutes(start);
}

export function formatTime(t: TimeValue) {
    return `${t.hour}:${t.minute} ${t.ampm}`;
}

/* ── Animations ──────────────────── */

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;

/* ── Styles ──────────────────────── */

const Container = styled.div`
    width: 100%;
    border-radius: 12px;
    background: white;
    border: 2px solid lightgray;
    box-shadow: -3px 3px 10px 0px #b5b5b5;
    overflow: hidden;
    animation: ${slideUp} 0.2s ease;
`;

const TitleInput = styled.input`
    width: 100%;
    border: none;
    background: #eaeaea;
    padding: 8px 10px;
    font-weight: bold;
    font-size: 1rem;
    outline: none;
    box-sizing: border-box;

    &:focus { background: #e0e0e0; }
`;

const Content = styled.div`
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Row = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const RowHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const Label = styled.span`
    font-size: 0.8rem;
    color: #888;
`;

const SmallBtn = styled.button`
    font-size: 0.72rem;
    color: #4B94DB;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-weight: 600;

    &:hover { text-decoration: underline; }
`;

const TimeRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const SmallSelect = styled.select<{ $error?: boolean }>`
    padding: 5px 6px;
    border: 1.5px solid ${({ $error }) => ($error ? "#e53935" : "#ddd")};
    border-radius: 6px;
    font-size: 0.9rem;
    background: white;
    cursor: pointer;
    transition: border-color 0.15s;

    &:focus { outline: 2px solid #AFDBFF; border-color: #AFDBFF; }
`;

const TimeSeparator = styled.span`
    font-size: 0.9rem;
    color: #888;
`;

const ErrorMsg = styled.div`
    font-size: 0.72rem;
    color: #e53935;
    margin-top: 2px;
`;

const DaysRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const Day = styled.button<{ $selected: boolean }>`
    padding: 5px 10px;
    border-radius: 6px;
    border: 1.5px solid ${({ $selected }) => ($selected ? "#4B94DB" : "#ccc")};
    background: ${({ $selected }) => ($selected ? "#AFDBFF" : "#f5f5f5")};
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s;

    &:hover { border-color: #4B94DB; }
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #eee;
    margin: 0;
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
`;

const FooterLeft = styled.div`
    display: flex;
    gap: 8px;
`;

const FooterRight = styled.div`
    display: flex;
    gap: 8px;
`;

const CancelBtn = styled.button`
    padding: 7px 16px;
    border-radius: 8px;
    border: 1.5px solid #ddd;
    background: white;
    font-size: 0.85rem;
    font-weight: 600;
    color: #888;
    cursor: pointer;

    &:hover { border-color: #bbb; color: #555; }
`;

const SaveBtn = styled.button<{ $disabled: boolean }>`
    padding: 7px 18px;
    border-radius: 8px;
    border: none;
    background: ${p => (p.$disabled ? "#ccc" : "#4B94DB")};
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: ${p => (p.$disabled ? "not-allowed" : "pointer")};
    transition: background 0.15s;

    &:hover { background: ${p => (p.$disabled ? "#ccc" : "#3a7fc1")}; }
`;

const DuplicateBtn = styled.button`
    padding: 7px 14px;
    border-radius: 8px;
    border: 1.5px solid #ddd;
    background: white;
    font-size: 0.82rem;
    font-weight: 600;
    color: #666;
    cursor: pointer;

    &:hover { border-color: #4B94DB; color: #4B94DB; }
`;

/* ── Sub-component: TimePicker ───── */

interface TimePickerProps {
    value: TimeValue;
    onChange: (val: TimeValue) => void;
    error?: boolean;
}

function TimePicker({ value, onChange, error }: TimePickerProps) {
    return (
        <TimeRow>
            <SmallSelect
                value={value.hour}
                onChange={e => onChange({ ...value, hour: e.target.value })}
                $error={error}
            >
                {HOURS.map(h => <option key={h}>{h}</option>)}
            </SmallSelect>

            <TimeSeparator>:</TimeSeparator>

            <SmallSelect
                value={value.minute}
                onChange={e => onChange({ ...value, minute: e.target.value })}
                $error={error}
            >
                {MINUTES.map(m => <option key={m}>{m}</option>)}
            </SmallSelect>

            <SmallSelect
                value={value.ampm}
                onChange={e => onChange({ ...value, ampm: e.target.value as "AM" | "PM" })}
                $error={error}
            >
                <option>AM</option>
                <option>PM</option>
            </SmallSelect>
        </TimeRow>
    );
}

/* ── Props ───────────────────────── */

interface Props {
    initial?: Partial<BusyTimeData>;
    onSave: (data: BusyTimeData) => void;
    onCancel: () => void;
    onDuplicate?: () => void;
}

/* ── Component ───────────────────── */

export default function BusyTimeCard({
                                         initial,
                                         onSave,
                                         onCancel,
                                         onDuplicate,
                                     }: Props) {
    const [title,  setTitle]  = useState(initial?.title  ?? "");
    const [start,  setStart]  = useState<TimeValue>(initial?.start  ?? { hour: "6", minute: "00", ampm: "AM" });
    const [end,    setEnd]    = useState<TimeValue>(initial?.end    ?? { hour: "7", minute: "00", ampm: "AM" });
    const [days,   setDays]   = useState<string[]>(initial?.days   ?? []);

    const titleRef = useRef<HTMLInputElement>(null);

    // Auto-focus title on mount
    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    const timeError = isEndBeforeStart(start, end);
    const canSave   = title.trim().length > 0 && days.length > 0 && !timeError;

    function toggleDay(day: string) {
        setDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    }

    function handleSave() {
        if (!canSave) return;
        onSave({ title, start, end, days });
    }

    // Enter on title moves to first select
    function handleTitleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            const first = document.querySelector<HTMLSelectElement>(".busy-time-first-select");
            first?.focus();
        }
    }


    return (
        <Container>
            <TitleInput
                ref={titleRef}
                placeholder="Busy time title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
            />

            <Content>

                <Row>
                    <Label>Start</Label>
                    <TimePicker value={start} onChange={setStart} />
                </Row>

                <Row>
                    <Label>End</Label>
                    <TimePicker value={end} onChange={setEnd} error={timeError} />
                    {timeError && <ErrorMsg>End time must be after start time</ErrorMsg>}
                </Row>

                {/* Days */}
                <Row>
                    <RowHeader>
                        <Label>Days</Label>
                        {/* Every day shortcut */}
                        <SmallBtn
                            type="button"
                            onClick={() =>
                                setDays(prev =>
                                    prev.length === 7 ? [] : [...DAYS]
                                )
                            }
                        >
                            {days.length === 7 ? "Clear all" : "Every day"}
                        </SmallBtn>
                    </RowHeader>
                    <DaysRow>
                        {DAYS.map(d => (
                            <Day
                                key={d}
                                type="button"
                                $selected={days.includes(d)}
                                onClick={() => toggleDay(d)}
                            >
                                {d}
                            </Day>
                        ))}
                    </DaysRow>
                </Row>
            </Content>

            <Divider />

            <Footer>
                <FooterLeft>
                    {/* Duplicate — only shown when editing existing */}
                    {onDuplicate && (
                        <DuplicateBtn type="button" onClick={onDuplicate}>
                            Duplicate
                        </DuplicateBtn>
                    )}
                </FooterLeft>

                <FooterRight>
                    <CancelBtn type="button" onClick={onCancel}>Cancel</CancelBtn>
                    <SaveBtn
                        type="button"
                        $disabled={!canSave}
                        onClick={handleSave}
                    >
                        Save
                    </SaveBtn>
                </FooterRight>
            </Footer>
        </Container>
    );
}