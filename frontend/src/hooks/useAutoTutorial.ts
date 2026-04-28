import { useEffect } from "react";
import type { TutorialStep } from "../types/TutorialStep";
import { useTutorial } from "../constants/useTutorial.ts";
import { useUserVisits } from "../hooks/useUserVisits.ts";

type Page = "home" | "notes" | "tasks" | "schedule" | "timer" | "garden";

export function useAutoTutorial(
    visited: boolean | null | undefined,
    steps: TutorialStep[],
    page: Page,
    enabled: boolean = true
) {
    const { setSteps, setOnComplete, start } = useTutorial();
    const { markVisited } = useUserVisits();

    useEffect(() => {
        if (!enabled) return;
        if (visited !== false) return;
        setSteps(steps);
        setOnComplete(() => markVisited(page));
        start();
    }, [visited, enabled, steps, page, markVisited, setOnComplete, setSteps, start]);
}