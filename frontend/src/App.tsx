// returns views that are needed but with appropriate urls (bookmark)
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Root from "./Root.tsx"

const router = createBrowserRouter(
    [ {path: "*", Component: Root} ]
);

export default function App() {

    return (
        <>
            <RouterProvider router={router}/>
        </>
    )
}
