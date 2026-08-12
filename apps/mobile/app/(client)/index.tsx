import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../hooks/useLocation';
import { NurseCard } from '../../components/NurseCard';
import { Colors, Spacing, Radius, Shadow } from '../../constants/colors';
import type { NurseWithLocation } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ClientMap() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { getCurrentLocation, location } = useLocation();
  const [nurses, setNurses] = useState<NurseWithLocation[]>([]);
  const [selectedNurseId, setSelectedNurseId] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 4.711,
    longitude: -74.0721,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const fetchNurses = useCallback(async () => {
    const { data: locations } = await supabase
      .from('nurse_locations')
      .select(`
        *,
        nurse_profiles!inner(
          *,
          profiles!nurse_profiles_id_fkey(*),
          nurse_specializations(specializations(*))
        )
      `)
      .limit(50);

    if (!locations) return;

    const mapped: NurseWithLocation[] = locations.map((loc: any) => {
      const np = loc.nurse_profiles;
      const specializations = np.nurse_specializations?.map((ns: any) => ns.specializations) ?? [];
      const dist = location
        ? getDistance(location.coords.latitude, location.coords.longitude, loc.latitude, loc.longitude)
        : undefined;

      return {
        ...np,
        profile: np.profiles,
        specializations,
        location: { nurse_id: loc.nurse_id, latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, updated_at: loc.updated_at },
        distance: dist,
      };
    });

    const sorted = location
      ? mapped.sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99))
      : mapped;

    setNurses(sorted);
  }, [location]);

  useEffect(() => {
    const init = async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        const newRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 800);
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchNurses();
    const interval = setInterval(fetchNurses, 30000);
    return () => clearInterval(interval);
  }, [fetchNurses]);

  // Suscripción en tiempo real a ubicaciones
  useEffect(() => {
    const channel = supabase
      .channel('nurse_locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nurse_locations' }, () => {
        fetchNurses();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchNurses]);

  const handleMarkerPress = (nurseId: string) => {
    setSelectedNurseId(nurseId);
    bottomSheetRef.current?.expand();
  };

  const handleNursePress = (nurseId: string) => {
    router.push(`/(client)/nurse/${nurseId}`);
  };

  const centerOnMe = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 600);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {nurses.map((nurse) => {
          if (!nurse.location) return null;
          const isSelected = nurse.id === selectedNurseId;
          return (
            <Marker
              key={nurse.id}
              coordinate={{ latitude: nurse.location.latitude, longitude: nurse.location.longitude }}
              onPress={() => handleMarkerPress(nurse.id)}
            >
              <View style={[styles.markerContainer, isSelected && styles.markerSelected]}>
                <Text style={styles.markerEmoji}>👩‍⚕️</Text>
                {nurse.hourly_rate && (
                  <View style={styles.markerLabel}>
                    <Text style={styles.markerRate}>${Math.round(nurse.hourly_rate / 1000)}k</Text>
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* FABs */}
      <SafeAreaView style={styles.fabContainer} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <View style={styles.searchBar}>
            <Text style={styles.searchText}>🔍  Buscar por especialización...</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.fab} onPress={centerOnMe}>
          <Text style={{ fontSize: 20 }}>📍</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Badge de conteo */}
      <View style={styles.countBadge} pointerEvents="none">
        <Text style={styles.countText}>
          {nurses.length} enfermero{nurses.length !== 1 ? 's' : ''} activo{nurses.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Bottom Sheet con lista de enfermeros */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['25%', '55%', '90%']}
        index={0}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetIndicator}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Enfermeros cercanos</Text>
          <Text style={styles.sheetSubtitle}>{nurses.length} disponibles</Text>
        </View>

        <BottomSheetFlatList
          data={nurses}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.sheetList}
          renderItem={({ item }) => (
            <NurseCard
              nurse={item}
              onPress={() => handleNursePress(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No hay enfermeros activos cerca</Text>
            </View>
          }
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  fabContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  searchBar: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadow.md,
  },
  searchText: { color: Colors.textMuted, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: SCREEN_HEIGHT * 0.3,
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  countBadge: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  markerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: 6,
    ...Shadow.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  markerSelected: { borderColor: Colors.primary, transform: [{ scale: 1.2 }] },
  markerEmoji: { fontSize: 22 },
  markerLabel: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  markerRate: { fontSize: 9, color: '#fff', fontWeight: '700' },
  sheetBg: { backgroundColor: Colors.background },
  sheetIndicator: { backgroundColor: Colors.border, width: 40 },
  sheetHeader: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  sheetSubtitle: { fontSize: 13, color: Colors.textSecondary },
  sheetList: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.lg },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
});
