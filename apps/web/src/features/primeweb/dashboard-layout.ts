export const defaultLayout = [
  { id: 'onboarding', label: 'Onboarding checklist', visible: false },
  { id: 'metrics', label: 'At-a-glance stats', visible: true },
  { id: 'traffic', label: 'Traffic & performance', visible: true },
  { id: 'seo', label: 'SEO health', visible: true },
  { id: 'orders', label: 'Pending orders', visible: true },
];
export type DashboardLayout = typeof defaultLayout;
export function readDashboardLayout(key: string): DashboardLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(saved) && saved.length === defaultLayout.length && new Set(saved.map(row => row.id)).size === defaultLayout.length && saved.every(row => defaultLayout.some(item => item.id === row.id) && typeof row.visible === 'boolean')) return saved.map(row => ({ ...defaultLayout.find(item => item.id === row.id)!, visible: row.visible }));
  } catch { /* Recover missing or invalid local preferences. */ }
  return defaultLayout;
}
