import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EnfermerosPage() {
  const supabase = await createClient();

  const { data: nurses, error } = await supabase
    .from('nurse_profiles')
    .select(`
      *,
      profiles!nurse_profiles_id_fkey(full_name, email, phone, city),
      nurse_specializations(specializations(name))
    `)
    .eq('status', 'approved')
    .order('rating', { ascending: false });

  if (error) console.error('Enfermeros query error:', error);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Enfermeros Aprobados</h1>
        <p className="text-slate-500 mt-1">{nurses?.length ?? 0} enfermeros activos en la plataforma</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {nurses?.map((nurse: any) => {
          const specializations = nurse.nurse_specializations?.map((ns: any) => ns.specializations?.name).filter(Boolean) ?? [];
          return (
            <div key={nurse.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
                    {nurse.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'E'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{nurse.profiles?.full_name ?? '—'}</p>
                      {nurse.is_active && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{nurse.profiles?.email}</p>
                    <p className="text-sm text-slate-500">{nurse.profiles?.city ?? '—'}</p>

                    {specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {specializations.slice(0, 3).map((s: string) => (
                          <span key={s} className="bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                        {specializations.length > 3 && (
                          <span className="text-xs text-slate-400">+{specializations.length - 3} más</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold text-slate-900">{nurse.rating?.toFixed(1) ?? '—'}</span>
                    <span className="text-xs text-slate-400">({nurse.total_reviews})</span>
                  </div>
                  <p className="text-sm font-medium text-primary-600">
                    {nurse.hourly_rate ? `$${Number(nurse.hourly_rate).toLocaleString()}/h` : '—'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{nurse.years_experience ? `${nurse.years_experience} años exp.` : ''}</p>
                  <div className="mt-3">
                    <Link
                      href={`/dashboard/validaciones/${nurse.id}`}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Ver perfil →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {(!nurses || nurses.length === 0) && (
          <div className="card p-16 text-center text-slate-400">
            <p className="text-4xl mb-3">👩‍⚕️</p>
            <p className="font-medium">No hay enfermeros aprobados aún</p>
          </div>
        )}
      </div>
    </div>
  );
}
