import { useState, useEffect } from 'react';
import { useCeoContext } from '@/lib/CeoContext';
import { useNucleosQuery } from '@/hooks/useNucleos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Building2, Search, X } from 'lucide-react';

export default function NucleoSelectorModal({
  open,
  onOpenChange,
  forceBlocking = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forceBlocking?: boolean;
}) {
  const { setSelectedNucleusId, selectedNucleusId } = useCeoContext();
  const { data: nucleos = [], isLoading } = useNucleosQuery();
  const [searchQuery, setSearchQuery] = useState('');

  // Limpa o termo de busca sempre que o modal for aberto
  useEffect(() => {
    if (open) {
      setSearchQuery('');
    }
  }, [open]);

  // Se o modal for bloqueante e não houver núcleo selecionado, o fechamento é bloqueado
  const isBlocking = forceBlocking && !selectedNucleusId;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isBlocking) {
      return;
    }
    onOpenChange(newOpen);
  };

  const handleSelect = (id: string) => {
    setSelectedNucleusId(id);
    onOpenChange(false);
  };

  // Filtragem da lista por nome do núcleo, cidade ou sigla/nome do estado
  const filteredNucleos = nucleos.filter((nucleo) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase().trim();
    const nome = (nucleo.nome || '').toLowerCase();
    const cidade = (nucleo.cidade || '').toLowerCase();
    const estado = (nucleo.estado || '').toLowerCase();
    return nome.includes(term) || cidade.includes(term) || estado.includes(term);
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`sm:max-w-md max-h-[85vh] flex flex-col p-6 ${
          isBlocking ? '[&>button]:hidden' : ''
        }`}
        onPointerDownOutside={(e: any) => isBlocking && e.preventDefault()}
        onEscapeKeyDown={(e: any) => isBlocking && e.preventDefault()}
      >
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Building2 className="w-5 h-5 text-blue-600" />
            Selecione o Núcleo
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs sm:text-sm">
            Como CEO, você possui acesso global. Escolha qual núcleo deseja visualizar e gerenciar no momento.
          </DialogDescription>
        </DialogHeader>

        {/* Campo de Busca Sticky (Fixado no topo ao rolar a lista) */}
        <div className="sticky top-0 z-10 bg-white pt-2 pb-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar núcleo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors"
                title="Limpar busca"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Resultados com Barra de Rolagem */}
        <div className="py-2 flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">Carregando núcleos...</span>
            </div>
          ) : filteredNucleos.length === 0 ? (
            <div className="text-center p-6 text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              {nucleos.length === 0
                ? 'Nenhum núcleo encontrado no sistema.'
                : `Nenhum núcleo encontrado para "${searchQuery}".`}
            </div>
          ) : (
            filteredNucleos.map((nucleo) => {
              const isSelected = selectedNucleusId === nucleo.id;
              return (
                <Button
                  key={nucleo.id}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  className={`justify-start h-auto py-3 px-4 transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 hover:bg-blue-700 shadow-sm'
                      : 'hover:bg-blue-50/50 hover:border-blue-300 text-slate-700'
                  }`}
                  onClick={() => handleSelect(nucleo.id)}
                >
                  <div className="flex flex-col items-start text-left gap-1 w-full min-w-0">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-sm sm:text-base truncate">
                        {nucleo.nome}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-blue-500/80 text-white font-medium px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs flex items-center gap-1.5 ${
                        isSelected ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {nucleo.cidade} - {nucleo.estado}
                    </span>
                  </div>
                </Button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
