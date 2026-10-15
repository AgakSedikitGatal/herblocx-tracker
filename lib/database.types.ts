// Types for the HerblocX Tracker database, matching supabase/migrations.
// Written in the same shape as `supabase gen types typescript`, so `npm run db:types`
// can regenerate this file from the live database at any time.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: Database["public"]["Enums"]["activity_action"]
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          task_id: string | null
          task_title: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          created_by: string
          description: string
          end_date: string
          id: string
          owner_id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          description?: string
          end_date: string
          owner_id: string
          start_date: string
          title: string
        }
        Update: {
          description?: string
          end_date?: string
          owner_id?: string
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_admin: boolean
          job_role: Database["public"]["Enums"]["job_role"]
          updated_at: string
        }
        Insert: never
        Update: {
          full_name?: string
          is_active?: boolean
          is_admin?: boolean
          job_role?: Database["public"]["Enums"]["job_role"]
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          added_by: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string | null
          task_id: string
          url: string | null
        }
        Insert: {
          kind: Database["public"]["Enums"]["attachment_kind"]
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path?: string | null
          task_id: string
          url?: string | null
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: "task_attachments_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          task_id: string
        }
        Insert: {
          body: string
          task_id: string
        }
        Update: {
          body?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          department: Database["public"]["Enums"]["job_role"]
          description: string
          due_date: string
          id: string
          milestone_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          department: Database["public"]["Enums"]["job_role"]
          description?: string
          due_date: string
          milestone_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          assignee_id?: string | null
          department?: Database["public"]["Enums"]["job_role"]
          description?: string
          due_date?: string
          milestone_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      milestone_progress: {
        Row: {
          done_tasks: number | null
          milestone_id: string | null
          progress_pct: number | null
          total_tasks: number | null
        }
        Relationships: []
      }
      person_workload: {
        Row: {
          full_name: string | null
          job_role: Database["public"]["Enums"]["job_role"] | null
          open_tasks: number | null
          overdue_tasks: number | null
          profile_id: string | null
        }
        Relationships: []
      }
      task_board: {
        Row: {
          assignee_id: string | null
          created_at: string | null
          created_by: string | null
          department: Database["public"]["Enums"]["job_role"] | null
          description: string | null
          due_date: string | null
          id: string | null
          is_overdue: boolean | null
          milestone_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      task_status_counts: {
        Row: {
          status: Database["public"]["Enums"]["task_status"] | null
          task_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_delete_task: {
        Args: { p_department: Database["public"]["Enums"]["job_role"] }
        Returns: boolean
      }
      can_edit_task: {
        Args: {
          p_assignee_id: string
          p_created_by: string
          p_department: Database["public"]["Enums"]["job_role"]
        }
        Returns: boolean
      }
      can_manage_milestones: { Args: never; Returns: boolean }
      current_job_role: {
        Args: never
        Returns: Database["public"]["Enums"]["job_role"]
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      jakarta_today: { Args: never; Returns: string }
    }
    Enums: {
      activity_action:
        | "task_created"
        | "task_updated"
        | "status_changed"
        | "reassigned"
        | "task_deleted"
        | "commented"
        | "comment_edited"
        | "comment_deleted"
        | "attachment_added"
        | "attachment_removed"
      attachment_kind: "link" | "file"
      job_role:
        | "director"
        | "head_of_finance"
        | "finance"
        | "marketing"
        | "software_dev"
        | "legal"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "review" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

// Same names and usage as the helpers `supabase gen types` writes: Tables<"tasks">, Tables<"task_board">, Enums<"job_role">.
export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
