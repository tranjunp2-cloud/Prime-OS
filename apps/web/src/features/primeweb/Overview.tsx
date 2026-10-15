import { CustomizeDashboard } from './CustomizeDashboard';
import { readDashboardLayout } from './dashboard-layout';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Eye, MousePointerClick, ShoppingBag, DollarSign, SlidersHorizontal, List, SearchCheck, TriangleAlert, Sparkles, Pencil, WandSparkles } from 'lucide-react';
import { PageDemoControls } from './ui';
import { websiteHref, type Website } from './store';
import './overview.css';

// Adapted from ech-prime-web-v2 dashboard/revamp: at-a-glance, traffic-performance, seo-health-card.
const issues = [
  ['Business address incomplete', 'YOU', 'Edit', '/settings/general'],
  ['7 pages need content improvements', 'YOU', 'Edit', 'pages'],
  ['3 pages missing meta descriptions', 'AI', 'Fix', 'seo'],
  ['3 items missing meta titles', 'AI', 'Fix', 'seo'],
  ['Phone number missing', 'YOU', 'Edit', '/settings/general'],
  ['Opening hours missing', 'YOU', 'Edit', '/settings/general'],
  ['Map location missing', 'YOU', 'Edit', '/settings/general'],
  ['Business subtype missing', 'YOU', 'Edit', '/settings/general'],
  ['Price range missing', 'YOU', 'Edit', '/settings/general'],
  ['Primary domain missing', 'YOU', 'Set up', 'domains'],
  ['Search verification missing', 'YOU', 'Set up', 'seo'],
];
export function Overview({ site }: { site: Website }) {
  const [period, setPeriod] = useState(7); const [tab, setTab] = useState('Pages'); const [customize, setCustomize] = useState(false);
  const storageKey = `primeweb.dashboard-layout:${site.id}`;
  const [layout, setLayout] = useState(() => readDashboardLayout(storageKey));
  const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - period + 1);
  const format = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const range = period === 1 ? format(end) : `${format(start)} – ${format(end)}`;
  const blocks: Record<string, React.ReactNode> = {
metrics: (<div className="pw-dash-metrics">{[{ label: 'Page views', Icon: Eye, color: '#3b82f6', value: '0' }, { label: 'Leads', Icon: MousePointerClick, color: '#06b6d4', value: '0' }, { label: 'Engagement', Icon: ShoppingBag, color: '#f59e0b', value: '0' }, { label: 'Revenue', Icon: DollarSign, color: '#10b981', value: 'RM 0.00' }].map(({ label, Icon, color, value }) => <section className="pw-dash-card pw-dash-metric" key={label} style={{ borderBottomColor: color }}><div><span className="pw-dash-icon" style={{ color, background: `${color}18` }}><Icon size={18} /></span><span>{label}</span><small>− 0.0%</small></div><div><strong>{value}</strong><small>vs prev {period === 1 ? 'day' : `${period}d`}</small></div></section>)}</div>),
traffic: (<section><div className="pw-dash-section-title"><BarChart3 size={24} /><div><h2>Traffic & performance</h2><p>Daily pageviews and what’s driving them</p></div></div><div className="pw-dash-card"><div className="pw-dash-total"><strong>0</strong><span>total pageviews · {period === 1 ? 'today' : `last ${period} days`}</span></div><div className="pw-dash-empty"><BarChart3 /><h3>No traffic in this period</h3><p>Once visitors land on your site, daily pageviews will<br />show up here.</p></div></div><div className="pw-dash-card pw-dash-ranking"><div className="pw-dash-toolbar"><h2>Top performing</h2><div className="pw-dash-tabs">{['Pages', 'Blogs', 'Referrers', 'Products'].map(label => <button key={label} disabled={label === 'Products'} aria-pressed={tab === label} onClick={() => setTab(label)}>{label}{label === 'Products' && <small>Soon</small>}</button>)}</div></div><div className="pw-dash-empty" role="status" aria-label={`${tab} ranking`}><List /><h3>Nothing to rank yet</h3><p>Top pages, blogs and referrers appear once you<br />have traffic.</p></div></div></section>),
seo: (<section><div className="pw-dash-section-title"><SearchCheck size={24} /><div><h2>SEO health</h2><p>How discoverable your store is on search engines</p></div></div><div className="pw-dash-card"><div className="pw-dash-seo"><div className="pw-dash-score"><svg viewBox="0 0 200 180" aria-label="Sample SEO score: 42 out of 100" role="img"><path d="M 29 145 A 85 85 0 1 1 171 145" fill="none" stroke="#222e40" strokeWidth="14" strokeLinecap="round" /><path d="M 29 145 A 85 85 0 1 1 171 145" fill="none" stroke="#ef4444" strokeWidth="14" strokeLinecap="round" pathLength="100" strokeDasharray="42 100" /><text x="100" y="96" textAnchor="middle" fill="currentColor" fontSize="42" fontWeight="700">42</text><text x="100" y="118" textAnchor="middle" fill="#94a3b8" fontSize="12">/ 100</text></svg><strong>At risk</strong></div><div className="pw-dash-buckets">{[{ label: 'Business Data', value: 35 }, { label: 'Schema', value: 0 }, { label: 'AI Discoverability', value: 100 }, { label: 'Technical Health', value: 66 }].map(({ label, value }) => <div key={label}><div><span>{label}</span><strong style={{ color: value === 100 ? '#10b981' : '#f59e0b' }}>{value === 100 ? 'Good' : 'Needs work'}</strong></div><progress aria-label={label} value={value} max={100} style={{ accentColor: value === 100 ? '#10b981' : '#f59e0b' }} /></div>)}</div></div><div className="pw-dash-critical"><TriangleAlert size={20} /><p>Most critical issue: 3 pages missing meta descriptions. Fixing these will lift your score.</p><Link className="pw-dash-primary" to={websiteHref('seo', site.id)}><Sparkles size={16} />AI Fix Issues</Link></div><div className="pw-dash-toolbar pw-dash-issues-title"><h2>SEO issues</h2><span className="pw-dash-open">11 open</span></div><div className="pw-dash-issues">{issues.map(([label, owner, action, target]) => <div key={label}><span className={`pw-dash-owner ${owner === 'AI' ? 'ai' : ''}`}>{owner}</span><span>{label}</span><Link className="pw-dash-outline" to={target.startsWith('/') ? target : websiteHref(target, site.id)} aria-label={`${action}: ${label}`}>{owner === 'AI' ? <WandSparkles size={14} /> : <Pencil size={14} />}{action}</Link></div>)}</div></div></section>),
    onboarding: <section className="pw-dash-card"><h2>Onboarding checklist</h2><div className="pw-dash-onboarding">{[{ label: 'Customize your website', done: true, section: 'theme' }, { label: 'Manage products in Main', done: !!site.draft.productIds.length, section: '/products/master-catalog' }, { label: 'Connect your domain', done: site.domainStatus === 'verified', section: 'domains' }, { label: 'Publish your website', done: site.status === 'published', section: 'domains' }].map(item => <Link key={item.label} to={item.section.startsWith('/') ? item.section : websiteHref(item.section, site.id)}><span>{item.done ? '✓' : '○'}</span>{item.label}<span>→</span></Link>)}</div></section>,
    orders: <section className="pw-dash-card"><div className="pw-dash-toolbar"><h2>Pending orders</h2><Link className="pw-dash-outline" to="/orders">View orders in Main</Link></div><div className="pw-dash-empty"><ShoppingBag /><h3>No pending orders</h3><p>Website orders will appear here. Manage your orders in Main.</p></div></section>,
  };
  return <div className="pw-dashboard"><header><div className="pw-title-row"><h1>Welcome to Web Store Dashboard</h1><PageDemoControls /></div><p>Track your store’s performance and run your online business from one place.</p></header><div className="pw-dash-toolbar"><div><h2>Dashboard</h2><span>Daily · {range}</span><small>Prototype · sample data</small></div><div><div className="pw-dash-tabs">{[1, 7, 30].map(days => <button key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days === 1 ? 'Today' : `${days} days`}</button>)}</div><button className="pw-dash-outline" onClick={() => setCustomize(true)}><SlidersHorizontal size={16} />Customize</button></div></div>
    {layout.filter(row => row.visible).map(row => <div key={row.id} data-dashboard-block={row.id}>{blocks[row.id]}</div>)}
    {customize && <CustomizeDashboard layout={layout} storageKey={storageKey} onSave={setLayout} onClose={() => setCustomize(false)} />}
  </div>;
}
