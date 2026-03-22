from datetime import datetime, timedelta


class ScheduleService:
    def __init__(self, schedule_repo, task_repo):
        self.schedule_repo = schedule_repo
        self.task_repo = task_repo

    def build_schedule(self, user_id, task_ids, filters):
        # -------------------------
        # 1. GET TASKS
        # -------------------------
        print(user_id)
        print(list(t for t in task_ids))
        print(list(f for f in filters))

        for key, value in filters.items():
            print(key, value)
        tasks = self.task_repo.get_tasks_by_ids(user_id, task_ids)

        print("TASKS FROM DB:", tasks)

        if not tasks:
            return {
                "id": None,
                "blocks": []
            }

        now = datetime.now()
        end_window = now + timedelta(hours=24)

        # -------------------------
        # 2. GENERATE TIME SLOTS
        # -------------------------

        def generate_time_slots(start, end, gap_hours=1):
            slots = []
            current = start

            while current < end:
                slots.append(current)
                current += timedelta(hours=gap_hours)

            return slots

        # Optional: nicer human times (can later come from filters)
        # preferred_hours = filters.get("preferred_hours") if filters else None
        #
        # if preferred_hours:
        #     slots = []
        #     for h in preferred_hours:
        #         slot = now.replace(hour=h, minute=0, second=0, microsecond=0)
        #
        #         # only future times
        #         if slot > now:
        #             slots.append(slot)
        #
        #     # fallback if none valid
        #     if not slots:
        #         slots = generate_time_slots(now, end_window)
        # else:
        #     slots = generate_time_slots(now, end_window)

        # -------------------------
        # 3. BUILD BLOCKS (SPACED)
        # -------------------------
        slots = generate_time_slots(now, end_window)
        schedule_blocks = []

        for i, task in enumerate(tasks):
            if i >= len(slots):
                break  # no more room in 24h window

            start_time = slots[i]
            duration_minutes = task.get("task_duration", 60)
            end_time = start_time + timedelta(minutes=duration_minutes)

            # prevent overflow past 24hr window
            if end_time > end_window:
                break

            print(task)
            block = {
                "task_id": task["id"],
                "title": task["title"],
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "type": "task",
                "color": task.get("color")
            }

            schedule_blocks.append(block)

        # -------------------------
        # 4. CREATE SCHEDULE
        # -------------------------
        schedule_row = self.schedule_repo.create_schedule(user_id)
        print("Schedule_row: ", schedule_row)
        schedule_id = schedule_row["id"]

        # -------------------------
        # 5. ATTACH schedule_id
        # -------------------------
        for block in schedule_blocks:
            block["schedule_id"] = schedule_id
            block["user_id"] = user_id

        # -------------------------
        # 6. BULK INSERT
        # -------------------------
        saved_blocks = self.schedule_repo.insert_blocks(schedule_blocks)

        # -------------------------
        # 7. RETURN FRONTEND SHAPE
        # -------------------------
        return {
            "id": schedule_id,
            "blocks": [
                {
                    "id": block["id"],
                    "taskId": block["task_id"],
                    "title": block["title"],
                    "start": block["start_time"],
                    "end": block["end_time"],
                    "color": block.get("color")
                }
                for block in saved_blocks
            ]
        }