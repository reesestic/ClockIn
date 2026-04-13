import styled, { keyframes, css } from "styled-components";
import { useTutorial } from "../../constants/useTutorial";
import TutorialBeeIcon from "../icons/TutorialBeeIcon.tsx";
import { useEffect, useState } from "react";

/* ── Animations ── */
const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const floatBee = keyframes`
    0%   { transform: translateY(0px) rotate(-4deg); }
    50%  { transform: translateY(-10px) rotate(4deg); }
    100% { transform: translateY(0px) rotate(-4deg); }
`;

const slideIn = keyframes`
    0%   { opacity: 0; transform: scale(0.6) translateY(20px); }
    60%  { opacity: 1; transform: scale(1.04) translateY(-4px); }
    80%  { transform: scale(0.98) translateY(2px); }
    100% { transform: scale(1) translateY(0); }
`;

/* ── The full-screen SVG overlay — does dim + spotlight cutout in one ── */
const OverlaySvg = styled.svg`
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    pointer-events: all;
    animation: ${fadeIn} 0.3s ease;
`;

const lineFadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;
/* ── Line SVG sits on top of the overlay ── */
const LineSvg = styled.svg`
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 10000;
    overflow: visible;
    animation: ${lineFadeIn} 0.2s ease 0.1s both;
`;

/* CardWrapper owns position — set via inline style so it's there frame zero */
const CardWrapper = styled.div<{
    $centered?: boolean;
}>`
    position: fixed;
    z-index: 10001;
    ${p => p.$centered && css`transform: translate(-50%, -50%);`}
`;

/* Card only handles visuals + animation — never touches position */
const Card = styled.div`
    background: white;
    border-radius: 12px;
    padding: 36px 44px 28px;
    min-width: 300px;
    max-width: 420px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.15);
    transform-origin: left center;
    animation: ${slideIn} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

const CardTitle = styled.h2`
    font-size: 1.65rem;
    font-weight: 800;
    font-style: italic;
    color: #1a1a1a;
    margin: 0 0 10px;
    text-align: center;
`;

const CardBody = styled.p`
    font-size: 1rem;
    color: #333;
    text-align: center;
    margin: 0;
    line-height: 1.5;
`;

const CardHighlight = styled.span`
    color: #4B94DB;
    font-weight: 500;
`;

const BeeWrapper = styled.div<{
    $top?: string; $bottom?: string;
    $left?: string; $right?: string;
}>`
    position: fixed;
    width: 90px;
    z-index: 10002;
    animation: ${floatBee} 2.8s ease-in-out infinite;
    pointer-events: none;

    ${p => p.$top    && css`top: ${p.$top};`}
    ${p => p.$bottom && css`bottom: ${p.$bottom};`}
    ${p => p.$left   && css`left: ${p.$left};`}
    ${p => p.$right  && css`right: ${p.$right};`}
`;

const DotsRow = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 10003;
`;

const Dot = styled.div<{ $active: boolean }>`
    width: ${p => p.$active ? "12px" : "9px"};
    height: ${p => p.$active ? "12px" : "9px"};
    border-radius: 50%;
    background: ${p => p.$active ? "#4B94DB" : "rgba(255,255,255,0.6)"};
    border: 2px solid ${p => p.$active ? "#4B94DB" : "rgba(255,255,255,0.8)"};
    transition: all 0.2s ease;
`;

const ArrowBtn = styled.button`
    background: none;
    border: none;
    color: white;
    font-size: 1.4rem;
    cursor: pointer;
    padding: 2px 6px;
    opacity: 0.8;
    transition: opacity 0.15s;
    line-height: 1;

    &:hover { opacity: 1; }
    &:disabled { opacity: 0.3; cursor: default; }
`;

const SkipBtn = styled.button`
    position: fixed;
    top: 20px;
    right: 24px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.75);
    font-size: 0.85rem;
    cursor: pointer;
    z-index: 10003;
    transition: color 0.15s;

    &:hover { color: white; }
`;

/* ── Spotlight rect with padding ── */
interface SpotlightRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

const SPOTLIGHT_PADDING = 16;

function pct(val: string | undefined, total: number): number {
    if (!val) return 0;
    if (val.endsWith("%")) return (parseFloat(val) / 100) * total;
    return parseFloat(val);
}

export default function TutorialOverlay() {
    const { isActive, currentStep, step, totalSteps, next, prev, stop } = useTutorial();
    const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
    const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

    // Update dims on resize
    useEffect(() => {
        const handle = () => setDims({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener("resize", handle);
        return () => window.removeEventListener("resize", handle);
    }, []);

    // Find the target element and compute its spotlight rect
    useEffect(() => {
        if (!isActive || !step?.targetSelector) return;

        const timer = setTimeout(() => {
            const el = document.querySelector(step.targetSelector!);
            if (!el) return; // 🚫 don't clear spotlight

            const rect = el.getBoundingClientRect();
            setSpotlight({
                x: rect.left - SPOTLIGHT_PADDING,
                y: rect.top - SPOTLIGHT_PADDING,
                width: rect.width + SPOTLIGHT_PADDING * 2,
                height: rect.height + SPOTLIGHT_PADDING * 2,
            });
        }, 50);

        return () => clearTimeout(timer);
    }, [isActive, currentStep, step?.targetSelector]);

    if (!isActive || !step) return null;

    const { w, h } = dims;

    // Bee center coords for line start
    const beeX = step.beePosition.right
        ? w - pct(step.beePosition.right, w) - 45
        : pct(step.beePosition.left, w) + 45;
    const beeY = step.beePosition.bottom
        ? h - pct(step.beePosition.bottom, h) - 45
        : pct(step.beePosition.top, h) + 45;

    const offsetX = step.spotlightOffset?.x ?? 0;
    const offsetY = step.spotlightOffset?.y ?? 0;

    // Line points to spotlight center if we have one, otherwise lineTarget
    const targetX = spotlight ? spotlight.x + spotlight.width / 2 + offsetX : 0;
    const targetY = spotlight ? spotlight.y + spotlight.height / 2 + offsetY : 0;

    const showLine = step.id !== "welcome" && step.id !== "gist" && spotlight !== null;

    const cpX = (beeX + targetX) / 2 + (targetY - beeY) * 0.3 + (step.lineCurve?.offsetX ?? 0);
    const cpY = (beeY + targetY) / 2 - Math.abs(targetX - beeX) * 0.25 + (step.lineCurve?.offsetY ?? 0);

    // Build the SVG clip path:
    // Outer rect covers entire screen, inner rect is the spotlight hole.
    // "evenodd" fill rule makes the inner rect transparent.
    const spotlightPath = spotlight
        ? `M 0 0 H ${w} V ${h} H 0 Z M ${spotlight.x} ${spotlight.y} h ${spotlight.width} v ${spotlight.height} h -${spotlight.width} Z`
        : null;

    return (
        <>
            {/* Dim overlay with spotlight cutout */}
            <OverlaySvg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                <defs>
                    {spotlight && (
                        <filter id="spotlight-glow">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    )}
                </defs>

                {/* Dim background with cutout */}
                {spotlightPath ? (
                    <path
                        d={spotlightPath}
                        fill="rgba(50, 90, 150, 0.55)"
                        fillRule="evenodd"
                    />
                ) : (
                    <rect width={w} height={h} fill="rgba(50, 90, 150, 0.55)" />
                )}

                {/* Glowing border around the spotlight */}
                {spotlight && (
                    <rect
                        x={spotlight.x}
                        y={spotlight.y}
                        width={spotlight.width}
                        height={spotlight.height}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.85)"
                        strokeWidth="2.5"
                        rx="8"
                        style={{
                            filter: "drop-shadow(0 0 8px rgba(255,255,255,0.9)) drop-shadow(0 0 16px rgba(175,219,255,0.6))"
                        }}
                    />
                )}
            </OverlaySvg>

            <SkipBtn onClick={stop}>Skip ✕</SkipBtn>

            {/* Dashed curved line from bee to target */}
            {showLine && (
                <LineSvg key={currentStep}>
                    <path
                        d={`M ${beeX} ${beeY} Q ${cpX} ${cpY} ${targetX} ${targetY}`}
                        stroke="#FFF59A"
                        strokeWidth="6"
                        strokeDasharray="16 10"
                        fill="none"
                        strokeLinecap="round"
                    />
                </LineSvg>
            )}

            {/* Floating bee */}
            <BeeWrapper
                $top={step.beePosition.top}
                $bottom={step.beePosition.bottom}
                $left={step.beePosition.left}
                $right={step.beePosition.right}
            >
                <TutorialBeeIcon style={{ width: "100%", height: "auto" }} />
            </BeeWrapper>

            {/* Modal card */}
            <CardWrapper
                key={step.id}
                $centered={!!step.modalPosition.transform}
                style={{
                    top: step.modalPosition.top,
                    bottom: step.modalPosition.bottom,
                    left: step.modalPosition.left,
                    right: step.modalPosition.right,
                }}
            >
                <Card>
                    <CardTitle>{step.title}</CardTitle>
                    {(step.body || step.highlight) && (
                        <CardBody>
                            {step.body}{step.body ? " " : ""}
                            <CardHighlight>{step.highlight}</CardHighlight>
                            {step.id === "timer" && " and complete a task!"}
                        </CardBody>
                    )}
                </Card>
            </CardWrapper>

            {/* Dot pagination */}
            <DotsRow>
                <ArrowBtn onClick={prev} disabled={currentStep === 0}>‹</ArrowBtn>
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <Dot key={i} $active={i === currentStep} />
                ))}
                <ArrowBtn onClick={next}>
                    {currentStep === totalSteps - 1 ? "✓" : "›"}
                </ArrowBtn>
            </DotsRow>
        </>
    );
}