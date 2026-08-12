import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/auth.store';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius, Shadow } from '../../constants/colors';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function NurseProfile() {
  const { profile, nurseProfile, signOut, fetchProfile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(nurseProfile?.bio ?? '');
  const [hourlyRate, setHourlyRate] = useState(nurseProfile?.hourly_rate?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const initials = profile?.full_name
    ?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'E';

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase.from('nurse_profiles').update({
      bio: bio.trim(),
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
    }).eq('id', profile.id);
    await fetchProfile(profile.id);
    setSaving(false);
    setEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  const changeAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !profile) return;

    const asset = result.assets[0];
    const ext = asset.fileName?.split('.').pop() ?? 'jpg';
    const path = `${profile.id}/avatar.${ext}`;

    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
      await fetchProfile(profile.id);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header del perfil */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={changeAvatar} style={styles.avatarWrapper}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              <Text style={{ fontSize: 12 }}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{profile?.full_name}</Text>
          <Text style={styles.role}>Enfermero/a Profesional</Text>

          {nurseProfile?.status === 'approved' && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verificado</Text>
            </View>
          )}

          {nurseProfile?.rating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>★ {nurseProfile.rating.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({nurseProfile.total_reviews} reseñas)</Text>
            </View>
          )}
        </View>

        {/* Info cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>{nurseProfile?.years_experience ?? '—'}</Text>
            <Text style={styles.infoLabel}>Años exp.</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>
              {nurseProfile?.hourly_rate ? `$${nurseProfile.hourly_rate.toLocaleString()}` : '—'}
            </Text>
            <Text style={styles.infoLabel}>Tarifa/hora</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>{nurseProfile?.total_reviews ?? 0}</Text>
            <Text style={styles.infoLabel}>Servicios</Text>
          </View>
        </View>

        {/* Especializaciones */}
        {nurseProfile?.specializations && nurseProfile.specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Especializaciones</Text>
            <View style={styles.specsWrap}>
              {nurseProfile.specializations.map((s) => (
                <Badge key={s.id} label={s.name} variant="primary" />
              ))}
            </View>
          </View>
        )}

        {/* Información de contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de contacto</Text>
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>✉️</Text>
            <Text style={styles.contactText}>{profile?.email}</Text>
          </View>
          {profile?.phone && (
            <View style={styles.contactItem}>
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactText}>{profile.phone}</Text>
            </View>
          )}
          {profile?.city && (
            <View style={styles.contactItem}>
              <Text style={styles.contactIcon}>📍</Text>
              <Text style={styles.contactText}>{profile.city}</Text>
            </View>
          )}
          {nurseProfile?.license_number && (
            <View style={styles.contactItem}>
              <Text style={styles.contactIcon}>💳</Text>
              <Text style={styles.contactText}>Tarjeta: {nurseProfile.license_number}</Text>
            </View>
          )}
        </View>

        {/* Editar bio y tarifa */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Sobre mí</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={styles.editBtn}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <>
              <Input
                label="Tarifa por hora (COP)"
                value={hourlyRate}
                onChangeText={setHourlyRate}
                keyboardType="numeric"
                prefix={<Text style={{ color: Colors.textSecondary }}>$</Text>}
              />
              <Input
                label="Biografía"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                placeholder="Cuéntales a los clientes sobre tu experiencia..."
                style={{ minHeight: 90 }}
                textAlignVertical="top"
              />
              <View style={styles.editActions}>
                <Button title="Cancelar" onPress={() => setEditing(false)} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
                <Button title="Guardar" onPress={handleSave} loading={saving} fullWidth={false} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <Text style={styles.bioText}>
              {nurseProfile?.bio ?? 'Agrega una biografía para que los clientes te conozcan mejor.'}
            </Text>
          )}
        </View>

        {/* Cerrar sesión */}
        <View style={styles.section}>
          <Button
            title="Cerrar sesión"
            onPress={handleSignOut}
            variant="outline"
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  profileHeader: { alignItems: 'center', padding: Spacing.xl, paddingBottom: Spacing.lg },
  avatarWrapper: { position: 'relative', marginBottom: Spacing.md },
  avatar: { width: 100, height: 100, borderRadius: Radius.full },
  avatarFallback: { width: 100, height: 100, borderRadius: Radius.full, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 36, fontWeight: '700', color: Colors.primary },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.surface, width: 28, height: 28, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  name: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  role: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm },
  verifiedBadge: { backgroundColor: Colors.secondaryLight, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full, marginBottom: Spacing.sm },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ratingText: { fontSize: 15, fontWeight: '700', color: Colors.warning },
  reviewsText: { fontSize: 13, color: Colors.textSecondary },
  infoGrid: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.md },
  infoCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', ...Shadow.sm },
  infoValue: { fontSize: 18, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
  infoLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  section: { marginHorizontal: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  specsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  contactIcon: { fontSize: 18, width: 28 },
  contactText: { fontSize: 14, color: Colors.textSecondary },
  editBtn: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  bioText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  editActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
