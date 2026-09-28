/**
 * Local recovery contract, NOT generated from the production database.
 * TODO DE RECUPERAÇÃO/VALIDAÇÃO: compare nullability, defaults, enums and
 * relationships with a confirmed homologation schema before deployment.
 * Only fields referenced by the application, tests and SQL reports are listed.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};
type Identified = { id: string; created_at: string };
type Operational = Identified & { company_id: string; is_demo: boolean };
export type CompanyRow = Identified & {
  owner_id: string;
  nome: string;
  ramo: string | null;
  regime_tributario: string | null;
  faturamento_mensal: number;
  vendas_mensais: number;
  pro_labore: number;
  imposto_percentual: number;
  comissao_padrao: number;
  margem_padrao: number;
  arredondamento: string;
  onboarding_completo: boolean;
  is_demo: boolean;
  logo_url: string | null;
  trial_expira_em: string | null;
  licenca_expira_em: string | null;
};
type ProductRow = Operational & {
  updated_at: string;
  tipo: "produto" | "servico";
  nome: string;
  categoria: string | null;
  descricao: string | null;
  sku: string | null;
  observacoes: string | null;
  custo_aquisicao: number;
  embalagem: number;
  frete: number;
  outros_custos: number;
  estoque: number | null;
  horas: number;
  valor_hora: number;
  materiais: number;
  deslocamento: number;
  terceirizados: number;
  preco_atual: number;
  ativo: boolean;
};
type CalculationRow = Operational & {
  item_id: string | null;
  item_nome: string;
  tipo: "produto" | "servico";
  modo: "ideal" | "minimo" | "promocional";
  forma_pagamento: string;
  parcelas: number;
  custo_direto: number;
  custo_fixo_venda: number;
  impostos_percentual: number;
  comissao_percentual: number;
  taxa_percentual: number;
  tarifa_fixa: number;
  lucro_percentual: number;
  desconto_percentual: number;
  preco_sugerido: number;
  preco_minimo: number;
  preco_atual: number;
  valor_liquido: number;
  lucro_liquido: number;
  margem_liquida: number;
  margem_contribuicao: number;
  markup: number;
  classificacao: string;
  observacoes: string | null;
};
export type Database = {
  public: {
    Tables: {
      companies: Table<CompanyRow, "nome" | "owner_id">;
      company_members: Table<
        Identified & { company_id: string; user_id: string; role: string },
        "company_id" | "user_id" | "role"
      >;
      profiles: Table<
        Identified & {
          nome: string;
          email: string;
          telefone: string | null;
          cpf: string | null;
          cnpj: string | null;
          cidade: string | null;
          uf: string | null;
        },
        "id"
      >;
      products_services: Table<ProductRow, "company_id" | "nome" | "tipo">;
      employees: Table<
        Operational & {
          nome: string;
          quantidade: number;
          salario: number;
          beneficios: number;
          outros_custos: number;
          encargos_percentual: number;
          ativo: boolean;
        },
        "company_id" | "nome"
      >;
      expenses: Table<
        Operational & {
          descricao: string;
          categoria: string;
          valor: number;
          recorrencia: string;
          dia_vencimento: number | null;
          observacoes: string | null;
          ativo: boolean;
        },
        "company_id" | "descricao"
      >;
      payment_methods: Table<
        Operational & {
          tipo: string;
          nome: string;
          parcelas: number;
          taxa_percentual: number;
          tarifa_fixa: number;
          prazo_recebimento: number;
          ordem: number;
          ativo: boolean;
        },
        "company_id" | "tipo" | "nome" | "parcelas"
      >;
      pricing_calculations: Table<CalculationRow, "company_id" | "item_nome" | "tipo">;
      pricing_scenarios: Table<
        Identified & { company_id: string; calculation_id: string; nome: string },
        "company_id" | "calculation_id" | "nome"
      >;
      platform_admins: Table<{ user_id: string; created_at: string }, "user_id">;
      platform_settings: Table<
        {
          id: boolean;
          margem_padrao: number;
          imposto_padrao: number;
          comissao_padrao: number;
          arredondamento: string;
          permitir_cadastros: boolean;
          permitir_demo: boolean;
          mensagem_aviso: string | null;
          preco_licenca: number;
          meses_licenca: number;
          dias_teste: number;
          updated_at: string;
        },
        "id"
      >;
      platform_secrets: Table<
        {
          id: boolean;
          mercadopago_ativo: boolean;
          mercadopago_access_token: string | null;
          updated_at: string;
        },
        "id"
      >;
      license_payments: Table<
        Identified & {
          company_id: string;
          user_id: string | null;
          valor: number;
          meses: number;
          status: string;
          provider: string;
          preference_id: string | null;
          init_point: string | null;
        },
        "company_id" | "valor" | "provider"
      >;
      storage_cleanup_jobs: Table<
        { bucket_id: string; object_path: string; attempts: number; last_error: string | null },
        "bucket_id" | "object_path"
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      // Recovery RPCs make the existing multi-step client operations atomic.
      create_company_with_payment_methods: {
        Args: { _company: Json; _payment_methods: Json };
        Returns: CompanyRow;
      };
      seed_company_demo: { Args: { _company_id: string; _payload: Json }; Returns: undefined };
      remove_company_demo: { Args: { _company_id: string }; Returns: undefined };
      get_my_company_context: { Args: Record<string, never>; Returns: CompanyRow[] };
      is_platform_admin: { Args: { _user_id?: string }; Returns: boolean };
      can_write: { Args: { _company_id: string }; Returns: boolean };
      tenant_license_active: { Args: { _company_id: string }; Returns: boolean };
      queue_logo_cleanup: {
        Args: { _company_id: string; _object_path: string };
        Returns: undefined;
      };
      delete_company_admin: {
        Args: { _company_id: string; _actor_id: string };
        Returns: string | null;
      };
      consume_ai_rate_limit: { Args: { _company_id: string }; Returns: boolean };
      process_mercado_pago_payment: {
        Args: {
          _charge_id: string;
          _payment_id: string;
          _provider_status: string;
          _status_detail: string;
          _live_mode: boolean;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
