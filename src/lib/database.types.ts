export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      congress_trades: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          company_name: string | null
          created_at: string | null
          dedup_key: string
          disclosure_date: string
          filing_url: string | null
          id: string
          politician_id: string | null
          raw: Json | null
          source: string
          ticker: string | null
          trade_date: string
          trade_type: string | null
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          company_name?: string | null
          created_at?: string | null
          dedup_key: string
          disclosure_date: string
          filing_url?: string | null
          id?: string
          politician_id?: string | null
          raw?: Json | null
          source: string
          ticker?: string | null
          trade_date: string
          trade_type?: string | null
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          company_name?: string | null
          created_at?: string | null
          dedup_key?: string
          disclosure_date?: string
          filing_url?: string | null
          id?: string
          politician_id?: string | null
          raw?: Json | null
          source?: string
          ticker?: string | null
          trade_date?: string
          trade_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "congress_trades_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politician_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "congress_trades_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blog_post_comments: {
        Row: {
          author_id: string
          blog_post_id: string
          body: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          blog_post_id: string
          body: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          blog_post_id?: string
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_blog_post_comments_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "content_blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blog_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      insider_trades: {
        Row: {
          company_name: string | null
          created_at: string | null
          dedup_key: string
          filing_date: string
          form4_url: string | null
          id: string
          insider_id: string | null
          price_per_share: number | null
          raw: Json | null
          shares: number | null
          source: string
          ticker: string
          total_value: number | null
          trade_date: string
          trade_type: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          dedup_key: string
          filing_date: string
          form4_url?: string | null
          id?: string
          insider_id?: string | null
          price_per_share?: number | null
          raw?: Json | null
          shares?: number | null
          source?: string
          ticker: string
          total_value?: number | null
          trade_date: string
          trade_type?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          dedup_key?: string
          filing_date?: string
          form4_url?: string | null
          id?: string
          insider_id?: string | null
          price_per_share?: number | null
          raw?: Json | null
          shares?: number | null
          source?: string
          ticker?: string
          total_value?: number | null
          trade_date?: string
          trade_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insider_trades_insider_id_fkey"
            columns: ["insider_id"]
            isOneToOne: false
            referencedRelation: "insiders"
            referencedColumns: ["id"]
          },
        ]
      }
      insiders: {
        Row: {
          cik: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          cik?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          cik?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          duration_seconds: number | null
          error_message: string | null
          id: string
          job_name: string
          ran_at: string | null
          rows_failed: number | null
          rows_inserted: number | null
          rows_skipped: number | null
          status: string | null
        }
        Insert: {
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          job_name: string
          ran_at?: string | null
          rows_failed?: number | null
          rows_inserted?: number | null
          rows_skipped?: number | null
          status?: string | null
        }
        Update: {
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          job_name?: string
          ran_at?: string | null
          rows_failed?: number | null
          rows_inserted?: number | null
          rows_skipped?: number | null
          status?: string | null
        }
        Relationships: []
      }
      pipeline_state: {
        Row: {
          job_name: string
          last_accession_id: string | null
          last_run: string | null
          overlap_hours: number | null
          updated_at: string | null
        }
        Insert: {
          job_name: string
          last_accession_id?: string | null
          last_run?: string | null
          overlap_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          job_name?: string
          last_accession_id?: string | null
          last_run?: string | null
          overlap_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      politicians: {
        Row: {
          chamber: string | null
          created_at: string | null
          full_name: string
          id: string
          party: string | null
          state: string | null
        }
        Insert: {
          chamber?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          party?: string | null
          state?: string | null
        }
        Update: {
          chamber?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          party?: string | null
          state?: string | null
        }
        Relationships: []
      }
      portfolio_holdings: {
        Row: {
          company_name: string | null
          created_at: string | null
          dedup_key: string
          filing_date: string | null
          id: string
          investor_id: string | null
          portfolio_weight: number | null
          quarter: string
          raw: Json | null
          shares: number | null
          ticker: string
          value_usd: number | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          dedup_key: string
          filing_date?: string | null
          id?: string
          investor_id?: string | null
          portfolio_weight?: number | null
          quarter: string
          raw?: Json | null
          shares?: number | null
          ticker: string
          value_usd?: number | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          dedup_key?: string
          filing_date?: string | null
          id?: string
          investor_id?: string | null
          portfolio_weight?: number | null
          quarter?: string
          raw?: Json | null
          shares?: number | null
          ticker?: string
          value_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_holdings_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "superinvestors"
            referencedColumns: ["id"]
          },
        ]
      }
      private_items: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      stock_prices: {
        Row: {
          close_price: number | null
          date: string
          id: string
          source: string | null
          ticker: string
        }
        Insert: {
          close_price?: number | null
          date: string
          id?: string
          source?: string | null
          ticker: string
        }
        Update: {
          close_price?: number | null
          date?: string
          id?: string
          source?: string | null
          ticker?: string
        }
        Relationships: []
      }
      superinvestors: {
        Row: {
          aum_usd: number | null
          cik: string | null
          created_at: string | null
          fund_name: string | null
          id: string
          name: string
        }
        Insert: {
          aum_usd?: number | null
          cik?: string | null
          created_at?: string | null
          fund_name?: string | null
          id?: string
          name: string
        }
        Update: {
          aum_usd?: number | null
          cik?: string | null
          created_at?: string | null
          fund_name?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      politician_summary: {
        Row: {
          buy_count: number | null
          chamber: string | null
          full_name: string | null
          id: string | null
          last_trade_date: string | null
          party: string | null
          sell_count: number | null
          state: string | null
          total_trades: number | null
        }
        Relationships: []
      }
      ticker_activity_summary: {
        Row: {
          buy_count: number | null
          data_type: string | null
          last_trade: string | null
          sell_count: number | null
          ticker: string | null
          total_volume: number | null
          trade_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      refresh_materialized_views: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
