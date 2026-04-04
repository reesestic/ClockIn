import StickyNoteFrame from "./StickyNoteFrame";
import type { Note } from "../../types/Note";
import styled from "styled-components";
import { StickyNoteThemes } from "../../types/StickyNoteThemes";
import React, { useRef, useEffect } from "react";

const TitleInput = styled.input`
    font-size: 1.6rem;
    font-weight: 600;

    margin: 0;
    padding: 0;

    border: none;
    background: transparent;

    &:focus {
        outline: none;
    }
`;


// 🔥 SCROLL CONTAINER (this replaces textarea scroll)
const ContentWrapper = styled.div`
    flex: 1;
    min-height: 0;

    overflow-y: auto;

    padding-right: 2.5rem;

    /* hide scrollbar */
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
        display: none;
    }
`;


const ContentTextarea = styled.textarea`
    font-size: 1.2rem;
    line-height: 1.6;

    width: 100%;
    border: none;
    resize: none;
    background: transparent;

    overflow: hidden;

    word-break: break-word;

    &:focus {
        outline: none;
    }
`;

type NoteProps = {
    note: Note;
    onChange: (title: string, content: string) => void;
    size?: "small" | "large";
};


export default function StickyNoteEditable({
                                               note,
                                               onChange,
                                               size = "small"
                                           }: NoteProps) {

    const titleRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    // autofocus title
    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    // enter → jump to body
    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            contentRef.current?.focus();
        }
    };

    // 🔥 auto-grow textarea
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.style.height = "auto";
            contentRef.current.style.height = contentRef.current.scrollHeight + "px";
        }
    }, [note.content]);

    return (
        <StickyNoteFrame
            size={size}
            theme={StickyNoteThemes[note.color]}
        >
            <TitleInput
                ref={titleRef}
                value={note.title}
                onChange={(e) => onChange(e.target.value, note.content)}
                onKeyDown={handleTitleKeyDown}
                placeholder="Add a title..."
            />

            <ContentWrapper>
                <ContentTextarea
                    ref={contentRef}
                    value={note.content}
                    onChange={(e) => onChange(note.title, e.target.value)}
                    placeholder="Start writing..."
                />
            </ContentWrapper>

        </StickyNoteFrame>
    );
}