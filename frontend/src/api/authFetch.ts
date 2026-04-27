import {supabase} from "../supabaseClient.ts";

function buildHeaders(token: string, extra?: HeadersInit): HeadersInit {
    return {
        ...(extra ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
}

export async function authFetch(url: string, options: RequestInit = {}) {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;

    if (!token) {
        throw new Error("No auth token found");
    }

    let response = await fetch(url, {
        ...options,
        headers: buildHeaders(token, options.headers),
    });

    // Token was rejected — try a forced refresh and retry once
    if (response.status === 401) {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (error || !refreshed.session) {
            throw new Error("Session expired — please log in again");
        }
        token = refreshed.session.access_token;
        response = await fetch(url, {
            ...options,
            headers: buildHeaders(token, options.headers),
        });
    }

    return response;
}