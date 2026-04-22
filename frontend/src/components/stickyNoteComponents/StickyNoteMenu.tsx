import styled from "styled-components";
import type { StickyNoteColor } from "../../types/StickyNoteThemes";
import type { Editor } from "@tiptap/react";


// ─── Layout ───────────────────────────────────────────────────────────────────

const MenuContainer = styled.div`
    display: inline-flex;
    flex-direction: column;

    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 10px;
    box-shadow:
            0 4px 16px rgba(0, 0, 0, 0.12),
            0 1px 4px rgba(0, 0, 0, 0.08);

    overflow: hidden;
    user-select: none;
`;

const Divider = styled.div`
    height: 1px;
    background: rgba(0, 0, 0, 0.08);
    margin: 0 8px;
`;

// ─── Format Row ───────────────────────────────────────────────────────────────

const FormatRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: stretch;
`;

const FormatButton = styled.button`
    flex: 1;
    padding: 7px 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.7);
    transition: background 0.12s ease;
    line-height: 1;

    &:hover {
        background: rgba(0, 0, 0, 0.07);
    }

    &:active {
        background: rgba(0, 0, 0, 0.13);
    }

    & + & {
        border-left: 1px solid rgba(0, 0, 0, 0.08);
    }
`;

const BoldLabel = styled.span`font-weight: 700;`;
const ItalicLabel = styled.span`font-style: italic; font-weight: 500;`;
const UnderlineLabel = styled.span`text-decoration: underline;`;
const StrikeLabel = styled.span`text-decoration: line-through;`;

// ─── Color Row ────────────────────────────────────────────────────────────────

const ColorRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
`;

const ColorLabel = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.5);
    margin-right: 2px;
    white-space: nowrap;
`;

const ColorSwatch = styled.button<{ color: string; selected?: boolean }>`
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${({ color }) => color};
    border: ${({ selected }) =>
            selected ? "2px solid rgba(0,0,0,0.5)" : "2px solid transparent"};
    cursor: pointer;
    padding: 0;
    transition: transform 0.1s ease, border-color 0.1s ease;
    flex-shrink: 0;

    &:hover {
        transform: scale(1.2);
        border-color: rgba(0, 0, 0, 0.3);
    }
`;

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR_OPTIONS: { color: StickyNoteColor; hex: string; label: string }[] = [
    { color: "red",    hex: "#FFAFB1", label: "Red" },
    { color: "orange", hex: "#F6C98A", label: "Orange" },
    { color: "yellow", hex: "#FFF59A", label: "Yellow" },
    { color: "green",  hex: "#C0E8AA", label: "Green" },
    { color: "blue",   hex: "#AFDBFF", label: "Blue" },
    { color: "purple", hex: "#C5AFFF", label: "Purple" },
    { color: "pink",   hex: "#FFC7E8", label: "Pink" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
    editor: Editor;
    noteId?: string;
    selectedColor?: StickyNoteColor;
    onColorChange?: (noteId: string, color: StickyNoteColor) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StickyNoteMenu({ editor, noteId, selectedColor, onColorChange }: Props) {
    return (
        <MenuContainer>
            <FormatRow>
                <FormatButton onClick={() => editor.chain().focus().toggleBold().run()}>
                    <BoldLabel>B</BoldLabel>
                </FormatButton>

                <FormatButton onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <ItalicLabel>I</ItalicLabel>
                </FormatButton>

                <FormatButton onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineLabel>U</UnderlineLabel>
                </FormatButton>

                <FormatButton onClick={() => editor.chain().focus().toggleStrike().run()}>
                    <StrikeLabel>S</StrikeLabel>
                </FormatButton>
            </FormatRow>

            <Divider />

            <ColorRow>
                <ColorLabel>Color</ColorLabel>
                {COLOR_OPTIONS.map(({ color, hex, label }) => (
                    <ColorSwatch
                        key={color}
                        color={hex}
                        selected={selectedColor === color}
                        title={label}
                        onClick={() => onColorChange?.(noteId ?? "", color)}
                    />
                ))}
            </ColorRow>
        </MenuContainer>
    );
}