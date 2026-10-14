type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      tenants: Table<
        {
          id: string;
          slug: string;
          name: string;
          plan: string | null;
          created_at: string | null;
          updated_at: string | null;
        },
        {
          id?: string;
          slug: string;
          name: string;
          plan?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        }
      >;
      user_profiles: Table<
        {
          id: string;
          tenant_id: string;
          email: string | null;
          name: string | null;
          role: "OWNER" | "ADMIN" | "STAFF" | "AGENT" | "CLIENT" | null;
          created_at: string | null;
          updated_at: string | null;
        },
        {
          id: string;
          tenant_id: string;
          email?: string | null;
          name?: string | null;
          role?: "OWNER" | "ADMIN" | "STAFF" | "AGENT" | "CLIENT" | null;
          created_at?: string | null;
          updated_at?: string | null;
        }
      >;
      clients: Table<
        {
          id: string;
          tenant_id: string;
          name: string | null;
          phone: string;
          whatsapp: string | null;
          email: string | null;
          country: string | null;
          city: string | null;
          currency: string | null;
          source: string | null;
          notes: string | null;
          deleted_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        },
        {
          id?: string;
          tenant_id: string;
          name?: string | null;
          phone: string;
          whatsapp?: string | null;
          email?: string | null;
          country?: string | null;
          city?: string | null;
          currency?: string | null;
          source?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        }
      >;
      sourcing_requests: Table<
        {
          id: string;
          tenant_id: string;
          request_code: string;
          client_id: string | null;
          raw_message: string | null;
          client_images: string[] | null;
          screenshots: string[] | null;
          source: string | null;
          quantity: number | null;
          unit: string | null;
          destination: string | null;
          target_price_cny: number | null;
          category: string | null;
          deadline: string | null;
          requirements: string | null;
          ai_category: string | null;
          ai_material: string | null;
          ai_keywords: string[] | null;
          ai_confidence: number | null;
          ai_analysis: Json | null;
          status:
            | "RECEIVED"
            | "ANALYZING"
            | "RFQ_SENT"
            | "QUOTES_RECEIVED"
            | "CLIENT_QUOTED"
            | "ORDERED"
            | "CANCELLED"
            | null;
          created_at: string | null;
          updated_at: string | null;
        },
        {
          id?: string;
          tenant_id: string;
          request_code: string;
          client_id?: string | null;
          raw_message?: string | null;
          client_images?: string[] | null;
          screenshots?: string[] | null;
          source?: string | null;
          quantity?: number | null;
          unit?: string | null;
          destination?: string | null;
          target_price_cny?: number | null;
          category?: string | null;
          deadline?: string | null;
          requirements?: string | null;
          ai_category?: string | null;
          ai_material?: string | null;
          ai_keywords?: string[] | null;
          ai_confidence?: number | null;
          ai_analysis?: Json | null;
          status?:
            | "RECEIVED"
            | "ANALYZING"
            | "RFQ_SENT"
            | "QUOTES_RECEIVED"
            | "CLIENT_QUOTED"
            | "ORDERED"
            | "CANCELLED"
            | null;
          created_at?: string | null;
          updated_at?: string | null;
        }
      >;
      sourcing_counters: Table<
        {
          tenant_id: string;
          year: number;
          last_seq: number | null;
          updated_at: string | null;
        },
        {
          tenant_id: string;
          year: number;
          last_seq?: number | null;
          updated_at?: string | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
