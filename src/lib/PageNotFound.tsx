import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);
  const { user, role, authChecked } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-7xl font-light text-slate-300">404</h1>
            <div className="h-0.5 w-16 bg-slate-200 mx-auto" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-medium text-slate-800">Página não encontrada</h2>
            <p className="text-slate-600 leading-relaxed">
              A página <span className="font-medium text-slate-700">&quot;{pageName}&quot;</span> não
              existe nesta aplicação.
            </p>
          </div>

          {authChecked && user && role === 'gerente' && (
            <div className="mt-8 p-4 bg-slate-100 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600 leading-relaxed">
                Verifique se a rota está registrada em pages.config.ts.
              </p>
            </div>
          )}

          <div className="pt-6">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
