import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Root from "./Root.tsx"
import {NotesProvider} from "./context/NoteContext.tsx";
import {TutorialProvider} from "./context/TutorialContext.tsx";
import {PlantProvider} from "./context/PlantProvider";
import {UserVisitsProvider} from "./context/UserVisitContext.tsx";
import TutorialOverlay from "./components/onboardingComponents/TutorialOverlay.tsx";

const router = createBrowserRouter(
    [ {path: "*", Component: Root} ]
);

export default function App() {
    return (
        <TutorialProvider>
            <TutorialOverlay />
            <UserVisitsProvider>
                <NotesProvider>
                    <PlantProvider>
                        <RouterProvider router={router} />
                    </PlantProvider>
                </NotesProvider>
            </UserVisitsProvider>
        </TutorialProvider>
    )
}