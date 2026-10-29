const fs = require('fs');
let content = fs.readFileSync('src/pages/Solicitacoes.tsx', 'utf8');

const hadCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Remove subtipo_id: '', from formData initial state
content = content.replace(
  `    tipo_equipamento_id: '',
    subtipo_id: '',
    motivo_solicitacao: '',`,
  `    tipo_equipamento_id: '',
    motivo_solicitacao: '',`
);

// 2. Replace lines 1839-1870 (the subtipo block) with dynamic characteristics block
const subtipoBlock = `            <div>
              <Label>Subtipo de Equipamento {availableSubtipos.length > 0 ? '*' : ''}</Label>
              {availableSubtipos.length > 0 ? (
                <Select
                  value={formData.subtipo_id || 'none'}
                  onValueChange={(v) =>
                    setFormData({ ...formData, subtipo_id: v === 'none' ? '' : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o subtipo de equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubtipos.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  disabled
                  value={
                    formData.tipo_equipamento_id
                      ? 'Nenhum subtipo específico cadastrado'
                      : 'Selecione primeiro o tipo de equipamento'
                  }
                  className="bg-slate-50 text-slate-500 text-xs cursor-not-allowed"
                />
              )}
            </div>`;

const dynamicBlock = `            {/* Características Dinâmicas do Equipamento */}
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
            )}`;

content = content.replace(subtipoBlock, dynamicBlock);

if (hadCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync('src/pages/Solicitacoes.tsx', content, 'utf8');
console.log('Final clean of subtipo from Solicitacoes.tsx done');

