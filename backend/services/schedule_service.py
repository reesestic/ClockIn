from datetime import datetime, timedelta

class ScheduleService:
    def __init__(self, schedule_repo, task_repo):
        self.schedule_repo = schedule_repo
        self.task_repo = task_repo

    def build_schedule(self, task_ids, filters):
        # 🔥 GET REAL TASKS
        tasks = self.task_repo.get_tasks_by_ids(task_ids)

        if not tasks:
            return []

        # 🔥 helper: convert asc/desc/none → weight
        def get_weight(pref):
            if pref == "none" or pref is None:
                return 0
            return 1 if pref == "desc" else -1

        # 🔥 SCORING
        def score(task):
            s = 0

            # IMPORTANCE
            w = get_weight(filters.get("importance"))
            s += w * task.get("priority", 0)

            # DEADLINE (sooner = higher score)
            w = get_weight(filters.get("deadline"))
            if task.get("deadline"):
                hours = (task["deadline"] - datetime.now()).total_seconds() / 3600
                urgency = 1 / max(hours, 1)
                s += w * urgency

            # VALUE (priority per time)
            w = get_weight(filters.get("value"))
            duration = max(task.get("task_duration", 1), 1)
            value_score = task.get("priority", 0) / duration
            s += w * value_score

            # TIME (short vs long)
            w = get_weight(filters.get("time"))
            time_score = 1 / duration
            s += w * time_score

            # CLASS / SUBJECT BOOST
            subject = filters.get("subject")
            if subject and task.get("subject") == subject:
                s += 2  # simple boost

            return s

        # 🔥 SORT
        sorted_tasks = sorted(tasks, key=score, reverse=True)

        # 🔥 BUILD BLOCKS
        schedule = []
        current_time = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)

        for task in sorted_tasks:
            duration_minutes = task.get("task_duration", 60)

            start_time = current_time
            end_time = current_time + timedelta(minutes=duration_minutes)

            block = {
                "type": "task",
                "task_id": task["id"],
                "title": task["title"],
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
            }

            schedule.append(block)
            current_time = end_time

        # 🔥 SAVE
        return self.schedule_repo.save_schedule(schedule)

    def fetch_schedule(self):
        return self.schedule_repo.get_schedule()