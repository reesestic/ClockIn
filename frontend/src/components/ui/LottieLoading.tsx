import Lottie from "lottie-react";
import styled, { keyframes } from "styled-components";
import animationData from "../../assets/animations/loading.json";

const bob = keyframes`
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-30px); }
`;

const dash = keyframes`
    from { stroke-dashoffset: 300; }
    to   { stroke-dashoffset: 0; }
`;

// Outer container — sets the total size of the whole widget
const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
`;

// This is the positioning context — wave and bee live inside here
const Scene = styled.div<{ size: number }>`
    position: relative;
    width: ${({ size }) => size}px;
    height: ${({ size }) => size * 1.2}px;
`;

// Wave sits at the vertical center of the scene, spanning full width
const FlightPath = styled.svg`
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 60px;
    overflow: visible;
`;

const WavePath = styled.path`
    fill: none;
    stroke: #AFDBFF;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 8 10;
    stroke-dashoffset: 300;
    animation: ${dash} 1.2s ease-in-out infinite;
`;

// Bee bobs in the top portion of the scene, centered horizontally
const BeeWrapper = styled.div<{ size: number }>`
    position: absolute;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
    width: ${({ size }) => size}px;
    height: ${({ size }) => size}px;
    animation: ${bob} 1.2s ease-in-out infinite;
`;

export default function LottieLoading({ size = 120 }: { size?: number }) {
    return (
        <Wrapper>
            <Scene size={size}>
                {/* Wave renders first = behind the bee */}
                <FlightPath viewBox="0 0 220 60" preserveAspectRatio="none">
                    <WavePath d="M 0 30 Q 27 0, 55 30 Q 82 60, 110 30 Q 137 0, 165 30 Q 192 60, 220 30" />
                </FlightPath>

                {/* Bee renders on top */}
                <BeeWrapper size={size}>
                    <Lottie animationData={animationData} loop autoplay />
                </BeeWrapper>
            </Scene>
        </Wrapper>
    );
}
