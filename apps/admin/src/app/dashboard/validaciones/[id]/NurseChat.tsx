'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface NurseChatProps {
  nurseId: string;
  nurseName: string;
}

export function NurseChat({ nurseId, nurseName }: NurseChatProps) {
  const supabase = createClient();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async (currentAdminId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentAdminId},receiver_id.eq.${nurseId}),` +
        `and(sender_id.eq.${nurseId},receiver_id.eq.${currentAdminId})`
      )
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
    setLoading(false);
  }, [nurseId, supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setAdminId(user.id);
      fetchMessages(user.id);

      const channel = supabase
        .channel(`admin_chat_${user.id}_${nurseId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.receiver_id === nurseId) ||
            (msg.sender_id === nurseId && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            setTimeout(scrollToBottom, 100);
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, [nurseId, fetchMessages, supabase]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [messages, loading]);

  const send = async () => {
    if (!text.trim() || !adminId || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    await supabase.from('messages').insert({
      sender_id: adminId,
      receiver_id: nurseId,
      content,
    });
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="card flex flex-col" style={{ height: 420 }}>
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <span className="text-lg">💬</span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Chat con {nurseName}</p>
          <p className="text-xs text-slate-400">Canal directo de validación</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Cargando mensajes...
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm">Sin mensajes aún</p>
            <p className="text-xs mt-1">Inicia la conversación con el enfermero</p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === adminId;
          const time = new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                }`}
              >
                <p className="break-words leading-snug">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? 'text-primary-200 text-right' : 'text-slate-400'}`}>
                  {time}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Escribe un mensaje..."
          maxLength={500}
          className="input flex-1 text-sm"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
        >
          {sending ? '...' : '➤'}
        </button>
      </div>
    </div>
  );
}
