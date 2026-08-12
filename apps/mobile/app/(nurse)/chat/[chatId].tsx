import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth.store';
import { Colors, Spacing, Radius, Shadow } from '../../../constants/colors';
import type { Message } from '../../../types';

export default function NurseChat() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { profile } = useAuthStore();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [otherName, setOtherName] = useState('Usuario');
  const [otherRole, setOtherRole] = useState('');
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${profile.id},receiver_id.eq.${chatId}),` +
        `and(sender_id.eq.${chatId},receiver_id.eq.${profile.id})`
      )
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  }, [profile, chatId]);

  useEffect(() => {
    supabase.from('profiles').select('full_name, avatar_url, role').eq('id', chatId).single()
      .then(({ data }) => {
        if (data) {
          setOtherName(data.full_name ?? 'Usuario');
          setOtherAvatar(data.avatar_url);
          setOtherRole(data.role === 'admin' ? 'Administrador' : data.role === 'client' ? 'Cliente' : 'Usuario');
        }
      });

    fetchMessages();

    const channel = supabase
      .channel(`chat_nurse_${profile?.id}_${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === profile?.id && msg.receiver_id === chatId) ||
          (msg.sender_id === chatId && msg.receiver_id === profile?.id)
        ) {
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, profile?.id, fetchMessages]);

  const send = async () => {
    if (!text.trim() || !profile || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: chatId,
      content,
    });
    setSending(false);
  };

  const initials = otherName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {otherAvatar ? (
            <Image source={{ uri: otherAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarFallback, otherRole === 'Administrador' && styles.adminAvatar]}>
              <Text style={styles.headerAvatarText}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{otherName}</Text>
            <Text style={styles.headerSub}>{otherRole}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.sender_id === profile?.id;
            return (
              <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, mine ? styles.textMine : styles.textTheirs]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
                    {new Date(item.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
              <Text style={styles.emptyText}>Inicia la conversación</Text>
            </View>
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: Colors.text },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  headerAvatar: { width: 40, height: 40, borderRadius: Radius.full },
  headerAvatarFallback: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  adminAvatar: { backgroundColor: '#FEF3C7' },
  headerAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textSecondary },
  list: { padding: Spacing.xl, gap: Spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  row: { flexDirection: 'row', marginBottom: 4 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  textMine: { color: '#fff' },
  textTheirs: { color: Colors.text },
  time: { fontSize: 10, marginTop: 3 },
  timeMine: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  timeTheirs: { color: Colors.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.background, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, fontSize: 15, color: Colors.text, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendIcon: { color: '#fff', fontSize: 18 },
});
