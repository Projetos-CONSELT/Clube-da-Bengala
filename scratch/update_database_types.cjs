const fs = require('fs');
let content = fs.readFileSync('src/types/database.types.ts', 'utf8');

// 1. Add caracteristicas_equipamento and valores_caracteristica right after tipos_equipamento
const tablesToInsert = `      caracteristicas_equipamento: {
        Row: {
          id: string;
          tipo_equipamento_id: string;
          nome: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tipo_equipamento_id: string;
          nome: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tipo_equipamento_id?: string;
          nome?: string;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'caracteristicas_equipamento_tipo_equipamento_id_fkey';
            columns: ['tipo_equipamento_id'];
            isOneToOne: false;
            referencedRelation: 'tipos_equipamento';
            referencedColumns: ['id'];
          }
        ];
      };
      valores_caracteristica: {
        Row: {
          id: string;
          caracteristica_id: string;
          valor: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          caracteristica_id: string;
          valor: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          caracteristica_id?: string;
          valor?: string;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'valores_caracteristica_caracteristica_id_fkey';
            columns: ['caracteristica_id'];
            isOneToOne: false;
            referencedRelation: 'caracteristicas_equipamento';
            referencedColumns: ['id'];
          }
        ];
      };
`;

content = content.replace(/(tipos_equipamento: \{[\s\S]*?Relationships: \[\];\r?\n      \};\r?\n)/, '$1' + tablesToInsert);

// 2. Add caracteristicas_solicitadas to solicitacoes Row, Insert, Update
content = content.replace(
  /(solicitacoes: \{\r?\n\s+Row: \{[\s\S]*?pode_criar_nucleos: boolean \| null;\r?\n)/,
  '$1          caracteristicas_solicitadas: Json | null;\r\n'
);

content = content.replace(
  /(solicitacoes: \{[\s\S]*?Insert: \{[\s\S]*?pode_criar_nucleos\?: boolean \| null;\r?\n)/,
  '$1          caracteristicas_solicitadas?: Json | null;\r\n'
);

content = content.replace(
  /(solicitacoes: \{[\s\S]*?Update: \{[\s\S]*?pode_criar_nucleos\?: boolean \| null;\r?\n)/,
  '$1          caracteristicas_solicitadas?: Json | null;\r\n'
);

// 3. Add export type aliases at the bottom
const exportsToAdd = `export type CaracteristicaEquipamentoRow = Database['public']['Tables']['caracteristicas_equipamento']['Row'];
export type CaracteristicaEquipamentoInsert = Database['public']['Tables']['caracteristicas_equipamento']['Insert'];
export type CaracteristicaEquipamentoUpdate = Database['public']['Tables']['caracteristicas_equipamento']['Update'];

export type ValorCaracteristicaRow = Database['public']['Tables']['valores_caracteristica']['Row'];
export type ValorCaracteristicaInsert = Database['public']['Tables']['valores_caracteristica']['Insert'];
export type ValorCaracteristicaUpdate = Database['public']['Tables']['valores_caracteristica']['Update'];
`;

content += '\n' + exportsToAdd;

fs.writeFileSync('src/types/database.types.ts', content, 'utf8');
console.log('database.types.ts updated successfully');

