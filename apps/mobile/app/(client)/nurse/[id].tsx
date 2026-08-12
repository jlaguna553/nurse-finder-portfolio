import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth.store';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Colors, Spacing, Radius, Shadow } from '../../../constants/colors';
import type { NurseWithLocation, Review } from '../../../types';

export default function NurseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [nurse, setNurse] = useState<NurseWithLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviews, setReviews] = useState<(Review & { reviewer?: { full_name: string | null } })[]>([]);

  // Form state
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('1');
  const [serviceDate, setServiceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    supabase
      .from('nurse_profiles')
      .select(`
        *,
        profiles!nurse_profiles_id_fkey(*),
        nurse_specializations(specializations(*))
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNurse({
            ...data,
            profile: data.profiles,
            specializations: data.nurse_specializations?.map((ns: any) => ns.specializations) ?? [],
          });
        }
        setLoading(false);
      });

    supabase
      .from('reviews')
      .select('*, profiles!reviewer_id(full_name)')
      .eq('nurse_id', id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setReviews(data as any);
      });
  }, [id]);

  const totalCost = nurse?.hourly_rate ? nurse.hourly_rate * parseInt(hours || '1') : null;

  const handleRequest = async () => {
    if (!profile || !nurse) return;
    if (!description.trim()) { Alert.alert('Error', 'Describe el servicio que necesitas.'); return; }
    if (!address.trim()) { Alert.alert('Error', 'Indica la dirección del servicio.'); return; }

    setSending(true);
    const { error } = await supabase.from('service_requests').insert({
      client_id: profile.id,
      nurse_id: nurse.id,
      description: description.trim(),
      address: address.trim(),
      hours: parseInt(hours),
      service_date: serviceDate.toISOString(),
      total_cost: totalCost,
    });
    setSending(false);

    if (error) {
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta de nuevo.');
      return;
    }

    setShowModal(false);
    Alert.alert(
      '¡Solicitud enviada! 🎉',
      `Tu solicitud fue enviada a ${nurse.profile?.full_name}. Te notificaremos cuando responda.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  if (loading || !nurse) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initials = nurse.profile?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'E';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Perfil */}
        <View style={styles.profileSection}>
          {nurse.profile?.avatar_url ? (
            <Image source={{ uri: nurse.profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.name}>{nurse.profile?.full_name}</Text>
          <Text style={styles.subtitle}>Enfermero/a Profesional</Text>

          {nurse.status === 'approved' && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Perfil Verificado</Text>
            </View>
          )}

          <View style={styles.statsRow}>
            {nurse.rating !== null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>★ {nurse.rating?.toFixed(1)}</Text>
                <Text style={styles.statLabel}>{nurse.total_reviews} reseñas</Text>
              </View>
            )}
            {nurse.years_experience !== null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{nurse.years_experience}</Text>
                <Text style={styles.statLabel}>años exp.</Text>
              </View>
            )}
            {nurse.hourly_rate !== null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>${nurse.hourly_rate?.toLocaleString()}</Text>
                <Text style={styles.statLabel}>por hora</Text>
              </View>
            )}
          </View>
        </View>

        {/* Disponibilidad */}
        <View style={styles.availabilityBar}>
          <View style={[styles.availabilityDot, nurse.is_active && styles.availabilityDotActive]} />
          <Text style={[styles.availabilityText, nurse.is_active && styles.availabilityTextActive]}>
            {nurse.is_active ? 'Disponible ahora' : 'No disponible en este momento'}
          </Text>
        </View>

        {/* Especializaciones */}
        {nurse.specializations && nurse.specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Especializaciones</Text>
            <View style={styles.specsWrap}>
              {nurse.specializations.map((s) => (
                <Badge key={s.id} label={s.name} variant="primary" />
              ))}
            </View>
          </View>
        )}

        {/* Sobre el enfermero */}
        {nurse.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre mí</Text>
            <Text style={styles.bioText}>{nurse.bio}</Text>
          </View>
        )}

        {/* Educación */}
        {nurse.education && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Formación</Text>
            <View style={styles.infoRow}>
              <Text style={{ fontSize: 18 }}>🎓</Text>
              <Text style={styles.infoText}>{nurse.education}</Text>
            </View>
            {nurse.license_number && (
              <View style={styles.infoRow}>
                <Text style={{ fontSize: 18 }}>💳</Text>
                <Text style={styles.infoText}>Tarjeta: {nurse.license_number}</Text>
              </View>
            )}
            {nurse.profile?.city && (
              <View style={styles.infoRow}>
                <Text style={{ fontSize: 18 }}>📍</Text>
                <Text style={styles.infoText}>{nurse.profile.city}</Text>
              </View>
            )}
          </View>
        )}

        {/* Reseñas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Reseñas {reviews.length > 0 ? `(${reviews.length})` : ''}
          </Text>
          {reviews.length > 0 ? (
            reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>
                    {(r as any).profiles?.full_name ?? 'Cliente'}
                  </Text>
                  <Text style={styles.reviewStars}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </Text>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                <Text style={styles.reviewDate}>
                  {new Date(r.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noReviews}>Aún no hay reseñas para este enfermero/a.</Text>
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* CTA Fijo */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => router.push(`/(client)/chat/${id}` as any)}
        >
          <Text style={styles.chatBtnText}>💬</Text>
        </TouchableOpacity>
        <Button
          title={nurse.is_active ? 'Solicitar servicio' : 'No disponible'}
          onPress={() => nurse.is_active && setShowModal(true)}
          disabled={!nurse.is_active}
          size="lg"
          style={{ flex: 1 }}
        />
      </View>

      {/* Modal de solicitud */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Solicitar Servicio</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.nursePreview}>
              <Text style={styles.nursePreviewName}>{nurse.profile?.full_name}</Text>
              {totalCost && <Text style={styles.nursePreviewRate}>Total estimado: ${totalCost.toLocaleString()}</Text>}
            </View>

            <Input
              label="Descripción del servicio *"
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Cuidado de adulto mayor postoperatorio, administración de medicamentos..."
              multiline
              numberOfLines={3}
              style={{ minHeight: 80 }}
              textAlignVertical="top"
            />

            <Input
              label="Dirección del servicio *"
              value={address}
              onChangeText={setAddress}
              placeholder="Calle, número, barrio, ciudad"
            />

            <Input
              label="Horas de servicio"
              value={hours}
              onChangeText={setHours}
              keyboardType="numeric"
              placeholder="1"
              hint={totalCost ? `Total estimado: $${totalCost.toLocaleString()} COP` : undefined}
            />

            <TouchableOpacity
              style={styles.datePicker}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerLabel}>Fecha del servicio</Text>
              <Text style={styles.datePickerValue}>
                📅 {serviceDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={serviceDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, date) => { setShowDatePicker(false); if (date) setServiceDate(date); }}
              />
            )}

            <Button
              title="Enviar solicitud"
              onPress={handleRequest}
              loading={sending}
              style={{ marginTop: Spacing.lg }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  backText: { fontSize: 20, color: Colors.text },
  profileSection: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  avatar: { width: 110, height: 110, borderRadius: Radius.full, marginBottom: Spacing.md },
  avatarFallback: { width: 110, height: 110, borderRadius: Radius.full, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarInitials: { fontSize: 40, fontWeight: '700', color: Colors.primary },
  name: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm },
  verifiedBadge: { backgroundColor: Colors.secondaryLight, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full, marginBottom: Spacing.md },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  statsRow: { flexDirection: 'row', gap: Spacing.xxl, marginTop: Spacing.md },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary },
  availabilityBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, marginHorizontal: Spacing.xl,
    borderRadius: Radius.lg, marginBottom: Spacing.md, ...Shadow.sm,
  },
  availabilityDot: { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.textMuted },
  availabilityDotActive: { backgroundColor: Colors.secondary },
  availabilityText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  availabilityTextActive: { color: Colors.secondary },
  section: { marginHorizontal: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  specsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  bioText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  infoText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  cta: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.xl, backgroundColor: Colors.surface, ...Shadow.md },
  chatBtn: { width: 50, height: 50, borderRadius: Radius.full, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.primary },
  chatBtnText: { fontSize: 22 },
  reviewCard: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  reviewStars: { fontSize: 13, color: Colors.warning },
  reviewComment: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 4 },
  reviewDate: { fontSize: 11, color: Colors.textMuted },
  noReviews: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  closeBtn: { fontSize: 20, color: Colors.textSecondary, padding: 4 },
  modalContent: { padding: Spacing.xl },
  nursePreview: { backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl },
  nursePreviewName: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark, marginBottom: 4 },
  nursePreviewRate: { fontSize: 14, color: Colors.primaryDark },
  datePicker: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.lg },
  datePickerLabel: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 6 },
  datePickerValue: { fontSize: 15, color: Colors.text },
});
