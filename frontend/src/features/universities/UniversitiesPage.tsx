import React, { useState, useEffect } from 'react';
import { Plus, Building2, BookOpen, Globe } from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { University, Course, Country } from '../../types';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input, Select } from '../../components/Form';

export const UniversitiesPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'universities' | 'courses' | 'countries'>('universities');
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isUniModalOpen, setIsUniModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [uniForm, setUniForm] = useState({
    name: '',
    country: 'United Kingdom',
    city: '',
    website: '',
    ranking: 50,
  });
  const [courseForm, setCourseForm] = useState({
    universityId: '',
    title: '',
    level: 'MASTER' as const,
    durationMonths: 12,
    annualFee: 25000,
    currency: 'GBP',
    intakes: ['Fall 2026', 'Spring 2027'],
  });

  const { success, error } = useToast();
  const { isStaff } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, cRes, cntRes] = await Promise.all([
        apiClient.get<University[]>('/universities/list'),
        apiClient.get<Course[]>('/universities/courses'),
        apiClient.get<Country[]>('/universities/countries'),
      ]);
      setUniversities(uRes.data || []);
      setCourses(cRes.data || []);
      setCountries(cntRes.data || []);
    } catch (err: any) {
      error(err.message || 'Failed to load university catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/universities', uniForm);
      success('University added to catalog.');
      setIsUniModalOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to create university');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/universities/courses', courseForm);
      success('Course added to catalog.');
      setIsCourseModalOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to create course');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Universities & Program Catalog
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage destination countries, partner universities, and academic courses.
          </p>
        </div>
        {isStaff && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setIsCourseModalOpen(true)}>
              Add Course
            </Button>
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsUniModalOpen(true)}>
              Add University
            </Button>
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeSubTab === 'universities' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('universities')}
        >
          Universities ({universities.length})
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('courses')}
        >
          Courses & Programs ({courses.length})
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'countries' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('countries')}
        >
          Study Destinations ({countries.length})
        </button>
      </div>

      {activeSubTab === 'universities' && (
        <Table
          columns={[
            {
              header: 'UNIVERSITY NAME',
              render: (u) => <strong>{u.name}</strong>,
            },
            { header: 'COUNTRY', accessor: 'country' },
            { header: 'CITY', accessor: 'city' },
            {
              header: 'GLOBAL RANKING',
              render: (u) => (u.ranking ? `#${u.ranking}` : '—'),
            },
            {
              header: 'WEBSITE',
              render: (u) =>
                u.website ? (
                  <a href={u.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                    {u.website}
                  </a>
                ) : (
                  '—'
                ),
            },
          ]}
          data={universities}
          loading={loading}
        />
      )}

      {activeSubTab === 'courses' && (
        <Table
          columns={[
            {
              header: 'COURSE TITLE',
              render: (c) => <strong>{c.title}</strong>,
            },
            { header: 'UNIVERSITY', accessor: 'universityName' },
            { header: 'LEVEL', accessor: 'level' },
            {
              header: 'DURATION',
              render: (c) => `${c.durationMonths} Months`,
            },
            {
              header: 'ANNUAL FEE',
              render: (c) => `${c.currency} ${c.annualFee.toLocaleString()}`,
            },
            {
              header: 'AVAILABLE INTAKES',
              render: (c) => (c.intakes || []).join(', '),
            },
          ]}
          data={courses}
          loading={loading}
        />
      )}

      {activeSubTab === 'countries' && (
        <Table
          columns={[
            {
              header: 'DESTINATION COUNTRY',
              render: (c) => <strong>{c.name}</strong>,
            },
            { header: 'COUNTRY CODE', accessor: 'code' },
            { header: 'DEFAULT CURRENCY', accessor: 'currency' },
          ]}
          data={countries}
          loading={loading}
        />
      )}

      {/* --- Add University Modal --- */}
      <Modal
        isOpen={isUniModalOpen}
        onClose={() => setIsUniModalOpen(false)}
        title="Add Partner University"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsUniModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateUniversity}>
              Save University
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateUniversity}>
          <Input
            label="University Name *"
            value={uniForm.name}
            onChange={(e) => setUniForm({ ...uniForm, name: e.target.value })}
            placeholder="e.g. University of Manchester"
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Country *"
              value={uniForm.country}
              onChange={(e) => setUniForm({ ...uniForm, country: e.target.value })}
              options={countries.map((c) => ({ value: c.name, label: c.name }))}
            />
            <Input
              label="City"
              value={uniForm.city}
              onChange={(e) => setUniForm({ ...uniForm, city: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Website"
              value={uniForm.website}
              onChange={(e) => setUniForm({ ...uniForm, website: e.target.value })}
              placeholder="https://..."
            />
            <Input
              label="Global Ranking"
              type="number"
              value={uniForm.ranking}
              onChange={(e) => setUniForm({ ...uniForm, ranking: parseInt(e.target.value, 10) })}
            />
          </div>
        </form>
      </Modal>

      {/* --- Add Course Modal --- */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title="Add Academic Program / Course"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCourseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateCourse}>
              Save Course
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCourse}>
          <Select
            label="University *"
            value={courseForm.universityId}
            onChange={(e) => setCourseForm({ ...courseForm, universityId: e.target.value })}
            options={universities.map((u) => ({ value: u._id, label: `${u.name} (${u.country})` }))}
            placeholder="Select University..."
            required
          />
          <Input
            label="Course Title *"
            value={courseForm.title}
            onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
            placeholder="e.g. Master of Science in Data Science"
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Level"
              value={courseForm.level}
              onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as any })}
              options={[
                { value: 'MASTER', label: "Master's Degree" },
                { value: 'BACHELOR', label: "Bachelor's Degree" },
                { value: 'DOCTORATE', label: 'Doctorate / PhD' },
                { value: 'DIPLOMA', label: 'Postgraduate Diploma' },
              ]}
            />
            <Input
              label="Duration (Months)"
              type="number"
              value={courseForm.durationMonths}
              onChange={(e) => setCourseForm({ ...courseForm, durationMonths: parseInt(e.target.value, 10) })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Annual Tuition Fee *"
              type="number"
              value={courseForm.annualFee}
              onChange={(e) => setCourseForm({ ...courseForm, annualFee: parseFloat(e.target.value) })}
              required
            />
            <Input
              label="Currency"
              value={courseForm.currency}
              onChange={(e) => setCourseForm({ ...courseForm, currency: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
