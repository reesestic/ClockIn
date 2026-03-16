import styled from "styled-components";
import StickyNoteBackground from "./StickyNoteBackground";
import React from "react";
import type { StickyNoteTheme } from "../../types/StickyNoteThemes";

const NoteWrapper = styled.div`
    position: relative;
    width: clamp(200px, 15vw, 300px);
    aspect-ratio: 1;
`;

const NoteContent = styled.div<{textColor: string}>`
    position: absolute;
    inset: 9% 9% 9% 13%;
    
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
};

export default function StickyNoteFrame({onClick, theme, menu, children }: Props) {
    return (
        <NoteWrapper onClick={onClick}>
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