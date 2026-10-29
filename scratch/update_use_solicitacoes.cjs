const fs = require('fs');
let content = fs.readFileSync('src/hooks/useSolicitacoes.ts', 'utf8');

content = content.replace(
  `      tempo_estimado_meses,
      nucleo_id,
    }: {
      beneficiario_id: string;
      tipo_equipamento_id: string;
      motivo_solicitacao?: string;
      como_conheceu?: string;
      tempo_estimado_meses?: number;
      nucleo_id?: string;
    }) => {`,
  `      tempo_estimado_meses,
      nucleo_id,
      caracteristicas_solicitadas,
    }: {
      beneficiario_id: string;
      tipo_equipamento_id: string;
      motivo_solicitacao?: string;
      como_conheceu?: string;
      tempo_estimado_meses?: number;
      nucleo_id?: string;
      caracteristicas_solicitadas?: Record<string, string> | null;
    }) => {`
);

content = content.replace(
  `        motivo_solicitacao: motivo_solicitacao || null,
        como_conheceu: como_conheceu || null,
        tempo_estimado_meses: tempo_estimado_meses || null,
        status: 'triagem',
      };`,
  `        motivo_solicitacao: motivo_solicitacao || null,
        como_conheceu: como_conheceu || null,
        tempo_estimado_meses: tempo_estimado_meses || null,
        status: 'triagem',
        caracteristicas_solicitadas: caracteristicas_solicitadas || null,
      };`
);

content = content.replace(
  `          motivo_solicitacao: motivo_solicitacao || null,
          status: data.status,
        },`,
  `          motivo_solicitacao: motivo_solicitacao || null,
          caracteristicas_solicitadas: caracteristicas_solicitadas || null,
          status: data.status,
        },`
);

fs.writeFileSync('src/hooks/useSolicitacoes.ts', content, 'utf8');
console.log('useSolicitacoes.ts updated');

