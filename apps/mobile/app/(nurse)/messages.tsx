import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth.store';
import { Colors, Spacing, Radius, Shadow } from '../../constants/colors';

interface ConvItem {
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  other_role: string;
  last_message: string;
  last_at: string;
  unread: number;
}

export default function NurseMessages() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, created_at, read_at')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (!data) return;

    // Agrupar por conversación
    const convMap = new Map<string, ConvItem>();
    for (const msg of data) {
      const otherId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          other_id: otherId,
          other_name: '',
          other_avatar: null,
          other_role: '',
          last_message: msg.content,
          last_at: msg.created_at,
          unread: msg.receiver_id === profile.id && !msg.read_at ? 1 : 0,
        });
      } else {
        const conv = convMap.get(otherId)!;
        if (msg.receiver_id === profile.id && !msg.read_at) conv.unread++;
      }
    }

    // Enriquecer con nombres de perfil
    const ids = Array.from(convMap.keys());
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('id', ids);

      profiles?.forEach((p) => {
        const conv = convMap.get(p.id);
        if (conv) {
          conv.other_name = p.full_name ?? 'Usuario';
          conv.other_avatar = p.avatar_url;
          conv.other_role = p.role === 'admin' ? 'Administrador' : p.role === 'client' ? 'Cliente' : 'Usuario';
        }
      });
    }

    setConversations(Array.from(convMap.values()));
  }, [profile]);

  useEffect(() => {
    fetchConversations();
    const channel = supabase
      .channel('nurse_messages_list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const totalUnread = conversations.reduce((acc, c) => acc + c.unread, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensajes</Text>
        {totalUnread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.other_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const initials = item.other_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
          return (
            <TouchableOpacity
              style={[styles.convItem, item.unread > 0 && styles.convItemUnread]}
              onPress={() => router.push(`/(nurse)/chat/${item.other_id}` as any)}
            >
              <View style={styles.avatarWrap}>
                {item.other_avatar ? (
                  <Image source={{ uri: item.other_avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, item.other_role === 'Administrador' && styles.adminFallback]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                {item.unread > 0 && (
                  <View style={styles.unreadDot}>
                    <Text style={styles.unreadDotText}>{item.unread}</Text>
                  </View>
                )}
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convRow}>
                  <Text style={[styles.convName, item.unread > 0 && styles.convNameBold]}>
                    {item.other_name}
                  </Text>
                  <Text style={styles.convTime}>
                    {new Date(item.last_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <Text style={styles.convRole}>{item.other_role}</Text>
                <Text style={[styles.convPreview, item.unread > 0 && styles.convPreviewBold]} numberOfLines={1}>
                  {item.last_message}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>Sin conversaciones</Text>
            <Text style={styles.emptyText}>Tus mensajes con clientes y el equipo de soporte aparecerán aquí.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  badge: { backgroundColor: Colors.error, borderRadius: Radius.full, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 20 },
  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadow.sm,
  },
  convItemUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: Radius.full },
  avatarFallback: { width: 52, height: 52, borderRadius: Radius.full, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  adminFallback: { backgroundColor: '#FEF3C7' },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  unreadDot: { position: 'absolute', top: -2, right: -2, backgroundColor: Colors.error, borderRadius: Radius.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadDotText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  convInfo: { flex: 1 },
  convRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  convNameBold: { fontWeight: '800' },
  convRole: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  convTime: { fontSize: 11, color: Colors.textMuted },
  convPreview: { fontSize: 13, color: Colors.textSecondary },
  convPreviewBold: { color: Colors.text, fontWeight: '600' },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyEmoji: { fontSize: 52, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
