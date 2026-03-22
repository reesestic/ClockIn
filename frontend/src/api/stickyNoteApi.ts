import { API_ROUTES } from "../constants/apiRoutes.ts";
import type { Note } from "../types/Note";
import type { StickyNoteColor } from "../types/StickyNoteThemes";
import { authFetch } from "./authFetch";

export async function sendNote (noteId : string) {

    const response = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.STICKY_NOTES}/send/${noteId}`,
        {
            method: "POST",
        }
    );

    if (!response.ok) {
        throw new Error("Failed to create note");
    }

    return await response.json();
}

export async function saveNote (activeNote : Note) {
    if (!activeNote) return;

    const response = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.STICKY_NOTES}/save`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                id: activeNote.id,
                title: activeNote.title,
                content: activeNote.content,
                position: activeNote.position,
                color: activeNote.color
            })
        }
    );

    if (!response.ok) {
        throw new Error("Failed to create note");
    }

    return await response.json();
}

export async function getNotes() {

    const response = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.STICKY_NOTES}`
    );


    if (!response.ok) {
        throw new Error("Failed to fetch notes");
    }
    return response.json();
}

export async function deleteNote(noteId: string) {
    const response = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.STICKY_NOTES}/delete/${noteId}`,
        {
            method: "DELETE",
        }
    );
    if (!response.ok) {
        throw new Error("Failed to delete note");
    }
    return await response.json();
    // { deleted_id: number }
    // returns this
}

export async function changeColor(noteId : string, color: StickyNoteColor) {
    // stuff to change color
    const response = await authFetch(
        `${import.meta.env.VITE_API_URL}${API_ROUTES.STICKY_NOTES}/${noteId}/color`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ color })
        }
    );

    if (!response.ok) {
        throw new Error("Failed to update color");
    }
    console.log("Succcess, no return to frontend")
}