export type UserPlants = Record<string, boolean>;

export type PlantContextType = {
    plants: UserPlants | null;
    refetchPlants: () => Promise<void>;
};