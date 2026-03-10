export type Note = {
    id?: number
    title: string
    content: string
    color: string
    position: {
        x: number
        y: number
        z: number
    }
}