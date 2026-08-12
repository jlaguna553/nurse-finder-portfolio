import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Spacing, Radius, Shadow } from '../../constants/colors';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { ServiceRequest } from '../../types';

const STATUS_LABEL: Record<string, { label: string; variant: 'primary' | 'warning' | 'success' | 'error' | 'neutral' }> = {
  pending:   { label: 'Pendiente',  variant: 'warning' },
  accepted:  { label: 'Aceptada',   variant: 'primary' },
  rejected:  { label: 'Rechazada',  variant: 'error' },
  completed: { label: 'Completada', variant: 'success' },
  cancelled: { label: 'Cancelada',  variant: 'neutral' },
};

export default function ClientRequests() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ requestId: string; nurseId: string; nurseName: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const fetchRequests = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('service_requests')
      .select(`*, nurse_profiles(*, profiles!nurse_profiles_id_fkey(*))`)
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setRequests(data as any);

    // Verificar cuáles ya tienen reseña
    const { data: myReviews } = await supabase
      .from('reviews')
      .select('request_id')
      .eq('reviewer_id', profile.id);
    if (myReviews) setReviewed(new Set(myReviews.map((r) => r.request_id)));
  }, [profile]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  const cancelRequest = (id: string) => {
    Alert.alert('Cancelar solicitud', '¿Deseas cancelar esta solicitud?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('service_requests').update({ status: 'cancelled' }).eq('id', id);
          fetchRequests();
        },
      },
    ]);
  };

  const submitReview = async () => {
    if (!reviewModal || !profile) return;
    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      request_id: reviewModal.requestId,
      reviewer_id: profile.id,
      nurse_id: reviewModal.nurseId,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', 'No se pudo enviar la reseña.');
      return;
    }
    setReviewed((prev) => new Set([...prev, reviewModal.requestId]));
    setReviewModal(null);
    setComment('');
    setRating(5);
    Alert.alert('¡Gracias!', 'Tu reseña fue enviada correctamente.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Solicitudes</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {requests.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Sin solicitudes</Text>
            <Text style={styles.emptyText}>Busca un enfermero en el mapa y solicita un servicio.</Text>
          </View>
        )}
        {requests.map((req) => {
          const nurse = (req as any).nurse_profiles;
          const nurseName = nurse?.profiles?.full_name ?? 'Enfermero/a';
          const status = STATUS_LABEL[req.status] ?? STATUS_LABEL.pending;
          const alreadyReviewed = reviewed.has(req.id);
          return (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.nurseName}>{nurseName}</Text>
                <Badge label={status.label} variant={status.variant} />
              </View>
              {req.description && <Text style={styles.desc} numberOfLines={2}>{req.description}</Text>}
              <View style={styles.details}>
                {req.service_date && (
                  <Text style={styles.detail}>📅 {new Date(req.service_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</Text>
                )}
                {req.address && <Text style={styles.detail} numberOfLines={1}>📍 {req.address}</Text>}
                {req.total_cost && <Text style={styles.detail}>💰 ${req.total_cost.toLocaleString()} COP</Text>}
              </View>

              <View style={styles.actions}>
                {nurse?.id && (
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => router.push(`/(client)/chat/${nurse.id}` as any)}
                  >
                    <Text style={styles.chatBtnText}>💬 Chat</Text>
                  </TouchableOpacity>
                )}
                {req.status === 'completed' && !alreadyReviewed && nurse?.id && (
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => setReviewModal({ requestId: req.id, nurseId: nurse.id, nurseName })}
                  >
                    <Text style={styles.reviewBtnText}>⭐ Dejar reseña</Text>
                  </TouchableOpacity>
                )}
                {req.status === 'completed' && alreadyReviewed && (
                  <Text style={styles.reviewedText}>✓ Reseña enviada</Text>
                )}
                {req.status === 'pending' && (
                  <TouchableOpacity onPress={() => cancelRequest(req.id)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>Cancelar solicitud</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modal de reseña */}
      <Modal visible={!!reviewModal} animationType="slide" presentationStyle="pageSheet" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Calificar a {reviewModal?.nurseName}</Text>

            {/* Estrellas */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {rating === 1 ? 'Muy malo' : rating === 2 ? 'Malo' : rating === 3 ? 'Regular' : rating === 4 ? 'Bueno' : 'Excelente'}
            </Text>

            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Escribe tu comentario (opcional)..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                onPress={() => { setReviewModal(null); setComment(''); setRating(5); }}
                variant="ghost"
                fullWidth={false}
                style={{ flex: 1 }}
              />
              <Button
                title="Enviar reseña"
                onPress={submitReview}
                loading={submitting}
                fullWidth={false}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  list: { paddingHorizontal: Spacing.xl },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  nurseName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1, marginRight: Spacing.sm },
  desc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  details: { gap: 4 },
  detail: { fontSize: 12, color: Colors.textMuted },
  actions: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  chatBtn: { paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.primaryLight, alignItems: 'center' },
  chatBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  reviewBtn: { paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: '#FEF3C7', alignItems: 'center' },
  reviewBtnText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  reviewedText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic' },
  cancelBtn: { alignItems: 'center' },
  cancelText: { fontSize: 13, fontWeight: '600', color: Colors.error },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: Spacing.lg },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  star: { fontSize: 40, color: Colors.border },
  starActive: { color: Colors.warning },
  ratingLabel: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  commentInput: { backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md, fontSize: 14, color: Colors.text, minHeight: 90, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', gap: Spacing.md },
});
