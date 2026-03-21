import App from "./App.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import { useAuth } from "./context/AuthContext.tsx";

export default function AuthRoot() {
    const { user, loading, signOut } = useAuth();

    if (loading) return null;

    if (user) return (
        <>
            <button
                onClick={signOut}
                style={{
                    position: "fixed", top: 16, right: 16, zIndex: 9999,
                    background: "rgba(255,255,255,0.85)", border: "1px solid #ccc",
                    borderRadius: 20, padding: "6px 14px", cursor: "pointer",
                    fontSize: "0.8rem", backdropFilter: "blur(4px)"
                }}
            >
                Sign out
            </button>
            <App />
        </>
    );

    return <LoginPage />;
}
