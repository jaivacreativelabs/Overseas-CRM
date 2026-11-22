import { Calendar, FileCheck, Award, CreditCard, Stamp, Plane, Compass } from 'lucide-react';

// Kept separate from ReportsPage so the always-loaded AppLayout can use the tab list
// without pulling the whole Reports page (and every module page it embeds) into the initial bundle.
export const REPORT_TABS = [
  { id: 'counselling', label: 'Counselling', icon: Calendar },
  { id: 'applications', label: 'Applications', icon: FileCheck },
  { id: 'offers', label: 'Offers', icon: Award },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'visa', label: 'Visa Tracking', icon: Stamp },
  { id: 'travel', label: 'Travel & Departure', icon: Plane },
  { id: 'orientation', label: 'Orientation & Onboarding', icon: Compass },
];
