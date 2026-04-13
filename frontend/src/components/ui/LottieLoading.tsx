import Lottie from "lottie-react";
import styled from "styled-components";
import animationData from "../../assets/animations/loading.json";


const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
`;

export default function LottieLoading({ size = 80 }: { size?: number }) {
    return (
        <Wrapper>
            <div style={{ width: size, height: size }}>
                <Lottie animationData={animationData} loop autoplay assetsPath="/images/"/>
            </div>
        </Wrapper>
    );
}
