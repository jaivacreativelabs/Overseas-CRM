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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NAVIGATION_SECTIONS } from '../routes/NavigationConfig';
import { apiClient } from '../services/api-client';
import { NotificationItem, UserRole, Lead, StudentStage } from '../types';
import { UserGuideModal } from '../components/UserGuide';
import { VerticalStageStepper } from '../components/StageStepper';

export const AppLayout: React.FC = () => {
  const { user, logout, isStaff, isStudent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [studentStage, setStudentStage] = useState<StudentStage>(StudentStage.PROFILE_EVALUATION);

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
          setStudentStage(res.data[0].stage);
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

  const allowedSections = NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => user && item.roles.includes(user.role)),
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

      {/* Backdrop overlay when left panel is open */}
      {!sidebarCollapsed && (
        <div
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

      {/* --- Full-Screen / Off-Canvas Left Sidebar Panel --- */}
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
          boxShadow: sidebarCollapsed ? 'none' : '4px 0 24px rgba(0, 0, 0, 0.18)',
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
            onClick={() => setSidebarCollapsed(true)}
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
            <X size={20} />
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
          {isStudent ? (
            <VerticalStageStepper currentStage={studentStage} sidebarCollapsed={false} />
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
                      onClick={() => setSidebarCollapsed(true)}
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
                setSidebarCollapsed(true);
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
          marginLeft: 0,
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
          {/* Left Header Actions: 3-Bars Hamburger Button & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
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
              title={sidebarCollapsed ? 'Open Left Panel' : 'Close Left Panel'}
            >
              <Menu size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <img
                src="/logo.png"
                alt="IIEC Logo"
                style={{
                  height: '30px',
                  maxWidth: '130px',
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
          </div>

          {/* Right Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
    </div>
  );
};
