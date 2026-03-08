import {
    CancelButton,
    ExpandedStickyNote,
    Overlay,
    OverlayButtons,
    SaveButton
} from "../../pages/StickyNoteHome.styles";

import type { Note } from "../../types/Note";

type Props = {
    note: Note;
    onChange: (title: string, content: string) => void;
    onSave: () => void;
    onCancel: () => void;
};

export default function StickyNoteOverlay({note, onChange, onSave, onCancel}: Props)
{

    return (
        <Overlay>
            <div onClick={(e) => e.stopPropagation()}>
                <ExpandedStickyNote
                    note={note}
                    onChange={onChange}
                />

                <OverlayButtons>
                    <SaveButton onClick={onSave}>
                        Save
                    </SaveButton>

                    <CancelButton onClick={onCancel}>
                        Cancel
                    </CancelButton>
                </OverlayButtons>
            </div>
        </Overlay>
    );
}