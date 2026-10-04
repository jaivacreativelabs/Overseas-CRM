export interface CounsellorPinnedItem {
  id: string;
  category: 'student' | 'counselling' | 'application' | 'offer' | 'payment' | 'visa' | 'travel' | 'orientation' | 'document' | 'task';
  title: string;
  subtitle?: string;
  path: string;
  pinnedAt: string;
}

export const getCounsellorPinsKey = (userId: string) => `counsellor_pins_${userId}`;

export const getCounsellorPins = (userId?: string): CounsellorPinnedItem[] => {
  if (!userId) return [];
  try {
    const saved = localStorage.getItem(getCounsellorPinsKey(userId));
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const toggleCounsellorPin = (userId: string | undefined, item: CounsellorPinnedItem): boolean => {
  if (!userId) return false;
  try {
    const current = getCounsellorPins(userId);
    const existingIndex = current.findIndex((p) => p.id === item.id);
    let updated: CounsellorPinnedItem[];
    let isPinnedNow = false;

    if (existingIndex >= 0) {
      updated = current.filter((p) => p.id !== item.id);
    } else {
      updated = [{ ...item, pinnedAt: new Date().toISOString() }, ...current];
      isPinnedNow = true;
    }

    localStorage.setItem(getCounsellorPinsKey(userId), JSON.stringify(updated));
    window.dispatchEvent(new Event('counsellor_pins_changed'));
    return isPinnedNow;
  } catch {
    return false;
  }
};

export const isCounsellorItemPinned = (userId: string | undefined, itemId: string): boolean => {
  if (!userId) return false;
  return getCounsellorPins(userId).some((p) => p.id === itemId);
};
