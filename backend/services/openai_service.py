import json

from openai import AsyncOpenAI

class AIService:
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        
    async def extract_task_fields(self, title: str, text: str, user_id: str):
        prompt = f"""
        Convert the following brain dump into structured task data.

        Title: {title}
        Text: {text}

        Return JSON:
        {{
            "title": "",
            "task_duration": "",
            "importance": "",
            "due_date": "",
            "description": "",
            "difficulty": "",
            "status": "to do",
            "user_id": "{user_id}",
            "can_schedule": false
        }}
        
        where the types of each field are as follows:
        title: string
        task_duration: integer (number in minutes)
        importance: integer (one of 1, 2, 3)
        difficulty: integer (one of 1, 2, 3)
        due_date: string (date format YYYY-MM-DD)
        description: string
        status: string (one of "to do", "scheduled", "in progress")
        can_schedule: boolean (true if all fields are present and valid, false otherwise)
        
        make sure the fields are in valid json and in snake_case format. Only return the JSON, no explanations.
        """

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content
        print("OpenAI response:", raw)

        task_data = json.loads(raw)  # ← parse string into dict

        # Ensure correct types in case OpenAI returns strings for numbers
        task_data["task_duration"] = int(task_data.get("task_duration") or 0)
        task_data["importance"] = int(task_data.get("importance") or 1)
        task_data["difficulty"] = int(task_data.get("difficulty") or 1)
        task_data["can_schedule"] = bool(task_data.get("can_schedule", False))
        
        return response.choices[0].message.content