import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";

// ── Root renders login or app based on auth state ────────────

function Root() {
    const { user, loading } = useAuth();

    if (loading) return null; // wait for session to restore before rendering

    if (user) return <App />;

    return <LoginPage />;
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthProvider>
            <Root />
        </AuthProvider>
    </StrictMode>
);
