import Lottie from "lottie-react";
import styled, { keyframes } from "styled-components";
import animationData from "../../assets/animations/loading.json";

const bob = keyframes`
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-30px); }
`;

const dash = keyframes`
    from { stroke-dashoffset: 200; }
    to   { stroke-dashoffset: 0; }
`;

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    gap: 0px;
`;

const BeeWrapper = styled.div`
    animation: ${bob} 1.2s ease-in-out infinite;
`;

const FlightPath = styled.svg`
    width: 220px;
    height: 40px;
    overflow: visible;
`;

const WavePath = styled.path`
    fill: none;
    stroke: #AFDBFF;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 8 10;
    stroke-dashoffset: 200;
    animation: ${dash} 1.2s ease-in-out infinite;
`;

export default function LottieLoading({ size = 100 }: { size?: number }) {
    return (
        <Wrapper>
            <BeeWrapper>
                <div style={{ width: size, height: size }}>
                    <Lottie animationData={animationData} loop autoplay />
                </div>
            </BeeWrapper>
            <FlightPath viewBox="0 0 220 40">
                <WavePath d="M 0 20 Q 27 0, 55 20 Q 82 40, 110 20 Q 137 0, 165 20 Q 192 40, 220 20" />
            </FlightPath>
        </Wrapper>
    );
}
