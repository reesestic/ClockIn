from openai import AsyncOpenAI

class AIService:
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        
    async def extract_task_fields(self, title: str, text: str):
        prompt = f"""
        Convert the following brain dump into structured task data.

        Title: {title}
        Text: {text}

        Return JSON:
        {{
            "task_title": "",
            "description": "",
            "due_date": "",
            "priority": "",
            "task_duration": ""
        }}
        """

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        return response.choices[0].message.content