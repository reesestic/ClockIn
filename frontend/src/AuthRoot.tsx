import { useState } from "react";
import App from "./App.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import { useAuth } from "./context/AuthContext.tsx";
import OnboardingSurvey from "./components/onboardingComponents/OnboardingSurvey.tsx";

export default function AuthRoot() {
    const { user, loading } = useAuth();
    const [surveyed, setSurveyed] = useState(false);

    if (loading) return null;
    if (!user) return <LoginPage />;

    const needsOnboarding = !surveyed && !localStorage.getItem(`clockin_onboarding_done:${user.id}`);

    if (needsOnboarding) {
        return (
            <>
                <App />
                <OnboardingSurvey
                    userId={user.id}
                    onComplete={() => setSurveyed(true)}
                />
            </>
        );
    }

    return <App />;
}