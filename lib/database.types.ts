export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      estimates: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          deposit_link: string | null;
          id: string;
          lead_id: string;
          option1_price: number | null;
          option2_price: number | null;
          option3_price: number | null;
          recommended_option: number;
          sent_at: string | null;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          deposit_link?: string | null;
          id?: string;
          lead_id: string;
          option1_price?: number | null;
          option2_price?: number | null;
          option3_price?: number | null;
          recommended_option?: number;
          sent_at?: string | null;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          deposit_link?: string | null;
          id?: string;
          lead_id?: string;
          option1_price?: number | null;
          option2_price?: number | null;
          option3_price?: number | null;
          recommended_option?: number;
          sent_at?: string | null;
          updated_at?: string;
        };
      };
      follow_up_tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          due_at: string;
          id: string;
          lead_id: string;
          message_template_key: string | null;
          status: Database["public"]["Enums"]["task_status"];
          type: Database["public"]["Enums"]["follow_up_type"];
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          due_at: string;
          id?: string;
          lead_id: string;
          message_template_key?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          type: Database["public"]["Enums"]["follow_up_type"];
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          due_at?: string;
          id?: string;
          lead_id?: string;
          message_template_key?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          type?: Database["public"]["Enums"]["follow_up_type"];
          updated_at?: string;
        };
      };
      lead_activity: {
        Row: {
          activity_type: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          lead_id: string;
          message: string;
        };
        Insert: {
          activity_type: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          lead_id: string;
          message: string;
        };
        Update: {
          activity_type?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          lead_id?: string;
          message?: string;
        };
      };
      leads: {
        Row: {
          address: string;
          appt_status: Database["public"]["Enums"]["appt_status"];
          assigned_to: string | null;
          created_at: string;
          deposit_status: Database["public"]["Enums"]["deposit_status"];
          email: string | null;
          escalation_flag: boolean;
          estimate_id: string | null;
          id: string;
          job_type: string;
          last_touch_at: string;
          name: string;
          next_touch_at: string | null;
          notes: string | null;
          outcome: Database["public"]["Enums"]["lead_outcome"] | null;
          owner_role: Database["public"]["Enums"]["app_role"];
          phone: string;
          source: Database["public"]["Enums"]["lead_source"];
          stage: Database["public"]["Enums"]["lead_stage"];
          updated_at: string;
        };
        Insert: {
          address: string;
          appt_status?: Database["public"]["Enums"]["appt_status"];
          assigned_to?: string | null;
          created_at?: string;
          deposit_status?: Database["public"]["Enums"]["deposit_status"];
          email?: string | null;
          escalation_flag?: boolean;
          estimate_id?: string | null;
          id?: string;
          job_type: string;
          last_touch_at?: string;
          name: string;
          next_touch_at?: string | null;
          notes?: string | null;
          outcome?: Database["public"]["Enums"]["lead_outcome"] | null;
          owner_role?: Database["public"]["Enums"]["app_role"];
          phone: string;
          source?: Database["public"]["Enums"]["lead_source"];
          stage?: Database["public"]["Enums"]["lead_stage"];
          updated_at?: string;
        };
        Update: {
          address?: string;
          appt_status?: Database["public"]["Enums"]["appt_status"];
          assigned_to?: string | null;
          created_at?: string;
          deposit_status?: Database["public"]["Enums"]["deposit_status"];
          email?: string | null;
          escalation_flag?: boolean;
          estimate_id?: string | null;
          id?: string;
          job_type?: string;
          last_touch_at?: string;
          name?: string;
          next_touch_at?: string | null;
          notes?: string | null;
          outcome?: Database["public"]["Enums"]["lead_outcome"] | null;
          owner_role?: Database["public"]["Enums"]["app_role"];
          phone?: string;
          source?: Database["public"]["Enums"]["lead_source"];
          stage?: Database["public"]["Enums"]["lead_stage"];
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string;
          id: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
      };
      required_stops: {
        Row: {
          decision_maker_asked: boolean;
          dates_offered: boolean;
          deposit_asked: boolean;
          documented_in_service_fusion: boolean;
          estimate_sent: boolean;
          followup_locked: boolean;
          lead_id: string;
          option_recommended: boolean;
          photos_received: boolean;
          scope_confirmed: boolean;
          timeline_asked: boolean;
          updated_at: string;
        };
        Insert: {
          decision_maker_asked?: boolean;
          dates_offered?: boolean;
          deposit_asked?: boolean;
          documented_in_service_fusion?: boolean;
          estimate_sent?: boolean;
          followup_locked?: boolean;
          lead_id: string;
          option_recommended?: boolean;
          photos_received?: boolean;
          scope_confirmed?: boolean;
          timeline_asked?: boolean;
          updated_at?: string;
        };
        Update: {
          decision_maker_asked?: boolean;
          dates_offered?: boolean;
          deposit_asked?: boolean;
          documented_in_service_fusion?: boolean;
          estimate_sent?: boolean;
          followup_locked?: boolean;
          lead_id?: string;
          option_recommended?: boolean;
          photos_received?: boolean;
          scope_confirmed?: boolean;
          timeline_asked?: boolean;
          updated_at?: string;
        };
      };
      script_templates: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_system: boolean;
          template_key: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_system?: boolean;
          template_key: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_system?: boolean;
          template_key?: string;
          title?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: "VA" | "Joe";
      appt_status: "Not Scheduled" | "Scheduled";
      deposit_status: "Not Requested" | "Requested" | "Paid";
      follow_up_type: "Day2" | "Day5" | "Day10" | "Custom";
      lead_outcome: "Deposit secured" | "Appointment scheduled" | "Follow-up date locked" | "Explicit No";
      lead_source: "Google/Direct" | "Thumbtack" | "Yelp" | "BNI/Referral" | "Website" | "Other";
      lead_stage: "First Contact" | "Qualification" | "Estimate Sent" | "Deposit + Schedule" | "Follow-Up" | "Closed";
      task_status: "Open" | "Completed" | "Skipped";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
