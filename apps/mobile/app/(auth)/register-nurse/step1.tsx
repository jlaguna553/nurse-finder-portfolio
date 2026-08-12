import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Colors, Spacing, Radius } from '../../../constants/colors';
import { useNurseRegistrationStore } from '../../../store/nurse-registration.store';
import { useAuthStore } from '../../../store/auth.store';
import { supabase } from '../../../lib/supabase';

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepContainer}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.stepDot, i < current && styles.stepDotActive, i === current - 1 && styles.stepDotCurrent]}
        />
      ))}
      <Text style={styles.stepText}>Paso {current} de {total}</Text>
    </View>
  );
}

export default function NurseStep1() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { data, updateData } = useNurseRegistrationStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [phone, setPhone] = useState(data.phone || profile?.phone || '');
  const [city, setCity] = useState(data.city || '');
  const [address, setAddress] = useState(data.address || '');

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!phone.trim()) errs.phone = 'El teléfono es requerido';
    if (!city.trim()) errs.city = 'La ciudad es requerida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validate() || !profile) return;
    setLoading(true);

    const { error } = await supabase.from('profiles').update({
      phone: phone.trim(),
      city: city.trim(),
    }).eq('id', profile.id);

    setLoading(false);
    if (error) return;

    updateData({ phone: phone.trim(), city: city.trim(), address: address.trim() });
    router.push('/(auth)/register-nurse/step2');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <StepIndicator current={1} total={3} />

          <Text style={styles.title}>Información Personal</Text>
          <Text style={styles.subtitle}>
            Cuéntanos un poco sobre ti para que los clientes puedan encontrarte.
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>
              Tu ciudad nos ayuda a mostrarte en los resultados de búsqueda correctos.
            </Text>
          </View>

          <Input
            label="Teléfono de contacto"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+57 300 000 0000"
            error={errors.phone}
          />

          <Input
            label="Ciudad *"
            value={city}
            onChangeText={setCity}
            placeholder="Bogotá, Medellín, Cali..."
            autoCapitalize="words"
            error={errors.city}
          />

          <Input
            label="Dirección / Zona de trabajo (opcional)"
            value={address}
            onChangeText={setAddress}
            placeholder="Barrio o zona donde trabajas"
            autoCapitalize="sentences"
          />

          <Button
            title="Siguiente →"
            onPress={handleNext}
            loading={loading}
            style={styles.nextBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xl },
  stepContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xxl },
  stepDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotCurrent: { backgroundColor: Colors.primary },
  stepText: { marginLeft: 'auto', fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  infoIcon: { fontSize: 24 },
  infoText: { flex: 1, fontSize: 13, color: Colors.primaryDark, lineHeight: 19 },
  nextBtn: { marginTop: Spacing.sm },
});
