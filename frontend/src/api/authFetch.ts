import {supabase} from "../supabaseClient.ts";

function buildHeaders(token: string, body?: any, extra?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(extra as Record<string, string>),
    };

    if (!(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

export async function authFetch(url: string, options: RequestInit = {}) {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (!token) {
        throw new Error("No auth token found");
    }

    let response = await fetch(url, {
        ...options,
        headers: buildHeaders(token, options.body, options.headers),
    });

    // Retry on expired token
    if (response.status === 401) {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (error || !refreshed.session) {
            throw new Error("Session expired — please log in again");
        }

        token = refreshed.session.access_token;

        response = await fetch(url, {
            ...options,
            headers: buildHeaders(token, options.body, options.headers),
        });
    }

    return response;
}