import {ROUTES} from "../constants/Routes.ts";
import type { Note } from "../types/Note";


export async function sendNote (activeNote : Note) {
    if (!activeNote) return;

    try {
        console.log(" Active Note: ", activeNote);
        const response = await fetch(`${import.meta.env.VITE_API_URL}${ROUTES.STICKY_NOTES}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(activeNote)
        });

        const data = await response.json();
        console.log("Note saved:", data);

    } catch (error) {
        console.error("Error sending note:", error);
    }
}