import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  FileCheck,
  Award,
  CreditCard,
  Stamp,
  Plane,
  Compass,
  Eye,
  Pin,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ContextMenu } from '../../components/ContextMenu';
import {
  getPinnedModules,
  togglePinModule,
  isModulePinned,
} from '../../utils/pinnedModules';

// Import existing module pages for direct tab rendering
import { CounsellingPage } from '../counselling/CounsellingPage';
import { ApplicationsPage } from '../applications/ApplicationsPage';
import { OffersPage } from '../offers/OffersPage';
import { PaymentsPage } from '../payments/PaymentsPage';
import { VisaPage } from '../visa/VisaPage';
import { TravelPage } from '../travel/TravelPage';
import { OrientationPage } from '../orientation/OrientationPage';

export const REPORT_TABS = [
  { id: 'counselling', label: 'Counselling', icon: Calendar },
  { id: 'applications', label: 'Applications', icon: FileCheck },
  { id: 'offers', label: 'Offers', icon: Award },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'visa', label: 'Visa Tracking', icon: Stamp },
  { id: 'travel', label: 'Travel & Departure', icon: Plane },
  { id: 'orientation', label: 'Orientation & Onboarding', icon: Compass },
];

export const ReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { success } = useToast();

  const activeTab = searchParams.get('tab') || 'counselling';

  const [pinnedList, setPinnedList] = useState<string[]>(getPinnedModules());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  useEffect(() => {
    const handlePinnedChange = () => {
      setPinnedList(getPinnedModules());
    };
    window.addEventListener('pinned_modules_changed', handlePinnedChange);
    return () => window.removeEventListener('pinned_modules_changed', handlePinnedChange);
  }, []);

  const selectedTabConfig = REPORT_TABS.find((t) => t.id === activeTab) || REPORT_TABS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 Student Journey Reports
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Select a report tab below to view and manage operational data. Right-click any tab to pin/unpin from sidebar.
          </p>
        </div>
      </div>

      {/* HORIZONTAL SCROLLABLE TAB BAR */}
      <div
        className="reports-tab-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          borderBottom: '2px solid var(--border-color)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingBottom: '2px',
        }}
      >
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isPinned = pinnedList.includes(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              onContextMenu={(e) => {
                if (tab.id === 'counselling') {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, tabId: 'counselling' });
                }
              }}
              style={{
                padding: '11px 16px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                userSelect: 'none',
              }}
              title={tab.id === 'counselling' ? `Right-click to ${isPinned ? 'unpin' : 'pin'} Counselling in sidebar` : tab.label}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              <span>{tab.label}</span>
              {isPinned && (
                <span
                  style={{
                    fontSize: '10px',
                    backgroundColor: 'rgba(0, 87, 248, 0.15)',
                    color: 'var(--primary)',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  📌
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SELECTED REPORT MODULE CONTENT AREA */}
      <div style={{ width: '100%' }}>
        {activeTab === 'counselling' && <CounsellingPage />}
        {activeTab === 'applications' && <ApplicationsPage />}
        {activeTab === 'offers' && <OffersPage />}
        {activeTab === 'payments' && <PaymentsPage />}
        {activeTab === 'visa' && <VisaPage />}
        {activeTab === 'travel' && <TravelPage />}
        {activeTab === 'orientation' && <OrientationPage />}
      </div>

      {/* RIGHT-CLICK CONTEXT MENU (OPEN / PIN TO SIDEBAR / UNPIN FROM SIDEBAR) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOpen={!!contextMenu}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Open',
              icon: Eye,
              onClick: () => {
                setSearchParams({ tab: contextMenu.tabId });
              },
            },
            {
              label: pinnedList.includes(contextMenu.tabId) ? 'Unpin from Sidebar' : 'Pin to Sidebar',
              icon: Pin,
              onClick: () => {
                const targetTab = REPORT_TABS.find((t) => t.id === contextMenu.tabId);
                const wasPinned = pinnedList.includes(contextMenu.tabId);
                togglePinModule(contextMenu.tabId);
                success(
                  wasPinned
                    ? `Unpinned ${targetTab?.label || 'module'} from sidebar`
                    : `Pinned ${targetTab?.label || 'module'} to Student Journey sidebar`
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
};
