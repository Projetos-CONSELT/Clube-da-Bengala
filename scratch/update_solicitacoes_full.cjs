const fs = require('fs');
let content = fs.readFileSync('src/pages/Solicitacoes.tsx', 'utf8');

// Normalize line breaks to \n temporarily
const hadCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Add import of useCaracteristicasByTipoQuery
if (!content.includes('useCaracteristicasByTipoQuery')) {
  content = content.replace(
    "import { useEquipamentosQuery, useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';",
    "import { useEquipamentosQuery, useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';\nimport { useCaracteristicasByTipoQuery } from '@/hooks/useEquipamentos';"
  );
}

// 2. In DadosSolicitacaoTab: add caracteristicas_solicitadas block
const tipoPattern = /<div>\n\s+<p className="text-sm text-slate-500">Tipo de Equipamento<\/p>\n\s+<p className="font-medium">\{tipoName\(solicitacao\)\}<\/p>\n\s+<\/div>/;

if (!content.includes('Características Solicitadas')) {
  content = content.replace(tipoPattern, `<div>
        <p className="text-sm text-slate-500">Tipo de Equipamento</p>
        <p className="font-medium">{tipoName(solicitacao)}</p>
      </div>
      {(() => {
        const caracts = parseCaracteristicasSolicitadas(solicitacao.caracteristicas_solicitadas);
        const entries = Object.entries(caracts);
        if (entries.length === 0) return null;
        return (
          <div className="col-span-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1.5">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Características Solicitadas
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {entries.map(([k, v]) => (
                <Badge key={k} variant="secondary" className="bg-white border border-blue-200 text-blue-900 text-xs py-1 px-2.5 shadow-2xs">
                  <span className="text-slate-500 mr-1">{k}:</span>
                  <span className="font-bold">{String(v)}</span>
                </Badge>
              ))}
            </div>
          </div>
        );
      })()}`);
}

// 3. Replace availableSubtipos with caracteristicasQuery and caracteristicasRespostas
const availableSubtiposRegex = /  const availableSubtipos = useMemo\(\(\) => \{[\s\S]*?\}, \[tipos, formData\.tipo_equipamento_id\]\);/;
content = content.replace(availableSubtiposRegex, `  const [caracteristicasRespostas, setCaracteristicasRespostas] = useState<Record<string, string>>({});
  const caracteristicasQuery = useCaracteristicasByTipoQuery(formData.tipo_equipamento_id || null);
  const caracteristicas = caracteristicasQuery.data ?? [];`);

// 4. In handleCreate: replace availableSubtipos check with caracteristicas check
const subtipoValidationRegex = /if \(availableSubtipos\.length > 0 && !formData\.subtipo_id\) \{[\s\S]*?return;\n\s+\}/;
content = content.replace(subtipoValidationRegex, `if (caracteristicas.length > 0) {
      const faltando = caracteristicas.find((c) => !caracteristicasRespostas[c.nome]);
      if (faltando) {
        toast({
          variant: 'destructive',
          title: 'Especificação obrigatória',
          description: \`Por favor, selecione uma opção para "\${faltando.nome}".\`,
        });
        return;
      }
    }`);

// 5. In handleCreate: replace motivoFinal and createMutation.mutate
const mutateRegex = /const selectedSubtipoObj = availableSubtipos\.find\(\(s\) => s\.id === formData\.subtipo_id\);[\s\S]*?motivo_solicitacao: motivoFinal \|\| undefined,/;
content = content.replace(mutateRegex, `createMutation.mutate(
      {
        beneficiario_id: finalBeneficiarioId,
        tipo_equipamento_id: formData.tipo_equipamento_id,
        caracteristicas_solicitadas: caracteristicasRespostas,
        motivo_solicitacao: formData.motivo_solicitacao.trim() || undefined,`);

// 6. In renderSolicitacaoItem: add badges under tipoName(s)
const renderItemTitleRegex = /(<p className="font-semibold text-slate-900 text-base">\n\s+\{tipoName\(s\)\}\n\s+<\/p>\n\s+<StatusBadge status=\{s\.status\} isRecusada=\{isRecusada\} \/>\n\s+<\/div>)/;
content = content.replace(renderItemTitleRegex, `$1
            {(() => {
              const caracts = parseCaracteristicasSolicitadas(s.caracteristicas_solicitadas);
              const entries = Object.entries(caracts);
              if (entries.length === 0) return null;
              return (
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {entries.map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 rounded px-1.5 py-0.5"
                    >
                      <span className="font-semibold text-blue-900 mr-1">{k}:</span>
                      {String(v)}
                    </span>
                  ))}
                </div>
              );
            })()}`);

// 7. In Nova Solicitação: onValueChange reset caracteristicasRespostas
content = content.replace(
  `onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    tipo_equipamento_id: v === 'none' ? '' : v,
                    subtipo_id: '',
                  })
                }`,
  `onValueChange={(v) => {
                  setFormData({
                    ...formData,
                    tipo_equipamento_id: v === 'none' ? '' : v,
                  });
                  setCaracteristicasRespostas({});
                }}`
);

// 8. Replace subtipo UI block in Nova Solicitação
const subtipoUiRegex = /<div>\n\s+<Label>Subtipo de Equipamento[\s\S]*?<\/div>\n\s+<\/div>\n\s+<div className="grid grid-cols-1 md:grid-cols-2 gap-4">/;
const dynamicBlock = `{/* Características Dinâmicas */}
            {formData.tipo_equipamento_id && (
              <div className="space-y-3">
                {caracteristicasQuery.isLoading ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Carregando especificações do equipamento...</span>
                  </div>
                ) : caracteristicas.length > 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <div>
                        <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Especificações do Equipamento
                        </Label>
                        <p className="text-[11px] text-slate-500">
                          Responda às características abaixo para personalizarmos o equipamento ideal para você.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {caracteristicas.map((caract) => {
                        const valores = (caract.valores_caracteristica || []).map((v) => v.valor);
                        const currentVal = caracteristicasRespostas[caract.nome] || '';

                        return (
                          <div key={caract.id} className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                            <Label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                              <span>{caract.nome} *</span>
                              {currentVal && (
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                  {currentVal}
                                </span>
                              )}
                            </Label>
                            {valores.length <= 4 ? (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {valores.map((val) => (
                                  <Button
                                    key={val}
                                    type="button"
                                    size="sm"
                                    variant={currentVal === val ? 'default' : 'outline'}
                                    onClick={() =>
                                      setCaracteristicasRespostas((prev) => ({
                                        ...prev,
                                        [caract.nome]: val,
                                      }))
                                    }
                                    className={\`h-8 text-xs font-semibold rounded-lg transition-all \${
                                      currentVal === val
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-white hover:bg-slate-100 text-slate-700'
                                    }\`}
                                  >
                                    {val}
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <Select
                                value={currentVal || 'none'}
                                onValueChange={(v) =>
                                  setCaracteristicasRespostas((prev) => ({
                                    ...prev,
                                    [caract.nome]: v === 'none' ? '' : v,
                                  }))
                                }
                              >
                                <SelectTrigger className="bg-white h-9 text-xs">
                                  <SelectValue placeholder={\`Selecione \${caract.nome.toLowerCase()}...\`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {valores.map((val) => (
                                    <SelectItem key={val} value={val} className="text-xs">
                                      {val}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`;

content = content.replace(subtipoUiRegex, dynamicBlock);

// Restore CRLF if needed
if (hadCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync('src/pages/Solicitacoes.tsx', content, 'utf8');
console.log('Solicitacoes.tsx completely refactored');

