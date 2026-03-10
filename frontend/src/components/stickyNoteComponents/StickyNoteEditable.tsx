import StickyNoteFrame from "./StickyNoteFrame";
import type { Note } from "../../types/Note";
import styled from "styled-components"
import { StickyNoteThemes } from "../../types/StickyNoteThemes";

const TitleInput = styled.input`
  font-size: 1rem;
  font-weight: bold;
  border: none;
  background: transparent;

  &:focus {
    outline: none;
  }
`;

const ContentTextarea = styled.textarea`
  border: none;
  resize: none;
  background: transparent;

  &:focus {
    outline: none;
  }
`;

const EditMenu = () => {
    return (
        <div>
            <button>B</button>
            <button>I</button>
            <button>•</button>
        </div>
    )
}

type Props = {
    note: Note;
    onChange: (title: string, content: string) => void;
};

export default function StickyNoteEditable({ note, onChange }: Props) {
    return (
        <StickyNoteFrame theme={StickyNoteThemes[note.color]} menu={<EditMenu/>}>
            <TitleInput
                value={note.title}
                onChange={(e) => onChange(e.target.value, note.content)}
            />

            <ContentTextarea
                value={note.content}
                onChange={(e) => onChange(note.title, e.target.value)}
            />
        </StickyNoteFrame>
    );
}