import { API_ROUTES } from "../constants/apiRoutes.ts";
import { authFetch } from "./authFetch";

const BASE = `${import.meta.env.VITE_API_URL}${API_ROUTES.PLANTS}`;

export async function growPlant(activeSeconds: number) {
    const res = await authFetch(`${BASE}/grow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_seconds: activeSeconds }),
    });
    if (!res.ok) throw new Error("Failed to grow plant");
    return res.json();
}

export async function fetchActivePlant() {
    const res = await authFetch(`${BASE}/active`);
    if (!res.ok) throw new Error("Failed to fetch plant");
    return res.json();
}