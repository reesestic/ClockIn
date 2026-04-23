import React, { useState, useRef, useCallback } from "react";
import styled from "styled-components";
import { PLANT_SLOTS} from "./gardenData";
import {ROUTES} from "../../constants/Routes.ts";
import { usePlants } from "../../context/PlantContext";
import type { PlantSlot, PlantState, PlantVariety } from "./gardenData";
import GardenBackground from "./GardenBackground";
import GardenSunflower from "./GardenSunflower";
import GardenTulip from "./GardenTulip";
import GardenSnakePlant from "./GardenSnakePlant";
import GardenMonstera from "./GardenMonstera";
import GardenBonsai from "./GardenBonsai";
import GardenCactus from "./GardenCactus";
import BackButton from "../navigation/BackButton.tsx";

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #afdbff;
  cursor: grab;
  &:active { cursor: grabbing; }
  user-select: none;
`;

const PageBackButton = styled(BackButton)`
  position: fixed;
  top: 1.2rem;
  left: 1rem;
  z-index: 100;
`;

//const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;

// ─── Plant viewBox dimensions (width × height) ───────────────────────────────
const PLANT_VIEWBOXES: Record<PlantVariety, { w: number; h: number }> = {
    sunflower:   { w: 417,  h: 1257 },
    tulip:       { w: 267,  h: 763  },
    snake_plant: { w: 515,  h: 747  },
    monstera:    { w: 854,  h: 904  },
    bonsai:      { w: 436,  h: 473  },
    cactus:      { w: 384,  h: 448  },
};

const PLANT_COMPONENTS: Record<PlantVariety, () => React.ReactElement> = {
    sunflower: GardenSunflower,
    tulip: GardenTulip,
    snake_plant: GardenSnakePlant,
    monstera: GardenMonstera,
    bonsai: GardenBonsai,
    cactus: GardenCactus,
};

// ─── Single plant slot rendered inside the main SVG ──────────────────────────

interface PlantSlotSVGProps {
    slot: PlantSlot;
    state: PlantState;
    selected: boolean;
    onSelect: () => void;
}

function PlantSlotSVG({ slot, state, selected, onSelect }: PlantSlotSVGProps) {
    const vb = PLANT_VIEWBOXES[slot.variety];
    const PlantContent = PLANT_COMPONENTS[slot.variety];

    // 👇 THIS is the correct scale calculation
    const renderH = 1024 * slot.scale;
    const scale = renderH / vb.h;

    return (
        <g
            transform={`
                translate(${slot.svgX}, ${slot.svgY})
                scale(${scale})
                translate(${-vb.w / 2}, ${-vb.h})
            `}
            onClick={onSelect}
            style={{
                cursor: "pointer",
                pointerEvents: "all",
                opacity:
                    state === "empty" ? 0.15 :
                        state === "locked" ? 0.35 :
                            1,
                filter: state === "owned" ? "none" : "grayscale(1)",
            }}
        >
            {selected && (
                <rect
                    x={-vb.w / 2 - 20}
                    y={-vb.h - 20}
                    width={vb.w + 40}
                    height={vb.h + 40}
                    rx={16}
                    fill="none"
                    stroke="white"
                    strokeWidth={10}
                />
            )}

            <PlantContent />

            {state === "locked" && (
                <g transform={`translate(-18, -${vb.h + 30})`}>
                    <circle r={18} cx={18} cy={18} fill="rgba(0,0,0,0.45)" />
                    <text x={18} y={23} textAnchor="middle" fontSize={18} fill="white">🔒</text>
                </g>
            )}
        </g>
    );
}

// ─── Main GardenScene ─────────────────────────────────────────────────────────

const SVG_W = 4948;
const SVG_H = 1024;

export default function GardenScene() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [offsetX, setOffsetX] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { plants: userPlants } = usePlants();
    console.log("userPlants:", userPlants);

    // continuous pan state
    const drag = useRef({ active: false, startX: 0, startOffset: 0 });

    const getViewW = useCallback(() => {
        const el = wrapperRef.current;
        if (!el) return window.innerWidth;
        return el.clientWidth;
    }, []);

    const clampOffset = useCallback((v: number) => {
        const viewW = getViewW();
        const viewH = wrapperRef.current?.clientHeight ?? window.innerHeight;
        // viewBox width = SVG_W * (viewH / SVG_H) scaled to fill height
        const vbW = SVG_W * (viewH / SVG_H);
        const maxOffset = Math.max(0, vbW - viewW);
        // convert pixel offset to SVG units
        const svgUnitsPerPx = SVG_W / vbW;
        return Math.max(0, Math.min(v, maxOffset * svgUnitsPerPx));
    }, [getViewW]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        drag.current = { active: true, startX: e.clientX, startOffset: offsetX };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, [offsetX]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!drag.current.active) return;
        const dx = e.clientX - drag.current.startX;
        const viewH = wrapperRef.current?.clientHeight ?? window.innerHeight;
        const vbW = SVG_W * (viewH / SVG_H);
        const svgUnitsPerPx = SVG_W / vbW;
        const newOffset = drag.current.startOffset - dx * svgUnitsPerPx;
        setOffsetX(clampOffset(newOffset));
    }, [clampOffset]);

    const onPointerUp = useCallback(() => {
        drag.current.active = false;
    }, []);

    const getState = (slot: PlantSlot): PlantState => {
        if (!userPlants) return "empty";   // 👈 ADD THIS LINE
        if (userPlants[slot.variety]) return "owned";
        return "locked";
    };

    const handleSelect = (id: string) => {
        setSelectedId(prev => prev === id ? null : id);
    };

    const selectedSlot = PLANT_SLOTS.find(s => s.id === selectedId);
    const selectedState = selectedSlot ? getState(selectedSlot) : null;

    return (
        <Wrapper
            ref={wrapperRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={(e) => {
                const viewH = wrapperRef.current?.clientHeight ?? window.innerHeight;
                const vbW = SVG_W * (viewH / SVG_H);
                const svgUnitsPerPx = SVG_W / vbW;

                // 👇 USE deltaX instead of deltaY
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY)
                    ? e.deltaX   // horizontal scroll (trackpad left/right)
                    : e.deltaY;  // fallback for mouse wheel

                setOffsetX(prev =>
                    clampOffset(prev + delta * svgUnitsPerPx)
                );
            }}
        >
            <PageBackButton to={ROUTES.HOME} />

            {/* Selected plant info pill */}
            {selectedSlot && (
                <div style={{
                    position: "absolute",
                    bottom: 32,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "white",
                    borderRadius: 32,
                    padding: "10px 28px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 4px 24px rgba(75,148,219,0.18)",
                    zIndex: 50,
                    animation: "fadeUp 0.2s ease",
                }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#4B94DB" }}>
            {selectedSlot.label}
          </span>
                    {selectedState === "locked" && (
                        <span style={{
                            fontSize: 12, fontWeight: 600, color: "#999",
                            background: "#f0f0f0", borderRadius: 12, padding: "2px 10px"
                        }}>
              Not yet found
            </span>
                    )}
                    {selectedState === "owned" && (
                        <span style={{
                            fontSize: 12, fontWeight: 600, color: "#3D9D8B",
                            background: "#e8f7f0", borderRadius: 12, padding: "2px 10px"
                        }}>
              Growing ✓
            </span>
                    )}
                    <button
                        onClick={() => setSelectedId(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 18, lineHeight: 1 }}
                    >×</button>
                </div>
            )}

            {/* The single SVG — everything lives here */}
            <svg
                style={{
                    width: "auto",
                    height: "100%",
                    transition: drag.current.active ? "none" : "none",
                    display: "block",
                }}
                viewBox={`${offsetX} 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="xMinYMid meet"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="g_bg" x1="2676" y1="-897" x2="2676" y2="1655.5" gradientUnits="userSpaceOnUse">
                        <stop offset="0.294576" stopColor="#AFDBFF"/>
                        <stop offset="0.858336" stopColor="white"/>
                    </linearGradient>
                    <linearGradient id="g_sun1" x1="3765.58" y1="194.976" x2="4288.77" y2="933.899" gradientUnits="userSpaceOnUse">
                        <stop offset="0.572115" stopColor="#FFF59A"/>
                        <stop offset="1" stopColor="#FFFBD6" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="g_sun2" x1="4075.48" y1="92.6028" x2="4642.8" y2="672.264" gradientUnits="userSpaceOnUse">
                        <stop offset="0.572115" stopColor="#FFF59A"/>
                        <stop offset="1" stopColor="#FFFBD6" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="g_sun3" x1="3093.62" y1="139.976" x2="2570.44" y2="878.899" gradientUnits="userSpaceOnUse">
                        <stop offset="0.572115" stopColor="#FFF59A"/>
                        <stop offset="1" stopColor="#FFFBD6" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="g_sun4" x1="2783.72" y1="37.6028" x2="2216.4" y2="617.264" gradientUnits="userSpaceOnUse">
                        <stop offset="0.572115" stopColor="#FFF59A"/>
                        <stop offset="1" stopColor="#FFFBD6" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="g_sun5" x1="352.583" y1="186.698" x2="875.766" y2="925.622" gradientUnits="userSpaceOnUse">
                        <stop offset="0.572115" stopColor="#FFF59A"/>
                        <stop offset="1" stopColor="#FFFBD6" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="g_sun6" x1="662.483" y1="82.6028" x2="1229.8" y2="662.264" gradientUnits="userSpaceOnUse">
                        <stop offset="0.572115" stopColor="#FFF59A"/>
                        <stop offset="1" stopColor="#FFFBD6" stopOpacity="0"/>
                    </linearGradient>
                    <clipPath id="gardenClip">
                        <rect width="4948" height="1024" fill="white"/>
                    </clipPath>

                    {/* Outline filter for selected plant */}
                    <filter id="outlineFilter" x="-10%" y="-10%" width="120%" height="120%">
                        <feMorphology in="SourceAlpha" operator="dilate" radius="6" result="expanded"/>
                        <feFlood floodColor="white" result="color"/>
                        <feComposite in="color" in2="expanded" operator="in" result="outline"/>
                        <feMerge>
                            <feMergeNode in="outline"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <GardenBackground/>
                {PLANT_SLOTS.map(slot => (
                    <PlantSlotSVG
                        key={slot.id}
                        slot={slot}
                        state={getState(slot)}
                        selected={selectedId === slot.id}
                        onSelect={() => handleSelect(slot.id)}
                    />
                ))}

            </svg>

            <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
        </Wrapper>
    );
}