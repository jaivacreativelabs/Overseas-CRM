import React, { useState, useEffect } from 'react';
import {
  Plus,
  Building2,
  BookOpen,
  Globe,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  Award,
  Search,
  Filter,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Camera,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { University, Course, Country } from '../../types';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input, Select, Textarea } from '../../components/Form';
import { UniversityDetailsModal } from './components/UniversityDetailsModal';

const BANNER_GRADIENTS = [
  { from: '#1E293B', to: '#0F172A' },
  { from: '#1E40AF', to: '#1E3A8A' },
  { from: '#047857', to: '#064E3B' },
  { from: '#B45309', to: '#78350F' },
  { from: '#6D28D9', to: '#4C1D95' },
  { from: '#BE185D', to: '#831843' },
];

const PRESET_FACILITIES = [
  'Smart Classrooms',
  'Digital Library',
  'Research & Science Labs',
  'Sports & Fitness Complex',
  'Student Accommodation',
  'Auditorium & Theatre',
  'Innovation Hub',
];

export const UniversitiesPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'universities' | 'courses' | 'countries'>('universities');
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for Universities tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('');
  const [sortByRanking, setSortByRanking] = useState<'default' | 'asc' | 'desc'>('default');

  // Modals
  const [isUniModalOpen, setIsUniModalOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [submittingUni, setSubmittingUni] = useState(false);

  // University Detail Modal
  const [selectedUniForDetails, setSelectedUniForDetails] = useState<University | null>(null);

  // University Delete Confirmation
  const [deletingUniId, setDeletingUniId] = useState<string | null>(null);
  const [isDeletingUni, setIsDeletingUni] = useState(false);

  // University Form State
  const [uniForm, setUniForm] = useState({
    name: '',
    country: 'United Kingdom',
    state: '',
    city: '',
    address: '',
    website: '',
    ranking: '' as number | '',
    customComment: '',
    logoUrl: '',
    bannerUrl: '',
    description: '',
    overview: '',
    establishedYear: '' as number | '',
    acceptanceRate: '',
    averageTuitionFee: '',
    campusFacilities: [] as string[],
    galleryPhotos: [] as string[],
  });
  const [uniFormErrors, setUniFormErrors] = useState<Record<string, string>>({});

  // Media Upload Drag & Drop and Processing States
  const [isBannerDragging, setIsBannerDragging] = useState(false);
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const [isGalleryDragging, setIsGalleryDragging] = useState(false);
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isProcessingGallery, setIsProcessingGallery] = useState(false);

  // Course Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [submittingCourse, setSubmittingCourse] = useState(false);
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

  // Client-side image canvas compression (< 120 KB base64 JPEG)
  const compressImage = (file: File, maxDim = 800, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const validateImageFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      error('Please select an image file (JPG, PNG, or WEBP)');
      return false;
    }
    return true;
  };

  const processBannerFile = async (file: File) => {
    if (!validateImageFile(file)) return;
    setIsProcessingBanner(true);
    try {
      const compressed = await compressImage(file, 1200, 0.75);
      setUniForm((prev) => ({ ...prev, bannerUrl: compressed }));
      success('Campus cover banner updated.');
    } catch (err) {
      error('Failed to process cover banner.');
    } finally {
      setIsProcessingBanner(false);
    }
  };

  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processBannerFile(e.target.files[0]);
    e.target.value = '';
  };

  const processLogoFile = async (file: File) => {
    if (!validateImageFile(file)) return;
    setIsProcessingLogo(true);
    try {
      const compressed = await compressImage(file, 250, 0.85);
      setUniForm((prev) => ({ ...prev, logoUrl: compressed }));
      success('Institution logo updated.');
    } catch (err) {
      error('Failed to process logo image.');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processLogoFile(e.target.files[0]);
    e.target.value = '';
  };

  const processGalleryFiles = async (files: File[]) => {
    const validFiles = files.filter((f) => {
      if (!f.type.startsWith('image/')) {
        error(`"${f.name}" is not an image. Please select JPG, PNG, or WEBP.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsProcessingGallery(true);
    try {
      const compressedList = await Promise.all(validFiles.map((f) => compressImage(f, 800, 0.7)));
      setUniForm((prev) => ({
        ...prev,
        galleryPhotos: [...prev.galleryPhotos, ...compressedList],
      }));
      success(`Added ${compressedList.length} photo(s) to campus gallery.`);
    } catch (err) {
      error('Failed to process gallery images.');
    } finally {
      setIsProcessingGallery(false);
    }
  };

  const handleGalleryPhotosSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processGalleryFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeGalleryPhoto = (index: number) => {
    setUniForm((prev) => ({
      ...prev,
      galleryPhotos: prev.galleryPhotos.filter((_, i) => i !== index),
    }));
  };

  const toggleFacilityTag = (fac: string) => {
    setUniForm((prev) => {
      const exists = prev.campusFacilities.includes(fac);
      return {
        ...prev,
        campusFacilities: exists
          ? prev.campusFacilities.filter((f) => f !== fac)
          : [...prev.campusFacilities, fac],
      };
    });
  };

  const openAddUniModal = () => {
    setEditingUniversity(null);
    setUniForm({
      name: '',
      country: countries[0]?.name || 'United Kingdom',
      state: '',
      city: '',
      address: '',
      website: '',
      ranking: '',
      customComment: '',
      logoUrl: '',
      bannerUrl: '',
      description: '',
      overview: '',
      establishedYear: '',
      acceptanceRate: '',
      averageTuitionFee: '',
      campusFacilities: [...PRESET_FACILITIES],
      galleryPhotos: [],
    });
    setUniFormErrors({});
    setIsUniModalOpen(true);
  };

  const openEditUniModal = (u: University) => {
    setEditingUniversity(u);
    setUniForm({
      name: u.name || '',
      country: u.country || 'United Kingdom',
      state: u.state || '',
      city: u.city || '',
      address: u.address || '',
      website: u.website || '',
      ranking: u.ranking !== undefined && u.ranking !== null ? u.ranking : '',
      customComment: u.customComment || '',
      logoUrl: u.logoUrl || '',
      bannerUrl: u.bannerUrl || '',
      description: u.description || '',
      overview: u.overview || '',
      establishedYear: u.establishedYear !== undefined && u.establishedYear !== null ? u.establishedYear : '',
      acceptanceRate: u.acceptanceRate || '',
      averageTuitionFee: u.averageTuitionFee || '',
      campusFacilities: u.campusFacilities || [...PRESET_FACILITIES],
      galleryPhotos: u.galleryPhotos || [],
    });
    setUniFormErrors({});
    setIsUniModalOpen(true);
  };

  const validateUniForm = () => {
    const errors: Record<string, string> = {};
    if (!uniForm.name.trim()) errors.name = 'University name is required';
    if (!uniForm.country.trim()) errors.country = 'Country is required';
    if (!uniForm.city.trim()) errors.city = 'City is required';
    if (uniForm.website && !/^https?:\/\//i.test(uniForm.website) && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(uniForm.website)) {
      errors.website = 'Enter a valid URL (e.g. https://ox.ac.uk)';
    }
    setUniFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUniForm()) return;

    setSubmittingUni(true);
    try {
      const payload = {
        name: uniForm.name.trim(),
        country: uniForm.country,
        state: uniForm.state.trim() || undefined,
        city: uniForm.city.trim(),
        address: uniForm.address.trim() || undefined,
        website: uniForm.website.trim()
          ? uniForm.website.startsWith('http')
            ? uniForm.website.trim()
            : `https://${uniForm.website.trim()}`
          : undefined,
        ranking: uniForm.ranking !== '' ? Number(uniForm.ranking) : undefined,
        customComment: uniForm.customComment.trim(),
        logoUrl: uniForm.logoUrl.trim() || undefined,
        bannerUrl: uniForm.bannerUrl.trim() || undefined,
        description: uniForm.description.trim() || undefined,
        overview: uniForm.overview.trim() || undefined,
        establishedYear: uniForm.establishedYear !== '' ? Number(uniForm.establishedYear) : undefined,
        acceptanceRate: uniForm.acceptanceRate.trim() || undefined,
        averageTuitionFee: uniForm.averageTuitionFee.trim() || undefined,
        campusFacilities: uniForm.campusFacilities,
        galleryPhotos: uniForm.galleryPhotos,
      };

      if (editingUniversity) {
        const res = await apiClient.put<University>(`/universities/${editingUniversity._id}`, payload);
        success(`Updated ${res.data?.name || 'University'}.`);
        setUniversities((prev) => prev.map((u) => (u._id === editingUniversity._id ? { ...u, ...payload } : u)));
      } else {
        const res = await apiClient.post<University>('/universities', payload);
        success(`Added ${res.data?.name || 'University'} to catalog.`);
        if (res.data) {
          setUniversities((prev) => [res.data, ...prev]);
        }
      }

      setIsUniModalOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to save university');
    } finally {
      setSubmittingUni(false);
    }
  };

  const handleDeleteUniversity = async () => {
    if (!deletingUniId) return;
    setIsDeletingUni(true);
    try {
      await apiClient.delete(`/universities/${deletingUniId}`);
      success('University removed from catalog.');
      setUniversities((prev) => prev.filter((u) => u._id !== deletingUniId));
      setDeletingUniId(null);
    } catch (err: any) {
      error(err.message || 'Failed to delete university');
    } finally {
      setIsDeletingUni(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.universityId || !courseForm.title) {
      error('Please fill out all required fields');
      return;
    }
    setSubmittingCourse(true);
    try {
      await apiClient.post('/universities/courses', courseForm);
      success('Course added to catalog.');
      setIsCourseModalOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to create course');
    } finally {
      setSubmittingCourse(false);
    }
  };

  // Filter & Sort Universities
  const filteredUniversities = universities
    .filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.city && u.city.toLowerCase().includes(q)) ||
        (u.state && u.state.toLowerCase().includes(q)) ||
        u.country.toLowerCase().includes(q);
      const matchesCountry = !selectedCountryFilter || u.country === selectedCountryFilter;
      return matchesSearch && matchesCountry;
    })
    .sort((a, b) => {
      if (sortByRanking === 'asc') {
        return (a.ranking || 9999) - (b.ranking || 9999);
      }
      if (sortByRanking === 'desc') {
        return (b.ranking || 0) - (a.ranking || 0);
      }
      return 0;
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Bar */}
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
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openAddUniModal}>
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

      {/* --- TAB 1: UNIVERSITIES GRID VIEW --- */}
      {activeSubTab === 'universities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search & Filter Control Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: '#FFFFFF',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search university name, city, state, or country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', width: '100%' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} color="var(--text-muted)" />
                <select
                  value={selectedCountryFilter}
                  onChange={(e) => setSelectedCountryFilter(e.target.value)}
                  className="form-select"
                  style={{ fontSize: '13px', padding: '6px 10px' }}
                >
                  <option value="">All Countries</option>
                  {countries.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={sortByRanking}
                onChange={(e) => setSortByRanking(e.target.value as any)}
                className="form-select"
                style={{ fontSize: '13px', padding: '6px 10px' }}
              >
                <option value="default">Sort by: Default</option>
                <option value="asc">Rank: Best First (#1, #2...)</option>
                <option value="desc">Rank: Highest Numeric</option>
              </select>
            </div>
          </div>

          {/* Grid Layout of Standalone University Cards */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading university catalog...
            </div>
          ) : filteredUniversities.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Building2 size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                No universities found
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {searchQuery || selectedCountryFilter
                  ? 'Try adjusting your search criteria or country filters.'
                  : 'Start building your catalog by adding partner universities.'}
              </p>
              {isStaff && (
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openAddUniModal}>
                  Add Partner University
                </Button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                gap: '20px',
              }}
            >
              {filteredUniversities.map((u, idx) => {
                const gradient = BANNER_GRADIENTS[idx % BANNER_GRADIENTS.length];
                const courseCount = courses.filter((c) => c.universityId === u._id).length;

                return (
                  <div
                    key={u._id}
                    onClick={() => setSelectedUniForDetails(u)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: '14px',
                      boxShadow: 'var(--shadow-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    className="university-card-item"
                  >
                    {/* Cover Banner Image Container (Isolated Overflow) */}
                    <div
                      style={{
                        position: 'relative',
                        height: '130px',
                        width: '100%',
                        backgroundColor: '#0F172A',
                        borderTopLeftRadius: '13px',
                        borderTopRightRadius: '13px',
                        overflow: 'hidden',
                      }}
                    >
                      {u.bannerUrl ? (
                        <img
                          src={u.bannerUrl}
                          alt={u.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Building2 size={44} color="rgba(255, 255, 255, 0.22)" />
                        </div>
                      )}

                      {/* Highlight Tag / Custom Comment / Global Ranking Badge Chip */}
                      {(u.customComment?.trim() || (u.ranking !== undefined && u.ranking !== null)) && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(4px)',
                            color: '#FBBF24',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            whiteSpace: 'nowrap',
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            zIndex: 10,
                          }}
                          title={u.customComment?.trim() || `Global Rank #${u.ranking}`}
                        >
                          {u.customComment?.trim() ? (
                            <Sparkles size={12} color="#FBBF24" style={{ flexShrink: 0 }} />
                          ) : (
                            <Award size={12} color="#FBBF24" style={{ flexShrink: 0 }} />
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.customComment?.trim() || `#${u.ranking} Global`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pop-Out University Logo / Avatar Badge */}
                    <div
                      style={{
                        marginTop: '-28px',
                        marginLeft: '16px',
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        backgroundColor: '#FFFFFF',
                        padding: '4px',
                        border: '2px solid #FFFFFF',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 10,
                        flexShrink: 0,
                      }}
                    >
                      {u.logoUrl ? (
                        <img
                          src={u.logoUrl}
                          alt={u.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '8px',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div style={{ padding: '12px 16px 14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <h3
                          style={{
                            fontSize: '15.5px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.3,
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={u.name}
                        >
                          {u.name}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                          <MapPin size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[u.city, u.state, u.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      </div>

                      {(u.overview || u.description) && (
                        <p
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            margin: '2px 0 0 0',
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {u.overview || u.description}
                        </p>
                      )}

                      <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        {u.website ? (
                          <a
                            href={u.website.startsWith('http') ? u.website : `https://${u.website}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: '12px',
                              color: 'var(--primary)',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe size={13} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px', whiteSpace: 'nowrap' }}>
                              {u.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No website linked</span>
                        )}

                        <Badge variant="neutral">
                          {courseCount} {courseCount === 1 ? 'Program' : 'Programs'}
                        </Badge>
                      </div>
                    </div>

                    {/* Quick Action Footer */}
                    <div
                      style={{
                        padding: '10px 16px',
                        borderTop: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle, #F9FAFB)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye size={13} />}
                        onClick={() => setSelectedUniForDetails(u)}
                      >
                        View Details
                      </Button>

                      {isStaff && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditUniModal(u);
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              padding: '5px 8px',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Edit University"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingUniId(u._id);
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              borderRadius: 'var(--radius-md)',
                              padding: '5px 8px',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete University"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: COURSES TABLE --- */}
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

      {/* --- TAB 3: COUNTRIES TABLE --- */}
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

      {/* --- Refactored Add / Edit Partner University Modal --- */}
      <Modal
        isOpen={isUniModalOpen}
        onClose={() => setIsUniModalOpen(false)}
        title={editingUniversity ? 'Edit Partner University' : 'Add Partner University'}
        maxWidth="620px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsUniModalOpen(false)} disabled={submittingUni}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveUniversity} disabled={submittingUni}>
              {submittingUni ? 'Saving...' : editingUniversity ? 'Update University' : 'Save University'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveUniversity} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Section 1: Media & Visuals */}
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-subtle, #F9FAFB)', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              1. Media & Visuals
            </div>

            {/* Profile Staging Card: Banner + Floating Logo */}
            <div
              style={{
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                marginBottom: '16px',
              }}
            >
              {/* Cover Banner Area (Height: ~140px–160px) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsBannerDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsBannerDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsBannerDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    processBannerFile(e.dataTransfer.files[0]);
                  }
                }}
                style={{
                  position: 'relative',
                  height: '150px',
                  backgroundColor: isBannerDragging ? '#EFF6FF' : '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {isProcessingBanner ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                    <Loader2 size={24} className="animate-spin" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Processing banner...</span>
                  </div>
                ) : uniForm.bannerUrl ? (
                  <>
                    <img
                      src={uniForm.bannerUrl}
                      alt="Campus Banner"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Top-Right Action Pills */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        display: 'flex',
                        gap: '6px',
                        zIndex: 10,
                      }}
                    >
                      <label
                        style={{
                          padding: '5px 10px',
                          backgroundColor: 'rgba(15, 23, 42, 0.75)',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        }}
                        title="Change campus banner"
                      >
                        <Edit2 size={12} />
                        <span>Change</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleBannerFileSelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setUniForm((prev) => ({ ...prev, bannerUrl: '' }))}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: 'rgba(239, 68, 68, 0.85)',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        }}
                        title="Remove campus banner"
                      >
                        <Trash2 size={12} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* Banner Empty State */
                  <label
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      border: isBannerDragging ? '2px dashed #0057F8' : 'none',
                      backgroundColor: isBannerDragging ? '#EFF6FF' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: isBannerDragging ? '#DBEAFE' : '#EEF2F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isBannerDragging ? '#0057F8' : '#64748B',
                      }}
                    >
                      <ImageIcon size={20} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                      Click or drag campus banner here
                    </span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleBannerFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Staging Footer Row: Floating Logo & Institution Crest Info */}
              <div
                style={{
                  padding: '0 16px 14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                {/* Floating Logo Avatar (Bottom-Left Corner) */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsLogoDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsLogoDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsLogoDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      processLogoFile(e.dataTransfer.files[0]);
                    }
                  }}
                  style={{
                    marginTop: '-32px',
                    width: '68px',
                    height: '68px',
                    borderRadius: '12px',
                    backgroundColor: '#FFFFFF',
                    border: isLogoDragging ? '2.5px dashed #0057F8' : '3px solid #FFFFFF',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                    position: 'relative',
                    zIndex: 5,
                    flexShrink: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isProcessingLogo ? (
                    <Loader2 size={20} className="animate-spin" color="var(--primary)" />
                  ) : uniForm.logoUrl ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <img
                        src={uniForm.logoUrl}
                        alt="Logo"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          padding: '4px',
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                      {/* Tiny top-right remove badge */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUniForm((prev) => ({ ...prev, logoUrl: '' }));
                        }}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                        }}
                        title="Remove logo"
                      >
                        <X size={9} />
                      </button>
                      {/* Tiny hover edit overlay badge */}
                      <label
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(15, 23, 42, 0.7)',
                          color: '#FFFFFF',
                          fontSize: '9px',
                          fontWeight: 600,
                          textAlign: 'center',
                          padding: '2px 0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                        }}
                        title="Change logo"
                      >
                        <Edit2 size={9} />
                        <span>Edit</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/svg+xml"
                          onChange={handleLogoFileSelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  ) : (
                    /* Empty Logo State */
                    <label
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        cursor: 'pointer',
                        backgroundColor: isLogoDragging ? '#EFF6FF' : '#F8FAFC',
                        border: isLogoDragging ? 'none' : '1px dashed #CBD5E1',
                        borderRadius: '9px',
                      }}
                      title="Upload University Crest / Logo"
                    >
                      <Camera size={18} color="#64748B" />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                        Logo
                      </span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={handleLogoFileSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

                {/* Header Footer Info (Next to Logo) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flex: 1,
                    paddingTop: '8px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Institution Crest / Logo
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--primary-light, #EFF6FF)',
                      }}
                    >
                      <Upload size={12} />
                      <span>{uniForm.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={handleLogoFileSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {uniForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setUniForm((prev) => ({ ...prev, logoUrl: '' }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Campus & Classroom Photo Gallery */}
            <div>
              <style>{`
                .gallery-grid-responsive {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 10px;
                }
                @media (max-width: 540px) {
                  .gallery-grid-responsive {
                    grid-template-columns: repeat(3, 1fr);
                  }
                }
                .gallery-thumb-card {
                  position: relative;
                  height: 90px;
                  border-radius: 10px;
                  overflow: hidden;
                  background-color: #f1f5f9;
                  border: 1px solid #e2e8f0;
                }
                .gallery-thumb-card .gallery-thumb-overlay {
                  position: absolute;
                  inset: 0;
                  background-color: rgba(15, 23, 42, 0);
                  transition: background-color 0.2s ease;
                  display: flex;
                  justify-content: flex-end;
                  align-items: flex-start;
                  padding: 4px;
                }
                .gallery-thumb-card:hover .gallery-thumb-overlay {
                  background-color: rgba(15, 23, 42, 0.35);
                }
                .gallery-thumb-card .gallery-trash-btn {
                  opacity: 0.85;
                  transition: all 0.15s ease;
                }
                .gallery-thumb-card:hover .gallery-trash-btn {
                  opacity: 1;
                  transform: scale(1.05);
                }
              `}</style>

              {/* Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Campus & Classroom Gallery
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                  }}
                >
                  {uniForm.galleryPhotos.length}/8 photos
                </span>
              </div>

              {/* Interactive Thumbnail Grid */}
              <div className="gallery-grid-responsive">
                {/* Tile 1: "Add Photos" Action Tile */}
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsGalleryDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsGalleryDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsGalleryDragging(false);
                    if (e.dataTransfer.files) {
                      processGalleryFiles(Array.from(e.dataTransfer.files));
                    }
                  }}
                  style={{
                    height: '90px',
                    border: isGalleryDragging ? '2px dashed #0057F8' : '2px dashed #CBD5E1',
                    borderRadius: '10px',
                    backgroundColor: isGalleryDragging ? '#EFF6FF' : '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Click or drag to add photos"
                >
                  <Plus size={20} color="var(--primary)" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Add Photos
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryPhotosSelect}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Processing State Tile */}
                {isProcessingGallery && (
                  <div
                    style={{
                      height: '90px',
                      borderRadius: '10px',
                      border: '1px dashed var(--primary)',
                      backgroundColor: '#EFF6FF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      color: 'var(--primary)',
                    }}
                  >
                    <Loader2 size={20} className="animate-spin" />
                    <span style={{ fontSize: '10px', fontWeight: 600 }}>Processing...</span>
                  </div>
                )}

                {/* Uploaded Photo Tiles */}
                {uniForm.galleryPhotos.map((photo, i) => (
                  <div key={i} className="gallery-thumb-card">
                    <img
                      src={photo}
                      alt={`Campus Photo ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div className="gallery-thumb-overlay">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGalleryPhoto(i);
                        }}
                        className="gallery-trash-btn"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                        title="Remove photo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* 3 Outline Placeholder Boxes when no photos are added yet */}
                {uniForm.galleryPhotos.length === 0 && (
                  <>
                    <div
                      style={{
                        height: '90px',
                        borderRadius: '10px',
                        border: '1.5px dashed #CBD5E1',
                        backgroundColor: '#FAFAFA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ImageIcon size={20} color="#CBD5E1" />
                    </div>
                    <div
                      style={{
                        height: '90px',
                        borderRadius: '10px',
                        border: '1.5px dashed #CBD5E1',
                        backgroundColor: '#FAFAFA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ImageIcon size={20} color="#CBD5E1" />
                    </div>
                    <div
                      style={{
                        height: '90px',
                        borderRadius: '10px',
                        border: '1.5px dashed #CBD5E1',
                        backgroundColor: '#FAFAFA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ImageIcon size={20} color="#CBD5E1" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Identity & Key Institutional Info */}
          <div style={{ padding: '12px 14px', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              2. Identity & Academic Profile
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input
                label="University Name *"
                value={uniForm.name}
                onChange={(e) => setUniForm({ ...uniForm, name: e.target.value })}
                placeholder="e.g. Technical University of Munich"
                error={uniFormErrors.name}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Card Tag / Highlight Comment (Optional)"
                  value={uniForm.customComment}
                  onChange={(e) => setUniForm({ ...uniForm, customComment: e.target.value.slice(0, 40) })}
                  placeholder="e.g. Top Choice, #49 Global, 100% Scholarship, Low Tuition"
                  maxLength={40}
                  helperText="Short highlight badge displayed in the top-right corner of the university card."
                />
                <Input
                  label="Official Website URL"
                  value={uniForm.website}
                  onChange={(e) => setUniForm({ ...uniForm, website: e.target.value })}
                  placeholder="https://tum.de"
                  error={uniFormErrors.website}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <Input
                  label="Established Year"
                  type="number"
                  value={uniForm.establishedYear}
                  onChange={(e) => setUniForm({ ...uniForm, establishedYear: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                  placeholder="e.g. 1868"
                />
                <Input
                  label="Acceptance Rate"
                  value={uniForm.acceptanceRate}
                  onChange={(e) => setUniForm({ ...uniForm, acceptanceRate: e.target.value })}
                  placeholder="e.g. 24%"
                />
                <Input
                  label="Avg. Tuition Fee"
                  value={uniForm.averageTuitionFee}
                  onChange={(e) => setUniForm({ ...uniForm, averageTuitionFee: e.target.value })}
                  placeholder="e.g. $32,000 / yr"
                />
              </div>

              <Textarea
                label="Overview / About Institution"
                value={uniForm.overview || uniForm.description}
                onChange={(e) => setUniForm({ ...uniForm, overview: e.target.value, description: e.target.value })}
                placeholder="Comprehensive overview of campus facilities, research prestige, or academic reputation..."
                rows={3}
              />

              {/* Campus Facilities Select Chips */}
              <div>
                <label className="form-label">Campus Highlights & Facilities</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {PRESET_FACILITIES.map((fac) => {
                    const isSelected = uniForm.campusFacilities.includes(fac);
                    return (
                      <button
                        key={fac}
                        type="button"
                        onClick={() => toggleFacilityTag(fac)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-subtle)',
                          color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {fac}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Detailed Location Information */}
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle, #F9FAFB)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              3. Detailed Location Information
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Select
                  label="Country *"
                  value={uniForm.country}
                  onChange={(e) => setUniForm({ ...uniForm, country: e.target.value })}
                  options={countries.map((c) => ({ value: c.name, label: c.name }))}
                  error={uniFormErrors.country}
                  required
                />
                <Input
                  label="State / Province / Region"
                  value={uniForm.state}
                  onChange={(e) => setUniForm({ ...uniForm, state: e.target.value })}
                  placeholder="e.g. Bavaria or Ontario"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="City *"
                  value={uniForm.city}
                  onChange={(e) => setUniForm({ ...uniForm, city: e.target.value })}
                  placeholder="e.g. Munich"
                  error={uniFormErrors.city}
                  required
                />
                <Input
                  label="Campus Address / Postal Code"
                  value={uniForm.address}
                  onChange={(e) => setUniForm({ ...uniForm, address: e.target.value })}
                  placeholder="e.g. Arcisstraße 21, 80333"
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* --- Rich Play Store-Style University Details Modal --- */}
      <UniversityDetailsModal
        university={selectedUniForDetails}
        isOpen={!!selectedUniForDetails}
        onClose={() => setSelectedUniForDetails(null)}
        courses={courses}
      />

      {/* --- Delete Confirmation Modal --- */}
      {deletingUniId && (
        <Modal
          isOpen={!!deletingUniId}
          onClose={() => setDeletingUniId(null)}
          title="Delete Partner University"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeletingUniId(null)} disabled={isDeletingUni}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteUniversity} disabled={isDeletingUni}>
                {isDeletingUni ? 'Removing...' : 'Delete University'}
              </Button>
            </>
          }
        >
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', margin: 0 }}>
              Are you sure you want to remove this university from the active catalog? This will hide the university and its listed programs from shortlisting.
            </p>
          </div>
        </Modal>
      )}

      {/* --- Add Course Modal --- */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title="Add Academic Program / Course"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCourseModalOpen(false)} disabled={submittingCourse}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateCourse} disabled={submittingCourse}>
              {submittingCourse ? 'Saving...' : 'Save Course'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
