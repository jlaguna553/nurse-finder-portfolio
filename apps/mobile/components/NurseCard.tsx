import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../constants/colors';
import { Badge } from './ui/Badge';
import type { NurseWithLocation } from '../types';

interface NurseCardProps {
  nurse: NurseWithLocation;
  onPress: () => void;
  compact?: boolean;
}

export function NurseCard({ nurse, onPress, compact = false }: NurseCardProps) {
  const profile = nurse.profile;
  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'E';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.card, compact && styles.cardCompact]}
    >
      <View style={styles.avatarContainer}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={[styles.activeDot, nurse.is_active && styles.activeDotOn]} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {profile?.full_name ?? 'Enfermero/a'}
        </Text>

        {nurse.rating !== null && (
          <View style={styles.rating}>
            <Text style={styles.ratingText}>★ {nurse.rating?.toFixed(1)}</Text>
            <Text style={styles.reviewsText}>({nurse.total_reviews} reseñas)</Text>
          </View>
        )}

        {!compact && nurse.specializations && nurse.specializations.length > 0 && (
          <View style={styles.specs}>
            {nurse.specializations.slice(0, 2).map((s) => (
              <Badge key={s.id} label={s.name} variant="primary" />
            ))}
            {nurse.specializations.length > 2 && (
              <Badge label={`+${nurse.specializations.length - 2}`} variant="neutral" />
            )}
          </View>
        )}
      </View>

      <View style={styles.right}>
        {nurse.hourly_rate !== null && (
          <Text style={styles.rate}>
            ${nurse.hourly_rate?.toLocaleString()}
            {'\n'}
            <Text style={styles.rateUnit}>/hora</Text>
          </Text>
        )}
        {nurse.distance !== undefined && (
          <Text style={styles.distance}>
            {nurse.distance < 1
              ? `${Math.round(nurse.distance * 1000)}m`
              : `${nurse.distance.toFixed(1)}km`}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardCompact: { padding: Spacing.md },
  avatarContainer: { position: 'relative', marginRight: Spacing.md },
  avatar: { width: 56, height: 56, borderRadius: Radius.full },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.textMuted,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  activeDotOn: { backgroundColor: Colors.secondary },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  rating: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  ratingText: { fontSize: 13, color: Colors.warning, fontWeight: '600', marginRight: 4 },
  reviewsText: { fontSize: 12, color: Colors.textSecondary },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  right: { alignItems: 'flex-end', marginLeft: Spacing.sm },
  rate: { fontSize: 15, fontWeight: '700', color: Colors.primary, textAlign: 'right' },
  rateUnit: { fontSize: 11, fontWeight: '400', color: Colors.textSecondary },
  distance: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
});
