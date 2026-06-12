import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const AccessDenied = () => {
  const { role, logout } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-100">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v.01M4.93 19h14.14c1.54 0 2.5-1.667 1.73-3L13.73 5c-.77-1.333-2.69-1.333-3.46 0L3.2 16c-.77 1.333.19 3 1.73 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso negado</h1>
          <p className="text-slate-600 mb-6">
            Sua conta {role ? <span className="font-medium">({role})</span> : null} não tem permissão para acessar esta área.
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button>
            <Button onClick={logout} variant="destructive">Sair</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
