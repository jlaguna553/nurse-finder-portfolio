import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { NurseCard } from '../../components/NurseCard';
import { Colors, Spacing, Radius, Shadow } from '../../constants/colors';
import type { NurseWithLocation, Specialization } from '../../types';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [nurses, setNurses] = useState<NurseWithLocation[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [maxRate, setMaxRate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('specializations').select('*').order('name').then(({ data }) => {
      if (data) setSpecializations(data);
    });
  }, []);

  const search = useCallback(async () => {
    setLoading(true);

    let q = supabase
      .from('nurse_profiles')
      .select(`
        *,
        profiles(*),
        nurse_specializations(specializations(*))
      `)
      .eq('status', 'approved')
      .order('rating', { ascending: false });

    if (maxRate) q = q.lte('hourly_rate', parseFloat(maxRate));

    const { data } = await q;
    setLoading(false);
    if (!data) return;

    let results = data.map((np: any) => ({
      ...np,
      profile: np.profiles,
      specializations: np.nurse_specializations?.map((ns: any) => ns.specializations) ?? [],
    })) as NurseWithLocation[];

    if (query.trim()) {
      const q2 = query.toLowerCase();
      results = results.filter((n) =>
        n.profile?.full_name?.toLowerCase().includes(q2) ||
        n.specializations?.some((s) => s.name.toLowerCase().includes(q2)) ||
        n.profile?.city?.toLowerCase().includes(q2)
      );
    }

    if (selectedSpec) {
      results = results.filter((n) =>
        n.specializations?.some((s) => s.id === selectedSpec)
      );
    }

    setNurses(results);
  }, [query, selectedSpec, maxRate]);

  useEffect(() => {
    const t = setTimeout(search, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search bar */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar Enfermeros</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, especialización o ciudad..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros de especialización */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedSpec && styles.filterChipActive]}
            onPress={() => setSelectedSpec(null)}
          >
            <Text style={[styles.filterText, !selectedSpec && styles.filterTextActive]}>Todas</Text>
          </TouchableOpacity>
          {specializations.map((spec) => (
            <TouchableOpacity
              key={spec.id}
              style={[styles.filterChip, selectedSpec === spec.id && styles.filterChipActive]}
              onPress={() => setSelectedSpec(selectedSpec === spec.id ? null : spec.id)}
            >
              <Text style={[styles.filterText, selectedSpec === spec.id && styles.filterTextActive]}>
                {spec.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Resultados */}
      <View style={styles.results}>
        <Text style={styles.resultsCount}>
          {loading ? 'Buscando...' : `${nurses.length} resultado${nurses.length !== 1 ? 's' : ''}`}
        </Text>

        {loading && (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        )}

        {!loading && (
          <FlatList
            data={nurses}
            keyExtractor={(n) => n.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <NurseCard
                nurse={item}
                onPress={() => router.push(`/(client)/nurse/${item.id}`)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔎</Text>
                <Text style={styles.emptyTitle}>Sin resultados</Text>
                <Text style={styles.emptyText}>
                  Intenta cambiar los filtros o buscar por otro término.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.surface, paddingTop: Spacing.xl, ...Shadow.sm },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  clearBtn: { fontSize: 16, color: Colors.textMuted, padding: 4 },
  filters: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  results: { flex: 1 },
  resultsCount: { fontSize: 13, color: Colors.textSecondary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
