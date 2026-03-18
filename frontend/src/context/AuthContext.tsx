import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../database/supabaseClient";

// ── Types ────────────────────────────────────────────────────

interface AuthContextValue {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<string | null>;
    signUp: (email: string, password: string, username: string) => Promise<string | null>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore session on page load
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setLoading(false);
        });

        // Listen for login / logout / token refresh
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    // Email + password login — returns error message or null on success
    async function signIn(email: string, password: string): Promise<string | null> {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return null;
        if (error.message.includes("Invalid login credentials")) return "Wrong email or password.";
        if (error.message.includes("Email not confirmed")) return "Please confirm your email first.";
        return error.message;
    }

    // Sign up — creates auth account + inserts row into public Users table
    async function signUp(email: string, password: string, username: string): Promise<string | null> {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return error.message;

        // Insert into public Users table using the new auth user's id
        if (data.user) {
            await supabase.from("Users").insert({
                id: data.user.id,
                username,
                email,
                password_hash: "supabase_managed",
            });
        }
        return null;
    }

    // Google OAuth — redirects to Google, then back to the app
    async function signInWithGoogle() {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin },
        });
    }

    async function signOut() {
        await supabase.auth.signOut();
    }

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
