import { Navigate } from "react-router-dom";
import { ROUTES } from "../../constants/Routes";
import { getActiveSession } from "../../utils/session.ts";

export default function TimerRouteGuard({ children }: any) {
    const session = getActiveSession();

    if (session) {
        return <Navigate to={ROUTES.TIMER_SCREEN} replace />;
    }

    return <>{children}</>;
}