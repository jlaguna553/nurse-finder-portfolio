import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius, Shadow } from '../../constants/colors';
import { Badge } from '../../components/ui/Badge';
import type { NurseStatus, ServiceRequest } from '../../types';

const STATUS_CONFIG: Record<NurseStatus, { label: string; color: string; bg: string; emoji: string; desc: string }> = {
  pending: { label: 'En revisión', color: Colors.warning, bg: Colors.warningLight, emoji: '⏳', desc: 'Tu perfil está siendo revisado por nuestro equipo. Te notificaremos pronto.' },
  approved: { label: 'Aprobado', color: Colors.success, bg: Colors.successLight, emoji: '✅', desc: 'Tu perfil está activo. Puedes activar tu disponibilidad para recibir solicitudes.' },
  rejected: { label: 'Rechazado', color: Colors.error, bg: Colors.errorLight, emoji: '❌', desc: 'Tu perfil fue rechazado. Revisa los comentarios del administrador.' },
  suspended: { label: 'Suspendido', color: Colors.textMuted, bg: Colors.border, emoji: '⛔', desc: 'Tu perfil ha sido suspendido temporalmente. Contacta soporte.' },
};

export default function NurseDashboard() {
  const { profile, nurseProfile, fetchProfile } = useAuthStore();
  const { startSharingLocation, stopSharingLocation } = useLocation();
  const router = useRouter();
  const [isActive, setIsActive] = useState(nurseProfile?.is_active ?? false);
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('service_requests')
      .select('*, profiles!client_id(*)')
      .eq('nurse_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentRequests(data as any);
  }, [profile]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (profile) await fetchProfile(profile.id);
    await fetchRequests();
    setRefreshing(false);
  }, [profile, fetchProfile, fetchRequests]);

  const toggleActive = async () => {
    if (!profile || nurseProfile?.status !== 'approved') return;
    setTogglingActive(true);
    const newActive = !isActive;

    const { error } = await supabase
      .from('nurse_profiles')
      .update({ is_active: newActive })
      .eq('id', profile.id);

    if (!error) {
      setIsActive(newActive);
      if (newActive) {
        await startSharingLocation();
        Alert.alert('¡Estás activo!', 'Los clientes pueden encontrarte en el mapa.');
      } else {
        await stopSharingLocation();
      }
    }
    setTogglingActive(false);
  };

  const contactSupport = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();
    if (data?.id) {
      router.push(`/(nurse)/chat/${data.id}` as any);
    } else {
      Alert.alert('Sin soporte disponible', 'No hay administradores disponibles en este momento.');
    }
  };

  const status = nurseProfile?.status ?? 'pending';
  const statusConfig = STATUS_CONFIG[status];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {profile?.full_name?.split(' ')[0] ?? 'Enfermero/a'} 👋</Text>
            <Text style={styles.subGreeting}>Gestiona tu disponibilidad y solicitudes</Text>
          </View>
        </View>

        {/* Estado del perfil */}
        <View style={[styles.statusCard, { backgroundColor: statusConfig.bg }]}>
          <View style={styles.statusRow}>
            <Text style={{ fontSize: 28 }}>{statusConfig.emoji}</Text>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              <Text style={styles.statusDesc}>{statusConfig.desc}</Text>
            </View>
          </View>
          {status === 'rejected' && nurseProfile?.rejection_reason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionTitle}>Motivo:</Text>
              <Text style={styles.rejectionText}>{nurseProfile.rejection_reason}</Text>
            </View>
          )}
        </View>

        {/* Toggle disponibilidad */}
        {status === 'approved' && (
          <View style={[styles.card, styles.availabilityCard]}>
            <View style={styles.availabilityInfo}>
              <View style={[styles.activeDot, isActive && styles.activeDotOn]} />
              <View>
                <Text style={styles.availabilityTitle}>
                  {isActive ? 'Estás disponible' : 'Estás inactivo'}
                </Text>
                <Text style={styles.availabilitySubtitle}>
                  {isActive ? 'Los clientes te pueden ver en el mapa' : 'No apareces en búsquedas'}
                </Text>
              </View>
            </View>
            <Switch
              value={isActive}
              onValueChange={toggleActive}
              disabled={togglingActive}
              trackColor={{ false: Colors.border, true: Colors.secondary }}
              thumbColor={isActive ? '#fff' : '#fff'}
            />
          </View>
        )}

        {/* Estadísticas */}
        <Text style={styles.sectionTitle}>Tu desempeño</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {nurseProfile?.rating ? `${nurseProfile.rating}★` : '—'}
            </Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{nurseProfile?.total_reviews ?? 0}</Text>
            <Text style={styles.statLabel}>Reseñas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {nurseProfile?.hourly_rate ? `$${nurseProfile.hourly_rate.toLocaleString()}` : '—'}
            </Text>
            <Text style={styles.statLabel}>Tarifa/hora</Text>
          </View>
        </View>

        {/* Solicitudes recientes */}
        {recentRequests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Solicitudes recientes</Text>
            {recentRequests.slice(0, 3).map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestRow}>
                  <Text style={styles.requestClient}>
                    {(req as any).profiles?.full_name ?? 'Cliente'}
                  </Text>
                  <Badge
                    label={req.status === 'pending' ? 'Pendiente' : req.status === 'accepted' ? 'Aceptada' : 'Completada'}
                    variant={req.status === 'pending' ? 'warning' : req.status === 'accepted' ? 'primary' : 'success'}
                  />
                </View>
                <Text style={styles.requestDesc} numberOfLines={2}>{req.description ?? 'Sin descripción'}</Text>
                {req.service_date && (
                  <Text style={styles.requestDate}>
                    📅 {new Date(req.service_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {recentRequests.length === 0 && status === 'approved' && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Sin solicitudes aún</Text>
            <Text style={styles.emptyText}>
              Activa tu disponibilidad para que los clientes puedan encontrarte.
            </Text>
          </View>
        )}

        {/* Contactar soporte */}
        <TouchableOpacity style={styles.supportBtn} onPress={contactSupport}>
          <Text style={styles.supportBtnText}>💬 Contactar al equipo de soporte</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingBottom: Spacing.md },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.text },
  subGreeting: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statusCard: { marginHorizontal: Spacing.xl, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statusDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  rejectionBox: { marginTop: Spacing.md, backgroundColor: Colors.errorLight, borderRadius: Radius.sm, padding: Spacing.md },
  rejectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.error, marginBottom: 2 },
  rejectionText: { fontSize: 13, color: Colors.text },
  card: { marginHorizontal: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  availabilityCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  availabilityInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  activeDot: { width: 10, height: 10, borderRadius: Radius.full, backgroundColor: Colors.textMuted },
  activeDotOn: { backgroundColor: Colors.secondary },
  availabilityTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  availabilitySubtitle: { fontSize: 12, color: Colors.textSecondary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, paddingHorizontal: Spacing.xl, marginTop: Spacing.lg, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', ...Shadow.sm },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  requestCard: { marginHorizontal: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  requestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  requestClient: { fontSize: 15, fontWeight: '600', color: Colors.text },
  requestDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  requestDate: { fontSize: 12, color: Colors.textMuted },
  emptyCard: { margin: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xxxl, alignItems: 'center', ...Shadow.sm },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  supportBtn: { marginHorizontal: Spacing.xl, marginTop: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center' },
  supportBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
