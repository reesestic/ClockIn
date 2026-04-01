import {
    Overlay,
    OverlayContent,
    IconButton,
    BottomActions,
} from "../../pages/StickyNoteHome.styles";
import type { StickyNoteColor } from "../../types/StickyNoteThemes";

import CancelIcon from "../icons/CancelIcon.tsx";
import ConfirmIcon from "../icons/ConfirmIcon.tsx";
import styled from "styled-components";
import type { Note } from "../../types/Note";
import StickyNoteEditable from "../stickyNoteComponents/StickyNoteEditable.tsx";

const LargeIconButton = styled(IconButton)`
  svg {
    width: 35px;
    height: 35px;
  }
`;

type OverlayProps = {
    note: Note;
    onChange: (title: string, content: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
    onColorChange: (noteId: string, color: StickyNoteColor) => void;
};

export default function StickyNoteOverlay({note, onChange, onSave, onCancel, onDelete, onColorChange}: OverlayProps)
{

    return (
        <Overlay onClick={onCancel}>
            <OverlayContent onClick={(e) => e.stopPropagation()}>

                {/* 🧠 TOP MENU (comes from StickyNoteEditable) */}
                <StickyNoteEditable
                    note={note}
                    onChange={onChange}
                    onColorChange={onColorChange}
                    size="large"
                />

                {/* 🔘 BOTTOM ACTIONS */}
                <BottomActions>
                    <LargeIconButton style={{ color: "#FFF59A" }}
                                     onClick={onSave}>
                        <ConfirmIcon />
                    </LargeIconButton>

                    <LargeIconButton style={{ color: "#AFDBFF" }}
                                     onClick={onCancel}>
                        <CancelIcon />
                    </LargeIconButton>
                </BottomActions>

            </OverlayContent>
        </Overlay>
    );
}