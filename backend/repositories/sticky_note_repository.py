from database.supabase_client import supabase

def create_note_repository(title, content, user_id):
    result = supabase.table("StickyNotes").insert({

        "title": title,
        "text": content,
        "color" : "From Reese Test",
        "user_id": user_id,
        "posX" : 0,
        "posY": 0,
        "posZ" : 0
    }).execute()

    return result.data[0]