import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Check if database is properly set up
export const checkDatabaseSetup = async () => {
  try {
    const { data, error } = await supabase.from("messages").select("id").limit(1)
    return !error
  } catch (error) {
    return false
  }
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          is_admin: boolean
          created_at: string
          last_seen: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          is_admin?: boolean
          created_at?: string
          last_seen?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          is_admin?: boolean
          created_at?: string
          last_seen?: string
        }
      }
      messages: {
        Row: {
          id: string
          user_id: string
          user_name: string
          content: string
          is_private: boolean
          target_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_name: string
          content: string
          is_private?: boolean
          target_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_name?: string
          content?: string
          is_private?: boolean
          target_user_id?: string | null
          created_at?: string
        }
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          user_name: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          user_name: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          user_name?: string
          emoji?: string
          created_at?: string
        }
      }
      message_seen: {
        Row: {
          id: string
          message_id: string
          user_id: string
          user_name: string
          seen_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          user_name: string
          seen_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          user_name?: string
          seen_at?: string
        }
      }
    }
  }
}
