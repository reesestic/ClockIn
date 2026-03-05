import styled from "styled-components";

const StickyNoteContainer = styled.div`
  width: 240px;
  height: 240px;
  background: #efe08a;
  border-radius: 18px;
  padding: 16px;
  position: relative;
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
`;

const NoteHeader = styled.div`
  font-weight: bold;
  background: #e1d478;
  padding: 10px;
  border-radius: 12px 12px 0 0;

  display: flex;
  justify-content: space-between;
`;

const NoteText = styled.p`
  margin-top: 12px;
`;

const CornerFold = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;

  width: 40px;
  height: 40px;

  background: #b9a94d;

  clip-path: polygon(0 0, 100% 0, 100% 100%);
`;

export default function StickyNote() {
    return (
        <StickyNoteContainer>
            <NoteHeader>
                <span>Sticky Note Name</span>
                <span>⋮</span>
            </NoteHeader>

            <NoteText>• Jot down a note...</NoteText>

            <CornerFold />
        </StickyNoteContainer>
    );
}