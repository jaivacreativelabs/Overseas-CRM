import React, { useState, useEffect } from 'react';
import { Plus, Sliders } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input, Select } from '../../components/Form';

export const MastersPage: React.FC = () => {
  const [masters, setMasters] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('LEAD_SOURCE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'LEAD_SOURCE',
    key: '',
    label: '',
    description: '',
  });

  const { success, error } = useToast();

  const fetchMasters = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Record<string, any[]>>('/masters');
      setMasters(res.data || {});
    } catch (err: any) {
      error(err.message || 'Failed to load master records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  const handleCreateMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/masters', { ...form, type: activeType });
      success('Master configuration item added.');
      setIsModalOpen(false);
      setForm({ type: activeType, key: '', label: '', description: '' });
      fetchMasters();
    } catch (err: any) {
      error(err.message || 'Failed to create master item');
    }
  };

  const currentItems = masters[activeType] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            System Master Configurations
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure dropdown values, acquisition sources, closed lost reasons, and intake cycles.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsModalOpen(true)}>
          Add Master Value
        </Button>
      </div>

      <div className="tabs-header">
        <button className={`tab-btn ${activeType === 'LEAD_SOURCE' ? 'active' : ''}`} onClick={() => setActiveType('LEAD_SOURCE')}>
          Lead Sources
        </button>
        <button className={`tab-btn ${activeType === 'CLOSED_LOST_REASON' ? 'active' : ''}`} onClick={() => setActiveType('CLOSED_LOST_REASON')}>
          Closed Lost Reasons
        </button>
        <button className={`tab-btn ${activeType === 'INTAKE' ? 'active' : ''}`} onClick={() => setActiveType('INTAKE')}>
          Intakes
        </button>
      </div>

      <Table
        columns={[
          { header: 'KEY / CODE', accessor: 'key' },
          { header: 'DISPLAY LABEL', accessor: 'label' },
          {
            header: 'STATUS',
            render: () => <span style={{ color: 'var(--success)', fontWeight: 600 }}>Active</span>,
          },
        ]}
        data={currentItems}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Add ${activeType.replace(/_/g, ' ')} Value`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateMaster}>
              Save Item
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateMaster}>
          <Input
            label="Internal Unique Key *"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
            placeholder="e.g. LINKEDIN_CAMPAIGN"
            required
          />
          <Input
            label="Display Label *"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. LinkedIn Sponsored Campaign"
            required
          />
        </form>
      </Modal>
    </div>
  );
};
