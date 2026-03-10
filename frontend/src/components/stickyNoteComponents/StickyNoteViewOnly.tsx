import StickyNoteFrame from "./StickyNoteFrame";
import type {Note} from "../../types/Note";
import styled from "styled-components";
import { StickyNoteThemes } from "../../types/StickyNoteThemes";
import { useState} from "react";

const Title = styled.h3`
    font-size: 1rem;
    margin: 0;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Content = styled.p`
    font-size: 0.9rem;
    line-height: 1.3;

    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;

    word-break: break-word;
`;

const ViewOnlyMenu = ({ onColorChange }: { onColorChange: (color: string) => void }) => {

    const [open, setOpen] = useState(false);

    return (
        <div style={{ position: "relative", zIndex: 1000}}>
            <button onClick={(e) => {e.stopPropagation();
                setOpen(!open)}}>
                ⋯
            </button>

            {open && (
                <ul style={{
                    position: "absolute",
                    top: "0%",
                    right: "100%",
                    display: "flex",
                    marginRight: "6px",
                    listStyle: "none",
                    zIndex: 1000,
                    margin: 0,
                    color: "white",
                }}>
                    <li style={{
                        border: "2px solid #eeeeee",
                        padding: "6px",
                        display: "block",
                        background: "black",
                        cursor: "pointer"}}
                        onClick={(e) => {e.stopPropagation();
                            onColorChange("pink")}}
                    >pink</li>
                    <li style={{
                        border: "2px solid #eeeeee",
                        padding: "6px",
                        display: "block",
                        background: "black",
                        cursor: "pointer"}}
                        onClick={(e) => {e.stopPropagation();
                            onColorChange("yellow")}}
                    >yellow</li>
                    <li style={{
                        border: "2px solid #eeeeee",
                        padding: "6px",
                        display: "block",
                        background: "black",
                        cursor: "pointer"}}
                        onClick={(e) => {e.stopPropagation();
                            onColorChange("blue")}}
                    >blue</li>
                </ul>
            )}

        </div>
    );
};

type Props = {
    note: Note;
    onClick?: () => void;
    onColorChange: (noteId: string, color: string) => void;
};

export default function StickyNoteViewOnly({note, onClick, onColorChange}: Props) {
    return (
        // children passed auto by title, content
        <StickyNoteFrame
            onClick={onClick}
            theme={StickyNoteThemes[note.color]}
             menu={<ViewOnlyMenu onColorChange={(color) => onColorChange(note.id!, color)}/>} >
            <Title>{note.title}</Title>
            <Content>{note.content}</Content>
        </StickyNoteFrame>
    );
}