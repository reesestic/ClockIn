import React, { useEffect, useState } from "react";
import { fetchCompletedPlants } from "../api/plantApi";
import { PlantContext } from "./PlantContext";
import type { UserPlants } from "../types/plantContextTypes";

export function PlantProvider({ children }: { children: React.ReactNode }) {
    const [plants, setPlants] = useState<UserPlants | null>(null);

    async function refetchPlants() {
        try {
            const data = await fetchCompletedPlants();

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
        refetchPlants().catch(console.error);
    }, []);

    return (
        <PlantContext.Provider value={{ plants, refetchPlants }}>
            {children}
        </PlantContext.Provider>
    );
}