import { createClient } from '@/lib/supabase/server';

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-500 mt-1">{clients?.length ?? 0} clientes registrados</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 font-medium text-slate-600">Nombre</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Correo</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Teléfono</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Ciudad</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients?.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold">
                      {client.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'}
                    </div>
                    <span className="font-medium text-slate-900">{client.full_name ?? '—'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{client.email}</td>
                <td className="px-6 py-4 text-slate-600">{client.phone ?? '—'}</td>
                <td className="px-6 py-4 text-slate-600">{client.city ?? '—'}</td>
                <td className="px-6 py-4 text-xs text-slate-400">
                  {new Date(client.created_at).toLocaleDateString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!clients || clients.length === 0) && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">👤</p>
            <p>No hay clientes registrados aún</p>
          </div>
        )}
      </div>
    </div>
  );
}
