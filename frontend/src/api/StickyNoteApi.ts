import {ROUTES} from "../constants/Routes.ts";
import type { Note } from "../types/Note";


export async function sendNote (activeNote : Note) {
    if (!activeNote) return;

    const response = await fetch(
        `${import.meta.env.VITE_API_URL}${ROUTES.STICKY_NOTES}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },

            // Only sends fields that the frontend modifies, not IDs
            body: JSON.stringify({
                title: activeNote.title,
                content: activeNote.content,
                position: activeNote.position
            })
        }
    );

    if (!response.ok) {
        throw new Error("Failed to create note");
    }

    const data = await response.json();
    console.log(data);
    //return data.note;
}