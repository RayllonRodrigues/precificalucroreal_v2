// Generated from homologation adkfebcanubebtmqyram using Supabase CLI, 2026-09-28.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "companies": {
                  Row: {
                    "arredondamento": string,"comissao_padrao": number,"created_at": string,"faturamento_mensal": number,"id": string,"imposto_percentual": number,"is_demo": boolean,"licenca_expira_em": string | null,"logo_url": string | null,"margem_padrao": number,"nome": string,"onboarding_completo": boolean,"owner_id": string,"pro_labore": number,"ramo": string | null,"regime_tributario": string | null,"trial_expira_em": string | null,"vendas_mensais": number
                  }
                  Insert: {
                    "arredondamento"?: string,"comissao_padrao"?: number,"created_at"?: string,"faturamento_mensal"?: number,"id"?: string,"imposto_percentual"?: number,"is_demo"?: boolean,"licenca_expira_em"?: string | null,"logo_url"?: string | null,"margem_padrao"?: number,"nome": string,"onboarding_completo"?: boolean,"owner_id": string,"pro_labore"?: number,"ramo"?: string | null,"regime_tributario"?: string | null,"trial_expira_em"?: string | null,"vendas_mensais"?: number
                  }
                  Update: {
                    "arredondamento"?: string,"comissao_padrao"?: number,"created_at"?: string,"faturamento_mensal"?: number,"id"?: string,"imposto_percentual"?: number,"is_demo"?: boolean,"licenca_expira_em"?: string | null,"logo_url"?: string | null,"margem_padrao"?: number,"nome"?: string,"onboarding_completo"?: boolean,"owner_id"?: string,"pro_labore"?: number,"ramo"?: string | null,"regime_tributario"?: string | null,"trial_expira_em"?: string | null,"vendas_mensais"?: number
                  }
                  Relationships: [
                    
                  ]
                },"company_members": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"role": string,"user_id": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"role": string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"employees": {
                  Row: {
                    "ativo": boolean,"beneficios": number,"company_id": string,"created_at": string,"encargos_percentual": number,"id": string,"is_demo": boolean,"nome": string,"outros_custos": number,"quantidade": number,"salario": number
                  }
                  Insert: {
                    "ativo"?: boolean,"beneficios"?: number,"company_id": string,"created_at"?: string,"encargos_percentual"?: number,"id"?: string,"is_demo"?: boolean,"nome": string,"outros_custos"?: number,"quantidade"?: number,"salario"?: number
                  }
                  Update: {
                    "ativo"?: boolean,"beneficios"?: number,"company_id"?: string,"created_at"?: string,"encargos_percentual"?: number,"id"?: string,"is_demo"?: boolean,"nome"?: string,"outros_custos"?: number,"quantidade"?: number,"salario"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "employees_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "ativo": boolean,"categoria": string,"company_id": string,"created_at": string,"descricao": string,"dia_vencimento": number | null,"id": string,"is_demo": boolean,"observacoes": string | null,"recorrencia": string,"valor": number
                  }
                  Insert: {
                    "ativo"?: boolean,"categoria"?: string,"company_id": string,"created_at"?: string,"descricao": string,"dia_vencimento"?: number | null,"id"?: string,"is_demo"?: boolean,"observacoes"?: string | null,"recorrencia"?: string,"valor"?: number
                  }
                  Update: {
                    "ativo"?: boolean,"categoria"?: string,"company_id"?: string,"created_at"?: string,"descricao"?: string,"dia_vencimento"?: number | null,"id"?: string,"is_demo"?: boolean,"observacoes"?: string | null,"recorrencia"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"license_payments": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"init_point": string | null,"meses": number,"preference_id": string | null,"provider": string,"status": string,"user_id": string | null,"valor": number
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"init_point"?: string | null,"meses"?: number,"preference_id"?: string | null,"provider"?: string,"status"?: string,"user_id"?: string | null,"valor"?: number
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"init_point"?: string | null,"meses"?: number,"preference_id"?: string | null,"provider"?: string,"status"?: string,"user_id"?: string | null,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "license_payments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_methods": {
                  Row: {
                    "ativo": boolean,"company_id": string,"created_at": string,"id": string,"is_demo": boolean,"nome": string,"ordem": number,"parcelas": number,"prazo_recebimento": number,"tarifa_fixa": number,"taxa_percentual": number,"tipo": string
                  }
                  Insert: {
                    "ativo"?: boolean,"company_id": string,"created_at"?: string,"id"?: string,"is_demo"?: boolean,"nome": string,"ordem"?: number,"parcelas"?: number,"prazo_recebimento"?: number,"tarifa_fixa"?: number,"taxa_percentual"?: number,"tipo": string
                  }
                  Update: {
                    "ativo"?: boolean,"company_id"?: string,"created_at"?: string,"id"?: string,"is_demo"?: boolean,"nome"?: string,"ordem"?: number,"parcelas"?: number,"prazo_recebimento"?: number,"tarifa_fixa"?: number,"taxa_percentual"?: number,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_methods_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_secrets": {
                  Row: {
                    "id": boolean,"mercadopago_access_token": string | null,"mercadopago_ativo": boolean,"updated_at": string
                  }
                  Insert: {
                    "id"?: boolean,"mercadopago_access_token"?: string | null,"mercadopago_ativo"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "id"?: boolean,"mercadopago_access_token"?: string | null,"mercadopago_ativo"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_settings": {
                  Row: {
                    "arredondamento": string,"comissao_padrao": number,"dias_teste": number,"id": boolean,"imposto_padrao": number,"margem_padrao": number,"mensagem_aviso": string | null,"meses_licenca": number,"permitir_cadastros": boolean,"permitir_demo": boolean,"preco_licenca": number,"updated_at": string
                  }
                  Insert: {
                    "arredondamento"?: string,"comissao_padrao"?: number,"dias_teste"?: number,"id"?: boolean,"imposto_padrao"?: number,"margem_padrao"?: number,"mensagem_aviso"?: string | null,"meses_licenca"?: number,"permitir_cadastros"?: boolean,"permitir_demo"?: boolean,"preco_licenca"?: number,"updated_at"?: string
                  }
                  Update: {
                    "arredondamento"?: string,"comissao_padrao"?: number,"dias_teste"?: number,"id"?: boolean,"imposto_padrao"?: number,"margem_padrao"?: number,"mensagem_aviso"?: string | null,"meses_licenca"?: number,"permitir_cadastros"?: boolean,"permitir_demo"?: boolean,"preco_licenca"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pricing_calculations": {
                  Row: {
                    "classificacao": string,"comissao_percentual": number,"company_id": string,"created_at": string,"custo_direto": number,"custo_fixo_venda": number,"desconto_percentual": number,"forma_pagamento": string,"id": string,"impostos_percentual": number,"is_demo": boolean,"item_id": string | null,"item_nome": string,"lucro_liquido": number,"lucro_percentual": number,"margem_contribuicao": number,"margem_liquida": number,"markup": number,"modo": string,"observacoes": string | null,"parcelas": number,"preco_atual": number,"preco_minimo": number,"preco_sugerido": number,"tarifa_fixa": number,"taxa_percentual": number,"tipo": string,"valor_liquido": number
                  }
                  Insert: {
                    "classificacao"?: string,"comissao_percentual"?: number,"company_id": string,"created_at"?: string,"custo_direto"?: number,"custo_fixo_venda"?: number,"desconto_percentual"?: number,"forma_pagamento"?: string,"id"?: string,"impostos_percentual"?: number,"is_demo"?: boolean,"item_id"?: string | null,"item_nome": string,"lucro_liquido"?: number,"lucro_percentual"?: number,"margem_contribuicao"?: number,"margem_liquida"?: number,"markup"?: number,"modo"?: string,"observacoes"?: string | null,"parcelas"?: number,"preco_atual"?: number,"preco_minimo"?: number,"preco_sugerido"?: number,"tarifa_fixa"?: number,"taxa_percentual"?: number,"tipo": string,"valor_liquido"?: number
                  }
                  Update: {
                    "classificacao"?: string,"comissao_percentual"?: number,"company_id"?: string,"created_at"?: string,"custo_direto"?: number,"custo_fixo_venda"?: number,"desconto_percentual"?: number,"forma_pagamento"?: string,"id"?: string,"impostos_percentual"?: number,"is_demo"?: boolean,"item_id"?: string | null,"item_nome"?: string,"lucro_liquido"?: number,"lucro_percentual"?: number,"margem_contribuicao"?: number,"margem_liquida"?: number,"markup"?: number,"modo"?: string,"observacoes"?: string | null,"parcelas"?: number,"preco_atual"?: number,"preco_minimo"?: number,"preco_sugerido"?: number,"tarifa_fixa"?: number,"taxa_percentual"?: number,"tipo"?: string,"valor_liquido"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pricing_calculations_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pricing_calculations_item_same_company_fk"
      columns: ["item_id","company_id"]
isOneToOne: false
      referencedRelation: "products_services"
      referencedColumns: ["id","company_id"]
    }
                  ]
                },"pricing_scenarios": {
                  Row: {
                    "calculation_id": string,"company_id": string,"created_at": string,"id": string,"nome": string
                  }
                  Insert: {
                    "calculation_id": string,"company_id": string,"created_at"?: string,"id"?: string,"nome": string
                  }
                  Update: {
                    "calculation_id"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pricing_scenarios_calculation_same_company_fk"
      columns: ["calculation_id","company_id"]
isOneToOne: false
      referencedRelation: "pricing_calculations"
      referencedColumns: ["id","company_id"]
    },{
      foreignKeyName: "pricing_scenarios_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"products_services": {
                  Row: {
                    "ativo": boolean,"categoria": string | null,"company_id": string,"created_at": string,"custo_aquisicao": number,"descricao": string | null,"deslocamento": number,"embalagem": number,"estoque": number | null,"frete": number,"horas": number,"id": string,"is_demo": boolean,"materiais": number,"nome": string,"observacoes": string | null,"outros_custos": number,"preco_atual": number,"sku": string | null,"terceirizados": number,"tipo": string,"updated_at": string,"valor_hora": number
                  }
                  Insert: {
                    "ativo"?: boolean,"categoria"?: string | null,"company_id": string,"created_at"?: string,"custo_aquisicao"?: number,"descricao"?: string | null,"deslocamento"?: number,"embalagem"?: number,"estoque"?: number | null,"frete"?: number,"horas"?: number,"id"?: string,"is_demo"?: boolean,"materiais"?: number,"nome": string,"observacoes"?: string | null,"outros_custos"?: number,"preco_atual"?: number,"sku"?: string | null,"terceirizados"?: number,"tipo": string,"updated_at"?: string,"valor_hora"?: number
                  }
                  Update: {
                    "ativo"?: boolean,"categoria"?: string | null,"company_id"?: string,"created_at"?: string,"custo_aquisicao"?: number,"descricao"?: string | null,"deslocamento"?: number,"embalagem"?: number,"estoque"?: number | null,"frete"?: number,"horas"?: number,"id"?: string,"is_demo"?: boolean,"materiais"?: number,"nome"?: string,"observacoes"?: string | null,"outros_custos"?: number,"preco_atual"?: number,"sku"?: string | null,"terceirizados"?: number,"tipo"?: string,"updated_at"?: string,"valor_hora"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_services_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "cidade": string | null,"cnpj": string | null,"cpf": string | null,"created_at": string,"email": string,"id": string,"nome": string,"telefone": string | null,"uf": string | null
                  }
                  Insert: {
                    "cidade"?: string | null,"cnpj"?: string | null,"cpf"?: string | null,"created_at"?: string,"email"?: string,"id": string,"nome"?: string,"telefone"?: string | null,"uf"?: string | null
                  }
                  Update: {
                    "cidade"?: string | null,"cnpj"?: string | null,"cpf"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"nome"?: string,"telefone"?: string | null,"uf"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"storage_cleanup_jobs": {
                  Row: {
                    "attempts": number,"bucket_id": string,"last_error": string | null,"object_path": string
                  }
                  Insert: {
                    "attempts"?: number,"bucket_id": string,"last_error"?: string | null,"object_path": string
                  }
                  Update: {
                    "attempts"?: number,"bucket_id"?: string,"last_error"?: string | null,"object_path"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_access_logo":
{ Args: { "_path": string,"_write"?: boolean }; Returns: boolean
                           },
"can_write":
{ Args: { "_company_id": string }; Returns: boolean
                           },
"consume_ai_rate_limit":
{ Args: { "_company_id": string }; Returns: boolean
                           },
"create_company_with_payment_methods":
{ Args: { "_company": Json,"_payment_methods": Json }; Returns: {
              "arredondamento": string,
"comissao_padrao": number,
"created_at": string,
"faturamento_mensal": number,
"id": string,
"imposto_percentual": number,
"is_demo": boolean,
"licenca_expira_em": string | null,
"logo_url": string | null,
"margem_padrao": number,
"nome": string,
"onboarding_completo": boolean,
"owner_id": string,
"pro_labore": number,
"ramo": string | null,
"regime_tributario": string | null,
"trial_expira_em": string | null,
"vendas_mensais": number
            }
                          SetofOptions: {
        from: "*"
        to: "companies"
        isOneToOne: true
        isSetofReturn: false
      } },
"delete_company_admin":
{ Args: { "_actor_id": string,"_company_id": string }; Returns: string
                           },
"get_my_company_context":
{ Args: Record<PropertyKey, never>; Returns: {
              "arredondamento": string,
"comissao_padrao": number,
"created_at": string,
"faturamento_mensal": number,
"id": string,
"imposto_percentual": number,
"is_demo": boolean,
"licenca_expira_em": string | null,
"logo_url": string | null,
"margem_padrao": number,
"nome": string,
"onboarding_completo": boolean,
"owner_id": string,
"pro_labore": number,
"ramo": string | null,
"regime_tributario": string | null,
"trial_expira_em": string | null,
"vendas_mensais": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "companies"
        isOneToOne: false
        isSetofReturn: true
      } },
"hook_enforce_signup_enabled":
{ Args: { "event": Json }; Returns: Json
                           },
"is_member":
{ Args: { "_company_id": string }; Returns: boolean
                           },
"is_owner":
{ Args: { "_company_id": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: { "_user_id"?: string }; Returns: boolean
                           },
"process_mercado_pago_payment":
{ Args: { "_charge_id": string,"_live_mode": boolean,"_payment_id": string,"_provider_status": string,"_status_detail": string }; Returns: string
                           },
"queue_logo_cleanup":
{ Args: { "_company_id": string,"_object_path": string }; Returns: undefined
                           },
"remove_company_demo":
{ Args: { "_company_id": string }; Returns: undefined
                           },
"seed_company_demo":
{ Args: { "_company_id": string,"_payload": Json }; Returns: undefined
                           },
"tenant_license_active":
{ Args: { "_company_id": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const

