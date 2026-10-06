/**
 * Hand-maintained mirror of the SQL in `supabase/migrations`.
 * Regenerate with `npm run db:types` once the Supabase CLI is linked.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "super_admin" | "manager" | "waiter";
export type OrderStatus = "open" | "billed" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "card" | "upi";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: AppRole;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: AppRole;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: AppRole;
          phone?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      dining_tables: {
        Row: {
          id: string;
          label: string;
          seats: number;
          zone: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          seats?: number;
          zone?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          label?: string;
          seats?: number;
          zone?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_available: boolean;
          is_featured: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_available?: boolean;
          is_featured?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_available?: boolean;
          is_featured?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "menu_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          order_no: number;
          business_date: string;
          table_id: string | null;
          waiter_id: string | null;
          status: OrderStatus;
          guest_count: number;
          subtotal: number;
          discount: number;
          discount_reason: string | null;
          total: number;
          payment_method: PaymentMethod | null;
          notes: string | null;
          opened_at: string;
          billed_at: string | null;
          closed_at: string | null;
          closed_by: string | null;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id?: string | null;
          waiter_id?: string | null;
          status?: OrderStatus;
          guest_count?: number;
          discount?: number;
          discount_reason?: string | null;
          payment_method?: PaymentMethod | null;
          notes?: string | null;
        };
        Update: {
          table_id?: string | null;
          waiter_id?: string | null;
          status?: OrderStatus;
          guest_count?: number;
          discount?: number;
          discount_reason?: string | null;
          payment_method?: PaymentMethod | null;
          notes?: string | null;
          billed_at?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          cancel_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "dining_tables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_waiter_id_fkey";
            columns: ["waiter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_closed_by_fkey";
            columns: ["closed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          name_snapshot: string;
          unit_price_snapshot: number;
          qty: number;
          line_total: number;
          notes: string | null;
          added_by: string | null;
          voided_at: string | null;
          voided_by: string | null;
          void_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          name_snapshot?: string;
          unit_price_snapshot?: number;
          qty?: number;
          notes?: string | null;
          added_by?: string | null;
        };
        Update: {
          /** Only reassigned when two tables are merged into one bill. */
          order_id?: string;
          qty?: number;
          notes?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
          void_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: number;
          actor_id: string | null;
          actor_name: string | null;
          actor_role: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          at: string;
        };
        Insert: {
          actor_id?: string | null;
          actor_name?: string | null;
          actor_role?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          sale_no: number;
          business_date: string;
          table_id: string | null;
          table_billed_at: string | null;
          subtotal: number;
          total: number;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          business_date?: string;
          table_id?: string | null;
          table_billed_at?: string | null;
          subtotal?: number;
          total?: number;
          created_by?: string | null;
        };
        Update: {
          table_id?: string | null;
          table_billed_at?: string | null;
          subtotal?: number;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "dining_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          menu_item_id: string | null;
          item_name: string;
          item_price: number;
          qty: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          menu_item_id?: string | null;
          item_name: string;
          item_price: number;
          qty?: number;
        };
        Update: {
          qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      business_days: {
        Row: {
          id: string;
          date: string;
          started_at: string;
          ended_at: string | null;
          started_by: string | null;
          ended_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          started_at?: string;
          ended_at?: string | null;
          started_by?: string | null;
          ended_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          started_at?: string;
          ended_at?: string | null;
          started_by?: string | null;
          ended_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_days_started_by_fkey";
            columns: ["started_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_days_ended_by_fkey";
            columns: ["ended_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          business_date: string;
          expense_type: "salary" | "daily_item" | "miscellaneous";
          staff_name: string | null;
          role: string | null;
          item_name: string | null;
          quantity: number | null;
          unit: string | null;
          unit_price: number | null;
          title: string | null;
          category: string | null;
          amount: number;
          payment_method: string;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          business_date?: string;
          expense_type: "salary" | "daily_item" | "miscellaneous";
          staff_name?: string | null;
          role?: string | null;
          item_name?: string | null;
          quantity?: number | null;
          unit?: string | null;
          unit_price?: number | null;
          title?: string | null;
          category?: string | null;
          amount?: number;
          payment_method?: string;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          business_date?: string;
          expense_type?: "salary" | "daily_item" | "miscellaneous";
          staff_name?: string | null;
          role?: string | null;
          item_name?: string | null;
          quantity?: number | null;
          unit?: string | null;
          unit_price?: number | null;
          title?: string | null;
          category?: string | null;
          amount?: number;
          payment_method?: string;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_sales_daily: {
        Row: {
          business_date: string;
          orders_count: number;
          covers: number;
          gross_sales: number;
          discount_total: number;
          net_sales: number;
          avg_ticket: number;
          cash_sales: number;
          card_sales: number;
          upi_sales: number;
          voided_items: number;
          voided_value: number;
          cancelled_orders: number;
        };
        Relationships: [];
      };
      v_sales_by_waiter: {
        Row: {
          business_date: string;
          waiter_id: string | null;
          waiter_name: string;
          orders_count: number;
          covers: number;
          items_count: number;
          gross_sales: number;
          discount_total: number;
          net_sales: number;
          avg_ticket: number;
        };
        Relationships: [];
      };
      v_sales_by_item: {
        Row: {
          business_date: string;
          menu_item_id: string | null;
          item_name: string;
          category_id: string | null;
          category_name: string;
          qty_sold: number;
          gross_sales: number;
          orders_count: number;
        };
        Relationships: [];
      };
      v_sales_hourly: {
        Row: {
          business_date: string;
          hour: number;
          orders_count: number;
          net_sales: number;
        };
        Relationships: [];
      };
      v_table_turnover: {
        Row: {
          business_date: string;
          table_id: string | null;
          table_label: string;
          orders_count: number;
          covers: number;
          net_sales: number;
          avg_minutes: number;
        };
        Relationships: [];
      };
      v_counter_sales_daily: {
        Row: {
          business_date: string;
          sale_count: number;
          revenue: number;
          avg_ticket: number;
        };
        Relationships: [];
      };
      v_counter_sales_by_item: {
        Row: {
          business_date: string;
          menu_item_id: string | null;
          item_name: string;
          qty_sold: number;
          revenue: number;
          sale_count: number;
        };
        Relationships: [];
      };
      v_counter_sales_hourly: {
        Row: {
          business_date: string;
          hour: number;
          sale_count: number;
          revenue: number;
        };
        Relationships: [];
      };
      v_daily_expenses_summary: {
        Row: {
          business_date: string;
          total_salaries: number;
          total_items: number;
          total_misc: number;
          grand_total_expenses: number;
          salary_count: number;
          item_count: number;
          misc_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_app_role: {
        Args: Record<string, never>;
        Returns: AppRole;
      };
      is_manager: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      business_date_for: {
        Args: { ts: string };
        Returns: string;
      };
      floor_snapshot: {
        Args: Record<string, never>;
        Returns: {
          table_id: string | null;
          table_label: string;
          zone: string;
          seats: number;
          sort_order: number;
          order_id: string | null;
          order_no: number | null;
          status: OrderStatus | null;
          waiter_id: string | null;
          waiter_name: string | null;
          guest_count: number | null;
          total: number | null;
          item_count: number;
          opened_at: string | null;
          billed_at: string | null;
          is_mine: boolean;
        }[];
      };
    };
    Enums: {
      app_role: AppRole;
      order_status: OrderStatus;
      payment_method: PaymentMethod;
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> =
  PublicSchema["Views"][T]["Row"];

export type Profile = Tables<"profiles">;
export type DiningTable = Tables<"dining_tables">;
export type MenuCategory = Tables<"menu_categories">;
export type MenuItem = Tables<"menu_items">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type AuditEntry = Tables<"audit_log">;
export type Sale = Tables<"sales">;
export type SaleItem = Tables<"sale_items">;
export type BusinessDay = Tables<"business_days">;
export type Expense = Tables<"expenses">;
export type ExpenseType = "salary" | "daily_item" | "miscellaneous";

export type SalesDaily = Views<"v_sales_daily">;
export type SalesByWaiter = Views<"v_sales_by_waiter">;
export type SalesByItem = Views<"v_sales_by_item">;
export type SalesHourly = Views<"v_sales_hourly">;
export type TableTurnover = Views<"v_table_turnover">;
export type CounterSalesDaily = Views<"v_counter_sales_daily">;
export type CounterSalesByItem = Views<"v_counter_sales_by_item">;
export type CounterSalesHourly = Views<"v_counter_sales_hourly">;
export type DailyExpensesSummary = Views<"v_daily_expenses_summary">;
