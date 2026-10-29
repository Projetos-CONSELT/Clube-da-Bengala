const fs = require('fs');
let content = fs.readFileSync('src/pages/TriagemNucleo.tsx', 'utf8');

// 1. Remove import getSubtiposTipo, SubtipoEquipamento
content = content.replace(/  getSubtiposTipo,\r?\n/, '');
content = content.replace(/  type SubtipoEquipamento,\r?\n/, '');

// 2. Remove selectedSubtipoId state
content = content.replace(/  const \[selectedSubtipoId, setSelectedSubtipoId\] = useState<string>\(''\);\r?\n/, '');

// 3. Remove subtiposDisponiveis and subtipoSelecionadoObj
const subtiposDisponiveisRegex = /  \/\/ Lista de subtipos disponíveis do Tipo selecionado[\s\S]*?\}, \[subtiposDisponiveis, selectedSubtipoId\]\);\r?\n/;
content = content.replace(subtiposDisponiveisRegex, '');

// 4. In handleAbrirAvaliacao:
content = content.replace(
  `    // Pré-selecionar o primeiro tipo se disponível
    if (tiposEquipamento.length > 0) {
      const primeiroTipo = tiposEquipamento[0];
      setSelectedTipoId(primeiroTipo.id);
      const sub = getSubtiposTipo(primeiroTipo.schema_especificacoes);
      setSelectedSubtipoId(sub.length > 0 ? sub[0].id : '');
    } else {
      setSelectedTipoId('');
      setSelectedSubtipoId('');
    }`,
  `    if (tiposEquipamento.length > 0) {
      setSelectedTipoId(tiposEquipamento[0].id);
    } else {
      setSelectedTipoId('');
    }`
);

// 5. In handleTipoChange:
content = content.replace(
  `  const handleTipoChange = (tipoId: string) => {
    setSelectedTipoId(tipoId);
    const tipo = tiposEquipamento.find((t) => t.id === tipoId);
    const subs = tipo ? getSubtiposTipo(tipo.schema_especificacoes) : [];
    setSelectedSubtipoId(subs.length > 0 ? subs[0].id : '');
  };`,
  `  const handleTipoChange = (tipoId: string) => {
    setSelectedTipoId(tipoId);
  };`
);

// 6. In handleAprovarDoacao:
content = content.replace(
  `      const tipo = tiposEquipamento.find((t) => t.id === selectedTipoId);
      const subtipo = subtiposDisponiveis.find((s) => s.id === selectedSubtipoId);

      const novoEquipamento = {
        codigo_patrimonio: codigoPatrimonio.trim() || generateCodigoPatrimonio(),
        tipo_id: selectedTipoId,
        status: 'disponivel' as const,
        estado_conservacao: estadoConservacao || 'Bom',
        atributos_especificos: {
          subtipo_id: selectedSubtipoId || undefined,
          subtipo_nome: subtipo?.nome || undefined,
          origem: 'doacao',`,
  `      const novoEquipamento = {
        codigo_patrimonio: codigoPatrimonio.trim() || generateCodigoPatrimonio(),
        tipo_id: selectedTipoId,
        status: 'disponivel' as const,
        estado_conservacao: estadoConservacao || 'Bom',
        atributos_especificos: {
          origem: 'doacao',`
);

// 7. Remove UI for Subtipo from modal
const subtipoUiRegex = /\r?\n                \{\/\* Select: Subtipo de Equipamento \*\/\}[\s\S]*?\{\/\* Código de Patrimônio Gerado \*\/\}/;
content = content.replace(subtipoUiRegex, '\r\n                {/* Código de Patrimônio Gerado */}');

fs.writeFileSync('src/pages/TriagemNucleo.tsx', content, 'utf8');
console.log('TriagemNucleo.tsx cleaned up');

