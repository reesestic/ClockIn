
class StickyNoteRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def get_title(self, sticky_id):
        response = self.supabase.table("StickyNotes") \
            .select("title") \
            .eq("id", sticky_id) \
            .execute()
        return response.data[0]['title'] if response.data else None

    def get_text(self, sticky_id):
        response = self.supabase.table("StickyNotes") \
            .select("text") \
            .eq("id", sticky_id) \
            .execute()
        return response.data[0]['text'] if response.data else None

    # Creation stuff
    def create_note(self, title, content, x: int, y: int, z: int):
        result = self.supabase.table("StickyNotes").insert({
            # remember ID returned in this too!!
            "title": title,
            "text": content,
            "color" : "From Reese Test",
            "user_id": 1,
            "posX" : x,
            "posY": y,
            "posZ" : z
        }).execute()
        return result.data[0]

    def update_note(self, id: int, title: str, content: str):
        result = (self.supabase.table("StickyNotes").update({
                "title": title,
                "text": content
            })
            .eq("id", id)
            .execute()
        )
        return result.data[0]

    def get_notes(self, user_id: int):
        result = (
            self.supabase
            .table("StickyNotes")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        return result.data

    def delete_note(self, note_id):
        result = (
            self.supabase
            .table("StickyNotes")
            .delete()
            .eq("id", note_id)
            .execute()
        )
        if not result.data:
            raise Exception("Note not found")

        return note_id