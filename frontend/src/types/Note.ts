export type Note = {
    id: number
    userId?: number
    title: string
    content: string
    position?: { x: number; y: number }
}