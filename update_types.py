import re

path = 'src/types/database.types.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add pode_criar_nucleos
content = content.replace(
    'nucleo_id: string | null;\n        };',
    'nucleo_id: string | null;\n          pode_criar_nucleos: boolean | null;\n        };'
)
content = content.replace(
    'nucleo_id?: string | null;\n        };',
    'nucleo_id?: string | null;\n          pode_criar_nucleos?: boolean | null;\n        };'
)

# 2. Add nucleos table if not exists
nucleos_str = """      nucleos: {
        Row: {
          id: string;
          nome: string;
          cep: string;
          estado: string;
          cidade: string;
          bairro: string;
          rua: string;
          numero: string;
          complemento: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          nome: string;
          cep: string;
          estado: string;
          cidade: string;
          bairro: string;
          rua: string;
          numero: string;
          complemento?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          cep?: string;
          estado?: string;
          cidade?: string;
          bairro?: string;
          rua?: string;
          numero?: string;
          complemento?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };"""

if 'nucleos: {' not in content:
    content = content.replace('      beneficiarios: {', nucleos_str + '\n      beneficiarios: {')

# 3. Add Nucleo types if not exists
nucleo_types = """
export type Nucleo = Database['public']['Tables']['nucleos']['Row'];
export type NucleoInsert = Database['public']['Tables']['nucleos']['Insert'];
export type NucleoUpdate = Database['public']['Tables']['nucleos']['Update'];
"""

if 'export type Nucleo ' not in content:
    content = content.replace('export type Notificacao = Database', nucleo_types.strip() + '\n\nexport type Notificacao = Database')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
