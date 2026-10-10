import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  Bell,
  HelpCircle,
  Menu,
  ChevronDown,
  Globe,
  CheckCircle2,
  X,
  Compass,
  Building2,
  FileText,
  BarChart3,
  Eye,
  Pin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NAVIGATION_SECTIONS } from '../routes/NavigationConfig';
import { apiClient } from '../services/api-client';
import { NotificationItem, UserRole, AdminType, Lead, StudentStage } from '../types';
import { UserGuideModal } from '../components/UserGuide';
import { VerticalStageStepper } from '../components/StageStepper';
import { ContextMenu } from '../components/ContextMenu';
import { getPinnedModules, togglePinModule } from '../utils/pinnedModules';
import { REPORT_TABS } from '../features/reports/ReportsPage';
import {
  getCounsellorPins,
  toggleCounsellorPin,
  CounsellorPinnedItem,
} from '../utils/counsellorPinManager';

export const AppLayout: React.FC = () => {
  const { user, logout, isStaff, isStudent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const getInitialSidebarState = (): boolean => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return true; // Auto-collapsed on mobile
    }
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved !== null ? saved === 'true' : false; // Default EXPANDED (false) on desktop/laptop
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(getInitialSidebarState);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPinnedItems, setShowPinnedItems] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [studentStage, setStudentStage] = useState<StudentStage>(StudentStage.PROFILE_EVALUATION);

  const [pinnedModules, setPinnedModules] = useState<string[]>(getPinnedModules());
  const [counsellorPins, setCounsellorPins] = useState<CounsellorPinnedItem[]>(() =>
    user?._id ? getCounsellorPins(user._id) : []
  );
  const [sidebarContextMenu, setSidebarContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  useEffect(() => {
    const handlePinnedChange = () => setPinnedModules(getPinnedModules());
    window.addEventListener('pinned_modules_changed', handlePinnedChange);
    return () => window.removeEventListener('pinned_modules_changed', handlePinnedChange);
  }, []);

  useEffect(() => {
    const syncCounsellorPins = () => {
      if (user?._id) {
        setCounsellorPins(getCounsellorPins(user._id));
      }
    };
    syncCounsellorPins();
    window.addEventListener('counsellor_pins_changed', syncCounsellorPins);
    return () => window.removeEventListener('counsellor_pins_changed', syncCounsellorPins);
  }, [user?._id]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (window.innerWidth >= 768) {
        localStorage.setItem('sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  // If student is logged in, redirect them to student portal if accessing admin panel
  useEffect(() => {
    if (isStudent && !location.pathname.startsWith('/portal')) {
      navigate('/portal');
    }
  }, [isStudent, location.pathname, navigate]);

  // Fetch student application stage if user is student
  useEffect(() => {
    const fetchStudentStage = async () => {
      try {
        const res = await apiClient.get<Lead[]>('/leads', { isStudent: true, limit: 1 });
        if (res.data?.[0]?.stage) {
          setStudentStage(res.data[0].stage as StudentStage);
        }
      } catch (err) {
        // silent fail
      }
    };
    if (isStudent) fetchStudentStage();
  }, [isStudent]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get<NotificationItem[]>('/notifications');
        setNotifications(res.data || []);
        setUnreadCount((res.data || []).filter((n) => !n.isRead).length);
      } catch (err) {
        // silent fail
      }
    };
    if (user) fetchNotifications();
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) { }
  };

  const isOwnerAdmin =
    user?.role === UserRole.ADMIN &&
    (user?.adminType === AdminType.OWNER_ADMIN || !user?.adminType);

  const allowedSections = NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!user) return false;
      if (item.isOwnerAdminOnly) {
        return isOwnerAdmin;
      }
      return item.roles.includes(user.role);
    }),
  })).filter((section) => section.items.length > 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      <style>{`
        @media (max-width: 768px) {
          .app-sidebar-panel {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
          }
        }

        @media (min-width: 769px) {
          .app-sidebar-backdrop {
            display: none !important;
          }
        }

        .app-notification-popover {
          position: absolute;
          top: 44px;
          right: 0;
          width: 330px;
          max-width: calc(100vw - 24px);
          background-color: #FFFFFF;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
          z-index: 1100;
          overflow: hidden;
        }

        @media (max-width: 640px) {
          .app-notification-popover {
            position: fixed !important;
            top: 62px !important;
            left: 12px !important;
            right: 12px !important;
            width: auto !important;
            max-width: none !important;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22) !important;
          }

          .app-user-profile-info {
            display: none !important;
          }
        }
      `}</style>

      {/* Backdrop overlay when left panel is open on mobile */}
      {!sidebarCollapsed && isMobile && (
        <div
          className="app-sidebar-backdrop"
          onClick={() => setSidebarCollapsed(true)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* --- Left Sidebar Panel --- */}
      <aside
        className="app-sidebar-panel"
        style={{
          width: '260px',
          maxWidth: '100vw',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 1000,
          transform: sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isMobile ? (sidebarCollapsed ? 'none' : '4px 0 24px rgba(0, 0, 0, 0.18)') : 'none',
        }}
      >
        {/* Brand Logo & Top Close Bar */}
        <div
          style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
            <img
              src="/logo.png"
              alt="IIEC Logo"
              style={{
                height: '32px',
                maxWidth: '135px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#D8232A',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                padding: '2px 5px',
                borderRadius: '4px',
                letterSpacing: '0.04em',
              }}
            >
              CRM
            </span>
          </div>

          <button
            onClick={toggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Close Panel"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Grouped Navigation List or Student Progress Timeline */}
        <nav
          style={{
            flex: 1,
            padding: '12px 10px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {isStudent || location.pathname.startsWith('/portal') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    padding: '4px 10px 3px',
                  }}
                >
                  STUDENT JOURNEY
                </div>

                <NavLink
                  to="/portal?tab=universities"
                  onClick={handleNavClick}
                  style={() => {
                    const active = location.pathname.startsWith('/portal') && location.search.includes('tab=universities');
                    return {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      color: active ? 'var(--primary)' : 'var(--text-secondary)',
                      backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                      fontWeight: active ? 600 : 500,
                      fontSize: '13.5px',
                      transition: 'all 0.15s ease',
                      textDecoration: 'none',
                    };
                  }}
                >
                  <Building2 size={18} strokeWidth={2} />
                  <span>📍 Universities</span>
                </NavLink>

                <NavLink
                  to="/portal?tab=documents"
                  onClick={handleNavClick}
                  style={() => {
                    const active = location.pathname.startsWith('/portal') && location.search.includes('tab=documents');
                    return {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      color: active ? 'var(--primary)' : 'var(--text-secondary)',
                      backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                      fontWeight: active ? 600 : 500,
                      fontSize: '13.5px',
                      transition: 'all 0.15s ease',
                      textDecoration: 'none',
                    };
                  }}
                >
                  <FileText size={18} strokeWidth={2} />
                  <span>📄 Documents</span>
                </NavLink>

                <NavLink
                  to="/portal?tab=report"
                  onClick={handleNavClick}
                  style={() => {
                    const active = location.pathname.startsWith('/portal') && (!location.search.includes('tab=universities') && !location.search.includes('tab=documents'));
                    return {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      color: active ? 'var(--primary)' : 'var(--text-secondary)',
                      backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                      fontWeight: active ? 600 : 500,
                      fontSize: '13.5px',
                      transition: 'all 0.15s ease',
                      textDecoration: 'none',
                    };
                  }}
                >
                  <BarChart3 size={18} strokeWidth={2} />
                  <span>📊 Report</span>
                </NavLink>
              </div>

              <VerticalStageStepper currentStage={studentStage} sidebarCollapsed={false} />
            </div>
          ) : (
            allowedSections.map((section, sIdx) => (
              <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    padding: sIdx === 0 ? '4px 10px 3px' : '8px 10px 3px',
                  }}
                >
                  {section.title}
                </div>

                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={handleNavClick}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        justifyContent: 'flex-start',
                        borderRadius: 'var(--radius-md)',
                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '13.5px',
                        transition: 'all 0.15s ease',
                      })}
                    >
                      <Icon size={18} strokeWidth={2} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}

                {/* Dynamically Pinned Modules under Student Journey */}
                {section.title === 'Student Journey' &&
                  pinnedModules.map((modId) => {
                    const modConfig = REPORT_TABS.find((t) => t.id === modId);
                    if (!modConfig) return null;
                    const ModIcon = modConfig.icon;
                    return (
                      <NavLink
                        key={`pinned-${modId}`}
                        to={`/reports?tab=${modId}`}
                        onClick={handleNavClick}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSidebarContextMenu({ x: e.clientX, y: e.clientY, tabId: modId });
                        }}
                        style={({ isActive }) => {
                          const active = isActive || location.search.includes(`tab=${modId}`);
                          return {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            justifyContent: 'flex-start',
                            borderRadius: 'var(--radius-md)',
                            color: active ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                            fontWeight: active ? 600 : 500,
                            fontSize: '13.5px',
                            transition: 'all 0.15s ease',
                            textDecoration: 'none',
                          };
                        }}
                        title={`Pinned shortcut. Right-click to unpin ${modConfig.label}`}
                      >
                        <ModIcon size={18} strokeWidth={2} />
                        <span>📌 {modConfig.label}</span>
                      </NavLink>
                    );
                  })}
              </div>
            ))
          )}
        </nav>

        {/* Bottom Section: Help & Logout */}
        <div
          style={{
            padding: '12px 10px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {!isStudent && (
            <button
              onClick={() => {
                setIsGuideOpen(true);
                handleNavClick();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                justifyContent: 'flex-start',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13.5px',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <HelpCircle size={18} />
              <span>User Guide & FAQs</span>
            </button>
          )}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              justifyContent: 'flex-start',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13.5px',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? 0 : '260px'),
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: '100%',
        }}
      >
        {/* Top Header */}
        <header
          style={{
            height: '56px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            position: 'sticky',
            top: 0,
            zIndex: 90,
          }}
        >
          {/* Left Header Actions: 3-Bars Hamburger Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {sidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  transition: 'background-color 0.15s ease',
                }}
                title={'Open Left Panel'}
              >
                <Menu size={20} />
              </button>
            )}
          </div>

          {/* Right Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Counsellor Pinned Items */}
            {user && (user.role === UserRole.COUNSELLOR || user.role === UserRole.ADMIN) && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowPinnedItems(!showPinnedItems)}
                  style={{
                    background: showPinnedItems ? 'var(--primary-light)' : 'none',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    color: showPinnedItems ? 'var(--primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                  }}
                  title="View your Pinned Student Journey items"
                >
                  <Pin size={15} fill={counsellorPins.length > 0 ? 'var(--primary)' : 'none'} color={counsellorPins.length > 0 ? 'var(--primary)' : 'currentColor'} />
                  <span>Pinned</span>
                  {counsellorPins.length > 0 && (
                    <span
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 700,
                        borderRadius: '10px',
                        padding: '1px 6px',
                        lineHeight: 1.4,
                      }}
                    >
                      {counsellorPins.length}
                    </span>
                  )}
                </button>

                {/* Pinned Items Popover Dropdown */}
                {showPinnedItems && (
                  <>
                    <div
                      onClick={() => setShowPinnedItems(false)}
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1050,
                      }}
                    />
                    <div
                      className="app-notification-popover"
                      style={{
                        position: 'absolute',
                        top: '44px',
                        right: 0,
                        width: '340px',
                        maxWidth: 'calc(100vw - 24px)',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                        zIndex: 1100,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-subtle, #F9FAFB)',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📌</span> Pinned Items ({counsellorPins.length})
                        </span>
                        <button
                          onClick={() => setShowPinnedItems(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Close Pinned Items"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                        {counsellorPins.length === 0 ? (
                          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                            <div style={{ fontSize: '24px', marginBottom: '6px' }}>📌</div>
                            <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>No pinned items</strong>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              Click the 📌 Pin icon on any student, session, application, or payment to quickly access it here.
                            </div>
                          </div>
                        ) : (
                          counsellorPins.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                padding: '12px 14px',
                                borderBottom: '1px solid var(--border-light)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: '10px',
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              <div
                                style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
                                onClick={() => {
                                  navigate(item.path);
                                  setShowPinnedItems(false);
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      color: 'var(--primary)',
                                      backgroundColor: 'var(--primary-light)',
                                      border: '1px solid rgba(0,87,248,0.2)',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    📌 {item.category}
                                  </span>
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                  {item.title}
                                </div>
                                {item.subtitle && (
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                                    {item.subtitle}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate(item.path);
                                    setShowPinnedItems(false);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'var(--primary)',
                                    backgroundColor: 'var(--primary-light)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Open
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (user?._id) {
                                      toggleCounsellorPin(user._id, item);
                                    }
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    background: 'none',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                  }}
                                  title="Unpin item"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--danger)',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <>
                  <div
                    onClick={() => setShowNotifications(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 1050,
                    }}
                  />
                  <div className="app-notification-popover">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle, #F9FAFB)',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Notifications ({notifications.length})
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Close Notifications"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif._id}
                            style={{
                              padding: '12px 14px',
                              borderBottom: '1px solid var(--border-light)',
                              backgroundColor: notif.isRead ? '#FFFFFF' : 'var(--primary-light, #F0F7FF)',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)', marginBottom: '3px', lineHeight: 1.3 }}>
                              {notif.title}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{notif.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="app-user-profile-info">
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {user?.role === UserRole.ADMIN
                    ? user.adminType === 'OWNER_ADMIN'
                      ? 'Owner Admin'
                      : 'Administrator'
                    : 'Counsellor'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Interactive User Guide Modal */}
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Sidebar Right-Click Context Menu for Pinned Modules */}
      {sidebarContextMenu && (
        <ContextMenu
          x={sidebarContextMenu.x}
          y={sidebarContextMenu.y}
          isOpen={!!sidebarContextMenu}
          onClose={() => setSidebarContextMenu(null)}
          items={[
            {
              label: 'Open',
              icon: Eye,
              onClick: () => {
                const targetPath = isStudent || location.pathname.startsWith('/portal')
                  ? `/portal?tab=${sidebarContextMenu.tabId}`
                  : `/reports?tab=${sidebarContextMenu.tabId}`;
                navigate(targetPath);
              },
            },
            {
              label: 'Unpin from Sidebar',
              icon: Pin,
              onClick: () => {
                togglePinModule(sidebarContextMenu.tabId);
              },
            },
          ]}
        />
      )}
    </div>
  );
};
