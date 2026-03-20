export type StickyNoteTheme = {
    background: string
    fold: string
    text: string
}

export type StickyNoteColor = keyof typeof StickyNoteThemes;
export const StickyNoteThemes: Record<string, StickyNoteTheme> = {
    yellow: {
        background: "#FFF59A",
        fold: "#989847",
        text: "#989847"
    },

    pink: {
        background: "#FFC7E8",
        fold: "#D45884",
        text: "#D45884"
    },

    blue: {
        background: "#AFDBFF",
        fold: "#0E4F87",
        text: "#0E4F87"
    },

}