import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { AuthProvider } from "./context/AuthContext.tsx";
import AuthRoot from "./AuthRoot.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthProvider>
            <AuthRoot />
        </AuthProvider>
    </StrictMode>
);
