import {StickyNoteHome} from "./pages/StickyNoteHome.tsx";
import Home from "./pages/Home.tsx";
import { ROUTES } from "./constants/Routes";

//import Task from "./components/taskComponents/Task.tsx";

import { Route, Routes } from "react-router-dom";
// import TimerPage from "./pages/TimerPage.tsx";
import PlannerPage from "./pages/PlannerPage";

export default function Root() {
    return (
        <>
            <Routes>

                <Route
                    path={ROUTES.HOME}
                    element={<Home/>}
                />

                <Route
                    path={ROUTES.STICKY_NOTES}
                    element={<StickyNoteHome/>}
                />

                <Route
                    path="/planner"
                    element={<PlannerPage />}
                />

                {/*<Route*/}
                {/*    path="/timer"*/}
                {/*    element={<TimerPage />}*/}
                {/*/>*/}

            </Routes>
        </>
    )
}