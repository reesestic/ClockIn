import styled from "styled-components";
import StickyNoteBackground from "./StickyNoteBackground";
import React from "react";
import type { StickyNoteTheme } from "../../types/StickyNoteThemes";

const NoteWrapper = styled.div<{ size?: "small" | "large" }>`
    position: relative;
    opacity: 1;

    width: ${({ size }) =>
            size === "large"
                    ? "min(400px, 60vw)"   // 🔥 bigger edit mode
                    : "clamp(200px, 14vw, 300px)"};

    aspect-ratio: 1;
`;

const NoteContent = styled.div<{textColor: string}>`
    position: absolute;
    inset: 8% 8% 10% 8%;
    
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: ${(props) => props.textColor};
`;

const MenuWrapper = styled.div`
  position: absolute; 
  top: 10px;
  right: 10px;
`

type Props = {
    onClick?: () => void;
    theme: StickyNoteTheme;
    menu?: React.ReactNode;
    children: React.ReactNode;
    size?: "small" | "large";
};

export default function StickyNoteFrame({onClick, theme, menu, children, size }: Props) {
    return (
        <NoteWrapper size={size} onClick={onClick}>
            <StickyNoteBackground theme={theme}/>

            { menu && (
                <MenuWrapper onClick={(e : React.MouseEvent) => e.stopPropagation()}>
                    {menu}
                </MenuWrapper>
            )}
            <NoteContent textColor={theme.text}>{children}</NoteContent>
        </NoteWrapper>
    );
}