import { Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsuariosAdminTab from '@/components/admin/UsuariosAdminTab';
import NucleosAdminTab from '@/components/admin/NucleosAdminTab';

export default function AdminPanel() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Painel Administrativo
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os níveis de acesso de todos os colaboradores, registre novos membros e administre os Núcleos de Atendimento.
          </p>
        </div>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="mb-6 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="usuarios" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Usuários e Permissões
          </TabsTrigger>
          <TabsTrigger value="nucleos" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Núcleos de Atendimento
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="usuarios" className="mt-0">
          <UsuariosAdminTab />
        </TabsContent>
        
        <TabsContent value="nucleos" className="mt-0">
          <NucleosAdminTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
