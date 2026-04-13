from repositories.plants_repository import PlantsRepository

SECONDS_PER_STAGE = 30  # testing
MAX_STAGE = 5

class PlantsService:
    def __init__(self, repo: PlantsRepository):
        self.repo = repo

    async def get_active_plant(self, user_id: str):
        plant = self.repo.get_active_plant(user_id)
        if not plant:
            plant = self.repo.create_plant(user_id)
        return plant

    async def grow_plant(self, user_id: str, active_seconds: int):
        plant = self.repo.get_active_plant(user_id)
        if not plant:
            plant = self.repo.create_plant(user_id)

        total = plant["progress_seconds"] + active_seconds
        stages_completed = total // SECONDS_PER_STAGE
        new_progress = total % SECONDS_PER_STAGE

        plants_earned = 0

        for _ in range(stages_completed):
            next_stage = plant["stage"] + 1
            if next_stage > MAX_STAGE:
                self.repo.complete_plant(plant["id"])
                plant = self.repo.create_plant(user_id)
                plants_earned += 1
            else:
                plant = self.repo.advance_stage(plant["id"], next_stage)

        self.repo.update_progress(plant["id"], new_progress)

        return {
            "plants_earned": plants_earned,
            "progress": new_progress,
            "stage": plant["stage"],
        }