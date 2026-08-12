import { createClient } from '@/lib/supabase/server';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [
    { count: totalNurses },
    { count: pendingNurses },
    { count: approvedNurses },
    { count: totalClients },
    { count: totalRequests },
    { count: completedRequests },
  ] = await Promise.all([
    supabase.from('nurse_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('nurse_profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('nurse_profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }),
    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
  ]);

  return { totalNurses, pendingNurses, approvedNurses, totalClients, totalRequests, completedRequests };
}

const STATS_CARDS = [
  { key: 'totalNurses', label: 'Enfermeros registrados', emoji: '👩‍⚕️', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'pendingNurses', label: 'Pendientes de validación', emoji: '⏳', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', urgent: true },
  { key: 'approvedNurses', label: 'Enfermeros aprobados', emoji: '✅', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'totalClients', label: 'Clientes registrados', emoji: '👤', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'totalRequests', label: 'Solicitudes totales', emoji: '📬', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  { key: 'completedRequests', label: 'Servicios completados', emoji: '🎯', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const stats = await getStats(supabase);

  const { data: recentNurses } = await supabase
    .from('nurse_profiles')
    .select('*, profiles!nurse_profiles_id_fkey(full_name, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Resumen general de NurseFinder</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATS_CARDS.map(({ key, label, emoji, color, urgent }) => (
          <div key={key} className={`card p-6 border ${color}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{emoji}</span>
              {urgent && (stats as any)[key] > 0 && (
                <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  Acción requerida
                </span>
              )}
            </div>
            <p className="text-3xl font-bold">{(stats as any)[key] ?? 0}</p>
            <p className="text-sm mt-1 opacity-75">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending Nurses */}
      {recentNurses && recentNurses.length > 0 && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Enfermeros pendientes de validación</h2>
            <a href="/dashboard/validaciones" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Ver todos →
            </a>
          </div>
          <div className="space-y-3">
            {recentNurses.map((nurse: any) => (
              <div key={nurse.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {nurse.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'E'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{nurse.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{nurse.profiles?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {new Date(nurse.created_at).toLocaleDateString('es-CO')}
                  </span>
                  <a
                    href={`/dashboard/validaciones/${nurse.id}`}
                    className="btn-primary text-xs py-1.5"
                  >
                    Revisar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state if no pending */}
      {(!recentNurses || recentNurses.length === 0) && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">✅</p>
          <p className="text-lg font-semibold text-slate-700">Todo al día</p>
          <p className="text-slate-500 text-sm mt-1">No hay enfermeros pendientes de validación.</p>
        </div>
      )}
    </div>
  );
}
