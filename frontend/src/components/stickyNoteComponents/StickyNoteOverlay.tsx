import {
    CancelButton,
    ExpandedStickyNote,
    Overlay,
    OverlayButtons,
    SaveButton,
    DeleteButton
} from "../../pages/StickyNoteHome.styles";
import type { StickyNoteColor } from "../../types/StickyNoteThemes";

import type { Note } from "../../types/Note";

type Props = {
    note: Note;
    onChange: (title: string, content: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
    onColorChange: (noteId: string, color: StickyNoteColor) => void;
};

export default function StickyNoteOverlay({note, onChange, onSave, onCancel, onDelete, onColorChange}: Props)
{

    return (
        <Overlay>
            <div onClick={(e) => e.stopPropagation()}>
                <ExpandedStickyNote
                    note={note}
                    onChange={onChange}
                    onColorChange={onColorChange}
                />

                <OverlayButtons>
                    <SaveButton onClick={onSave}>
                        Save
                    </SaveButton>

                    <CancelButton onClick={onCancel}>
                        Cancel
                    </CancelButton>

                    <DeleteButton onClick={onDelete}>
                        Delete
                    </DeleteButton>
                </OverlayButtons>
            </div>
        </Overlay>
    );
}