export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          papel: Database['public']['Enums']['user_role'];
          nome_completo: string;
          cpf: string | null;
          whatsapp: string | null;
          email: string | null;
          endereco: string | null;
          cidade: string | null;
          estado: string | null;
          cep: string | null;
          is_inadimplente: boolean;
          aprovado: boolean;
          created_at: string | null;
          solicitacao_papel: string | null;
        };
        Insert: {
          id: string;
          papel?: Database['public']['Enums']['user_role'];
          nome_completo: string;
          cpf?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          endereco?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          is_inadimplente?: boolean;
          aprovado?: boolean;
          created_at?: string | null;
          solicitacao_papel?: string | null;
        };
        Update: {
          id?: string;
          papel?: Database['public']['Enums']['user_role'];
          nome_completo?: string;
          cpf?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          endereco?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          is_inadimplente?: boolean;
          aprovado?: boolean;
          created_at?: string | null;
          solicitacao_papel?: string | null;
        };
        Relationships: [];
      };
      beneficiarios: {
        Row: {
          id: string;
          solicitante_id: string;
          nome_completo: string;
          cpf: string;
          altura_cm: number | null;
          peso_kg: number | null;
          tamanho_calcado: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          solicitante_id: string;
          nome_completo: string;
          cpf: string;
          altura_cm?: number | null;
          peso_kg?: number | null;
          tamanho_calcado?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          solicitante_id?: string;
          nome_completo?: string;
          cpf?: string;
          altura_cm?: number | null;
          peso_kg?: number | null;
          tamanho_calcado?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'beneficiarios_solicitante_id_fkey';
            columns: ['solicitante_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      tipos_equipamento: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          schema_especificacoes: Json;
          limite_renovacoes: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          schema_especificacoes?: Json;
          limite_renovacoes?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          schema_especificacoes?: Json;
          limite_renovacoes?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      equipamentos: {
        Row: {
          id: string;
          codigo_patrimonio: string;
          tipo_id: string;
          status: Database['public']['Enums']['status_equipamento'];
          estado_conservacao: string | null;
          atributos_especificos: Json;
          doador_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          codigo_patrimonio: string;
          tipo_id: string;
          status?: Database['public']['Enums']['status_equipamento'];
          estado_conservacao?: string | null;
          atributos_especificos?: Json;
          doador_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          codigo_patrimonio?: string;
          tipo_id?: string;
          status?: Database['public']['Enums']['status_equipamento'];
          estado_conservacao?: string | null;
          atributos_especificos?: Json;
          doador_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'equipamentos_tipo_id_fkey';
            columns: ['tipo_id'];
            isOneToOne: false;
            referencedRelation: 'tipos_equipamento';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'equipamentos_doador_id_fkey';
            columns: ['doador_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      solicitacoes: {
        Row: {
          id: string;
          protocolo: string;
          solicitante_id: string;
          beneficiario_id: string | null;
          tipo_equipamento_id: string;
          equipamento_reservado_id: string | null;
          status: Database['public']['Enums']['status_solicitacao'];
          tempo_estimado_meses: number | null;
          motivo_solicitacao: string | null;
          prazo_limite_retirada: string | null;
          prazo_retirada: string | null;
          data_retirada_realizada: string | null;
          link_boleto_ressarcimento: string | null;
          valor_boleto_ressarcimento: number | null;
          prazo_vencimento_boleto: string | null;
          texto_notificacao_boleto: string | null;
          pagamento_ressarcimento_realizado: boolean | null;
          data_pagamento_ressarcimento: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          protocolo: string;
          solicitante_id: string;
          beneficiario_id?: string | null;
          tipo_equipamento_id: string;
          equipamento_reservado_id?: string | null;
          status?: Database['public']['Enums']['status_solicitacao'];
          tempo_estimado_meses?: number | null;
          motivo_solicitacao?: string | null;
          prazo_limite_retirada?: string | null;
          prazo_retirada?: string | null;
          data_retirada_realizada?: string | null;
          link_boleto_ressarcimento?: string | null;
          valor_boleto_ressarcimento?: number | null;
          prazo_vencimento_boleto?: string | null;
          texto_notificacao_boleto?: string | null;
          pagamento_ressarcimento_realizado?: boolean | null;
          data_pagamento_ressarcimento?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          protocolo?: string;
          solicitante_id?: string;
          beneficiario_id?: string | null;
          tipo_equipamento_id?: string;
          equipamento_reservado_id?: string | null;
          status?: Database['public']['Enums']['status_solicitacao'];
          tempo_estimado_meses?: number | null;
          motivo_solicitacao?: string | null;
          prazo_limite_retirada?: string | null;
          prazo_retirada?: string | null;
          data_retirada_realizada?: string | null;
          link_boleto_ressarcimento?: string | null;
          valor_boleto_ressarcimento?: number | null;
          prazo_vencimento_boleto?: string | null;
          texto_notificacao_boleto?: string | null;
          pagamento_ressarcimento_realizado?: boolean | null;
          data_pagamento_ressarcimento?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'solicitacoes_solicitante_id_fkey';
            columns: ['solicitante_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solicitacoes_beneficiario_id_fkey';
            columns: ['beneficiario_id'];
            isOneToOne: false;
            referencedRelation: 'beneficiarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solicitacoes_tipo_equipamento_id_fkey';
            columns: ['tipo_equipamento_id'];
            isOneToOne: false;
            referencedRelation: 'tipos_equipamento';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solicitacoes_equipamento_reservado_id_fkey';
            columns: ['equipamento_reservado_id'];
            isOneToOne: false;
            referencedRelation: 'equipamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      documentos_solicitacao: {
        Row: {
          id: string;
          solicitacao_id: string;
          tipo_documento: Database['public']['Enums']['tipo_documento'];
          url_arquivo: string;
          status: Database['public']['Enums']['status_documento'];
          motivo_rejeicao: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          tipo_documento: Database['public']['Enums']['tipo_documento'];
          url_arquivo: string;
          status?: Database['public']['Enums']['status_documento'];
          motivo_rejeicao?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          tipo_documento?: Database['public']['Enums']['tipo_documento'];
          url_arquivo?: string;
          status?: Database['public']['Enums']['status_documento'];
          motivo_rejeicao?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documentos_solicitacao_solicitacao_id_fkey';
            columns: ['solicitacao_id'];
            isOneToOne: false;
            referencedRelation: 'solicitacoes';
            referencedColumns: ['id'];
          },
        ];
      };
      emprestimos: {
        Row: {
          id: string;
          solicitacao_id: string;
          equipamento_id: string;
          data_retirada: string;
          data_prevista_devolucao: string | null;
          data_devolucao_realizada: string | null;
          renovacoes_realizadas: number;
          recibo_texto_customizado: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          equipamento_id: string;
          data_retirada: string;
          data_prevista_devolucao?: string | null;
          data_devolucao_realizada?: string | null;
          renovacoes_realizadas?: number;
          recibo_texto_customizado?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          equipamento_id?: string;
          data_retirada?: string;
          data_prevista_devolucao?: string | null;
          data_devolucao_realizada?: string | null;
          renovacoes_realizadas?: number;
          recibo_texto_customizado?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'emprestimos_solicitacao_id_fkey';
            columns: ['solicitacao_id'];
            isOneToOne: false;
            referencedRelation: 'solicitacoes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emprestimos_equipamento_id_fkey';
            columns: ['equipamento_id'];
            isOneToOne: false;
            referencedRelation: 'equipamentos';
            referencedColumns: ['id'];
          },
        ];
      };
      recibos_pagamento: {
        Row: {
          id: string;
          solicitacao_id: string;
          solicitante_id: string;
          nome_completo: string;
          cpf: string;
          descricao_equipamento: string;
          valor_pago: number;
          texto_customizado: string | null;
          data_emissao: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          solicitante_id: string;
          nome_completo: string;
          cpf: string;
          descricao_equipamento: string;
          valor_pago: number;
          texto_customizado?: string | null;
          data_emissao?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          solicitante_id?: string;
          nome_completo?: string;
          cpf?: string;
          descricao_equipamento?: string;
          valor_pago?: number;
          texto_customizado?: string | null;
          data_emissao?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'recibos_pagamento_solicitacao_id_fkey';
            columns: ['solicitacao_id'];
            isOneToOne: false;
            referencedRelation: 'solicitacoes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recibos_pagamento_solicitante_id_fkey';
            columns: ['solicitante_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
      imagens_retirada: {
        Row: {
          id: string;
          solicitacao_id: string;
          url_imagem: string;
          descricao: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          url_imagem: string;
          descricao?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          url_imagem?: string;
          descricao?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'imagens_retirada_solicitacao_id_fkey';
            columns: ['solicitacao_id'];
            isOneToOne: false;
            referencedRelation: 'solicitacoes';
            referencedColumns: ['id'];
          },
        ];
      };
      imagens_devolucao: {
        Row: {
          id: string;
          solicitacao_id: string;
          url_imagem: string;
          descricao: string | null;
          estado_conservacao: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          url_imagem: string;
          descricao?: string | null;
          estado_conservacao?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          url_imagem?: string;
          descricao?: string | null;
          estado_conservacao?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'imagens_devolucao_solicitacao_id_fkey';
            columns: ['solicitacao_id'];
            isOneToOne: false;
            referencedRelation: 'solicitacoes';
            referencedColumns: ['id'];
          },
        ];
      };
      notificacoes: {
        Row: {
          id: string;
          solicitacao_id: string;
          usuario_id: string;
          tipo: 'boleto' | 'pagamento' | 'inadimplencia' | 'retirada' | 'devolucao';
          titulo: string;
          descricao: string | null;
          lido: boolean;
          link_acao: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          usuario_id: string;
          tipo: 'boleto' | 'pagamento' | 'inadimplencia' | 'retirada' | 'devolucao';
          titulo: string;
          descricao?: string | null;
          lido?: boolean;
          link_acao?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          usuario_id?: string;
          tipo?: 'boleto' | 'pagamento' | 'inadimplencia' | 'retirada' | 'devolucao';
          titulo?: string;
          descricao?: string | null;
          lido?: boolean;
          link_acao?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notificacoes_solicitacao_id_fkey';
            columns: ['solicitacao_id'];
            isOneToOne: false;
            referencedRelation: 'solicitacoes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notificacoes_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: 'gerente' | 'coordenador' | 'atendente' | 'solicitante';
      status_equipamento:
        | 'disponivel'
        | 'reservado'
        | 'emprestado'
        | 'manutencao'
        | 'vendido'
        | 'extraviado';
      status_solicitacao:
        | 'triagem'
        | 'aguardando_documentacao'
        | 'aguardando_retirada'
        | 'equipamento_emprestado'
        | 'em_devolucao'
        | 'inadimplente'
        | 'em_cobranca'
        | 'encerrada';
      status_documento: 'pendente' | 'aprovado' | 'reprovado';
      tipo_documento: 'RG_FRENTE' | 'COMPROVANTE_RESIDENCIA';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Usuario = Database['public']['Tables']['usuarios']['Row'];
export type UsuarioInsert = Database['public']['Tables']['usuarios']['Insert'];
export type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update'];
export type UserRole = Database['public']['Enums']['user_role'];
export type StatusEquipamento = Database['public']['Enums']['status_equipamento'];
export type StatusSolicitacao = Database['public']['Enums']['status_solicitacao'];
export type StatusDocumento = Database['public']['Enums']['status_documento'];
export type TipoDocumento = Database['public']['Enums']['tipo_documento'];

export type Beneficiario = Database['public']['Tables']['beneficiarios']['Row'];
export type BeneficiarioInsert = Database['public']['Tables']['beneficiarios']['Insert'];
export type BeneficiarioUpdate = Database['public']['Tables']['beneficiarios']['Update'];
export type TipoEquipamento = Database['public']['Tables']['tipos_equipamento']['Row'];
export type TipoEquipamentoInsert = Database['public']['Tables']['tipos_equipamento']['Insert'];
export type TipoEquipamentoUpdate = Database['public']['Tables']['tipos_equipamento']['Update'];
export type Equipamento = Database['public']['Tables']['equipamentos']['Row'];
export type EquipamentoInsert = Database['public']['Tables']['equipamentos']['Insert'];
export type EquipamentoUpdate = Database['public']['Tables']['equipamentos']['Update'];
export type Solicitacao = Database['public']['Tables']['solicitacoes']['Row'];
export type SolicitacaoInsert = Database['public']['Tables']['solicitacoes']['Insert'];
export type SolicitacaoUpdate = Database['public']['Tables']['solicitacoes']['Update'];
export type DocumentoSolicitacao = Database['public']['Tables']['documentos_solicitacao']['Row'];
export type Emprestimo = Database['public']['Tables']['emprestimos']['Row'];
export type EmprestimoInsert = Database['public']['Tables']['emprestimos']['Insert'];
export type EmprestimoUpdate = Database['public']['Tables']['emprestimos']['Update'];

export type ReciboPagamento = Database['public']['Tables']['recibos_pagamento']['Row'];
export type ReciboPagamentoInsert = Database['public']['Tables']['recibos_pagamento']['Insert'];
export type ReciboPagamentoUpdate = Database['public']['Tables']['recibos_pagamento']['Update'];

export type ImagemRetirada = Database['public']['Tables']['imagens_retirada']['Row'];
export type ImagemRetiradaInsert = Database['public']['Tables']['imagens_retirada']['Insert'];
export type ImagemRetiradaUpdate = Database['public']['Tables']['imagens_retirada']['Update'];

export type ImagemDevolucao = Database['public']['Tables']['imagens_devolucao']['Row'];
export type ImagemDevolucaoInsert = Database['public']['Tables']['imagens_devolucao']['Insert'];
export type ImagemDevolucaoUpdate = Database['public']['Tables']['imagens_devolucao']['Update'];

export type Notificacao = Database['public']['Tables']['notificacoes']['Row'];
export type NotificacaoInsert = Database['public']['Tables']['notificacoes']['Insert'];
export type NotificacaoUpdate = Database['public']['Tables']['notificacoes']['Update'];

