const fs = require('fs');
let content = fs.readFileSync('src/pages/Solicitacoes.tsx', 'utf8');

// 1. Update imports
content = content.replace(
  "  getStatusSolicitacaoUi,\n  getSubtiposTipo,\n  isBackOfficeRole,",
  "  getStatusSolicitacaoUi,\n  parseCaracteristicasSolicitadas,\n  isBackOfficeRole,"
);
content = content.replace(
  "  getStatusSolicitacaoUi,\r\n  getSubtiposTipo,\r\n  isBackOfficeRole,",
  "  getStatusSolicitacaoUi,\r\n  parseCaracteristicasSolicitadas,\r\n  isBackOfficeRole,"
);

// Add useCaracteristicasByTipoQuery import
content = content.replace(
  "import { useEquipamentosQuery, useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';",
  "import { useEquipamentosQuery, useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';\nimport { useCaracteristicasByTipoQuery } from '@/hooks/useEquipamentos';"
);

// 2. In DadosSolicitacaoTab, add parsed caracteristicas_solicitadas
const tipoSection = `      <div>
        <p className="text-sm text-slate-500">Tipo de Equipamento</p>
        <p className="font-medium">{tipoName(solicitacao)}</p>
      </div>`;

const tipoSectionReplacement = `      <div>
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
      })()}`;

content = content.replace(tipoSection, tipoSectionReplacement);

// 3. In Solicitacoes component, remove subtipo_id from formData and add caracteristicasRespostas
content = content.replace(
  `    tipo_equipamento_id: '',
    subtipo_id: '',
    motivo_solicitacao: '',`,
  `    tipo_equipamento_id: '',
    motivo_solicitacao: '',`
);

content = content.replace(
  `  const availableSubtipos = useMemo(() => {
    if (!formData.tipo_equipamento_id) return [];
    const tipoObj = tipos.find((t) => t.id === formData.tipo_equipamento_id);
    return tipoObj ? getSubtiposTipo(tipoObj.schema_especificacoes) : [];
  }, [tipos, formData.tipo_equipamento_id]);`,
  `  const [caracteristicasRespostas, setCaracteristicasRespostas] = useState<Record<string, string>>({});
  const caracteristicasQuery = useCaracteristicasByTipoQuery(formData.tipo_equipamento_id || null);
  const caracteristicas = caracteristicasQuery.data ?? [];`
);

// 4. In openNewModal:
content = content.replace(
  `setFormData({ beneficiario_id: '', tipo_equipamento_id: '', subtipo_id: '', motivo_solicitacao: '', como_conheceu: '', tempo_estimado_meses: '', aceitou_termos: false });`,
  `setFormData({ beneficiario_id: '', tipo_equipamento_id: '', motivo_solicitacao: '', como_conheceu: '', tempo_estimado_meses: '', aceitou_termos: false });\n    setCaracteristicasRespostas({});`
);

// 5. In handleCreate:
content = content.replace(
  `    if (availableSubtipos.length > 0 && !formData.subtipo_id) {
      toast({ variant: 'destructive', title: 'Selecione o subtipo de equipamento' });
      return;
    }`,
  `    if (caracteristicas.length > 0) {
      const faltando = caracteristicas.find((c) => !caracteristicasRespostas[c.nome]);
      if (faltando) {
        toast({
          variant: 'destructive',
          title: 'Característica obrigatória',
          description: \`Por favor, selecione uma opção para "\${faltando.nome}".\`,
        });
        return;
      }
    }`
);

content = content.replace(
  `    const selectedSubtipoObj = availableSubtipos.find((s) => s.id === formData.subtipo_id);
    const motivoFinal = selectedSubtipoObj
      ? \`[Subtipo: \${selectedSubtipoObj.nome}] \${formData.motivo_solicitacao.trim()}\`.trim()
      : formData.motivo_solicitacao.trim();

    createMutation.mutate(
      {
        beneficiario_id: finalBeneficiarioId,
        tipo_equipamento_id: formData.tipo_equipamento_id,
        motivo_solicitacao: motivoFinal || undefined,`,
  `    createMutation.mutate(
      {
        beneficiario_id: finalBeneficiarioId,
        tipo_equipamento_id: formData.tipo_equipamento_id,
        caracteristicas_solicitadas: caracteristicasRespostas,
        motivo_solicitacao: formData.motivo_solicitacao.trim() || undefined,`
);

// 6. In renderSolicitacaoItem:
content = content.replace(
  `              <p className="font-semibold text-slate-900 text-base">
                {tipoName(s)}
              </p>
              <StatusBadge status={s.status} isRecusada={isRecusada} />
            </div>`,
  `              <p className="font-semibold text-slate-900 text-base">
                {tipoName(s)}
              </p>
              <StatusBadge status={s.status} isRecusada={isRecusada} />
            </div>
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
            })()}`
);

// 7. In Nova Solicitação Dialog:
content = content.replace(
  `                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    tipo_equipamento_id: v === 'none' ? '' : v,
                    subtipo_id: '',
                  })
                }`,
  `                onValueChange={(v) => {
                  setFormData({
                    ...formData,
                    tipo_equipamento_id: v === 'none' ? '' : v,
                  });
                  setCaracteristicasRespostas({});
                }}`
);

// Replace subtipo block with dynamic characteristics block
const subtipoBlockRegex = /            <div>\r?\n              <Label>Subtipo de Equipamento[\s\S]*?<\/div>\r?\n            <\/div>\r?\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">/;

const dynamicCharacteristicsBlock = `            {/* Características Dinâmicas */}
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
                                  Selecionado: {currentVal}
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

content = content.replace(subtipoBlockRegex, dynamicCharacteristicsBlock);

// 8. In button disabled check:
content = content.replace(
  `(availableSubtipos.length > 0 && !formData.subtipo_id) ||`,
  `(caracteristicas.length > 0 && caracteristicas.some((c) => !caracteristicasRespostas[c.nome])) ||`
);

fs.writeFileSync('src/pages/Solicitacoes.tsx', content, 'utf8');
console.log('Solicitacoes.tsx updated');

