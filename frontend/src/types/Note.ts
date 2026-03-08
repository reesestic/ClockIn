export type Note = {
    id?: number
    userId?: number
    title: string
    content: string
    position?: { x: number; y: number, z: number}
}

export type StickyNoteDB = {
    id: number
    title: string
    text: string
    posX: number
    posY: number
    posZ: number
}