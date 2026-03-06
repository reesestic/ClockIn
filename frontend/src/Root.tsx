import StickyNoteHome from "./pages/StickyNoteHome.tsx";
import Home from "./pages/Home.tsx";

//import styled from "styled-components";
//import Task from "./components/taskComponents/Task.tsx";

import { Route, Routes } from "react-router-dom";

export default function Root() {
    return (
        <>
            <Routes>

                <Route
                    path={"/"}
                    element={<Home/>}
                />

                <Route
                    path={"/sticky-notes"}
                    element={<StickyNoteHome/>}
                />

            </Routes>
        </>
    )
}