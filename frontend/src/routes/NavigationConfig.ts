import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  Building2,
  FileText,
  FileCheck,
  Award,
  CreditCard,
  Stamp,
  Plane,
  Compass,
  CheckSquare,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { UserRole } from '../types';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  roles: UserRole[];
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Core & Pipeline',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Leads',
        path: '/leads',
        icon: Users,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Students',
        path: '/students',
        icon: GraduationCap,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
    ],
  },
  {
    title: 'Student Journey',
    items: [
      {
        label: 'Counselling',
        path: '/counselling',
        icon: Calendar,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Universities',
        path: '/universities',
        icon: Building2,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Documents',
        path: '/documents',
        icon: FileText,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Applications',
        path: '/applications',
        icon: FileCheck,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Offers',
        path: '/offers',
        icon: Award,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Payments',
        path: '/payments',
        icon: CreditCard,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Visa Tracking',
        path: '/visa',
        icon: Stamp,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Travel & Departure',
        path: '/travel',
        icon: Plane,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Orientation',
        path: '/orientation',
        icon: Compass,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Tasks',
        path: '/tasks',
        icon: CheckSquare,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Messages',
        path: '/messages',
        icon: MessageSquare,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Reports',
        path: '/reports',
        icon: BarChart3,
        roles: [UserRole.ADMIN],
      },
      {
        label: 'User Management',
        path: '/users',
        icon: ShieldCheck,
        roles: [UserRole.ADMIN],
      },
      {
        label: 'Masters Config',
        path: '/masters',
        icon: Sliders,
        roles: [UserRole.ADMIN, UserRole.COUNSELLOR],
      },
      {
        label: 'Audit Logs',
        path: '/audit-logs',
        icon: ShieldCheck,
        roles: [UserRole.ADMIN],
      },
    ],
  },
];

export const NAVIGATION_ITEMS: NavItem[] = NAVIGATION_SECTIONS.flatMap((s) => s.items);
