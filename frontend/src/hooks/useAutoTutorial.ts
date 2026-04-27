import { useEffect, useRef } from "react";
import type { TutorialStep } from "../types/TutorialStep";
import { useTutorial } from "../constants/useTutorial.ts";
import { useUserVisits } from "../hooks/useUserVisits.ts";

type Page = "home" | "notes" | "tasks" | "schedule" | "timer" | "garden";

export function useAutoTutorial(page: Page, steps: TutorialStep[]) {
    const { setSteps, setOnComplete, start } = useTutorial();
    const { visits, markVisited, loading } = useUserVisits();
    const hasStarted = useRef(false);

    // Reset when page changes
    useEffect(() => {
        hasStarted.current = false;
    }, [page]);

    useEffect(() => {
        if (loading || hasStarted.current || !visits) return;

        const col = `visited_${page}` as keyof typeof visits;
        const isUnvisited = visits[col] === false || visits[col] == null;

        console.log("[useAutoTutorial]", { page, col, value: visits[col], loading });

        if (isUnvisited) {
            hasStarted.current = true;
            setSteps(steps);
            setOnComplete(() => markVisited(page));
            const timer = setTimeout(() => start(), 100);
            return () => clearTimeout(timer);
        }
    }, [loading, visits, page]); // ✅ page is now a dependency
}