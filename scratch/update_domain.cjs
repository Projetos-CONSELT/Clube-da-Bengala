const fs = require('fs');
let content = fs.readFileSync('src/types/domain.ts', 'utf8');

const toAdd = `
export interface ValorCaracteristica {
  id: string;
  caracteristica_id: string;
  valor: string;
  created_at?: string | null;
}

export interface CaracteristicaEquipamento {
  id: string;
  tipo_equipamento_id: string;
  nome: string;
  created_at?: string | null;
  valores_caracteristica?: ValorCaracteristica[];
}

export function parseCaracteristicasSolicitadas(
  caracteristicas: Json | null | undefined
): Record<string, string> {
  if (!caracteristicas) return {};
  if (typeof caracteristicas === 'string') {
    try {
      const parsed = JSON.parse(caracteristicas);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof caracteristicas === 'object' && !Array.isArray(caracteristicas)) {
    return caracteristicas as Record<string, string>;
  }
  return {};
}
`;

content = content.replace('export interface AtributosEquipamento {', toAdd + '\nexport interface AtributosEquipamento {');

fs.writeFileSync('src/types/domain.ts', content, 'utf8');
console.log('domain.ts updated');

