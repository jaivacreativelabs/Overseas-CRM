export const PINNED_MODULES_KEY = 'pinned_student_journey_modules';

export const getPinnedModules = (): string[] => {
  try {
    const saved = localStorage.getItem(PINNED_MODULES_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    // Restrict strictly to 'counselling' only
    return Array.isArray(parsed) ? parsed.filter((id) => id === 'counselling') : [];
  } catch {
    return [];
  }
};

export const togglePinModule = (moduleId: string = 'counselling'): boolean => {
  if (moduleId !== 'counselling') return false;
  try {
    const current = getPinnedModules();
    let updated: string[];
    let isPinnedNow = false;
    if (current.includes('counselling')) {
      updated = [];
    } else {
      updated = ['counselling'];
      isPinnedNow = true;
    }
    localStorage.setItem(PINNED_MODULES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('pinned_modules_changed'));
    return isPinnedNow;
  } catch {
    return false;
  }
};

export const isModulePinned = (moduleId: string = 'counselling'): boolean => {
  if (moduleId !== 'counselling') return false;
  return getPinnedModules().includes('counselling');
};
