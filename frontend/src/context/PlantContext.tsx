import React from "react";
import { createContext, useEffect, useState } from "react";
import { fetchCompletedPlants } from "../api/plantApi";
import type { UserPlants, PlantContextType } from "../types/plantContextTypes.ts";

export const PlantContext = createContext<PlantContextType | null>(null);

export function PlantProvider({ children }: { children: React.ReactNode }) {
    const [plants, setPlants] = useState<UserPlants | null>(null);

    async function refetchPlants() {
        try {
            const data = await fetchCompletedPlants();
            console.log("API data:", data);

            const map: UserPlants = {};
            data.forEach((p: { variety: string }) => {
                map[p.variety] = true;
            });

            setPlants(map);
        } catch (e) {
            console.error("Failed to load plants", e);
            setPlants({});
        }
    }

    useEffect(() => {
        (async () => {
            await refetchPlants();
        })();
    }, []);

    return (
        <PlantContext.Provider value={{ plants, refetchPlants }}>
            {children}
        </PlantContext.Provider>
    );
}