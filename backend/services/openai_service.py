import json

from openai import AsyncOpenAI

class AIService:
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        
    async def extract_task_fields(self, title: str, text: str, user_id: str, color: str):
        prompt = f"""
        Convert this note into one or more tasks. Only split into multiple tasks if clearly distinct.
        Return JSON: {{"tasks": [{{"title": "", "description": "", "task_duration": 0, 
        "importance": 1, "difficulty": 1, "due_date": null, "status": "to do", 
        "can_schedule": false, "user_id": "{user_id}"}}]}}
        Title: {title}
        Text: {text}
        """

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        raw = response.choices[0].message.content
        parsed = json.loads(raw)

        tasks = parsed.get("tasks", [])
        for task in tasks:
                task["color"] = color  # stamp the sticky note color onto every task
                task["task_duration"] = int(task.get("task_duration") or 0)
                task["importance"] = int(task.get("importance") or 1)
                task["difficulty"] = int(task.get("difficulty") or 1)
                task["can_schedule"] = bool(task.get("can_schedule", False))
                task["user_id"] = user_id

        return tasks