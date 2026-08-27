import { useEffect } from 'react';
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
import { Loader2, MapPin, Building2 } from 'lucide-react';

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

  // If forceBlocking is true, they can't close the modal if they haven't selected one
  const handleOpenChange = (newOpen: boolean) => {
    if (forceBlocking && !selectedNucleusId) {
      return;
    }
    onOpenChange(newOpen);
  };

  const handleSelect = (id: string) => {
    setSelectedNucleusId(id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e: any) => forceBlocking && !selectedNucleusId && e.preventDefault()} onEscapeKeyDown={(e: any) => forceBlocking && !selectedNucleusId && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Selecione o Núcleo
          </DialogTitle>
          <DialogDescription>
            Como CEO, você possui acesso global. Escolha qual núcleo deseja visualizar e gerenciar no momento.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : nucleos.length === 0 ? (
            <div className="text-center p-4 text-sm text-slate-500">
              Nenhum núcleo encontrado no sistema.
            </div>
          ) : (
            nucleos.map((nucleo) => (
              <Button
                key={nucleo.id}
                variant={selectedNucleusId === nucleo.id ? 'default' : 'outline'}
                className={`justify-start h-auto py-3 px-4 ${
                  selectedNucleusId === nucleo.id ? 'bg-blue-600 ring-2 ring-blue-600 ring-offset-2' : ''
                }`}
                onClick={() => handleSelect(nucleo.id)}
              >
                <div className="flex flex-col items-start text-left gap-1">
                  <span className="font-semibold text-base">{nucleo.nome}</span>
                  <span className={`text-xs flex items-center gap-1 ${selectedNucleusId === nucleo.id ? 'text-blue-100' : 'text-slate-500'}`}>
                    <MapPin className="w-3 h-3" />
                    {nucleo.cidade} - {nucleo.estado}
                  </span>
                </div>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
