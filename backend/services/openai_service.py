import json

from openai import AsyncOpenAI

class AIService:
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        
    async def extract_task_fields(self, title: str, text: str, user_id: str):
        prompt = f"""
        Convert the following brain dump into one or more structured tasks.
        Only create multiple tasks if the note clearly mentions distinct, separate tasks.
        If it is one task or a general brain dump, return a single task object in the array.

        Title: {title}
        Text: {text}

        Return JSON in this exact format:
        {{
            "tasks": [
                {{
                    "title": "",
                    "task_duration": 0,
                    "importance": 1,
                    "due_date": null,
                    "description": "",
                    "difficulty": 1,
                    "status": "to do",
                    "user_id": "{user_id}",
                    "can_schedule": false
                }}
            ]
        }}
        where the types of each field are as follows:
        title: string
        task_duration: integer (number in minutes)
        importance: integer (one of 1, 2, 3)
        difficulty: integer (one of 1, 2, 3)
        due_date: string (date format YYYY-MM-DD) or null if not mentioned
        description: string
        status: string (always "to do")
        can_schedule: boolean (true if all fields are present and valid, false otherwise)
        Make sure fields are valid JSON and snake_case. Only return the JSON, no explanations.
        """

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        raw = response.choices[0].message.content
        print("OpenAI response:", raw)
        parsed = json.loads(raw)

        tasks = parsed.get("tasks", [])
        for task in tasks:
            task["task_duration"] = int(task.get("task_duration") or 0)
            task["importance"]    = int(task.get("importance") or 1)
            task["difficulty"]    = int(task.get("difficulty") or 1)
            task["can_schedule"]  = bool(task.get("can_schedule", False))
            task["user_id"]       = user_id

        return tasks