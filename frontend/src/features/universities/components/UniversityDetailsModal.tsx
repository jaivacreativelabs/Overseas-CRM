import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  MapPin,
  ExternalLink,
  Award,
  Calendar,
  Percent,
  DollarSign,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { University, Course } from '../../../types';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';

interface UniversityDetailsModalProps {
  university: University | null;
  isOpen: boolean;
  onClose: () => void;
  courses?: Course[];
  onSelectProgram?: (course: Course) => void;
}

const DEFAULT_GALLERY_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1000&q=80',
    title: 'Main Academic Quad & Historic Campus',
  },
  {
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80',
    title: 'Smart Digital Lecture Theatre',
  },
  {
    url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=80',
    title: 'Central University Library & Study Commons',
  },
  {
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1000&q=80',
    title: 'Advanced Research & Computer Laboratories',
  },
  {
    url: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1000&q=80',
    title: 'Student Innovation Center & Lounge',
  },
];

export const UniversityDetailsModal: React.FC<UniversityDetailsModalProps> = ({
  university,
  isOpen,
  onClose,
  courses = [],
  onSelectProgram,
}) => {
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Esc key listener & Body scroll locking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, lightboxIndex, onClose]);

  if (!isOpen || !university) return null;

  // Build combined photo list (uploaded galleryPhotos + fallbacks if needed)
  const uploadedPhotos = (university.galleryPhotos || []).map((url, i) => ({
    url,
    title: `Campus Gallery Image ${i + 1}`,
  }));

  const galleryList =
    uploadedPhotos.length > 0
      ? uploadedPhotos
      : DEFAULT_GALLERY_PHOTOS;

  const uniCourses = courses.filter((c) => c.universityId === university._id);
  const defaultFacilities = [
    'Smart Classrooms',
    'Digital Library',
    'High-Performance Computing Lab',
    'Student Accommodation',
    'Sports & Fitness Center',
    'Career Guidance Hub',
  ];
  const facilities =
    university.campusFacilities && university.campusFacilities.length > 0
      ? university.campusFacilities
      : defaultFacilities;

  const overviewText =
    university.overview ||
    university.description ||
    `${university.name} is a premier international higher education institution located in ${university.city || 'a vibrant academic hub'}, ${university.country}. Renowned for groundbreaking research, world-class faculty, and innovative teaching environments, the university offers undergraduate and postgraduate degree programs designed to equip students for global career success.`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      {/* Play Store Modal Window */}
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Top Header Controls */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: 30,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            color: '#FFFFFF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          title="Close (Esc)"
        >
          <X size={20} />
        </button>

        {/* Hero Cover Banner */}
        <div
          style={{
            position: 'relative',
            height: '210px',
            width: '100%',
            backgroundColor: '#0F172A',
            overflow: 'hidden',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            flexShrink: 0,
          }}
        >
          {university.bannerUrl ? (
            <img
              src={university.bannerUrl}
              alt={university.name}
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
                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={64} color="rgba(255, 255, 255, 0.15)" />
            </div>
          )}

          {/* Verified Partner Badge */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '16px',
              backgroundColor: 'rgba(16, 185, 129, 0.9)',
              backdropFilter: 'blur(4px)',
              color: '#FFFFFF',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <CheckCircle2 size={13} color="#FFFFFF" />
            <span>Verified Partner Institution</span>
          </div>
        </div>

        {/* App Header Listing Bar (Play Store Style) */}
        <div style={{ padding: '0 24px 16px 24px', position: 'relative' }}>
          {/* Logo Badge (Pop Out) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
            <div
              style={{
                marginTop: '-42px',
                width: '84px',
                height: '84px',
                borderRadius: '18px',
                backgroundColor: '#FFFFFF',
                padding: '6px',
                border: '3px solid #FFFFFF',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 10,
                flexShrink: 0,
              }}
            >
              {university.logoUrl ? (
                <img
                  src={university.logoUrl}
                  alt={university.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '12px',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    fontWeight: 800,
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {university.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
              {university.website && (
                <a
                  href={university.website.startsWith('http') ? university.website : `https://${university.website}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="secondary" size="sm" icon={<Globe size={14} />}>
                    Official Website
                  </Button>
                </a>
              )}
              <Button
                variant="primary"
                size="sm"
                icon={<GraduationCap size={15} />}
                onClick={() => {
                  const target = document.getElementById('programs-section');
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Programs ({uniCourses.length})
              </Button>
            </div>
          </div>

          {/* Title & Location */}
          <div style={{ marginTop: '12px' }}>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              {university.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
              <MapPin size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 500 }}>
                {[university.address, university.city, university.state, university.country].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>

          {/* Quick Stat Chips (Horizontal Row - Play Store Style) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '18px',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-subtle, #F8FAFC)',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              overflowX: 'auto',
            }}
          >
            {university.ranking && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>GLOBAL RANK</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Award size={14} color="#D97706" />
                  <span>#{university.ranking}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', borderRight: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ACCEPTANCE</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {university.acceptanceRate || '22%'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', borderRight: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ESTABLISHED</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {university.establishedYear || '1868'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>OFFERED COURSES</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                {uniCourses.length} Programs
              </div>
            </div>
          </div>

          {/* --- Play Store Media Carousel (Campus & Classroom Gallery) --- */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Campus & Classroom Gallery
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {galleryList.length} Photos • Click to expand
              </span>
            </div>

            {/* Horizontal Scrollable Gallery Strip */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}
              className="gallery-scroll-strip"
            >
              {galleryList.map((photo, i) => (
                <div
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  style={{
                    flexShrink: 0,
                    width: '260px',
                    height: '150px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.08)',
                    scrollSnapAlign: 'start',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#0F172A',
                    transition: 'transform 0.2s ease',
                  }}
                  className="gallery-photo-card"
                >
                  <img
                    src={photo.url}
                    alt={photo.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '10px 12px',
                    }}
                  >
                    <span style={{ fontSize: '11.5px', color: '#FFFFFF', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {photo.title}
                    </span>
                    <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.8)' }}>
                      <Maximize2 size={13} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* About / Overview Section */}
          <div style={{ marginTop: '22px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              About Institution
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: 0,
                display: isOverviewExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: isOverviewExpanded ? 'unset' : 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {overviewText}
            </p>
            {overviewText.length > 180 && (
              <button
                onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  padding: '4px 0',
                  marginTop: '4px',
                }}
              >
                {isOverviewExpanded ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>

          {/* Campus Highlights & Facilities */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Campus Highlights & Facilities
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {facilities.map((fac, i) => (
                <div
                  key={i}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid rgba(0, 87, 248, 0.15)',
                  }}
                >
                  <CheckCircle2 size={13} color="var(--primary)" />
                  <span>{fac}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Offered Academic Programs List */}
          <div id="programs-section" style={{ marginTop: '26px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Offered Programs & Courses ({uniCourses.length})
              </h3>
            </div>

            {uniCourses.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No courses currently listed for this university.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {uniCourses.map((c) => (
                  <div
                    key={c._id}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>Degree: <strong>{c.level}</strong></span>
                        <span>•</span>
                        <span>Duration: <strong>{c.durationMonths} Months</strong></span>
                        <span>•</span>
                        <span>Intakes: <strong>{(c.intakes || []).join(', ')}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                          {c.currency} {c.annualFee.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>per academic year</div>
                      </div>

                      {onSelectProgram && (
                        <Button variant="primary" size="sm" onClick={() => onSelectProgram(c)}>
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Photo Viewer Modal */}
      {lightboxIndex !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.92)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <X size={28} />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              style={{
                position: 'absolute',
                left: '20px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '50%',
                padding: '12px',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {lightboxIndex < galleryList.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              style={{
                position: 'absolute',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '50%',
                padding: '12px',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={24} />
            </button>
          )}

          <div
            style={{ maxWidth: '900px', maxHeight: '80vh', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryList[lightboxIndex].url}
              alt={galleryList[lightboxIndex].title}
              style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '12px', objectFit: 'contain' }}
            />
            <div style={{ color: '#FFFFFF', marginTop: '12px', fontSize: '14px', fontWeight: 600 }}>
              {galleryList[lightboxIndex].title} ({lightboxIndex + 1} / {galleryList.length})
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
