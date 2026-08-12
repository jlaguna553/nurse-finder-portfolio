import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DOCUMENT_TYPE_LABELS } from '@/types';
import { ValidationActions } from './ValidationActions';
import { NurseChat } from './NurseChat';

export default async function NurseValidationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: nurse } = await supabase
    .from('nurse_profiles')
    .select(`
      *,
      profiles!nurse_profiles_id_fkey(*),
      nurse_documents(*),
      nurse_specializations(specializations(*))
    `)
    .eq('id', id)
    .single();

  if (!nurse) notFound();

  const specializations = nurse.nurse_specializations?.map((ns: any) => ns.specializations) ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/validaciones" className="text-slate-500 hover:text-slate-700 text-sm">
          ← Validaciones
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">{nurse.profiles?.full_name}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Columna izquierda: Info del perfil */}
        <div className="col-span-2 space-y-6">
          {/* Información personal */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Información Personal</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nombre completo', value: nurse.profiles?.full_name },
                { label: 'Correo electrónico', value: nurse.profiles?.email },
                { label: 'Teléfono', value: nurse.profiles?.phone },
                { label: 'Ciudad', value: nurse.profiles?.city },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                  <p className="text-sm text-slate-900">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Información profesional */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Información Profesional</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { label: 'Tarjeta profesional', value: nurse.license_number },
                { label: 'Años de experiencia', value: nurse.years_experience ? `${nurse.years_experience} años` : null },
                { label: 'Formación', value: nurse.education },
                { label: 'Tarifa por hora', value: nurse.hourly_rate ? `$${Number(nurse.hourly_rate).toLocaleString()} COP` : null },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                  <p className="text-sm text-slate-900">{value ?? '—'}</p>
                </div>
              ))}
            </div>

            {nurse.bio && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Biografía</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{nurse.bio}</p>
              </div>
            )}

            {specializations.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Especializaciones</p>
                <div className="flex flex-wrap gap-2">
                  {specializations.map((s: any) => (
                    <span key={s.id} className="bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1 rounded-full">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Documentos */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Documentos Subidos</h2>
            {nurse.nurse_documents && nurse.nurse_documents.length > 0 ? (
              <div className="space-y-3">
                {nurse.nurse_documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-primary-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {doc.document_type === 'title' ? '🎓' : doc.document_type === 'license' ? '💳' : doc.document_type === 'id' ? '🪪' : '📄'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {DOCUMENT_TYPE_LABELS[doc.document_type as keyof typeof DOCUMENT_TYPE_LABELS] ?? doc.document_type}
                        </p>
                        <p className="text-xs text-slate-500">{doc.document_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                        doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {doc.status === 'approved' ? 'Aprobado' : doc.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                      <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/nurse-documents/${doc.storage_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                      >
                        Ver →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">No hay documentos subidos aún</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Acciones */}
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Estado actual</h3>
            <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold mb-4 ${
              nurse.status === 'approved' ? 'bg-green-100 text-green-700' :
              nurse.status === 'rejected' ? 'bg-red-100 text-red-700' :
              nurse.status === 'suspended' ? 'bg-slate-100 text-slate-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {nurse.status === 'approved' ? '✅ Aprobado' :
               nurse.status === 'rejected' ? '❌ Rechazado' :
               nurse.status === 'suspended' ? '⛔ Suspendido' :
               '⏳ En revisión'}
            </span>

            {nurse.rejection_reason && (
              <div className="bg-red-50 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-red-700 mb-1">Motivo de rechazo:</p>
                <p className="text-xs text-red-600">{nurse.rejection_reason}</p>
              </div>
            )}

            {nurse.reviewed_at && (
              <p className="text-xs text-slate-400 mb-4">
                Revisado el {new Date(nurse.reviewed_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}

            <ValidationActions nurseId={nurse.id} currentStatus={nurse.status} />
          </div>

          {/* Chat en tiempo real */}
          <NurseChat nurseId={nurse.id} nurseName={nurse.profiles?.full_name ?? 'Enfermero/a'} />

          {/* Info rápida */}
          <div className="card p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Registro</h4>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Fecha de registro:</span>
                <span className="font-medium text-slate-700">
                  {new Date(nurse.created_at).toLocaleDateString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Documentos:</span>
                <span className="font-medium text-slate-700">{nurse.nurse_documents?.length ?? 0} subidos</span>
              </div>
              <div className="flex justify-between">
                <span>Calificación:</span>
                <span className="font-medium text-slate-700">
                  {nurse.rating ? `★ ${nurse.rating}` : 'Sin reseñas'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
