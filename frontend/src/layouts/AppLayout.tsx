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
import { NotificationItem, UserRole } from '../types';
import { UserGuideModal } from '../components/UserGuide';

export const AppLayout: React.FC = () => {
  const { user, logout, isStaff, isStudent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // If student is logged in, redirect them to student portal if accessing admin panel
  useEffect(() => {
    if (isStudent && !location.pathname.startsWith('/portal')) {
      navigate('/portal');
    }
  }, [isStudent, location.pathname, navigate]);

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
    } catch (err) {}
  };

  const allowedSections = NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => user && item.roles.includes(user.role)),
  })).filter((section) => section.items.length > 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* --- Fixed Left Sidebar --- */}
      <aside
        style={{
          width: sidebarCollapsed ? '68px' : '250px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 100,
          transition: 'width 0.2s ease',
        }}
      >
        {/* Brand Logo & Title */}
        <div
          style={{
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            padding: sidebarCollapsed ? '0' : '0 14px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {!sidebarCollapsed ? (
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
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setSidebarCollapsed(false)}
              title="Expand Sidebar"
            >
              <img
                src="/logo.png"
                alt="IIEC"
                style={{
                  height: '22px',
                  maxWidth: '32px',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Collapse Sidebar"
            >
              <Menu size={18} />
            </button>
          )}
        </div>

        {/* Grouped Navigation List */}
        <nav
          style={{
            flex: 1,
            padding: '10px 8px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {allowedSections.map((section, sIdx) => (
            <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {!sidebarCollapsed ? (
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
              ) : (
                sIdx > 0 && (
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: 'var(--border-light)',
                      margin: '6px 8px',
                    }}
                  />
                )
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={({ isActive }) => {
                      const active = isActive || location.pathname.startsWith(item.path + '/');
                      return {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: sidebarCollapsed ? '9px 0' : '8px 12px',
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        borderRadius: 'var(--radius-md)',
                        color: active ? 'var(--primary)' : 'var(--text-secondary)',
                        backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                        fontWeight: active ? 600 : 500,
                        fontSize: '13px',
                        transition: 'all 0.15s ease',
                      };
                    }}
                    title={sidebarCollapsed ? `${section.title}: ${item.label}` : undefined}
                  >
                    <Icon size={17} strokeWidth={2} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Section: Help & Logout */}
        <div
          style={{
            padding: '12px 8px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <button
            onClick={() => setIsGuideOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: sidebarCollapsed ? '10px 0' : '9px 12px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <HelpCircle size={18} />
            {!sidebarCollapsed && <span>User Guide & FAQs</span>}
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: sidebarCollapsed ? '10px 0' : '9px 12px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div
        style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? '68px' : '250px',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin-left 0.2s ease',
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
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 90,
          }}
        >
          {/* Breadcrumb / Section context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              IIEC Consultancy Operations
            </span>
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
                <div
                  style={{
                    position: 'absolute',
                    top: '42px',
                    right: 0,
                    width: '320px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 200,
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
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border-light)',
                            backgroundColor: notif.isRead ? '#FFFFFF' : 'var(--bg-subtle)',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {notif.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{notif.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
              <div>
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
