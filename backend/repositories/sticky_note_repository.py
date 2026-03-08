from models.sticky_note_model import StickyNoteColor

class StickyNoteRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def get_title(self, sticky_id):
        response = self.supabase.table("StickyNotes") \
            .select("title") \
            .eq("id", sticky_id) \
            .execute()
        return response.data[0]['title'] if response.data else None

    def get_text(self, sticky_id: str):
        response = self.supabase.table("StickyNotes") \
            .select("text") \
            .eq("id", sticky_id) \
            .execute()
        return response.data[0]['text'] if response.data else None

    # Creation stuff
    def create_note(self, title, content, color: str, x: int, y: int, z: int):
        result = self.supabase.table("StickyNotes").insert({
            # remember ID returned in this too!!
            "title": title,
            "text": content,
            "color" : color,
            "user_id": "11111111-1111-1111-1111-111111111111",
            "posX" : x,
            "posY": y,
            "posZ" : z
        }).execute()
        return result.data[0]

    def update_note(self, id: str, title: str, content: str):
        result = (self.supabase.table("StickyNotes").update({
                "title": title,
                "text": content
            })
            .eq("id", id)
            .execute()
        )
        return result.data[0]

    def get_notes(self, user_id: str):
        result = (
            self.supabase
            .table("StickyNotes")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        return result.data

    def delete_note(self, note_id: str):
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

    def update_color(self, note_id: str, color: StickyNoteColor):
        result = (self.supabase.table("StickyNotes").update({"color" : color.value })
            .eq("id", note_id)
            .execute()
            )

    
    def create_sticky_note(self, title, text, id, user_id, posX, posY, posZ):
        self.supabase.table("StickyNotes").insert(
            {"title": title, 
            "text": text, 
            "id": id, 
            "user_id": user_id, 
            "posX": posX, 
            "posY": posY, 
            "posZ": posZ}
            ).execute()
        return