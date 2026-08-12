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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '../../../components/ui/Button';
import { Colors, Spacing, Radius, Shadow } from '../../../constants/colors';
import { supabase } from '../../../lib/supabase';
import { DOCUMENT_TYPE_LABELS } from '../../../types';

type DocType = 'title' | 'license' | 'id';

interface UploadedDoc {
  type: DocType;
  uri: string;
  name: string;
  mimeType: string;
}

const REQUIRED_DOCS: { type: DocType; label: string; desc: string; emoji: string }[] = [
  { type: 'title', label: 'Título Profesional', desc: 'Diploma o acta de grado en enfermería', emoji: '🎓' },
  { type: 'license', label: 'Tarjeta Profesional', desc: 'Tarjeta o licencia habilitante para ejercer', emoji: '💳' },
  { type: 'id', label: 'Documento de Identidad', desc: 'Cédula o pasaporte vigente', emoji: '🪪' },
];

export default function NurseStep3() {
  const router = useRouter();
  const [docs, setDocs] = useState<Record<DocType, UploadedDoc | null>>({
    title: null,
    license: null,
    id: null,
  });
  const [loading, setLoading] = useState(false);

  const pickDocument = async (type: DocType) => {
    Alert.alert('Subir documento', '¿Cómo deseas subir el documento?', [
      {
        text: 'Galería de fotos',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setDocs((prev) => ({
              ...prev,
              [type]: {
                type,
                uri: asset.uri,
                name: asset.fileName ?? `${type}_document.jpg`,
                mimeType: asset.mimeType ?? 'image/jpeg',
              },
            }));
          }
        },
      },
      {
        text: 'Archivo PDF',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
          });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setDocs((prev) => ({
              ...prev,
              [type]: {
                type,
                uri: asset.uri,
                name: asset.name,
                mimeType: asset.mimeType ?? 'application/pdf',
              },
            }));
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!docs.title || !docs.license || !docs.id) {
      Alert.alert('Documentos requeridos', 'Debes subir los 3 documentos para continuar.');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    try {
      for (const [docType, doc] of Object.entries(docs) as [DocType, UploadedDoc | null][]) {
        if (!doc) continue;
        const ext = doc.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}/${docType}_${Date.now()}.${ext}`;

        const response = await fetch(doc.uri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        await supabase.storage.from('nurse-documents').upload(path, arrayBuffer, {
          contentType: doc.mimeType,
          upsert: true,
        });

        await supabase.from('nurse_documents').insert({
          nurse_id: user.id,
          document_type: docType,
          document_name: doc.name,
          storage_path: path,
        });
      }

      Alert.alert(
        '¡Registro completado! 🎉',
        'Tu perfil está siendo revisado por nuestro equipo. Te notificaremos cuando sea aprobado.',
        [{ text: 'Entendido', onPress: () => router.replace('/(nurse)') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al subir los documentos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.stepRow}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[styles.stepDot, s <= 3 && styles.stepDotActive]} />
          ))}
          <Text style={styles.stepText}>Paso 3 de 3</Text>
        </View>

        <Text style={styles.title}>Documentos Requeridos</Text>
        <Text style={styles.subtitle}>
          Todos los documentos son revisados por nuestro equipo antes de aprobar tu perfil.
          Tus datos están protegidos y son confidenciales.
        </Text>

        <View style={styles.securityBadge}>
          <Text style={styles.securityEmoji}>🔒</Text>
          <Text style={styles.securityText}>
            Tus documentos se almacenan de forma segura y solo son accesibles por administradores.
          </Text>
        </View>

        {REQUIRED_DOCS.map(({ type, label, desc, emoji }) => {
          const doc = docs[type];
          return (
            <TouchableOpacity
              key={type}
              onPress={() => pickDocument(type)}
              activeOpacity={0.8}
              style={[styles.docCard, doc && styles.docCardUploaded]}
            >
              <View style={styles.docIcon}>
                <Text style={{ fontSize: 28 }}>{doc ? '✅' : emoji}</Text>
              </View>
              <View style={styles.docInfo}>
                <Text style={[styles.docLabel, doc && styles.docLabelUploaded]}>{label}</Text>
                {doc ? (
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                ) : (
                  <Text style={styles.docDesc}>{desc}</Text>
                )}
              </View>
              <Text style={[styles.docAction, doc && styles.docActionUploaded]}>
                {doc ? 'Cambiar' : 'Subir'}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Consejos para mejores resultados:</Text>
          <Text style={styles.tipText}>• Asegúrate de que el documento sea legible</Text>
          <Text style={styles.tipText}>• Fotografía en un lugar bien iluminado</Text>
          <Text style={styles.tipText}>• El documento debe estar vigente</Text>
        </View>

        <Button
          title="Enviar perfil para revisión ✓"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
      </ScrollView>
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
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: Spacing.xl },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  securityEmoji: { fontSize: 22 },
  securityText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 18 },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    ...Shadow.sm,
  },
  docCardUploaded: { borderStyle: 'solid', borderColor: Colors.secondary, backgroundColor: Colors.secondaryLight },
  docIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  docLabelUploaded: { color: '#065F46' },
  docDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  docName: { fontSize: 12, color: Colors.secondary, fontWeight: '500' },
  docAction: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  docActionUploaded: { color: Colors.secondary },
  tipCard: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: Spacing.sm },
  tipText: { fontSize: 13, color: '#92400E', lineHeight: 20 },
  submitBtn: { marginTop: Spacing.sm },
  backBtn: { alignItems: 'center', marginTop: Spacing.lg },
  backText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});
