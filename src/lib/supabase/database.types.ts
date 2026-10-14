type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type TimestampColumns = {
  created_at: string | null;
  updated_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      tenants: TableDefinition<
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
        },
        {
          slug?: string;
          name?: string;
          plan?: string | null;
          updated_at?: string | null;
        }
      >;
      clients: TableDefinition<
        TimestampColumns & {
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
        },
        {
          tenant_id?: string;
          name?: string | null;
          phone?: string;
          whatsapp?: string | null;
          email?: string | null;
          country?: string | null;
          city?: string | null;
          currency?: string | null;
          source?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          updated_at?: string | null;
        }
      >;
      sourcing_requests: TableDefinition<
        TimestampColumns & {
          id: string;
          tenant_id: string;
          request_code: string;
          client_id: string | null;
          raw_message: string | null;
          client_images: string[];
          screenshots: string[];
          source: string | null;
          quantity: number | null;
          unit: string | null;
          destination: string | null;
          target_price_cny: number | null;
          category: string | null;
          deadline: string | null;
          requirements: string | null;
          source_notes: string | null;
          status: string | null;
          deleted_at: string | null;
        },
        {
          id?: string;
          tenant_id: string;
          request_code: string;
          client_id?: string | null;
          raw_message?: string | null;
          client_images?: string[];
          screenshots?: string[];
          source?: string | null;
          quantity?: number | null;
          unit?: string | null;
          destination?: string | null;
          target_price_cny?: number | null;
          category?: string | null;
          deadline?: string | null;
          requirements?: string | null;
          source_notes?: string | null;
          status?: string | null;
          deleted_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        },
        {
          tenant_id?: string;
          request_code?: string;
          client_id?: string | null;
          raw_message?: string | null;
          client_images?: string[];
          screenshots?: string[];
          source?: string | null;
          quantity?: number | null;
          unit?: string | null;
          destination?: string | null;
          target_price_cny?: number | null;
          category?: string | null;
          deadline?: string | null;
          requirements?: string | null;
          source_notes?: string | null;
          status?: string | null;
          deleted_at?: string | null;
          updated_at?: string | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      generate_sourcing_code: {
        Args: { p_tenant_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
