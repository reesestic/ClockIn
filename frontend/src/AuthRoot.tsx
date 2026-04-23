import { useState, useEffect } from "react";
import App from "./App.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import { useAuth } from "./context/AuthContext.tsx";
import OnboardingSurvey from "./components/onboardingComponents/OnboardingSurvey.tsx";

export default function AuthRoot() {
    const { user, loading } = useAuth();
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        if (!user) {
            setNeedsOnboarding(false);
            return;
        }
        const done = localStorage.getItem(`clockin_onboarding_done:${user.id}`);
        setNeedsOnboarding(!done);
    }, [user]);

    if (loading) return null;

    if (!user) return <LoginPage />;

    if (needsOnboarding) {
        return (
            <>
                {/* Render the main app dimmed behind the survey overlay */}
                <App />
                <OnboardingSurvey
                    userId={user.id}
                    onComplete={() => setNeedsOnboarding(false)}
                />
            </>
        );
    }

    return <App />;
}