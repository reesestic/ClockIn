import { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./Root.tsx";
import { NotesProvider } from "./context/NoteContext.tsx";
import { TutorialProvider } from "./context/TutorialContext.tsx";
import { PlantProvider } from "./context/PlantProvider";
import TutorialOverlay from "./components/onboardingComponents/TutorialOverlay.tsx";
import OnboardingSurvey from "./components/onboardingComponents/OnboardingSurvey.tsx";
import { useAuth } from "./context/AuthContext.tsx";
import { useTutorial } from "./constants/useTutorial.ts";
import { HOME_TUTORIAL_STEPS } from "./constants/HomeTutorialSteps.ts";

const router = createBrowserRouter([{ path: "*", Component: Root }]);

function OnboardingController() {
    const { user } = useAuth();
    const { setSteps, start } = useTutorial();
    const [surveyed, setSurveyed] = useState(false);

    if (!user) return null;
    const needsOnboarding = !surveyed && !localStorage.getItem(`clockin_onboarding_done:${user.id}`);
    if (!needsOnboarding) return null;

    function handleSurveyComplete() {
        setSurveyed(true);
        setSteps(HOME_TUTORIAL_STEPS);
        setTimeout(start, 400);
    }

    return <OnboardingSurvey userId={user.id} onComplete={handleSurveyComplete} />;
}

export default function App() {
    return (
        <TutorialProvider>
            <TutorialOverlay />
            <NotesProvider>
                <PlantProvider>
                    <RouterProvider router={router} />
                </PlantProvider>
            </NotesProvider>
            <OnboardingController />
        </TutorialProvider>
    );
}
