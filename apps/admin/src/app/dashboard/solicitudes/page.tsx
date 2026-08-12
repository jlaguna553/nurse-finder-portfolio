import { createClient } from '@/lib/supabase/server';
import type { RequestStatus } from '@/types';
import Link from 'next/link';

const STATUS_CONFIG: Record<RequestStatus, { label: string; classes: string }> = {
  pending:   { label: 'Pendiente',  classes: 'bg-yellow-100 text-yellow-700' },
  accepted:  { label: 'Aceptada',   classes: 'bg-blue-100 text-blue-700' },
  rejected:  { label: 'Rechazada',  classes: 'bg-red-100 text-red-700' },
  completed: { label: 'Completada', classes: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada',  classes: 'bg-slate-100 text-slate-700' },
};

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = 'all' } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('service_requests')
    .select(`
      *,
      profiles!client_id(full_name, email),
      nurse_profiles!nurse_id(profiles(full_name))
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (status !== 'all') query = query.eq('status', status);

  const { data: requests } = await query;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Solicitudes de Servicio</h1>
        <p className="text-slate-500 mt-1">Historial de todas las solicitudes en la plataforma</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'] as const).map((s) => (
          <Link
            key={s}
            href={`/dashboard/solicitudes?status=${s}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              status === s
                ? 'bg-primary-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {s === 'all' ? 'Todas' : STATUS_CONFIG[s as RequestStatus]?.label ?? s}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 font-medium text-slate-600">Cliente</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Enfermero</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Descripción</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Fecha servicio</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Total</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests?.map((req: any) => {
              const cfg = STATUS_CONFIG[req.status as RequestStatus] ?? STATUS_CONFIG.pending;
              return (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{req.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{req.profiles?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {req.nurse_profiles?.profiles?.full_name ?? <span className="text-slate-400">Sin asignar</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs">
                    <p className="truncate">{req.description ?? '—'}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {req.service_date ? new Date(req.service_date).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {req.total_cost ? `$${Number(req.total_cost).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.classes}`}>
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!requests || requests.length === 0) && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📬</p>
            <p>No hay solicitudes en este estado</p>
          </div>
        )}
      </div>
    </div>
  );
}
