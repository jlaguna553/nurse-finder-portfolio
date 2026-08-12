import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { NurseStatus } from '@/types';

export const dynamic = 'force-dynamic';

const STATUS_CONFIG: Record<NurseStatus, { label: string; classes: string }> = {
  pending:   { label: 'En revisión',  classes: 'bg-yellow-100 text-yellow-700' },
  approved:  { label: 'Aprobado',     classes: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rechazado',    classes: 'bg-red-100 text-red-700' },
  suspended: { label: 'Suspendido',   classes: 'bg-slate-100 text-slate-700' },
};

export default async function ValidacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = 'pending' } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('nurse_profiles')
    .select(`
      *,
      profiles!nurse_profiles_id_fkey(full_name, email, phone, city),
      nurse_documents(id, document_type, status)
    `)
    .order('created_at', { ascending: false });

  if (status !== 'all') query = query.eq('status', status);

  const { data: nurses, error } = await query;
  if (error) console.error('Validaciones query error:', error);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Validaciones</h1>
        <p className="text-slate-500 mt-1">Revisa y aprueba los perfiles de los enfermeros</p>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'pending', label: 'Pendientes' },
          { key: 'approved', label: 'Aprobados' },
          { key: 'rejected', label: 'Rechazados' },
          { key: 'suspended', label: 'Suspendidos' },
          { key: 'all', label: 'Todos' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/validaciones?status=${tab.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === tab.key
                ? 'bg-primary-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 font-medium text-slate-600">Enfermero/a</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Ciudad</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Licencia</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Documentos</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Fecha</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {nurses?.map((nurse: any) => {
              const cfg = STATUS_CONFIG[nurse.status as NurseStatus];
              const totalDocs = nurse.nurse_documents?.length ?? 0;
              const approvedDocs = nurse.nurse_documents?.filter((d: any) => d.status === 'approved').length ?? 0;
              return (
                <tr key={nurse.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{nurse.profiles?.full_name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{nurse.profiles?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{nurse.profiles?.city ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{nurse.license_number ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium ${totalDocs === 0 ? 'text-red-600' : approvedDocs === totalDocs ? 'text-green-600' : 'text-yellow-600'}`}>
                      {approvedDocs}/{totalDocs} docs
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.classes}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(nurse.created_at).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/validaciones/${nurse.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-xs"
                    >
                      Revisar →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!nurses || nurses.length === 0) && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p>No hay perfiles en este estado</p>
          </div>
        )}
      </div>
    </div>
  );
}
