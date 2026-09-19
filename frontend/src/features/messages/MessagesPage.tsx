import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Lock } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Textarea } from '../../components/Form';
import { UserRole } from '../../types';

export const MessagesPage: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [loading, setLoading] = useState(true);

  const { success, error } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await apiClient.get<any[]>('/leads', { limit: 50 });
        setLeads(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedLead(res.data[0]);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedLead) return;
      try {
        const res = await apiClient.get<any[]>(`/messages/lead/${selectedLead._id}`);
        setMessages(res.data || []);
      } catch (err) {}
    };
    fetchMessages();
  }, [selectedLead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedLead) return;
    try {
      await apiClient.post('/messages', {
        leadId: selectedLead._id,
        content: newMessage,
        isInternalNote,
      });
      setNewMessage('');
      const res = await apiClient.get<any[]>(`/messages/lead/${selectedLead._id}`);
      setMessages(res.data || []);
      success('Message recorded.');
    } catch (err: any) {
      error(err.message || 'Failed to send');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Student Communications & Internal Notes
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Direct student portal chat and private staff-only internal notes.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '16px',
          height: '600px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Left: Students List */}
        <div style={{ borderRight: '1px solid var(--border-color)', overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
            Active Student Inboxes
          </div>
          {leads.map((l) => (
            <div
              key={l._id}
              onClick={() => setSelectedLead(l)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-light)',
                cursor: 'pointer',
                backgroundColor: selectedLead?._id === l._id ? 'var(--primary-light)' : 'transparent',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{l.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.email}</div>
            </div>
          ))}
        </div>

        {/* Right: Messages Thread */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {selectedLead ? (
            <>
              {/* Header */}
              <div
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{selectedLead.name}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedLead.phone} • {selectedLead.stage}</span>
                </div>
              </div>

              {/* Messages Body */}
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-app)' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>No messages exchanged yet.</div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m._id}
                      style={{
                        alignSelf: m.senderRole === UserRole.STUDENT ? 'flex-start' : 'flex-end',
                        maxWidth: '75%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: m.isInternalNote ? '#FFFBEB' : m.senderRole === UserRole.STUDENT ? '#FFFFFF' : 'var(--primary-light)',
                        border: `1px solid ${m.isInternalNote ? 'var(--warning-border)' : 'var(--border-color)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>
                        <span>{m.senderName} ({m.senderRole}) {m.isInternalNote && '🔒 [INTERNAL NOTE]'}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{new Date(m.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{m.content}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Footer */}
              <form onSubmit={handleSend} style={{ padding: '14px 16px', borderTop: '1px solid var(--border-color)', backgroundColor: '#FFFFFF' }}>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message or internal note..."
                  rows={2}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isInternalNote} onChange={(e) => setIsInternalNote(e.target.checked)} />
                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>🔒 Mark as Internal Note (Staff only)</span>
                  </label>
                  <Button type="submit" variant="primary" size="sm" icon={<Send size={14} />}>
                    Send
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Select a student to view messages.</div>
          )}
        </div>
      </div>
    </div>
  );
};
