export type LeadStage = 'novo_lead' | 'contato_feito' | 'qualificado' | 'cliente_ativo' | 'inativo'
export type ActivityType = 'call' | 'email' | 'whatsapp' | 'meeting' | 'task'
export type ActivityStatus = 'pending' | 'completed'
export type DiscountType = 'percent' | 'value'
export type UserRole = 'admin' | 'member'
export type AutomationTrigger =
  | 'order_stage_changed'
  | 'order_created'
  | 'client_created'
  | 'activity_overdue'
  | 'order_stale'
export type AutomationAction = 'create_activity' | 'send_notification'
export type WebhookEvent = 'order_created' | 'order_stage_changed' | 'client_created' | 'activity_created'
export type NotificationType = 'info' | 'overdue_activity' | 'automation'

export interface SectionAccess {
  dashboard: boolean
  pedidos: boolean
  produtos: boolean
  clientes: boolean
  atividades: boolean
  calendario: boolean
  relatorios: boolean
  automacoes: boolean
  configuracoes: boolean
}

export interface StageHistoryEntry {
  stage_id: string
  changed_at: string
  changed_by: string | null
}

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          owner_id: string
          currency: string
          timezone: string
          date_format: string
          monthly_goal: number
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['workspaces']['Row']> & { name: string; owner_id: string }
        Update: Partial<Database['public']['Tables']['workspaces']['Row']>
        Relationships: []
      }
      users: {
        Row: {
          id: string
          workspace_id: string
          auth_user_id: string | null
          email: string
          name: string | null
          avatar_url: string | null
          role: UserRole
          invited_at: string | null
          joined_at: string | null
          created_at: string
          section_access: SectionAccess
          can_view_all_records: boolean
        }
        Insert: Partial<Database['public']['Tables']['users']['Row']> & { workspace_id: string; email: string }
        Update: Partial<Database['public']['Tables']['users']['Row']>
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          id: string
          workspace_id: string
          name: string
          position: number
          color: string
          is_won: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['pipeline_stages']['Row']> & { workspace_id: string; name: string }
        Update: Partial<Database['public']['Tables']['pipeline_stages']['Row']>
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          workspace_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['tags']['Row']> & { workspace_id: string; name: string }
        Update: Partial<Database['public']['Tables']['tags']['Row']>
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          workspace_id: string
          name: string
          company: string | null
          document: string | null
          state_registration: string | null
          emails: string[]
          phones: string[]
          whatsapp: string | null
          role_title: string | null
          address_street: string | null
          address_number: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_city: string | null
          address_state: string | null
          address_zip: string | null
          search_text: string
          lead_stage: LeadStage
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['clients']['Row']> & { workspace_id: string; name: string }
        Update: Partial<Database['public']['Tables']['clients']['Row']>
        Relationships: []
      }
      client_tags: {
        Row: { client_id: string; tag_id: string }
        Insert: { client_id: string; tag_id: string }
        Update: Partial<{ client_id: string; tag_id: string }>
        Relationships: []
      }
      products: {
        Row: {
          id: string
          workspace_id: string
          sku: string
          description: string
          unit: string
          sale_price: number
          cost_price: number
          category: string | null
          min_stock: number | null
          ncm: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['products']['Row']> & {
          workspace_id: string
          sku: string
          description: string
        }
        Update: Partial<Database['public']['Tables']['products']['Row']>
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          workspace_id: string
          client_id: string
          stage_id: string
          subtotal: number
          discount_type: DiscountType
          discount_value: number
          freight: number
          total: number
          notes: string | null
          contact_name: string | null
          shipping_method: string | null
          payment_terms: string | null
          delivery_date: string | null
          purchase_order_number: string | null
          stage_history: StageHistoryEntry[]
          created_by: string | null
          assigned_to: string | null
          brand_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['orders']['Row']> & {
          workspace_id: string
          client_id: string
          stage_id: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Row']>
        Relationships: []
      }
      brands: {
        Row: {
          id: string
          workspace_id: string
          name: string
          logo_url: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['brands']['Row']> & { workspace_id: string; name: string }
        Update: Partial<Database['public']['Tables']['brands']['Row']>
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          description: string
          quantity: number
          unit_price: number
          discount_type: DiscountType
          discount_value: number
          total: number
          position: number
        }
        Insert: Partial<Database['public']['Tables']['order_items']['Row']> & {
          order_id: string
          description: string
        }
        Update: Partial<Database['public']['Tables']['order_items']['Row']>
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          workspace_id: string
          type: ActivityType
          title: string
          description: string | null
          due_at: string
          client_id: string | null
          order_id: string | null
          status: ActivityStatus
          completed_at: string | null
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['activities']['Row']> & {
          workspace_id: string
          type: ActivityType
          title: string
        }
        Update: Partial<Database['public']['Tables']['activities']['Row']>
        Relationships: []
      }
      automations: {
        Row: {
          id: string
          workspace_id: string
          name: string
          trigger_type: AutomationTrigger
          trigger_config: Record<string, unknown>
          action_type: AutomationAction
          action_config: Record<string, unknown>
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['automations']['Row']> & {
          workspace_id: string
          name: string
          trigger_type: AutomationTrigger
          action_type: AutomationAction
        }
        Update: Partial<Database['public']['Tables']['automations']['Row']>
        Relationships: []
      }
      automation_logs: {
        Row: {
          id: string
          automation_id: string
          workspace_id: string
          status: 'success' | 'error'
          details: Record<string, unknown>
          related_entity_type: string | null
          related_entity_id: string | null
          triggered_at: string
        }
        Insert: Partial<Database['public']['Tables']['automation_logs']['Row']> & {
          automation_id: string
          workspace_id: string
        }
        Update: Partial<Database['public']['Tables']['automation_logs']['Row']>
        Relationships: []
      }
      webhooks: {
        Row: {
          id: string
          workspace_id: string
          url: string
          event: WebhookEvent
          active: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['webhooks']['Row']> & {
          workspace_id: string
          url: string
          event: WebhookEvent
        }
        Update: Partial<Database['public']['Tables']['webhooks']['Row']>
        Relationships: []
      }
      incoming_webhooks: {
        Row: {
          id: string
          workspace_id: string
          name: string
          resource: 'client'
          token: string
          active: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['incoming_webhooks']['Row']> & {
          workspace_id: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['incoming_webhooks']['Row']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          title: string
          body: string | null
          type: NotificationType
          read: boolean
          related_entity_type: string | null
          related_entity_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['notifications']['Row']> & {
          workspace_id: string
          title: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_workspace: {
        Args: { p_name: string; p_user_name?: string | null }
        Returns: string
      }
      accept_pending_invites: {
        Args: Record<string, never>
        Returns: void
      }
      run_scheduled_automations: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}
