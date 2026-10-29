const fs = require('fs');
let content = fs.readFileSync('src/pages/Fila.tsx', 'utf8');

const hadCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

content = content.replace(
  "import { getStatusSolicitacaoUi, isBackOfficeRole, type SolicitacaoComRelacoes } from '@/types/domain';",
  "import { getStatusSolicitacaoUi, isBackOfficeRole, parseCaracteristicasSolicitadas, type SolicitacaoComRelacoes } from '@/types/domain';"
);

content = content.replace(
  `                            <p className="text-xs text-slate-500 mt-0.5">
                              #{item.protocolo || item.id.slice(0, 8)} •{' '}
                              <Calendar className="inline w-3 h-3" />{' '}
                              {moment(item.created_at).fromNow()}
                            </p>
                          </div>`,
  `                            <p className="text-xs text-slate-500 mt-0.5">
                              #{item.protocolo || item.id.slice(0, 8)} •{' '}
                              <Calendar className="inline w-3 h-3" />{' '}
                              {moment(item.created_at).fromNow()}
                            </p>
                            {(() => {
                              const caracts = parseCaracteristicasSolicitadas(item.caracteristicas_solicitadas);
                              const entries = Object.entries(caracts);
                              if (entries.length === 0) return null;
                              return (
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  {entries.map(([k, v]) => (
                                    <span
                                      key={k}
                                      className="inline-flex items-center text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/70 rounded px-1.5 py-0.5"
                                    >
                                      <span className="font-semibold mr-1">{k}:</span> {String(v)}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>`
);

if (hadCRLF) content = content.replace(/\n/g, '\r\n');

fs.writeFileSync('src/pages/Fila.tsx', content, 'utf8');
console.log('Fila.tsx updated');

