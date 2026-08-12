import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Spacing, Radius, Shadow } from '../../constants/colors';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { ServiceRequest, RequestStatus } from '../../types';

type Tab = 'pending' | 'accepted' | 'completed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'accepted', label: 'Aceptadas' },
  { key: 'completed', label: 'Completadas' },
];

export default function NurseRequests() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('service_requests')
      .select('*, profiles!client_id(full_name, phone, avatar_url)')
      .eq('nurse_id', profile.id)
      .eq('status', activeTab)
      .order('created_at', { ascending: false });
    if (data) setRequests(data as any);
    setLoading(false);
  }, [profile, activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  const updateStatus = async (requestId: string, status: RequestStatus) => {
    const { error } = await supabase
      .from('service_requests')
      .update({ status })
      .eq('id', requestId);
    if (!error) fetchRequests();
    else Alert.alert('Error', 'No se pudo actualizar la solicitud.');
  };

  const handleAccept = (id: string) => {
    Alert.alert('Aceptar solicitud', '¿Confirmas que aceptas esta solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aceptar', onPress: () => updateStatus(id, 'accepted') },
    ]);
  };

  const handleReject = (id: string) => {
    Alert.alert('Rechazar solicitud', '¿Estás seguro de que deseas rechazar esta solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: () => updateStatus(id, 'rejected') },
    ]);
  };

  const handleComplete = (id: string) => {
    Alert.alert('Marcar como completada', '¿El servicio fue completado exitosamente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Completar', onPress: () => updateStatus(id, 'completed') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Solicitudes</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {requests.length === 0 && !loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>
              {activeTab === 'pending' ? '📭' : activeTab === 'accepted' ? '📅' : '✅'}
            </Text>
            <Text style={styles.emptyTitle}>Sin solicitudes {TABS.find(t => t.key === activeTab)?.label.toLowerCase()}</Text>
          </View>
        )}

        {requests.map((req) => {
          const client = (req as any).profiles;
          const date = req.service_date ? new Date(req.service_date) : null;
          return (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.clientInfo}>
                  <View style={styles.clientAvatar}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <View>
                    <Text style={styles.clientName}>{client?.full_name ?? 'Cliente'}</Text>
                    {client?.phone && (
                      <Text style={styles.clientPhone}>{client.phone}</Text>
                    )}
                  </View>
                </View>
                {req.hours && req.total_cost && (
                  <View style={styles.costBadge}>
                    <Text style={styles.costText}>${req.total_cost?.toLocaleString()}</Text>
                    <Text style={styles.costHours}>{req.hours}h</Text>
                  </View>
                )}
              </View>

              {req.description && (
                <Text style={styles.description}>{req.description}</Text>
              )}

              <View style={styles.details}>
                {date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>
                      {date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                  </View>
                )}
                {req.address && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📍</Text>
                    <Text style={styles.detailText}>{req.address}</Text>
                  </View>
                )}
              </View>

              {activeTab === 'pending' && (
                <View style={styles.actions}>
                  <Button
                    title="Rechazar"
                    onPress={() => handleReject(req.id)}
                    variant="outline"
                    fullWidth={false}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Aceptar"
                    onPress={() => handleAccept(req.id)}
                    variant="secondary"
                    fullWidth={false}
                    style={{ flex: 1 }}
                  />
                </View>
              )}

              {activeTab === 'accepted' && (
                <Button
                  title="Marcar como completada ✓"
                  onPress={() => handleComplete(req.id)}
                  variant="secondary"
                  size="sm"
                  style={{ marginTop: Spacing.md }}
                />
              )}
            </View>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.lg },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.border, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: Spacing.xl },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxxl + 20 },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  clientInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  clientAvatar: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  clientPhone: { fontSize: 12, color: Colors.textSecondary },
  costBadge: { alignItems: 'flex-end' },
  costText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  costHours: { fontSize: 12, color: Colors.textSecondary },
  description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  details: { gap: Spacing.xs, marginBottom: Spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailIcon: { fontSize: 14 },
  detailText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
});
