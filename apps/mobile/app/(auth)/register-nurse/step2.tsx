import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Colors, Spacing, Radius, Shadow } from '../../../constants/colors';
import { useNurseRegistrationStore } from '../../../store/nurse-registration.store';
import { supabase } from '../../../lib/supabase';
import type { Specialization } from '../../../types';

export default function NurseStep2() {
  const router = useRouter();
  const { data, updateData } = useNurseRegistrationStore();
  const [loading, setLoading] = useState(false);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [licenseNumber, setLicenseNumber] = useState(data.license_number);
  const [yearsExp, setYearsExp] = useState(data.years_experience);
  const [education, setEducation] = useState(data.education);
  const [bio, setBio] = useState(data.bio);
  const [hourlyRate, setHourlyRate] = useState(data.hourly_rate);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(data.specialization_ids);

  useEffect(() => {
    supabase.from('specializations').select('*').order('name').then(({ data }) => {
      if (data) setSpecializations(data);
    });
  }, []);

  const toggleSpec = (id: string) => {
    setSelectedSpecs((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!licenseNumber.trim()) errs.license = 'El número de tarjeta es requerido';
    if (!yearsExp) errs.years = 'Los años de experiencia son requeridos';
    if (!education.trim()) errs.education = 'La formación es requerida';
    if (selectedSpecs.length === 0) errs.specs = 'Selecciona al menos una especialización';
    if (!hourlyRate) errs.rate = 'La tarifa por hora es requerida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { error } = await supabase.from('nurse_profiles').update({
      license_number: licenseNumber.trim(),
      years_experience: parseInt(yearsExp),
      education: education.trim(),
      bio: bio.trim(),
      hourly_rate: parseFloat(hourlyRate),
    }).eq('id', user.id);

    if (!error) {
      const inserts = selectedSpecs.map((sid) => ({
        nurse_id: user.id,
        specialization_id: sid,
      }));
      await supabase.from('nurse_specializations').upsert(inserts);
    }

    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }

    updateData({
      license_number: licenseNumber,
      years_experience: yearsExp,
      education,
      bio,
      hourly_rate: hourlyRate,
      specialization_ids: selectedSpecs,
    });
    router.push('/(auth)/register-nurse/step3');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.stepRow}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={[styles.stepDot, s <= 2 && styles.stepDotActive]} />
            ))}
            <Text style={styles.stepText}>Paso 2 de 3</Text>
          </View>

          <Text style={styles.title}>Información Profesional</Text>
          <Text style={styles.subtitle}>Tu perfil profesional es lo que verán los clientes.</Text>

          <Input
            label="Número de tarjeta profesional / Licencia *"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="RM-12345"
            autoCapitalize="characters"
            error={errors.license}
          />

          <Input
            label="Años de experiencia *"
            value={yearsExp}
            onChangeText={setYearsExp}
            keyboardType="numeric"
            placeholder="5"
            error={errors.years}
          />

          <Input
            label="Formación académica *"
            value={education}
            onChangeText={setEducation}
            placeholder="Ej: Licenciatura en Enfermería - UNAM"
            autoCapitalize="sentences"
            error={errors.education}
          />

          <Input
            label="Tarifa por hora (COP) *"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            keyboardType="numeric"
            placeholder="35000"
            prefix={<Text style={styles.prefix}>$</Text>}
            error={errors.rate}
          />

          <Input
            label="Biografía profesional (opcional)"
            value={bio}
            onChangeText={setBio}
            placeholder="Describe tu experiencia, logros y áreas de expertise..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 90 }}
          />

          {/* Especializaciones */}
          <Text style={styles.specsLabel}>Especializaciones *</Text>
          {errors.specs && <Text style={styles.errorText}>{errors.specs}</Text>}
          <View style={styles.specsGrid}>
            {specializations.map((spec) => {
              const selected = selectedSpecs.includes(spec.id);
              return (
                <TouchableOpacity
                  key={spec.id}
                  onPress={() => toggleSpec(spec.id)}
                  activeOpacity={0.8}
                  style={[styles.specChip, selected && styles.specChipSelected]}
                >
                  <Text style={[styles.specText, selected && styles.specTextSelected]}>
                    {spec.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Button title="Siguiente →" onPress={handleNext} loading={loading} style={styles.nextBtn} />

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xl },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xxl },
  stepDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary },
  stepText: { marginLeft: 'auto', fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  prefix: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
  specsLabel: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: Spacing.sm },
  errorText: { fontSize: 12, color: Colors.error, marginBottom: Spacing.sm },
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  specChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  specChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  specText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  specTextSelected: { color: '#fff' },
  nextBtn: { marginTop: Spacing.sm },
  backBtn: { alignItems: 'center', marginTop: Spacing.lg },
  backText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});
