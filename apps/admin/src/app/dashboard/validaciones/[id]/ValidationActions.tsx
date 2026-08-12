'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { NurseStatus } from '@/types';

interface ValidationActionsProps {
  nurseId: string;
  currentStatus: NurseStatus;
}

export function ValidationActions({ nurseId, currentStatus }: ValidationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const updateStatus = async (status: NurseStatus, reason?: string) => {
    setLoading(status);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('nurse_profiles').update({
      status,
      rejection_reason: reason ?? null,
      admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq('id', nurseId);

    setLoading(null);

    if (error) {
      alert(`Error al actualizar: ${error.message}`);
      return;
    }

    router.refresh();
    router.push(`/dashboard/validaciones?status=${status}`);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notas internas (opcional)</label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Observaciones para el equipo..."
          rows={3}
          className="input text-xs"
        />
      </div>

      {/* Aprobar */}
      {currentStatus !== 'approved' && (
        <button
          onClick={() => updateStatus('approved')}
          disabled={loading !== null}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading === 'approved' ? 'Aprobando...' : '✅ Aprobar perfil'}
        </button>
      )}

      {/* Suspender */}
      {currentStatus === 'approved' && (
        <button
          onClick={() => updateStatus('suspended')}
          disabled={loading !== null}
          className="btn-secondary w-full"
        >
          {loading === 'suspended' ? 'Suspendiendo...' : '⛔ Suspender'}
        </button>
      )}

      {/* Rechazar */}
      {currentStatus !== 'rejected' && (
        <>
          {!showRejectForm ? (
            <button
              onClick={() => setShowRejectForm(true)}
              className="btn-danger w-full"
            >
              ❌ Rechazar perfil
            </button>
          ) : (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
              <label className="block text-xs font-medium text-red-700">
                Motivo del rechazo (requerido)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica por qué se rechaza el perfil..."
                rows={3}
                className="input text-xs border-red-300 focus:ring-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!rejectionReason.trim()) return;
                    updateStatus('rejected', rejectionReason.trim());
                  }}
                  disabled={!rejectionReason.trim() || loading !== null}
                  className="btn-danger flex-1 text-sm"
                >
                  {loading === 'rejected' ? 'Rechazando...' : 'Confirmar rechazo'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reactivar si estaba rechazado o suspendido */}
      {(currentStatus === 'rejected' || currentStatus === 'suspended') && (
        <button
          onClick={() => updateStatus('pending')}
          disabled={loading !== null}
          className="btn-outline w-full"
        >
          {loading === 'pending' ? 'Actualizando...' : '🔄 Volver a pendiente'}
        </button>
      )}
    </div>
  );
}
