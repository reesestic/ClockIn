import { Link } from "react-router-dom";
import styled from "styled-components";
import { BackIcon } from "../icons/BackIcon";

type BackButtonProps = {
    to: string;
    label?: string;
    className?: string;
};

const BackLink = styled(Link)`
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    text-decoration: none;

    &:hover svg {
        transform: scale(1.08);
    }

    &:hover span {
        opacity: 1;
        transform: translateX(0);
    }
`;

const StyledBackIcon = styled(BackIcon)`
    width: 2.2rem;
    height: 2.2rem;
    flex-shrink: 0;
    transition: transform 0.15s ease;
`;

const HoverText = styled.span`
    font-size: 0.9rem;
    color: #0e4f87;

    opacity: 0;
    transform: translateX(-4px);
    transition: opacity 0.15s ease, transform 0.15s ease;

    pointer-events: none;
`;

export function BackButton({ to, label = "Home", className }: BackButtonProps) {
    return (
        <BackLink to={to} className={className}>
            <StyledBackIcon />
            <HoverText>{label}</HoverText>
        </BackLink>
    );
}