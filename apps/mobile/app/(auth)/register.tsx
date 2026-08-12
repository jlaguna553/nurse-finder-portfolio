import React, { useState } from 'react';
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
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors, Spacing, Radius, Shadow } from '../../constants/colors';
import type { UserRole } from '../../types';

export default function RegisterScreen() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('client');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'El nombre es requerido';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'Correo inválido';
    if (!phone.trim()) errs.phone = 'El teléfono es requerido';
    if (password.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          role,
        },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error al registrarse', error.message);
      return;
    }

    if (role === 'nurse') {
      router.replace('/(auth)/register-nurse/step1');
    } else {
      Alert.alert(
        '¡Registro exitoso!',
        'Revisa tu correo para confirmar tu cuenta.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>¿Cómo vas a usar NurseFinder?</Text>

          {/* Selector de rol */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'nurse' && styles.roleCardSelected]}
              onPress={() => setRole('nurse')}
              activeOpacity={0.8}
            >
              <Text style={styles.roleEmoji}>👩‍⚕️</Text>
              <Text style={[styles.roleTitle, role === 'nurse' && styles.roleTitleSelected]}>
                Soy Enfermero/a
              </Text>
              <Text style={styles.roleDesc}>Ofrezco servicios de enfermería</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === 'client' && styles.roleCardSelected]}
              onPress={() => setRole('client')}
              activeOpacity={0.8}
            >
              <Text style={styles.roleEmoji}>🏠</Text>
              <Text style={[styles.roleTitle, role === 'client' && styles.roleTitleSelected]}>
                Busco Servicios
              </Text>
              <Text style={styles.roleDesc}>Necesito atención de enfermería</Text>
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <Input
              label="Nombre completo"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nombre y apellidos"
              autoCapitalize="words"
              error={errors.fullName}
            />
            <Input
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="correo@ejemplo.com"
              error={errors.email}
            />
            <Input
              label="Teléfono"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+57 300 000 0000"
              error={errors.phone}
            />
            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
              error={errors.password}
            />
            <Input
              label="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Repite tu contraseña"
              error={errors.confirmPassword}
            />

            <Button title="Crear cuenta" onPress={handleRegister} loading={loading} />

            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>
                ¿Ya tienes cuenta? <Text style={styles.loginLinkBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg },
  backBtn: { marginBottom: Spacing.lg },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.xl },
  roleContainer: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  roleCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  roleEmoji: { fontSize: 32, marginBottom: Spacing.sm },
  roleTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 4 },
  roleTitleSelected: { color: Colors.primary },
  roleDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  form: {},
  loginLink: { alignItems: 'center', marginTop: Spacing.xl },
  loginLinkText: { fontSize: 14, color: Colors.textSecondary },
  loginLinkBold: { fontWeight: '700', color: Colors.primary },
});
