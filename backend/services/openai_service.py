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
    
    async def generate_workflow(self, title: str, description: str) -> dict:
        has_enough_info = len(description.strip()) > 30

        if has_enough_info:
            prompt = f"""
            You are a study planning assistant. Given this task, generate a focused work session workflow.
            Task: {title}
            Description: {description}
            Return JSON: {{"steps": [{{"label": "", "duration_seconds": 0}}]}}
            Keep it realistic, focused, and under 10 steps.
            """
        else:
            prompt = f"""
            Generate a general Pomodoro workflow for a task called "{title}".
            Return JSON: {{"steps": [{{"label": "", "duration_seconds": 0}}]}}
            Use the classic Pomodoro pattern: 25 min focus, 5 min break, repeat 4 cycles.
            """
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content
        parsed = json.loads(raw)
        return {
            "steps": parsed.get("steps", []),
            "is_pomodoro": not has_enough_info,
        }