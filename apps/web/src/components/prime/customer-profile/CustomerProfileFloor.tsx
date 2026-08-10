import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CircleUserRound,
  CopyCheck,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  UserRoundCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/I18nContext';
import type { Locale } from '@/lib/i18n/dictionaries';
import type { PrimeSnapshot } from '@/lib/prime/prime-data';
import {
  buildCustomerProfileFloor,
  detectIdentityMatches,
  filterCustomerAccounts,
  getAccountMatches,
  type AccountStatus,
  type ContactRole,
  type CustomerAccount,
  type CustomerAccountFilters,
  type CustomerContact,
  type CustomerLifecycle,
  type CustomerOwner,
  type CustomerTag,
  type CustomerType,
  type FutureModulePlaceholder,
  type IdentityMatch,
  type PreferredChannel,
} from '@/lib/prime/customer-profile-floor';

type AccountFormState = Pick<CustomerAccount,
  'companyName' | 'displayName' | 'customerType' | 'lifecycle' | 'status' | 'ownerId' | 'tags' | 'primaryEmail' | 'website' | 'industry' | 'country' | 'source'
>;

type ContactFormState = Pick<CustomerContact,
  'fullName' | 'title' | 'role' | 'email' | 'phone' | 'preferredChannel' | 'isPrimary'
>;

type CustomerSubFloor = 'overview' | 'account' | 'identity';

const currency = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });

const lifecycleOptions: Array<{ value: CustomerLifecycle; label: string }> = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'retention', label: 'Retention' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'inactive', label: 'Inactive' },
];

const customerTypeOptions: Array<{ value: CustomerType; label: string }> = [
  { value: 'b2b', label: 'B2B' },
  { value: 'marketplace', label: 'Marketplace buyer' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'creator', label: 'Creator' },
];

const customerTypeLabels: Record<CustomerType, string> = {
  b2b: 'B2B',
  marketplace: 'Marketplace buyer',
  distributor: 'Distributor',
  creator: 'Creator',
};

function normalizeCustomerAccount(account: CustomerAccount): CustomerAccount {
  if ((account.customerType as string) !== 'b2c') return account;

  return {
    ...account,
    customerType: 'marketplace',
    tags: Array.from(new Set(account.tags.map((tagId) => tagId === 'tag-b2c' ? 'tag-marketplace-buyer' : tagId))),
    industry: account.industry === 'Consumer commerce' ? 'Marketplace commerce' : account.industry,
    profile: account.profile ? {
      ...account.profile,
      segmentLabel: 'Marketplace buyer',
      buyingIntent: account.profile.buyingIntent.replace(/^Consumer purchase profile/, 'Marketplace purchase profile'),
    } : account.profile,
  };
}

const contactRoleOptions: Array<{ value: ContactRole; label: string }> = [
  { value: 'decision_maker', label: 'Decision maker' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'finance', label: 'Finance' },
  { value: 'ops', label: 'Operations' },
  { value: 'support', label: 'Support' },
  { value: 'other', label: 'Other' },
];

const channelOptions: Array<{ value: PreferredChannel; label: string }> = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'line', label: 'LINE' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

const tagCategoryOptions: Array<{ value: CustomerTag['category']; label: string }> = [
  { value: 'segment', label: 'Segment' },
  { value: 'lifecycle', label: 'Lifecycle' },
  { value: 'risk', label: 'Risk' },
  { value: 'channel', label: 'Channel' },
  { value: 'priority', label: 'Priority' },
];

const tagColorByCategory: Record<CustomerTag['category'], string> = {
  segment: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  lifecycle: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200',
  risk: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200',
  channel: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200',
  priority: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200',
};

const defaultFilters: CustomerAccountFilters = {
  query: '',
  tagId: 'all',
  ownerId: 'all',
  lifecycle: 'all',
  customerType: 'all',
};

const customerSubFloors: Array<{ id: CustomerSubFloor; label: string; detail: string }> = [
  { id: 'overview', label: 'Overview', detail: 'Floor health, next actions, and profile readiness.' },
  { id: 'account', label: 'Account Profile', detail: 'Account list, profile edit, ownership, lifecycle, contacts, and tags.' },
  { id: 'identity', label: 'Identity Matching', detail: 'Duplicate account/contact review queue.' },
];

const customerProfileCopy = {
  'en-US': {
    floor: 'Customer Profile Floor',
    subPage: 'Sub-page',
    nav: {
      overview: ['Overview', 'Floor health, next actions, and profile readiness.'],
      account: ['Account Profile', 'Account list, profile edit, ownership, lifecycle, contacts, and tags.'],
      identity: ['Identity Matching', 'Duplicate account/contact review queue.'],
    },
    metrics: {
      accounts: ['Accounts', 'visible after filters.'],
      ownerCoverage: ['Owner coverage', 'Every account needs a relationship owner.'],
      primaryContacts: ['Primary contacts', 'Primary buyer/contact coverage.'],
      identityAlerts: ['Identity alerts', 'account records on watch.'],
    },
    overview: {
      title: 'Customer Profile overview',
      body: 'This overview starts from relationship context. Open a sub-page to manage account records, contacts, duplicate review, or tags.',
      empty: 'No customer account is available yet. Create an account before connecting CRM, COS, Service, Finance, or Intelligence context.',
    },
    account: {
      title: 'Account list',
      body: 'Search and filter the customer identity layer before deals, quotes, orders, or intelligence connect.',
      create: 'Create account',
      search: 'Search account, code, email...',
      tag: 'Tag',
      allTags: 'All tags',
      owner: 'Owner',
      allOwners: 'All owners',
      lifecycle: 'Lifecycle',
      allLifecycle: 'All lifecycle',
      customerType: 'Customer type',
      allCustomerTypes: 'All customer types',
      reset: 'Reset filters',
      noMatch: 'No accounts match the current filters.',
      table: ['Account', 'EC channel', 'Type', 'Lifecycle', 'Owner', 'Contacts', 'Completeness', 'Action'],
      openProfile: 'Open profile',
      noChannelRef: 'No channel ref',
      noPrimaryContact: 'No primary contact',
      missing: 'Missing',
      identity: 'Identity',
      primary: 'Primary',
      phone: 'Phone',
      noPhone: 'No phone',
    },
    identity: {
      title: 'Identity Matching',
      body: 'Review-only duplicate detection. No merge is executed here.',
      total: 'Total alerts',
      selected: 'Selected account alerts',
      account: 'Account',
      queue: 'Duplicate review queue',
      queueBody: 'Potential duplicate account/contact warnings with confidence and matching reasons.',
    },
  },
  'ja-JP': {
    floor: '顧客プロファイルフロア',
    subPage: 'サブページ',
    nav: {
      overview: ['概要', 'フロア健全性、次アクション、プロファイル準備状況。'],
      account: ['アカウントプロファイル', 'アカウント一覧、編集、所有者、ライフサイクル、連絡先、タグ。'],
      identity: ['ID照合', '重複アカウント/連絡先レビューキュー。'],
    },
    metrics: {
      accounts: ['アカウント', '件がフィルター後に表示中。'],
      ownerCoverage: ['所有者カバレッジ', 'すべてのアカウントに関係責任者が必要です。'],
      primaryContacts: ['主連絡先', '主購入者/連絡先のカバレッジ。'],
      identityAlerts: ['IDアラート', '件のアカウントが監視対象。'],
    },
    overview: {
      title: '顧客プロファイル概要',
      body: 'この概要は関係コンテキストから始まります。サブページでアカウント、連絡先、重複レビュー、タグを管理します。',
      empty: '顧客アカウントはまだありません。CRM、COS、Service、Finance、Intelligenceに接続する前にアカウントを作成してください。',
    },
    account: {
      title: 'アカウント一覧',
      body: '案件、見積、注文、インテリジェンス連携前に顧客IDレイヤーを検索/絞り込みます。',
      create: 'アカウント作成',
      search: 'アカウント、コード、メールを検索...',
      tag: 'タグ',
      allTags: 'すべてのタグ',
      owner: '所有者',
      allOwners: 'すべての所有者',
      lifecycle: 'ライフサイクル',
      allLifecycle: 'すべてのライフサイクル',
      customerType: '顧客タイプ',
      allCustomerTypes: 'すべての顧客タイプ',
      reset: 'フィルターをリセット',
      noMatch: '現在のフィルターに一致するアカウントはありません。',
      table: ['アカウント', 'ECチャネル', 'タイプ', 'ライフサイクル', '所有者', '連絡先', '完全性', 'アクション'],
      openProfile: 'プロファイルを開く',
      noChannelRef: 'チャネル参照なし',
      noPrimaryContact: '主連絡先なし',
      missing: '未設定',
      identity: 'ID',
      primary: '主連絡先',
      phone: '電話',
      noPhone: '電話なし',
    },
    identity: {
      title: 'ID照合',
      body: 'レビュー専用の重複検出です。ここではマージを実行しません。',
      total: '合計アラート',
      selected: '選択中アカウントのアラート',
      account: 'アカウント',
      queue: '重複レビューキュー',
      queueBody: '信頼度と一致理由付きの重複候補アカウント/連絡先警告。',
    },
  },
  'vi-VN': {
    floor: 'Tầng hồ sơ khách hàng',
    subPage: 'Trang con',
    nav: {
      overview: ['Tổng quan', 'Sức khỏe tầng, hành động tiếp theo và độ sẵn sàng hồ sơ.'],
      account: ['Hồ sơ tài khoản', 'Danh sách, chỉnh sửa, chủ sở hữu, lifecycle, liên hệ và tag.'],
      identity: ['So khớp định danh', 'Hàng đợi rà soát tài khoản/liên hệ trùng.'],
    },
    metrics: {
      accounts: ['Tài khoản', 'hiển thị sau bộ lọc.'],
      ownerCoverage: ['Độ phủ owner', 'Mỗi tài khoản cần một owner quan hệ.'],
      primaryContacts: ['Liên hệ chính', 'Độ phủ buyer/contact chính.'],
      identityAlerts: ['Cảnh báo định danh', 'hồ sơ tài khoản đang watch.'],
    },
    overview: {
      title: 'Tổng quan hồ sơ khách hàng',
      body: 'Tổng quan bắt đầu từ ngữ cảnh quan hệ. Mở trang con để quản lý tài khoản, liên hệ, rà soát trùng hoặc tag.',
      empty: 'Chưa có tài khoản khách hàng. Hãy tạo tài khoản trước khi nối CRM, COS, Service, Finance hoặc Intelligence.',
    },
    account: {
      title: 'Danh sách tài khoản',
      body: 'Tìm kiếm và lọc lớp định danh khách hàng trước khi nối deal, quote, order hoặc intelligence.',
      create: 'Tạo tài khoản',
      search: 'Tìm tài khoản, mã, email...',
      tag: 'Tag',
      allTags: 'Tất cả tag',
      owner: 'Owner',
      allOwners: 'Tất cả owner',
      lifecycle: 'Lifecycle',
      allLifecycle: 'Tất cả lifecycle',
      customerType: 'Loại khách hàng',
      allCustomerTypes: 'Tất cả loại khách hàng',
      reset: 'Reset bộ lọc',
      noMatch: 'Không có tài khoản nào khớp bộ lọc hiện tại.',
      table: ['Tài khoản', 'Kênh EC', 'Loại', 'Lifecycle', 'Owner', 'Liên hệ', 'Độ đầy đủ', 'Hành động'],
      openProfile: 'Mở hồ sơ',
      noChannelRef: 'Không có mã kênh',
      noPrimaryContact: 'Chưa có liên hệ chính',
      missing: 'Thiếu',
      identity: 'Định danh',
      primary: 'Chính',
      phone: 'Điện thoại',
      noPhone: 'Chưa có điện thoại',
    },
    identity: {
      title: 'So khớp định danh',
      body: 'Chỉ rà soát phát hiện trùng. Không thực thi merge tại đây.',
      total: 'Tổng cảnh báo',
      selected: 'Cảnh báo tài khoản đã chọn',
      account: 'Tài khoản',
      queue: 'Hàng đợi rà soát trùng',
      queueBody: 'Cảnh báo tài khoản/liên hệ có thể trùng kèm độ tin cậy và lý do khớp.',
    },
  },
} as Record<Locale, any>;

function resolveSubFloor(value: string | null): CustomerSubFloor {
  if (value === 'account' || value === 'contact' || value === 'tags') return 'account';
  if (value === 'identity') return value;
  return 'overview';
}

function humanize(value: string) {
  return value.replace(/_/g, ' ');
}

function lifecycleBadgeVariant(lifecycle: CustomerLifecycle) {
  if (lifecycle === 'at_risk' || lifecycle === 'inactive') return 'warning';
  if (lifecycle === 'lead' || lifecycle === 'prospect') return 'secondary';
  return 'default';
}

function accountStatusVariant(status: AccountStatus) {
  if (status === 'watch') return 'warning';
  if (status === 'archived') return 'secondary';
  return 'outline';
}

function ownerName(owners: CustomerOwner[], ownerId: string) {
  return owners.find((owner) => owner.id === ownerId)?.name ?? 'Unassigned';
}

function tagById(tags: CustomerTag[], tagId: string) {
  return tags.find((tag) => tag.id === tagId);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'segment';
}

function makeBlankAccountForm(ownerId: string): AccountFormState {
  return {
    companyName: '',
    displayName: '',
    customerType: 'b2b',
    lifecycle: 'prospect',
    status: 'active',
    ownerId,
    tags: ['tag-identity-review'],
    primaryEmail: '',
    website: '',
    industry: '',
    country: 'Japan',
    source: 'Manual CRM entry',
  };
}

function formFromAccount(account: CustomerAccount): AccountFormState {
  return {
    companyName: account.companyName,
    displayName: account.displayName,
    customerType: account.customerType,
    lifecycle: account.lifecycle,
    status: account.status,
    ownerId: account.ownerId,
    tags: account.tags,
    primaryEmail: account.primaryEmail,
    website: account.website,
    industry: account.industry,
    country: account.country,
    source: account.source,
  };
}

function makeBlankContactForm(): ContactFormState {
  return {
    fullName: '',
    title: '',
    role: 'buyer',
    email: '',
    phone: '',
    preferredChannel: 'email',
    isPrimary: false,
  };
}

function buildAccountFromForm(form: AccountFormState, tags: string[] = []): CustomerAccount {
  const suffix = Date.now().toString(36);
  return {
    id: `acct-manual-${suffix}`,
    accountCode: `ACC-${suffix.toUpperCase().slice(-5)}`,
    companyName: form.companyName,
    displayName: form.displayName || form.companyName,
    customerType: form.customerType,
    lifecycle: form.lifecycle,
    status: form.status,
    ownerId: form.ownerId,
    tags,
    primaryEmail: form.primaryEmail,
    website: form.website,
    industry: form.industry,
    country: form.country,
    source: form.source,
    revenue: 0,
    orderCount: 0,
    identityCompleteness: Math.min(92, 52 + (form.primaryEmail ? 12 : 0) + (form.website ? 12 : 0) + (form.industry ? 8 : 0)),
    notes: ['Created in Customer Profile Floor mock state'],
    lifecycleStage: {
      customerId: `manual-${suffix}`,
      stage: form.lifecycle,
      ownerId: form.ownerId,
      nextAction: 'Qualify the account and attach CRM or COS evidence before handoff.',
      reason: 'Manual mock account needs source evidence before it can support the V1 proof loop.',
      updatedAt: '2026-05-09T09:00:00.000Z',
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
    },
    timelineEvents: [],
    followUps: [{
      id: `followup-manual-${suffix}`,
      customerId: `manual-${suffix}`,
      ownerId: form.ownerId,
      status: 'open',
      priority: 'normal',
      dueAt: '2026-05-12T09:00:00.000Z',
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
      source: 'Customer',
      sourceEntityId: `manual-${suffix}`,
      allowedAction: 'Attach a qualified lead, RFQ, or COS order before cross-area handoff.',
      humanApprovalBoundary: 'Operator approves the first outreach because no source evidence exists yet.',
      nextAction: 'Complete account qualification.',
      businessImpact: 'Prevents a manually created account from becoming unsupported customer truth.',
      href: '/customer/crm-compact?floor=account',
    }],
    rfqQuoteLinks: [],
    serviceCases: [],
  };
}

function resolveAccountIdFromCustomerParam(accounts: CustomerAccount[], customerParam: string | null) {
  if (!customerParam) return accounts[0]?.id ?? '';
  return accounts.find((account) => account.id === customerParam)?.id
    ?? accounts.find((account) => account.id === `acct-${customerParam}`)?.id
    ?? accounts.find((account) => account.accountCode === customerParam)?.id
    ?? accounts[0]?.id
    ?? '';
}

export function CustomerProfileFloor({ snapshot }: { snapshot: PrimeSnapshot }) {
  const { locale } = useI18n();
  const copy = customerProfileCopy[locale];
  const seed = useMemo(() => buildCustomerProfileFloor(snapshot), [snapshot]);
  const normalizedSeedAccounts = useMemo(() => seed.accounts.map(normalizeCustomerAccount), [seed.accounts]);
  const [searchParams, setSearchParams] = useSearchParams();
  const customerParam = searchParams.get('customer');
  const activeSubFloor = resolveSubFloor(searchParams.get('floor'));
  const { toast } = useToast();
  const [accounts, setAccounts] = useState(normalizedSeedAccounts);
  const [contacts, setContacts] = useState(seed.contacts);
  const [tags, setTags] = useState(seed.tags);
  const [selectedAccountId, setSelectedAccountId] = useState(() => resolveAccountIdFromCustomerParam(normalizedSeedAccounts, customerParam));
  const [filters, setFilters] = useState<CustomerAccountFilters>(defaultFilters);
  const [accountDialogMode, setAccountDialogMode] = useState<'create' | 'edit' | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormState>(() => makeBlankAccountForm(seed.owners[0]?.id ?? ''));
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileAccountId, setProfileAccountId] = useState<string | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>(() => makeBlankContactForm());
  const requestedAccountId = useMemo(() => resolveAccountIdFromCustomerParam(accounts, customerParam), [accounts, customerParam]);

  useEffect(() => {
    setAccounts((current) => current.map(normalizeCustomerAccount));
  }, []);

  useEffect(() => {
    setAccounts(normalizedSeedAccounts);
  }, [normalizedSeedAccounts]);

  useEffect(() => {
    setTags(seed.tags);
  }, [seed.tags]);

  const matches = useMemo(() => detectIdentityMatches(accounts, contacts), [accounts, contacts]);
  const filteredAccounts = useMemo(() => filterCustomerAccounts(accounts, tags, filters), [accounts, filters, tags]);
  const selectedAccount = filteredAccounts.find((account) => account.id === selectedAccountId) ?? filteredAccounts[0] ?? null;
  const selectedAccountRecord = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null;
  const profileAccountRecord = accounts.find((account) => account.id === profileAccountId) ?? selectedAccountRecord;
  const selectedRecordContacts = selectedAccountRecord ? contacts.filter((contact) => contact.accountId === selectedAccountRecord.id) : [];
  const selectedRecordMatches = selectedAccountRecord ? getAccountMatches(matches, selectedAccountRecord, contacts) : [];
  const atRiskCount = accounts.filter((account) => account.lifecycle === 'at_risk' || account.status === 'watch').length;
  const ownerCoverage = accounts.length ? Math.round((accounts.filter((account) => Boolean(account.ownerId)).length / accounts.length) * 100) : 0;
  const primaryContactCoverage = accounts.length ? Math.round((accounts.filter((account) => contacts.some((contact) => contact.accountId === account.id && contact.isPrimary)).length / accounts.length) * 100) : 0;

  useEffect(() => {
    if (!customerParam) return;
    if (!requestedAccountId) return;
    setSelectedAccountId(requestedAccountId);
    setFilters(defaultFilters);
  }, [customerParam, requestedAccountId]);

  useEffect(() => {
    if (filteredAccounts.length === 0) return;
    if (filteredAccounts.some((account) => account.id === selectedAccountId)) return;
    setSelectedAccountId(filteredAccounts[0].id);
  }, [filteredAccounts, selectedAccountId]);

  function setActiveSubFloor(subFloor: CustomerSubFloor) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('floor', subFloor);
    setSearchParams(nextParams);
  }

  function openCreateAccount() {
    setAccountForm(makeBlankAccountForm(seed.owners[0]?.id ?? ''));
    setAccountDialogMode('create');
  }

  function openAccountProfile(account: CustomerAccount) {
    setSelectedAccountId(account.id);
    setProfileAccountId(account.id);
    setProfileDialogOpen(true);
  }

  function openEditAccount(account: CustomerAccount) {
    setAccountForm(formFromAccount(account));
    setAccountDialogMode('edit');
  }

  function saveAccount() {
    if (!accountForm.companyName.trim() || !accountForm.primaryEmail.trim()) {
      toast({ title: 'Account needs a company and email' });
      return;
    }

    if (accountDialogMode === 'create') {
      const nextAccount = buildAccountFromForm(accountForm, accountForm.tags);
      setAccounts((current) => [nextAccount, ...current]);
      setSelectedAccountId(nextAccount.id);
      toast({ title: 'Account created in mock CRM floor' });
    }

    if (accountDialogMode === 'edit' && selectedAccountRecord) {
      setAccounts((current) => current.map((account) => account.id === selectedAccountRecord.id ? {
        ...account,
        ...accountForm,
        displayName: accountForm.displayName || accountForm.companyName,
        identityCompleteness: Math.min(98, account.identityCompleteness + 4),
      } : account));
      toast({ title: 'Account updated' });
    }

    setAccountDialogMode(null);
  }

  function openCreateContact() {
    setEditingContactId(null);
    setContactForm(makeBlankContactForm());
    setContactDialogOpen(true);
  }

  function openEditContact(contact: CustomerContact) {
    setEditingContactId(contact.id);
    setContactForm({
      fullName: contact.fullName,
      title: contact.title,
      role: contact.role,
      email: contact.email,
      phone: contact.phone,
      preferredChannel: contact.preferredChannel,
      isPrimary: contact.isPrimary,
    });
    setContactDialogOpen(true);
  }

  function saveContact() {
    if (!selectedAccountRecord || !contactForm.fullName.trim() || !contactForm.email.trim()) {
      toast({ title: 'Contact needs a name and email' });
      return;
    }

    setContacts((current) => {
      const normalized = contactForm.isPrimary
        ? current.map((contact) => contact.accountId === selectedAccountRecord.id ? { ...contact, isPrimary: false } : contact)
        : current;

      if (editingContactId) {
        return normalized.map((contact) => contact.id === editingContactId ? { ...contact, ...contactForm } : contact);
      }

      return [
        ...normalized,
        {
          id: `contact-${selectedAccountRecord.id}-${Date.now().toString(36)}`,
          accountId: selectedAccountRecord.id,
          ...contactForm,
        },
      ];
    });

    toast({ title: editingContactId ? 'Contact updated' : 'Contact added' });
    setContactDialogOpen(false);
  }

  function makePrimaryContact(contactId: string) {
    if (!selectedAccountRecord) return;

    setContacts((current) => current.map((contact) => contact.accountId === selectedAccountRecord.id
      ? { ...contact, isPrimary: contact.id === contactId }
      : contact));
    toast({ title: 'Primary contact updated' });
  }

  function createSegmentTag(label: string, category: CustomerTag['category'], usage: string) {
    const nextTag: CustomerTag = {
      id: `tag-${slugify(label)}-${Date.now().toString(36)}`,
      label: label.trim(),
      category,
      colorClass: tagColorByCategory[category],
      usage: usage.trim() || 'Custom account segment managed inside Account Profile.',
    };

    setTags((current) => [...current, nextTag]);
    setAccountForm((current) => ({ ...current, tags: Array.from(new Set([...current.tags, nextTag.id])) }));
    toast({ title: 'Segment tag created and assigned' });
  }

  return (
    <div className="space-y-4" data-testid="customer-profile-floor">
      <CustomerSubFloorNav
        activeSubFloor={activeSubFloor}
        onChange={setActiveSubFloor}
        copy={copy}
        counts={{
          overview: `${ownerCoverage}%`,
          account: accounts.length,
          identity: matches.length,
        }}
      />

      {activeSubFloor === 'overview' ? (
        <OverviewSubFloor
          accountsCount={accounts.length}
          filteredAccountsCount={filteredAccounts.length}
          ownerCoverage={ownerCoverage}
          primaryContactCoverage={primaryContactCoverage}
          identityAlertsCount={matches.length}
          atRiskCount={atRiskCount}
          account={selectedAccountRecord}
          contacts={selectedRecordContacts}
          owners={seed.owners}
          copy={copy}
          onOpenSubFloor={setActiveSubFloor}
          onOpenAccount={() => {
            if (!selectedAccountRecord) return;
            openAccountProfile(selectedAccountRecord);
          }}
        />
      ) : (
        <SubFloorPageHeader activeSubFloor={activeSubFloor} copy={copy} />
      )}

      {activeSubFloor === 'account' ? (
      <section data-testid="account-subfloor">
        <Card className="rounded-lg border">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{copy.account.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{copy.account.body}</p>
              </div>
              <Button onClick={openCreateAccount}>
                <Plus className="size-4" />
                {copy.account.create}
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  value={filters.query}
                  onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                  placeholder={copy.account.search}
                  className="pl-9"
                />
              </div>
              <FilterSelect label={copy.account.tag} value={filters.tagId} onValueChange={(tagId) => setFilters((current) => ({ ...current, tagId }))}>
                <SelectItem value="all">{copy.account.allTags}</SelectItem>
                {tags.map((tag) => <SelectItem key={tag.id} value={tag.id}>{tag.label}</SelectItem>)}
              </FilterSelect>
              <FilterSelect label={copy.account.owner} value={filters.ownerId} onValueChange={(ownerId) => setFilters((current) => ({ ...current, ownerId }))}>
                <SelectItem value="all">{copy.account.allOwners}</SelectItem>
                {seed.owners.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>)}
              </FilterSelect>
              <FilterSelect label={copy.account.lifecycle} value={filters.lifecycle} onValueChange={(lifecycle) => setFilters((current) => ({ ...current, lifecycle }))}>
                <SelectItem value="all">{copy.account.allLifecycle}</SelectItem>
                {lifecycleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </FilterSelect>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <FilterSelect label={copy.account.customerType} value={filters.customerType} onValueChange={(customerType) => setFilters((current) => ({ ...current, customerType }))}>
                <SelectItem value="all">{copy.account.allCustomerTypes}</SelectItem>
                {customerTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </FilterSelect>
              <Button variant="outline" onClick={() => setFilters(defaultFilters)}>
                {copy.account.reset}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden lg:block">
              <Table variant="embedded">
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy.account.table[0]}</TableHead>
                    <TableHead>{copy.account.table[1]}</TableHead>
                    <TableHead>{copy.account.table[2]}</TableHead>
                    <TableHead>{copy.account.table[3]}</TableHead>
                    <TableHead>{copy.account.table[4]}</TableHead>
                    <TableHead>{copy.account.table[5]}</TableHead>
                    <TableHead className="text-right">{copy.account.table[6]}</TableHead>
                    <TableHead className="text-right">{copy.account.table[7]}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => {
                    const accountContacts = contacts.filter((contact) => contact.accountId === account.id);
                    const primaryContact = accountContacts.find((contact) => contact.isPrimary);

                    return (
                      <TableRow
                        key={account.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedAccount?.id === account.id ? 'bg-primary/5' : ''}`}
                        onClick={() => openAccountProfile(account)}
                      >
                        <TableCell>
                          <button
                            type="button"
                            className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAccountProfile(account);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <CustomerAvatar account={account} size="sm" />
                              <div className="min-w-0">
                                <div className="font-medium">{account.displayName}</div>
                                <div className="text-xs text-muted-foreground">{account.accountCode} · {account.primaryEmail}</div>
                              </div>
                            </div>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{account.profile?.primaryEcomChannel ?? account.source}</div>
                          <div className="text-xs text-muted-foreground">{account.profile?.channelOrderRef ?? copy.account.noChannelRef}</div>
                        </TableCell>
                        <TableCell>{customerTypeLabels[account.customerType]}</TableCell>
                        <TableCell>
                          <Badge variant={lifecycleBadgeVariant(account.lifecycle)} className="capitalize">{humanize(account.lifecycle)}</Badge>
                        </TableCell>
                        <TableCell>{ownerName(seed.owners, account.ownerId)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{accountContacts.length}</div>
                          <div className="text-xs text-muted-foreground">{primaryContact?.fullName ?? copy.account.noPrimaryContact}</div>
                        </TableCell>
                        <TableCell className="text-right">{account.identityCompleteness}%</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAccountProfile(account);
                            }}
                          >
                            {copy.account.openProfile}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 lg:hidden">
              {filteredAccounts.map((account) => {
                const accountContacts = contacts.filter((contact) => contact.accountId === account.id);
                const primaryContact = accountContacts.find((contact) => contact.isPrimary);

                return (
                  <button
                    key={account.id}
                    type="button"
                    className={`rounded-lg border p-3 text-left ${selectedAccount?.id === account.id ? 'border-primary bg-primary/5' : 'bg-card'}`}
                    onClick={() => openAccountProfile(account)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <CustomerAvatar account={account} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium">{account.displayName}</div>
                          <div className="text-xs text-muted-foreground">{account.accountCode} · {account.primaryEmail}</div>
                        </div>
                      </div>
                      <Badge variant={lifecycleBadgeVariant(account.lifecycle)} className="capitalize">{humanize(account.lifecycle)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <span>{copy.account.owner}: {ownerName(seed.owners, account.ownerId)}</span>
                      <span>{copy.account.identity}: {account.identityCompleteness}%</span>
                      <span>{copy.account.table[5]}: {accountContacts.length}</span>
                      <span>{copy.account.primary}: {primaryContact?.fullName ?? copy.account.missing}</span>
                      <span>{copy.account.table[1]}: {account.profile?.primaryEcomChannel ?? account.source}</span>
                      <span>{copy.account.phone}: {account.profile?.phone ?? copy.account.noPhone}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {copy.account.noMatch}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
      ) : null}

      {activeSubFloor === 'identity' ? (
        <IdentityMatchingSubFloor
          account={selectedAccountRecord}
          accounts={accounts}
          contacts={contacts}
          owners={seed.owners}
          matches={matches}
          selectedMatches={selectedRecordMatches}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          copy={copy}
        />
      ) : null}

      <AccountEditorDialog
        mode={accountDialogMode}
        form={accountForm}
        owners={seed.owners}
        tags={tags}
        onFormChange={setAccountForm}
        onCreateTag={createSegmentTag}
        onOpenChange={(open) => {
          if (!open) setAccountDialogMode(null);
        }}
        onSave={saveAccount}
      />

      <AccountProfileDialog
        open={profileDialogOpen}
        account={profileAccountRecord}
        contacts={profileAccountRecord ? contacts.filter((contact) => contact.accountId === profileAccountRecord.id) : []}
        owners={seed.owners}
        tags={tags}
        futureModules={seed.futureModules}
        onOpenChange={(open) => {
          setProfileDialogOpen(open);
          if (!open) setProfileAccountId(null);
        }}
        onEditAccount={() => {
          if (!profileAccountRecord) return;
          setProfileDialogOpen(false);
          setProfileAccountId(null);
          openEditAccount(profileAccountRecord);
        }}
        onAddContact={() => {
          if (profileAccountRecord) setSelectedAccountId(profileAccountRecord.id);
          setProfileDialogOpen(false);
          setProfileAccountId(null);
          openCreateContact();
        }}
        onEditContact={(contact) => {
          setProfileDialogOpen(false);
          setProfileAccountId(null);
          openEditContact(contact);
        }}
        onMakePrimaryContact={makePrimaryContact}
      />

      <ContactEditorDialog
        open={contactDialogOpen}
        editing={Boolean(editingContactId)}
        form={contactForm}
        onFormChange={setContactForm}
        onOpenChange={setContactDialogOpen}
        onSave={saveContact}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
}

function OverviewSubFloor({
  accountsCount,
  filteredAccountsCount,
  ownerCoverage,
  primaryContactCoverage,
  identityAlertsCount,
  atRiskCount,
  account,
  contacts,
  owners,
  copy,
  onOpenSubFloor,
  onOpenAccount,
}: {
  accountsCount: number;
  filteredAccountsCount: number;
  ownerCoverage: number;
  primaryContactCoverage: number;
  identityAlertsCount: number;
  atRiskCount: number;
  account: CustomerAccount | null;
  contacts: CustomerContact[];
  owners: CustomerOwner[];
  copy: (typeof customerProfileCopy)[Locale];
  onOpenSubFloor: (subFloor: CustomerSubFloor) => void;
  onOpenAccount: () => void;
}) {
  return (
    <section className="space-y-4" data-testid="overview-subfloor">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard label={copy.metrics.accounts[0]} value={accountsCount} meta={`${filteredAccountsCount} ${copy.metrics.accounts[1]}`} icon={<Building2 className="size-5" />} tone="info" />
        <SummaryMetricCard label={copy.metrics.ownerCoverage[0]} value={`${ownerCoverage}%`} meta={copy.metrics.ownerCoverage[1]} icon={<UserRoundCheck className="size-5" />} tone="success" />
        <SummaryMetricCard label={copy.metrics.primaryContacts[0]} value={`${primaryContactCoverage}%`} meta={copy.metrics.primaryContacts[1]} icon={<CircleUserRound className="size-5" />} tone="purple" />
        <SummaryMetricCard label={copy.metrics.identityAlerts[0]} value={identityAlertsCount} meta={`${atRiskCount} ${copy.metrics.identityAlerts[1]}`} icon={<CopyCheck className="size-5" />} tone={identityAlertsCount ? 'warning' : 'success'} />
      </div>

      {account ? (
        <CustomerRelationshipOverview
          account={account}
          contacts={contacts}
          owners={owners}
          onOpenAccount={onOpenAccount}
          onOpenSubFloor={onOpenSubFloor}
        />
      ) : (
        <EmptyBlock text={copy.overview.empty} />
      )}

      <Card className="rounded-lg border">
        <CardHeader>
          <CardTitle>{copy.overview.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{copy.overview.body}</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {customerSubFloors.filter((subFloor) => subFloor.id !== 'overview').map((subFloor) => (
            <button
              key={subFloor.id}
              type="button"
              className="rounded-lg border bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => onOpenSubFloor(subFloor.id)}
            >
              <div className="text-sm font-semibold">{copy.nav[subFloor.id][0]}</div>
              <div className="mt-2 text-xs leading-5 text-muted-foreground">{copy.nav[subFloor.id][1]}</div>
            </button>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function CustomerRelationshipOverview({
  account,
  contacts,
  owners,
  onOpenAccount,
  onOpenSubFloor,
}: {
  account: CustomerAccount;
  contacts: CustomerContact[];
  owners: CustomerOwner[];
  onOpenAccount: () => void;
  onOpenSubFloor: (subFloor: CustomerSubFloor) => void;
}) {
  const primaryContact = contacts.find((contact) => contact.isPrimary);
  const timelineOwners = new Set(account.timelineEvents.map((event) => event.sourceOfTruthOwner));

  return (
    <Card className="rounded-lg border" data-testid="customer-relationship-overview">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Relationship context</Badge>
              <Badge variant={lifecycleBadgeVariant(account.lifecycleStage.stage)} className="capitalize">{humanize(account.lifecycleStage.stage)}</Badge>
              <Badge variant="secondary">{timelineOwners.size} source owners</Badge>
            </div>
            <CardTitle className="mt-3 text-2xl">{account.displayName}</CardTitle>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {account.profile?.profileSummary ?? account.lifecycleStage.reason}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onOpenAccount}>Open profile</Button>
            <Button size="sm" variant="outline" onClick={() => onOpenSubFloor('account')}>Manage account</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <IdentityFact icon={<UserRoundCheck className="size-4" />} label="Owner" value={ownerName(owners, account.lifecycleStage.ownerId)} detail="Customer owns lifecycle and follow-up accountability" />
          <IdentityFact icon={<CircleUserRound className="size-4" />} label="Primary contact" value={primaryContact?.fullName ?? 'Missing'} detail={primaryContact?.preferredChannel ?? 'Add contact before outreach'} />
          <IdentityFact icon={<ReceiptText className="size-4" />} label="Next action" value={account.lifecycleStage.nextAction} detail={account.lifecycleStage.reason} />
          <IdentityFact icon={<ShieldCheck className="size-4" />} label="Why it matters" value={account.followUps[0]?.businessImpact ?? 'Relationship context is ready'} detail="Operator can see impact before CRM/COS handoff" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <CustomerTimelineEventList events={account.timelineEvents.slice(0, 6)} owners={owners} compact />
          <div className="grid gap-4">
            <FollowUpQueue followUps={account.followUps} owners={owners} />
            <ContinuityPreview account={account} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SubFloorPageHeader({ activeSubFloor, copy }: { activeSubFloor: Exclude<CustomerSubFloor, 'overview'>; copy: (typeof customerProfileCopy)[Locale] }) {
  return (
    <section className="rounded-lg border bg-card p-4" data-testid="customer-subfloor-page-header">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{copy.floor}</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">{copy.nav[activeSubFloor][0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.nav[activeSubFloor][1]}</p>
        </div>
        <Badge variant="outline">{copy.subPage}</Badge>
      </div>
    </section>
  );
}

function CustomerSubFloorNav({
  activeSubFloor,
  onChange,
  counts,
  copy,
}: {
  activeSubFloor: CustomerSubFloor;
  onChange: (subFloor: CustomerSubFloor) => void;
  counts: Record<CustomerSubFloor, number | string>;
  copy: (typeof customerProfileCopy)[Locale];
}) {
  return (
    <nav aria-label="Customer Profile sub-pages" className="overflow-x-auto rounded-lg border bg-card p-1" data-testid="customer-subfloor-nav">
      <div className="flex min-w-max gap-1">
      {customerSubFloors.map((subFloor) => (
        <button
          key={subFloor.id}
          type="button"
          aria-current={activeSubFloor === subFloor.id ? 'page' : undefined}
          title={copy.nav[subFloor.id][1]}
          className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeSubFloor === subFloor.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          onClick={() => onChange(subFloor.id)}
        >
          <span>{copy.nav[subFloor.id][0]}</span>
          <Badge variant={activeSubFloor === subFloor.id ? 'secondary' : 'outline'}>{counts[subFloor.id]}</Badge>
        </button>
      ))}
      </div>
    </nav>
  );
}

function AccountSelector({
  accounts,
  owners,
  selectedAccountId,
  onSelectAccount,
}: {
  accounts: CustomerAccount[];
  owners: CustomerOwner[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
}) {
  return (
    <Select value={selectedAccountId} onValueChange={onSelectAccount}>
      <SelectTrigger aria-label="Select account">
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.displayName} · {ownerName(owners, account.ownerId)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function IdentityMatchingSubFloor({
  account,
  accounts,
  contacts,
  owners,
  matches,
  selectedMatches,
  selectedAccountId,
  onSelectAccount,
  copy,
}: {
  account: CustomerAccount | null;
  accounts: CustomerAccount[];
  contacts: CustomerContact[];
  owners: CustomerOwner[];
  matches: IdentityMatch[];
  selectedMatches: IdentityMatch[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  copy: (typeof customerProfileCopy)[Locale];
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]" data-testid="identity-subfloor">
      <Card className="rounded-lg border">
        <CardHeader>
          <CardTitle>{copy.identity.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{copy.identity.body}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <AccountSelector accounts={accounts} owners={owners} selectedAccountId={selectedAccountId} onSelectAccount={onSelectAccount} />
          <SmallMetric label={copy.identity.total} value={String(matches.length)} />
          <SmallMetric label={copy.identity.selected} value={String(selectedMatches.length)} />
          {account ? <SmallMetric label={copy.identity.account} value={account.displayName} /> : null}
        </CardContent>
      </Card>

      <Card className="rounded-lg border">
        <CardHeader>
          <CardTitle>{copy.identity.queue}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{copy.identity.queueBody}</p>
        </CardHeader>
        <CardContent>
          <IdentityMatchAlerts matches={selectedMatches} accounts={accounts} contacts={contacts} />
        </CardContent>
      </Card>
    </section>
  );
}

function AccountProfileDialog({
  open,
  account,
  contacts,
  owners,
  tags,
  futureModules,
  onOpenChange,
  onEditAccount,
  onAddContact,
  onEditContact,
  onMakePrimaryContact,
}: {
  open: boolean;
  account: CustomerAccount | null;
  contacts: CustomerContact[];
  owners: CustomerOwner[];
  tags: CustomerTag[];
  futureModules: FutureModulePlaceholder[];
  onOpenChange: (open: boolean) => void;
  onEditAccount: () => void;
  onAddContact: () => void;
  onEditContact: (contact: CustomerContact) => void;
  onMakePrimaryContact: (contactId: string) => void;
}) {
  if (!account) return null;

  const primaryContact = contacts.find((contact) => contact.isPrimary);
  const highPriorityFollowUps = account.followUps.filter((followUp) => followUp.priority === 'high').length;
  const openServiceCases = account.serviceCases.filter((serviceCase) => serviceCase.status !== 'resolved').length;
  const recentTimelineEvents = account.timelineEvents.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-[calc(50%+2.5rem)] flex h-[min(760px,calc(100dvh-8rem))] w-[calc(100vw-2rem)] max-w-6xl flex-col overflow-hidden rounded-lg p-0" data-testid="account-profile-dialog">
        <DialogHeader className="border-b bg-background/95 px-5 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <CustomerAvatar account={account} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Customer Profile Floor</Badge>
                  <Badge variant={accountStatusVariant(account.status)} className="capitalize">{account.status}</Badge>
                  <Badge variant="secondary">{humanize(account.lifecycle)}</Badge>
                  <Badge variant="outline">{account.identityCompleteness}% identity</Badge>
                </div>
                <DialogTitle className="mt-2 text-2xl leading-tight">{account.displayName}</DialogTitle>
                <DialogDescription className="mt-1">
                  {account.accountCode} · {account.industry} · {account.country}
                </DialogDescription>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-4 lg:min-w-[34rem]">
              <CompactStatus label="Owner" value={ownerName(owners, account.ownerId)} />
              <CompactStatus label="Revenue" value={currency.format(account.revenue)} />
              <CompactStatus label="Open cases" value={String(openServiceCases)} />
              <CompactStatus label="Priority" value={String(highPriorityFollowUps)} />
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-b px-5">
            <TabsList className="h-12 w-full justify-start overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                ['overview', 'Overview'],
                ['contacts', `Contacts (${contacts.length})`],
                ['portrait', 'Customer portrait'],
                ['activity', 'Activity & risk'],
                ['links', 'Future links'],
              ].map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="h-12 rounded-none border-b-2 border-transparent bg-transparent px-3 data-[state=active]:border-primary data-[state=active]:shadow-none">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="overview" className="m-0 space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                  <section className="rounded-lg border bg-primary/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Next customer move</div>
                        <h3 className="mt-2 text-lg font-semibold">{account.followUps[0]?.nextAction ?? 'Keep customer memory current'}</h3>
                        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{account.followUps[0]?.allowedAction ?? 'Review account context, confirm owner, and keep CRM evidence synchronized.'}</p>
                      </div>
                      <Button variant="default" onClick={onEditAccount}>Edit account</Button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <SmallMetric label="Customer type" value={customerTypeLabels[account.customerType]} />
                      <SmallMetric label="Orders" value={String(account.orderCount)} />
                      <SmallMetric label="Lifecycle" value={humanize(account.lifecycle)} />
                    </div>
                  </section>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <IdentityFact icon={<Building2 className="size-4" />} label="Company" value={account.companyName} detail={account.website} />
                    <IdentityFact icon={<UserRoundCheck className="size-4" />} label="Owner" value={ownerName(owners, account.ownerId)} detail="Relationship owner" />
                    <IdentityFact icon={<ShieldCheck className="size-4" />} label="Identity completeness" value={`${account.identityCompleteness}%`} detail="Profile, owner, contact, and source coverage" />
                    <IdentityFact icon={<Mail className="size-4" />} label="Primary contact" value={primaryContact?.fullName ?? 'Missing'} detail={primaryContact?.email ?? 'Add a primary contact'} />
                  </div>

                  <section className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold">Account memory</h3>
                        <p className="mt-1 text-sm text-muted-foreground">High-signal context for CRM, Service, Finance, and COS handoffs.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {account.tags.map((tagId) => {
                        const tag = tagById(tags, tagId);
                        if (!tag) return null;
                        return <Badge key={tag.id} variant="outline" className={tag.colorClass}>{tag.label}</Badge>;
                      })}
                    </div>
                  </section>
                </div>

                <aside className="space-y-3 xl:sticky xl:top-0 xl:self-start">
                  <ActionContextRail account={account} owners={owners} recentTimelineEvents={recentTimelineEvents} />
                </aside>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="m-0">
              <section className="rounded-lg border">
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Contacts</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Primary indicator, role, email, phone, and communication preference.</p>
                  </div>
                  <Button onClick={onAddContact}>
                    <Plus className="size-4" />
                    Add contact
                  </Button>
                </div>
                <div className="grid gap-3 p-4 lg:grid-cols-2">
                  {contacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} onEdit={() => onEditContact(contact)} onMakePrimary={() => onMakePrimaryContact(contact.id)} />
                  ))}
                  {contacts.length === 0 ? <EmptyBlock text="No contacts yet. Add a primary buyer before connecting CRM or RFQ flows." /> : null}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="portrait" className="m-0">
              {account.profile ? <CustomerPortraitSection account={account} owners={owners} /> : <EmptyBlock text="No detailed customer portrait is available for this account." />}
            </TabsContent>

            <TabsContent value="activity" className="m-0 grid gap-4 lg:grid-cols-2">
              <CustomerTimelineEventList events={account.timelineEvents} owners={owners} />
              <div className="grid gap-4">
                <FollowUpQueue followUps={account.followUps} owners={owners} />
                <ContinuityPreview account={account} />
                <ServiceCasePreview serviceCases={account.serviceCases} />
              </div>
            </TabsContent>

            <TabsContent value="links" className="m-0 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Future links</div>
                  <p className="text-xs text-muted-foreground">Read-only placeholders. These modules are not owned by Customer Profile Floor V1.</p>
                </div>
                <FutureModulePlaceholders modules={futureModules} />
              </div>
              <div className="space-y-3">
                <TextStack title="Profile notes" lines={account.notes} />
                {account.profile ? <TextStack title="Legacy customer memory" lines={account.profile.timeline} scroll /> : null}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CompactStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-semibold">{value}</div>
    </div>
  );
}

function ActionContextRail({ account, owners, recentTimelineEvents }: { account: CustomerAccount; owners: CustomerOwner[]; recentTimelineEvents: CustomerTimelineEvent[] }) {
  const nextFollowUp = account.followUps[0];

  return (
    <div className="rounded-lg border bg-card/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Action context</div>
          <p className="mt-1 text-xs text-muted-foreground">Operator rail for the next customer decision.</p>
        </div>
        <Badge variant="outline">{account.followUps.length} actions</Badge>
      </div>
      <div className="mt-3 rounded-lg border bg-background p-3">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Next action</div>
        <div className="mt-2 text-sm font-semibold">{nextFollowUp?.nextAction ?? 'No queued action'}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{nextFollowUp?.allowedAction ?? 'Customer profile is ready for the next linked workflow.'}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Owner: {ownerName(owners, account.ownerId)}</Badge>
          {nextFollowUp ? <Badge variant="outline">Due {formatProfileDate(nextFollowUp.dueAt)}</Badge> : null}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Recent memory</div>
        {recentTimelineEvents.map((event) => (
          <div key={event.id} className="rounded-lg border bg-background p-3 text-xs">
            <div className="flex items-center justify-between gap-2"><Badge variant="outline">{event.sourceModule}</Badge><span className="text-muted-foreground">{formatProfileDate(event.occurredAt)}</span></div>
            <div className="mt-2 font-medium leading-5">{event.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerAvatar({ account, size }: { account: CustomerAccount; size: 'sm' | 'lg' }) {
  const profile = account.profile;
  const name = profile?.customerName ?? account.displayName;
  const sizeClass = size === 'lg' ? 'size-16' : 'size-10';
  const textClass = size === 'lg' ? 'text-base' : 'text-xs';

  if (account.customerType === 'b2b') {
    return (
      <div className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200`}>
        <Building2 className={size === 'lg' ? 'size-8' : 'size-5'} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-primary/10 ${textClass} font-semibold text-primary`}>
      <span>{initials(name)}</span>
      {profile?.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={`${name} profile image`}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </div>
  );
}

function CustomerPortraitSection({ account, owners }: { account: CustomerAccount; owners: CustomerOwner[] }) {
  const profile = account.profile;
  if (!profile) return null;

  return (
    <section className="rounded-lg border" data-testid="customer-portrait-section">
      <div className="border-b p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <CustomerAvatar account={account} size="lg" />
            <div className="min-w-0">
            <h3 className="text-base font-semibold">Customer portrait</h3>
            <p className="mt-1 text-sm text-muted-foreground">{profile.profileSummary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{profile.primaryEcomChannel}</Badge>
              {profile.channelMix.map((channel) => <Badge key={channel} variant="secondary">{channel}</Badge>)}
            </div>
            </div>
          </div>
          <Badge variant="outline">{profile.segmentLabel}</Badge>
        </div>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-3">
        <PortraitBlock
          icon={<CircleUserRound className="size-4" />}
          label="Identity"
          title={profile.customerName}
          lines={[profile.customerEmail, profile.phone, profile.buyingIntent]}
        />
        <PortraitBlock
          icon={<MapPin className="size-4" />}
          label="Address"
          title={profile.location}
          lines={[profile.shippingAddress, `Postal: ${profile.postalCode || 'N/A'}`]}
        />
        <PortraitBlock
          icon={<ReceiptText className="size-4" />}
          label="EC channel"
          title={profile.primaryEcomChannel}
          lines={[`Channel ref: ${profile.channelOrderRef ?? 'N/A'}`, `Campaign: ${profile.sourceCampaignName}`, `Campaign channel: ${profile.sourceCampaignChannel}`]}
        />
        <PortraitBlock
          icon={<ReceiptText className="size-4" />}
          label="COS readback"
          title={profile.lastOrderId ?? 'No order yet'}
          lines={[`${profile.lastOrderStatus} · ${profile.lastLifecycleStage}`, `Tracking: ${profile.trackingNumber ?? 'N/A'}`, profile.cosReadiness]}
        />
        <PortraitBlock
          icon={<ShoppingBag className="size-4" />}
          label="Buying value"
          title={formatMoney(account.revenue, profile.lastOrderCurrency)}
          lines={[`${account.orderCount} orders`, `${formatMoney(profile.averageOrderValue, profile.lastOrderCurrency)} AOV`, `${profile.totalUnits} units`]}
        />
        <PortraitBlock
          icon={<Truck className="size-4" />}
          label="Fulfillment"
          title={profile.preferredShipping}
          lines={[`Warehouse: ${profile.warehouseId ?? 'N/A'}`, `Last order: ${profile.lastOrderDate ? formatProfileDate(profile.lastOrderDate) : 'N/A'}`, `Shipping fee: ${formatMoney(profile.shippingValue, profile.lastOrderCurrency)}`]}
        />
      </div>

      <div className="grid gap-3 border-t p-4 lg:grid-cols-2">
        <DetailList
          title="Customer fields"
          items={[
            ['Name', profile.customerName],
            ['Email', profile.customerEmail],
            ['Phone', profile.phone],
            ['City', profile.city],
            ['Prefecture', profile.prefecture || 'N/A'],
            ['Country', profile.country],
            ['Shipping address', profile.shippingAddress],
          ]}
        />
        <DetailList
          title="EC / COS order fields"
          items={[
            ['Primary EC channel', profile.primaryEcomChannel],
            ['EC channel mix', profile.channelMix.join(', ') || 'N/A'],
            ['Channel order ref', profile.channelOrderRef ?? 'N/A'],
            ['Last order total', formatMoney(profile.lastOrderValue, profile.lastOrderCurrency)],
            ['Subtotal', formatMoney(profile.subtotalValue, profile.lastOrderCurrency)],
            ['Discount', formatMoney(profile.discountValue, profile.lastOrderCurrency)],
            ['Tracking number', profile.trackingNumber ?? 'N/A'],
          ]}
        />
        <ProductAffinityList products={profile.favoriteProducts} currencyCode={profile.lastOrderCurrency} />
        <RecentOrdersList orders={profile.recentOrders} />
        <RecentEventsList events={profile.recentEvents} />
        <PortraitBlock
          icon={<AlertTriangle className="size-4" />}
          label="Service / risk"
          title={profile.riskSignal}
          lines={[
            `${profile.openServiceCaseCount}/${profile.serviceCaseCount} open service cases`,
            profile.latestServiceCase,
            profile.riskFlags.length ? `Risk flags: ${profile.riskFlags.join(', ')}` : 'No risk flags',
            'CRM owns identity only; COS remains order source.',
          ]}
        />
      </div>

      <div className="grid gap-3 border-t p-4 lg:grid-cols-2">
        <CustomerTimelineEventList events={account.timelineEvents} owners={owners} />
        <div className="grid gap-3">
          <FollowUpQueue followUps={account.followUps} owners={owners} />
          <ContinuityPreview account={account} />
          <ServiceCasePreview serviceCases={account.serviceCases} />
        </div>
      </div>

      <div className="grid gap-3 border-t p-4 lg:grid-cols-2">
        <TextStack title="Profile notes" lines={account.notes} />
        <TextStack title="Legacy customer memory" lines={profile.timeline} scroll />
      </div>
    </section>
  );
}

function DetailList({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-3 grid gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="grid gap-1 text-xs sm:grid-cols-[130px_minmax(0,1fr)]">
            <div className="text-muted-foreground">{label}</div>
            <div className="min-w-0 break-words font-medium">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductAffinityList({ products, currencyCode }: { products: NonNullable<CustomerAccount['profile']>['favoriteProducts']; currencyCode: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <PackageCheck className="size-4" />
        Product affinity
      </div>
      <div className="mt-3 grid gap-2">
        {products.length ? products.map((product) => (
          <div key={`${product.productName}-${product.sku}`} className="rounded-md border bg-background p-2">
            <div className="text-sm font-medium">{product.productName}</div>
            <div className="mt-1 text-xs text-muted-foreground">{product.sku} · {product.quantity} units · {formatMoney(product.revenue, currencyCode)}</div>
          </div>
        )) : <div className="text-xs text-muted-foreground">No product affinity yet.</div>}
      </div>
    </div>
  );
}

function RecentOrdersList({ orders }: { orders: NonNullable<CustomerAccount['profile']>['recentOrders'] }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-sm font-medium">Recent orders</div>
      <div className="mt-3 grid gap-2">
        {orders.length ? orders.map((order) => (
          <div key={order.orderNumber} className="rounded-md border bg-background p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{order.orderNumber}</div>
              <Badge variant="outline">{order.channel}</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{order.status} · {order.lifecycleStage} · {formatMoney(order.total, order.currency)} · {formatProfileDate(order.orderDate)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Tracking: {order.trackingNumber ?? 'N/A'}</div>
          </div>
        )) : <div className="text-xs text-muted-foreground">No COS order linked yet.</div>}
      </div>
    </div>
  );
}

function RecentEventsList({ events }: { events: NonNullable<CustomerAccount['profile']>['recentEvents'] }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-sm font-medium">Recent COS events</div>
      <div className="mt-3 grid gap-2">
        {events.length ? events.map((event) => (
          <div key={`${event.eventType}-${event.createdAt}-${event.message}`} className="rounded-md border bg-background p-2">
            <div className="text-sm font-medium">{event.eventType}</div>
            <div className="mt-1 text-xs text-muted-foreground">{event.message}</div>
            <div className="mt-1 text-xs text-muted-foreground">{event.actorType} · {formatProfileDate(event.createdAt)}</div>
          </div>
        )) : <div className="text-xs text-muted-foreground">No COS event captured yet.</div>}
      </div>
    </div>
  );
}

function CustomerTimelineEventList({
  events,
  owners = [],
  compact = false,
}: {
  events: CustomerAccount['timelineEvents'];
  owners?: CustomerOwner[];
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3" data-testid="customer-timeline-events">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">Unified customer timeline</div>
          <p className="mt-1 text-xs text-muted-foreground">Read model only. Source truth remains in CRM, Ecom/COS, Service, Finance, or Intelligence.</p>
        </div>
        <Badge variant="outline">{events.length} events</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {events.length ? events.map((event) => (
          <div key={event.id} className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={event.sourceOfTruthOwner === 'Customer' ? 'secondary' : 'outline'}>{event.sourceOfTruthOwner}</Badge>
                  <span className="text-xs text-muted-foreground">{formatProfileDate(event.occurredAt)}</span>
                </div>
                <div className="mt-2 text-sm font-medium">{event.summary}</div>
              </div>
              <Badge variant="outline" className="capitalize">{humanize(event.eventType)}</Badge>
            </div>
            <div className={`mt-2 grid gap-2 text-xs text-muted-foreground ${compact ? '' : 'sm:grid-cols-3'}`}>
              <span>Owner: {ownerName(owners, event.ownerId)}</span>
              <span>Next: {event.nextAction}</span>
              <span>Impact: {event.businessImpact}</span>
            </div>
          </div>
        )) : <EmptyBlock text="No timeline events yet. Attach a CRM lead, COS order, service case, or finance signal before using this account in the V1 proof loop." />}
      </div>
    </div>
  );
}

function FollowUpQueue({ followUps, owners }: { followUps: CustomerAccount['followUps']; owners: CustomerOwner[] }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3" data-testid="customer-follow-up-queue">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">Follow-up queue</div>
          <p className="mt-1 text-xs text-muted-foreground">Customer owns the action queue; source domains keep their own state.</p>
        </div>
        <Badge variant="outline">{followUps.length} actions</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {followUps.length ? followUps.map((followUp) => (
          <div key={followUp.id} className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{followUp.nextAction}</div>
              <Badge variant={followUp.priority === 'high' ? 'warning' : 'outline'}>{followUp.priority}</Badge>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <span>Owner: {ownerName(owners, followUp.ownerId)}</span>
              <span>Due: {formatProfileDate(followUp.dueAt)} · Status: {humanize(followUp.status)}</span>
              <span>Allowed action: {followUp.allowedAction}</span>
              <span>Approval: {followUp.humanApprovalBoundary}</span>
            </div>
          </div>
        )) : <EmptyBlock text="No follow-up is queued. Customer needs a next action before it can prove relationship continuity." />}
      </div>
    </div>
  );
}

function ContinuityPreview({ account }: { account: CustomerAccount }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3" data-testid="customer-continuity-preview">
      <div className="text-sm font-medium">RFQ / quote / order continuity</div>
      <div className="mt-3 grid gap-2">
        {account.rfqQuoteLinks.length ? account.rfqQuoteLinks.map((link) => (
          <div key={link.id} className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{link.rfqId ?? link.leadId ?? 'CRM continuity'}</div>
              <Badge variant={link.status === 'converted' ? 'default' : 'outline'} className="capitalize">{humanize(link.status)}</Badge>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <span>SKU: {link.skuId ?? 'N/A'} · Quantity: {link.quantity ?? 'N/A'}</span>
              <span>Value: {link.value ? formatMoney(link.value, 'JPY') : 'N/A'}</span>
              <span>{link.handoff}</span>
            </div>
          </div>
        )) : <EmptyBlock text="No RFQ or quote continuity yet. Customer can still show lifecycle, service, and COS context." />}
      </div>
    </div>
  );
}

function ServiceCasePreview({ serviceCases }: { serviceCases: CustomerAccount['serviceCases'] }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3" data-testid="customer-service-case-preview">
      <div className="text-sm font-medium">Service ownership / SLA</div>
      <div className="mt-3 grid gap-2">
        {serviceCases.length ? serviceCases.map((serviceCase) => (
          <div key={serviceCase.id} className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{serviceCase.linkedEntity}</div>
              <Badge variant={serviceCase.priority === 'high' ? 'warning' : 'outline'}>{serviceCase.status.replace('_', ' ')}</Badge>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <span>SLA: {serviceCase.sla}</span>
              <span>Pending: {serviceCase.pendingAction}</span>
              <span>{serviceCase.intelligenceHandoff}</span>
            </div>
          </div>
        )) : <EmptyBlock text="No service case blocks the next customer action." />}
      </div>
    </div>
  );
}

function TextStack({ title, lines, limit, scroll = false }: { title: string; lines: string[]; limit?: number; scroll?: boolean }) {
  const visibleLines = typeof limit === 'number' ? lines.slice(0, limit) : lines;
  const hiddenCount = Math.max(0, lines.length - visibleLines.length);

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        {hiddenCount ? <Badge variant="outline">+{hiddenCount} archived</Badge> : null}
      </div>
      <div className={`mt-3 grid gap-2 ${scroll ? 'max-h-80 overflow-y-auto pr-1' : ''}`}>
        {visibleLines.length ? visibleLines.map((line) => (
          <div key={line} className="rounded-md border bg-background p-2 text-xs text-muted-foreground">{line}</div>
        )) : <div className="text-xs text-muted-foreground">No entries yet.</div>}
      </div>
    </div>
  );
}

function PortraitBlock({ icon, label, title, lines }: { icon: ReactNode; label: string; title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 min-w-0 break-words text-sm font-medium">{title}</div>
      <div className="mt-2 space-y-1">
        {lines.filter(Boolean).map((line) => (
          <div key={line} className="min-w-0 break-words text-xs text-muted-foreground">{line}</div>
        ))}
      </div>
    </div>
  );
}

function IdentityFact({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 min-w-0 break-words text-sm font-medium">{value}</div>
      <div className="mt-1 min-w-0 break-words text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium capitalize">{value}</div>
    </div>
  );
}

function ContactCard({ contact, onEdit, onMakePrimary }: { contact: CustomerContact; onEdit: () => void; onMakePrimary: () => void }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">{contact.fullName}</div>
            {contact.isPrimary ? <Badge>Primary</Badge> : null}
            <Badge variant="outline" className="capitalize">{humanize(contact.role)}</Badge>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{contact.title}</div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <span className="inline-flex min-w-0 items-center gap-2"><Mail className="size-3" /> <span className="truncate">{contact.email}</span></span>
            <span className="inline-flex min-w-0 items-center gap-2"><Phone className="size-3" /> <span className="truncate">{contact.phone}</span></span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!contact.isPrimary ? <Button size="sm" variant="outline" onClick={onMakePrimary}>Make primary</Button> : null}
          <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Preferred channel: <span className="font-medium capitalize text-foreground">{contact.preferredChannel}</span></div>
    </div>
  );
}

function IdentityMatchAlerts({ matches, accounts, contacts }: { matches: IdentityMatch[]; accounts: CustomerAccount[]; contacts: CustomerContact[] }) {
  if (matches.length === 0) return <EmptyBlock text="No duplicate account or contact warnings for this account." />;

  return (
    <div className="grid gap-3">
      {matches.map((match) => {
        const entityName = getMatchEntityName(match.entityType, match.entityId, accounts, contacts);
        const candidateName = getMatchEntityName(match.entityType, match.candidateId, accounts, contacts);
        return (
          <div key={match.id} className="rounded-lg border border-warning/30 bg-warning/10 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="size-4 text-warning" />
                  Potential duplicate {match.entityType}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{entityName} may match {candidateName}.</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {match.reasons.map((reason) => <Badge key={`${match.id}-${reason}`} variant="outline">{reason}</Badge>)}
                </div>
              </div>
              <div className="shrink-0 text-sm font-semibold">{match.confidence}%</div>
            </div>
            <div className="mt-3 rounded-lg border bg-background/70 p-3 text-xs text-muted-foreground">
              Merge suggestion only. No merge action runs in Customer Profile Floor V1.
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getMatchEntityName(entityType: IdentityMatch['entityType'], id: string, accounts: CustomerAccount[], contacts: CustomerContact[]) {
  if (entityType === 'account') return accounts.find((account) => account.id === id)?.displayName ?? id;
  return contacts.find((contact) => contact.id === id)?.fullName ?? id;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CP';
}

function formatProfileDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: currencyCode || 'JPY', maximumFractionDigits: 0 }).format(amount);
}

function FutureModulePlaceholders({ modules }: { modules: FutureModulePlaceholder[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {modules.map((module) => (
        <div key={module.id} className="rounded-lg border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{module.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{module.detail}</div>
            </div>
            <Badge variant={module.status === 'not_connected' ? 'secondary' : 'outline'}>{module.owner}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{text}</div>;
}

function AccountEditorDialog({
  mode,
  form,
  owners,
  tags,
  onFormChange,
  onCreateTag,
  onOpenChange,
  onSave,
}: {
  mode: 'create' | 'edit' | null;
  form: AccountFormState;
  owners: CustomerOwner[];
  tags: CustomerTag[];
  onFormChange: (form: AccountFormState) => void;
  onCreateTag: (label: string, category: CustomerTag['category'], usage: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagCategory, setNewTagCategory] = useState<CustomerTag['category']>('segment');
  const [newTagUsage, setNewTagUsage] = useState('');

  const toggleTag = (tagId: string) => {
    const nextTags = form.tags.includes(tagId)
      ? form.tags.filter((id) => id !== tagId)
      : [...form.tags, tagId];
    onFormChange({ ...form, tags: nextTags });
  };

  const createTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;

    onCreateTag(label, newTagCategory, newTagUsage);
    setNewTagLabel('');
    setNewTagCategory('segment');
    setNewTagUsage('');
    setNewTagOpen(false);
  };

  return (
    <Dialog open={Boolean(mode)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create account' : 'Edit account'}</DialogTitle>
          <DialogDescription>Manage customer identity, ownership, lifecycle, profile basics, and segment tags in one account edit flow.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Company name" value={form.companyName} onChange={(companyName) => onFormChange({ ...form, companyName })} />
          <TextField label="Display name" value={form.displayName} onChange={(displayName) => onFormChange({ ...form, displayName })} />
          <TextField label="Primary email" value={form.primaryEmail} onChange={(primaryEmail) => onFormChange({ ...form, primaryEmail })} />
          <TextField label="Website" value={form.website} onChange={(website) => onFormChange({ ...form, website })} />
          <TextField label="Industry" value={form.industry} onChange={(industry) => onFormChange({ ...form, industry })} />
          <TextField label="Country" value={form.country} onChange={(country) => onFormChange({ ...form, country })} />
          <TextField label="Source" value={form.source} onChange={(source) => onFormChange({ ...form, source })} />
          <SelectField label="Owner" value={form.ownerId} onValueChange={(ownerId) => onFormChange({ ...form, ownerId })}>
            {owners.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>)}
          </SelectField>
          <SelectField label="Customer type" value={form.customerType} onValueChange={(customerType) => onFormChange({ ...form, customerType: customerType as CustomerType })}>
            {customerTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectField>
          <SelectField label="Lifecycle" value={form.lifecycle} onValueChange={(lifecycle) => onFormChange({ ...form, lifecycle: lifecycle as CustomerLifecycle })}>
            {lifecycleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectField>
          <SelectField label="Status" value={form.status} onValueChange={(status) => onFormChange({ ...form, status: status as AccountStatus })}>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="watch">Watch</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectField>
        </div>
        <section className="rounded-lg border bg-muted/20 p-4" data-testid="account-tag-editor">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Segment tags</h3>
              <p className="mt-1 text-xs text-muted-foreground">Tags are account profile metadata. Use them for CRM, Intelligence, and service segmentation later.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{form.tags.length} assigned</Badge>
              <Button type="button" size="sm" variant="outline" onClick={() => setNewTagOpen((open) => !open)}>
                <Plus className="size-4" />
                New segment tag
              </Button>
            </div>
          </div>
          {newTagOpen ? (
            <div className="mt-3 grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <TextField label="Tag label" value={newTagLabel} onChange={setNewTagLabel} />
              <SelectField label="Category" value={newTagCategory} onValueChange={(category) => setNewTagCategory(category as CustomerTag['category'])}>
                {tagCategoryOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectField>
              <TextField label="Usage note" value={newTagUsage} onChange={setNewTagUsage} />
              <div className="flex items-end gap-2">
                <Button type="button" className="w-full" onClick={createTag} disabled={!newTagLabel.trim()}>
                  Create and assign
                </Button>
              </div>
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {tags.map((tag) => {
              const selected = form.tags.includes(tag.id);

              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={selected}
                  className={`rounded-lg border bg-background p-3 text-left transition-colors ${selected ? 'border-primary/40 ring-1 ring-primary/30' : 'hover:border-primary/30'}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className={tag.colorClass}>{tag.label}</Badge>
                    <span className="text-xs font-medium text-muted-foreground">{selected ? 'Assigned' : 'Add'}</span>
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">{tag.category}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tag.usage}</p>
                </button>
              );
            })}
          </div>
        </section>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>{mode === 'create' ? 'Create account' : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactEditorDialog({
  open,
  editing,
  form,
  onFormChange,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  editing: boolean;
  form: ContactFormState;
  onFormChange: (form: ContactFormState) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit contact' : 'Add contact'}</DialogTitle>
          <DialogDescription>Contacts stay under the selected account. Outreach automation comes later.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Full name" value={form.fullName} onChange={(fullName) => onFormChange({ ...form, fullName })} />
          <TextField label="Title" value={form.title} onChange={(title) => onFormChange({ ...form, title })} />
          <TextField label="Email" value={form.email} onChange={(email) => onFormChange({ ...form, email })} />
          <TextField label="Phone" value={form.phone} onChange={(phone) => onFormChange({ ...form, phone })} />
          <SelectField label="Role" value={form.role} onValueChange={(role) => onFormChange({ ...form, role: role as ContactRole })}>
            {contactRoleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectField>
          <SelectField label="Preferred channel" value={form.preferredChannel} onValueChange={(preferredChannel) => onFormChange({ ...form, preferredChannel: preferredChannel as PreferredChannel })}>
            {channelOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectField>
          <button
            type="button"
            className={`rounded-lg border p-3 text-left text-sm ${form.isPrimary ? 'border-primary bg-primary/10' : 'bg-muted/20'}`}
            onClick={() => onFormChange({ ...form, isPrimary: !form.isPrimary })}
          >
            <div className="font-medium">Primary contact</div>
            <div className="mt-1 text-xs text-muted-foreground">Only one primary contact is allowed per account.</div>
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>{editing ? 'Save contact' : 'Add contact'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({ label, value, onValueChange, children }: { label: string; value: string; onValueChange: (value: string) => void; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}
