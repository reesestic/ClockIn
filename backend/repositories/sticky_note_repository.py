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
    
    def create_sticky_note(self, title, text, id, user_id, posX, posY, posZ):
        self.supabase.table("StickyNotes").insert({"title": title, "text": text, "id": id, "user_id": user_id, "posX": posX, "posY": posY, "posZ": posZ}).execute()
        return