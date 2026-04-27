import { useEffect, useRef } from "react";
import type { TutorialStep } from "../types/TutorialStep";
import { useTutorial } from "../constants/useTutorial.ts";
import { useUserVisits } from "../hooks/useUserVisits.ts";

type Page = "home" | "notes" | "tasks" | "schedule" | "timer" | "garden";

export function useAutoTutorial(page: Page, steps: TutorialStep[]) {
    const { setSteps, setOnComplete, start } = useTutorial();
    const { visits, markVisited, loading } = useUserVisits();
    const hasStarted = useRef(false);

    useEffect(() => {
        hasStarted.current = false;
    }, [page]);

    useEffect(() => {
        if (loading || hasStarted.current) return;
        const col = `visited_${page}` as keyof typeof visits;
        if (visits && visits[col] === false) {
            hasStarted.current = true;
            setSteps(steps);
            setOnComplete(() => markVisited(page));
            const timer = setTimeout(() => start(), 100);
            return () => clearTimeout(timer);
        }
    }, [loading, visits]);
}