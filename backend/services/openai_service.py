from openai import AsyncOpenAI
import json
class AIService:
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        
    async def extract_task_fields(self, title: str, text: str):
        prompt = f"""
            Convert the following brain dump into structured task data.
            Title: {title}
            Text: {text}

            Return ONLY a JSON object, no extra text:
            {{
                "title": "",
                "task_duration": 0,
                "user_id": "11111111-1111-1111-1111-111111111111",
                "priority": 0,
                "due_date": null,
                "description": ""
            }}

            Field types:
            - title: string
            - task_duration: integer (minutes)
            - priority: integer (1=low, 2=medium, 3=high)
            - due_date: null for now
            - description: string
            """

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        return json.loads(content)