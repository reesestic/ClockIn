import { createContext, useContext, useEffect, useState } from "react";
import { fetchCompletedPlants } from "../api/plantApi";
import React from "react";

type UserPlants = Record<string, boolean>;
type PlantContextType = {
    plants: UserPlants | null;
    refetchPlants: () => Promise<void>;
};

const PlantContext = createContext<PlantContextType | null>(null);

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
        refetchPlants();
    }, []);

    return (
        <PlantContext.Provider value={{ plants, refetchPlants }}>
            {children}
        </PlantContext.Provider>
    );
}

export function usePlants() {
    const ctx = useContext(PlantContext);
    if (!ctx) throw new Error("usePlants must be used within PlantProvider");
    return ctx;
}