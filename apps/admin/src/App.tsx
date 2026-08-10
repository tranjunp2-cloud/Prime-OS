import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BarChart3,
  BrainCircuit,
  CircleDollarSign,
  ClipboardList,
  ChevronRight,
  Eye,
  Gauge,
  HeartHandshake,
  ImagePlus,
  LayoutGrid,
  LogOut,
  LockKeyhole,
  Megaphone,
  MessageSquareText,
  MoonStar,
  Package2,
  PanelsTopLeft,
  Plus,
  RadioTower,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  ShieldUser,
  ShoppingCart,
  SquarePen,
  Store,
  Target,
  Truck,
  Trash2,
  UserRoundCheck,
  Users,
  Warehouse,
  Workflow,
  type LucideIcon
} from 'lucide-react';

type ResourceKey =
  | 'intelligenceCreators'
  | 'intelligenceCustomers'
  | 'launchDecisions'
  | 'products'
  | 'listings'
  | 'inventoryBrain'
  | 'warehouses'
  | 'omsOrders'
  | 'fulfillmentControl'
  | 'policies'
  | 'eventAudit'
  | 'campaignOps'
  | 'contentCreatorOps'
  | 'leadResponseCapture'
  | 'retargetingOutreach'
  | 'capitalReadiness'
  | 'capitalOffers'
  | 'riskTrust'
  | 'settlementRepayment'
  | 'financePortfolio'
  | 'crmCompact'
  | 'serviceDesk'
  | 'admins'
  | 'users';
type ViewerRole = 'admin' | 'user';
type ResourceGroupKey = 'intelligence' | 'ecom' | 'crm' | 'finance' | 'customer' | 'identity';
type FieldType = 'text' | 'email' | 'number' | 'select' | 'textarea' | 'boolean' | 'image';
type SortMode = 'updated' | 'title' | 'status';
type AdminValue = string | number | boolean | undefined;
type AdminRecord = Record<string, AdminValue> & { id?: string };

interface FieldOption {
  label: string;
  value: string;
}

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  step?: string;
  min?: number;
  options?: FieldOption[];
}

interface ResourceConfig {
  group: ResourceGroupKey;
  label: string;
  singular: string;
  description: string;
  tableTitle: string;
  strategy: string;
  evidence: string[];
  statusKey?: string;
  createDefault: () => AdminRecord;
  fields: FieldConfig[];
  toTitle: (record: AdminRecord) => string;
  toMeta: (record: AdminRecord) => string;
  columns: Array<{ key: string; label: string }>;
}

interface AuthAccount {
  id: string;
  role: ViewerRole;
  fullName: string;
  email: string;
  workspace?: string;
  seatType?: string;
}

interface SessionResponse {
  role: ViewerRole;
  roleLabel: string;
  description: string;
  canReset: boolean;
  canWrite: boolean;
  visibleResources: ResourceKey[];
  writableResources: ResourceKey[];
  hiddenResources: ResourceKey[];
  resourcePermissions: Record<ResourceKey, { read: boolean; write: boolean }>;
  account: AuthAccount | null;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  session: SessionResponse;
}

interface MetaResponse {
  resourceCounts: Partial<Record<ResourceKey, number>>;
  totalVisibleRecords: number;
  adminCount: number;
  userCount: number;
  writableResourceCount: number;
  updatedAt: string;
}

interface ResourceGroup {
  key: ResourceGroupKey;
  label: string;
  description: string;
  resources: ResourceKey[];
}

const authTokenStorageKey = 'prime-os-admin-token';
let adminAuthToken: string | null = null;
const resourceOrder: ResourceKey[] = [
  'intelligenceCreators',
  'intelligenceCustomers',
  'launchDecisions',
  'products',
  'listings',
  'inventoryBrain',
  'warehouses',
  'omsOrders',
  'fulfillmentControl',
  'policies',
  'eventAudit',
  'campaignOps',
  'contentCreatorOps',
  'leadResponseCapture',
  'retargetingOutreach',
  'capitalReadiness',
  'capitalOffers',
  'riskTrust',
  'settlementRepayment',
  'financePortfolio',
  'crmCompact',
  'serviceDesk',
  'admins',
  'users'
];
const resourceGroups: ResourceGroup[] = [
  {
    key: 'intelligence',
    label: 'Intelligence',
    description: 'Govern the insight inputs that feed Creators, Customers, and Launch Decisions.',
    resources: ['intelligenceCreators', 'intelligenceCustomers', 'launchDecisions']
  },
  {
    key: 'ecom',
    label: 'Ecom',
    description: 'Govern the exact COS floors that PrimeOS Ecom reads: Products, Listings, Inventory Brain, Warehouses, Orders, Fulfillment, Policy & Rule, and Event & Audit.',
    resources: ['products', 'listings', 'inventoryBrain', 'warehouses', 'omsOrders', 'fulfillmentControl', 'policies', 'eventAudit']
  },
  {
    key: 'crm',
    label: 'CRM',
    description: 'Control the execution lanes that turn PrimeOS decisions into demand.',
    resources: ['campaignOps', 'contentCreatorOps', 'leadResponseCapture', 'retargetingOutreach']
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Manage the finance control plane behind PrimeOS capital readiness, offers, risk, settlement, and portfolio views.',
    resources: ['capitalReadiness', 'capitalOffers', 'riskTrust', 'settlementRepayment', 'financePortfolio']
  },
  {
    key: 'customer',
    label: 'Customer',
    description: 'Own CRM memory and service operations after the transaction.',
    resources: ['crmCompact', 'serviceDesk']
  },
  {
    key: 'identity',
    label: 'Identity',
    description: 'Separate privileged admins from PrimeOS user seats.',
    resources: ['admins', 'users']
  }
];

const intelligenceAdminResources: ResourceKey[] = ['intelligenceCreators', 'intelligenceCustomers', 'launchDecisions'];
const runtimePreviewHrefs: Partial<Record<ResourceKey, string>> = {
  intelligenceCreators: 'http://127.0.0.1:5173/intelligence/creators',
  intelligenceCustomers: 'http://127.0.0.1:5173/intelligence/trends',
  launchDecisions: 'http://127.0.0.1:5173/intelligence/launch-decisions',
  capitalReadiness: 'http://127.0.0.1:5173/finance/capital-readiness',
  capitalOffers: 'http://127.0.0.1:5173/finance/capital-offers',
  riskTrust: 'http://127.0.0.1:5173/finance/risk-trust',
  settlementRepayment: 'http://127.0.0.1:5173/finance/settlement-repayment'
};

const resourceConfig: Record<ResourceKey, ResourceConfig> = {
  intelligenceCreators: {
    group: 'intelligence',
    label: 'Creators',
    singular: 'Creator profile',
    description: 'Control the creator pool that powers Intelligence / Creators in PrimeOS.',
    tableTitle: 'Creator intelligence pool',
    strategy: 'If creator metadata, fit, SKU linkage, and proof notes stay clean here, the Creators screen explains why each creator deserves attention.',
    evidence: ['Creator fit stays attached to SKU truth', 'Proof notes explain why the creator surfaced', 'Launch and content ops inherit the right creator context'],
    statusKey: 'status',
    createDefault: () => ({
      creatorName: '',
      imageUrl: '',
      market: 'JP',
      primaryChannel: 'instagram',
      fitScore: 80,
      linkedSku: '',
      audienceFit: '',
      marketFit: '',
      recentProof: '',
      status: 'watchlist'
    }),
    fields: [
      { key: 'creatorName', label: 'Creator name', type: 'text', required: true, placeholder: 'Linh Dao' },
      { key: 'imageUrl', label: 'Creator image', type: 'image' },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Japan', value: 'JP' },
          { label: 'Vietnam', value: 'VN' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Global', value: 'GLOBAL' }
        ]
      },
      {
        key: 'primaryChannel',
        label: 'Primary channel',
        type: 'select',
        options: [
          { label: 'Instagram', value: 'instagram' },
          { label: 'TikTok', value: 'tiktok' },
          { label: 'YouTube', value: 'youtube' },
          { label: 'XHS', value: 'xhs' }
        ]
      },
      { key: 'fitScore', label: 'Fit score', type: 'number', step: '1', min: 0 },
      { key: 'linkedSku', label: 'Linked SKU', type: 'text', placeholder: 'CR-NTB-BLK-A5-A4' },
      { key: 'audienceFit', label: 'Audience fit proof', type: 'textarea', placeholder: 'Why this creator matches the intended audience.' },
      { key: 'marketFit', label: 'Market fit proof', type: 'textarea', placeholder: 'Why this creator fits the target market right now.' },
      { key: 'recentProof', label: 'Recent proof', type: 'textarea', placeholder: 'Recent content, campaign, or product proof worth showing in PrimeOS.' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Watchlist', value: 'watchlist' },
          { label: 'Shortlisted', value: 'shortlisted' },
          { label: 'Approved', value: 'approved' },
          { label: 'Archived', value: 'archived' }
        ]
      }
    ],
    toTitle: (record) => String(record.creatorName || 'Untitled creator'),
    toMeta: (record) => `${String(record.primaryChannel || 'No channel')} · ${String(record.linkedSku || 'No SKU')}`,
    columns: [
      { key: 'market', label: 'Market' },
      { key: 'primaryChannel', label: 'Channel' },
      { key: 'fitScore', label: 'Fit' },
      { key: 'status', label: 'Status' }
    ]
  },
  intelligenceCustomers: {
    group: 'intelligence',
    label: 'Customers',
    singular: 'Customer segment',
    description: 'Control the customer segments and intent signals shown in Intelligence / Customers.',
    tableTitle: 'Customer intelligence segments',
    strategy: 'PrimeOS customer intelligence only feels useful when segment size, recent intent, next move, and commercial benefit are explicit here.',
    evidence: ['Lifecycle labels stay consistent', 'Next-best-action reads one source', 'PrimeOS can explain why a segment is worth acting on now'],
    statusKey: 'status',
    createDefault: () => ({
      segmentName: '',
      lifecycle: 'dormant_repeat',
      market: 'JP',
      recommendedProduct: '',
      potentialScore: 80,
      segmentSize: 0,
      recentIntent: '',
      bestChannel: 'CRM + WhatsApp',
      nextMove: '',
      benefit: '',
      status: 'active'
    }),
    fields: [
      { key: 'segmentName', label: 'Segment name', type: 'text', required: true, placeholder: 'Dormant repeat customers' },
      {
        key: 'lifecycle',
        label: 'Lifecycle',
        type: 'select',
        options: [
          { label: 'Dormant repeat', value: 'dormant_repeat' },
          { label: 'Active repeat', value: 'active_repeat' },
          { label: 'Prospecting', value: 'prospecting' },
          { label: 'At risk', value: 'at_risk' }
        ]
      },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Japan', value: 'JP' },
          { label: 'Vietnam', value: 'VN' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Regional', value: 'SEA' }
        ]
      },
      { key: 'recommendedProduct', label: 'Recommended product', type: 'text', placeholder: 'CR-NTB-BLK-A5-A4' },
      { key: 'potentialScore', label: 'Potential score', type: 'number', step: '1', min: 0 },
      { key: 'segmentSize', label: 'Segment size', type: 'number', step: '1', min: 0 },
      { key: 'recentIntent', label: 'Recent intent proof', type: 'textarea', placeholder: 'What recent buying or inquiry behavior makes this segment timely.' },
      { key: 'bestChannel', label: 'Best channel', type: 'text', placeholder: 'TikTok + CRM + WhatsApp' },
      { key: 'nextMove', label: 'Recommended move', type: 'textarea', placeholder: 'The one move PrimeOS should push the user toward.' },
      { key: 'benefit', label: 'Business benefit', type: 'textarea', placeholder: 'What the seller gains if this segment is activated now.' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Testing', value: 'testing' },
          { label: 'Watch', value: 'watch' },
          { label: 'Archived', value: 'archived' }
        ]
      }
    ],
    toTitle: (record) => String(record.segmentName || 'Untitled customer segment'),
    toMeta: (record) => `${String(record.lifecycle || 'No lifecycle')} · ${String(record.recommendedProduct || 'No product')}`,
    columns: [
      { key: 'market', label: 'Market' },
      { key: 'lifecycle', label: 'Lifecycle' },
      { key: 'potentialScore', label: 'Fit' },
      { key: 'status', label: 'Status' }
    ]
  },
  launchDecisions: {
    group: 'intelligence',
    label: 'Launch Decisions',
    singular: 'Launch decision',
    description: 'Control the launch plan rows shown in Intelligence / Launch Decisions.',
    tableTitle: 'Launch decision planner',
    strategy: 'Launch Decisions should act like a real commercial approval layer, with clear thesis, owner, blocker, and expected response.',
    evidence: ['Creator and customer inputs stay linked', 'Approval status and owner are explicit', 'CRM, CRM Compact, Ecom, and Finance can all be traced back to the decision'],
    statusKey: 'approvalStatus',
    createDefault: () => ({
      decisionName: '',
      skuCode: '',
      customerSegment: '',
      creatorName: '',
      approvalStatus: 'review',
      confidence: 80,
      whyThisLaunch: '',
      blocker: '',
      owner: '',
      expectedResponse: ''
    }),
    fields: [
      { key: 'decisionName', label: 'Decision name', type: 'text', required: true, placeholder: 'Notebook refill bundle launch' },
      { key: 'skuCode', label: 'SKU code', type: 'text', required: true, placeholder: 'CR-NTB-BLK-A5-A4' },
      { key: 'customerSegment', label: 'Customer segment', type: 'text', placeholder: 'Dormant repeat customers' },
      { key: 'creatorName', label: 'Creator', type: 'text', placeholder: 'Linh Dao' },
      {
        key: 'approvalStatus',
        label: 'Approval status',
        type: 'select',
        options: [
          { label: 'Review', value: 'review' },
          { label: 'Approved', value: 'approved' },
          { label: 'Hold', value: 'hold' },
          { label: 'Rejected', value: 'rejected' }
        ]
      },
      { key: 'confidence', label: 'Confidence', type: 'number', step: '1', min: 0 },
      { key: 'whyThisLaunch', label: 'Why this launch', type: 'textarea', placeholder: 'Why PrimeOS believes this launch should move now.' },
      { key: 'blocker', label: 'Current blocker', type: 'text', placeholder: 'What still needs to be cleared before scale.' },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Who owns the next commercial step.' },
      { key: 'expectedResponse', label: 'Expected response', type: 'textarea', placeholder: 'What response PrimeOS expects after launch.' }
    ],
    toTitle: (record) => String(record.decisionName || 'Untitled launch decision'),
    toMeta: (record) => `${String(record.skuCode || 'No SKU')} · ${String(record.customerSegment || 'No segment')}`,
    columns: [
      { key: 'creatorName', label: 'Creator' },
      { key: 'customerSegment', label: 'Customer' },
      { key: 'confidence', label: 'Confidence' },
      { key: 'approvalStatus', label: 'Approval' }
    ]
  },
  products: {
    group: 'ecom',
    label: 'Products',
    singular: 'Product master SKU',
    description: 'Control the exact records behind Ecom / COS / Products.',
    tableTitle: 'Products',
    strategy: 'PrimeOS Product Master should stay boring and trustworthy so every downstream surface reads the same SKU truth.',
    evidence: ['SKU naming stays normalized', 'Listings and launch screens inherit the same master record', 'Commerce Surface only exposes trusted product truth'],
    statusKey: 'status',
    createDefault: () => ({
      name: '',
      skuCode: '',
      category: 'Stationery',
      status: 'draft',
      retailPrice: 0,
      inventoryCount: 0,
      channelCount: 0
    }),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Black Hardcover Notebook' },
      { key: 'skuCode', label: 'SKU code', type: 'text', required: true, placeholder: 'PRIME-NTB-BLK-A5' },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { label: 'Stationery', value: 'Stationery' },
          { label: 'Art Supplies', value: 'Art Supplies' },
          { label: 'Art Prints', value: 'Art Prints' },
          { label: 'Accessories', value: 'Accessories' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Review', value: 'review' },
          { label: 'Published', value: 'published' },
          { label: 'Archived', value: 'archived' }
        ]
      },
      { key: 'retailPrice', label: 'Retail price', type: 'number', step: '1', min: 0 },
      { key: 'inventoryCount', label: 'Inventory count', type: 'number', step: '1', min: 0 },
      { key: 'channelCount', label: 'Channel count', type: 'number', step: '1', min: 0 }
    ],
    toTitle: (record) => String(record.name || 'Untitled product master row'),
    toMeta: (record) => `${String(record.skuCode || 'No SKU')} · ${String(record.category || 'No category')}`,
    columns: [
      { key: 'skuCode', label: 'SKU' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
      { key: 'retailPrice', label: 'Price' }
    ]
  },
  listings: {
    group: 'ecom',
    label: 'Listings',
    singular: 'Listing',
    description: 'Control the channel rows behind Ecom / COS / Listings.',
    tableTitle: 'Channel listings',
    strategy: 'Listings should stay explicit in admin so channel state does not get buried inside Product Master edits.',
    evidence: ['Marketplace sync stays visible', 'Listing ownership is separated from catalog edits', 'PrimeOS channel health reads one listing source'],
    statusKey: 'syncState',
    createDefault: () => ({
      title: '',
      skuCode: '',
      channel: 'website',
      status: 'draft',
      price: 0,
      currency: 'JPY',
      syncState: 'draft'
    }),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Prime Black Hardcover Notebook A4' },
      { key: 'skuCode', label: 'SKU code', type: 'text', required: true, placeholder: 'PRIME-NTB-BLK-A5' },
      {
        key: 'channel',
        label: 'Channel',
        type: 'select',
        options: [
          { label: 'Website', value: 'website' },
          { label: 'Amazon', value: 'amazon' },
          { label: 'Rakuten', value: 'rakuten' },
          { label: 'Shopee', value: 'shopee' },
          { label: 'TikTok', value: 'tiktok' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
          { label: 'Paused', value: 'paused' },
          { label: 'Error', value: 'error' }
        ]
      },
      { key: 'price', label: 'Price', type: 'number', step: '1', min: 0 },
      {
        key: 'currency',
        label: 'Currency',
        type: 'select',
        options: [
          { label: 'JPY', value: 'JPY' },
          { label: 'USD', value: 'USD' },
          { label: 'VND', value: 'VND' }
        ]
      },
      {
        key: 'syncState',
        label: 'Sync state',
        type: 'select',
        options: [
          { label: 'Healthy', value: 'healthy' },
          { label: 'Attention', value: 'attention' },
          { label: 'Draft', value: 'draft' }
        ]
      }
    ],
    toTitle: (record) => String(record.title || 'Untitled listing'),
    toMeta: (record) => `${String(record.channel || 'No channel')} · ${String(record.skuCode || 'No SKU')}`,
    columns: [
      { key: 'channel', label: 'Channel' },
      { key: 'status', label: 'Status' },
      { key: 'price', label: 'Price' },
      { key: 'syncState', label: 'Sync' }
    ]
  },
  inventoryBrain: {
    group: 'ecom',
    label: 'Inventory Brain',
    singular: 'Inventory signal',
    description: 'Control the stock, risk, and replenishment rows behind Ecom / COS / Inventory Brain.',
    tableTitle: 'Inventory brain signals',
    strategy: 'Inventory Brain should explain ATS and risk cleanly so Commerce Surface and Launch Decisions do not oversell shaky stock.',
    evidence: ['ATS stays explicit per SKU lane', 'Risk levels are visible before launch handoff', 'Warehouse routing inherits one inventory posture'],
    statusKey: 'riskLevel',
    createDefault: () => ({
      signalName: '',
      skuCode: '',
      warehouseCode: '',
      ats: 0,
      reserved: 0,
      riskLevel: 'healthy',
      replenishmentState: 'balanced'
    }),
    fields: [
      { key: 'signalName', label: 'Signal name', type: 'text', required: true, placeholder: 'Tokyo notebook stock lane' },
      { key: 'skuCode', label: 'SKU code', type: 'text', required: true, placeholder: 'CR-NTB-BLK-A5' },
      { key: 'warehouseCode', label: 'Warehouse code', type: 'text', required: true, placeholder: 'CR-JP' },
      { key: 'ats', label: 'ATS', type: 'number', step: '1', min: 0 },
      { key: 'reserved', label: 'Reserved', type: 'number', step: '1', min: 0 },
      {
        key: 'riskLevel',
        label: 'Risk level',
        type: 'select',
        options: [
          { label: 'Healthy', value: 'healthy' },
          { label: 'Watch', value: 'watch' },
          { label: 'Critical', value: 'critical' }
        ]
      },
      {
        key: 'replenishmentState',
        label: 'Replenishment state',
        type: 'select',
        options: [
          { label: 'Balanced', value: 'balanced' },
          { label: 'Reorder', value: 'reorder' },
          { label: 'Restricted', value: 'restricted' }
        ]
      }
    ],
    toTitle: (record) => String(record.signalName || 'Untitled inventory signal'),
    toMeta: (record) => `${String(record.skuCode || 'No SKU')} · ${String(record.warehouseCode || 'No warehouse')}`,
    columns: [
      { key: 'warehouseCode', label: 'Warehouse' },
      { key: 'ats', label: 'ATS' },
      { key: 'riskLevel', label: 'Risk' },
      { key: 'replenishmentState', label: 'Replenishment' }
    ]
  },
  warehouses: {
    group: 'ecom',
    label: 'Warehouses',
    singular: 'Warehouse',
    description: 'Control the warehouse nodes behind Ecom / COS / Warehouses.',
    tableTitle: 'Warehouse nodes',
    strategy: 'Warehouses should stay clean in admin so Inventory Brain, OMS, and Fulfillment all resolve the same node truth.',
    evidence: ['Node naming stays consistent', 'Routing guardrails read one source', 'Fulfillment handoff inherits the right warehouse codes'],
    statusKey: 'status',
    createDefault: () => ({
      code: '',
      name: '',
      country: 'VN',
      type: 'internal',
      status: 'active',
      capabilityCount: 1
    }),
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'PRIME-HCM' },
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'PrimeOS HCMC Hub' },
      {
        key: 'country',
        label: 'Country',
        type: 'select',
        options: [
          { label: 'Vietnam', value: 'VN' },
          { label: 'Japan', value: 'JP' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Malaysia', value: 'MY' },
          { label: 'Thailand', value: 'TH' }
        ]
      },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        options: [
          { label: 'Internal', value: 'internal' },
          { label: 'FBA', value: 'fba' },
          { label: 'FBS', value: 'fbs' },
          { label: '3PL', value: '3pl' },
          { label: 'Virtual', value: 'virtual' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
          { label: 'Syncing', value: 'syncing' }
        ]
      },
      { key: 'capabilityCount', label: 'Capability count', type: 'number', step: '1', min: 0 }
    ],
    toTitle: (record) => String(record.name || 'Untitled warehouse'),
    toMeta: (record) => `${String(record.code || 'No code')} · ${String(record.country || 'No country')}`,
    columns: [
      { key: 'country', label: 'Country' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'capabilityCount', label: 'Capabilities' }
    ]
  },
  omsOrders: {
    group: 'ecom',
    label: 'Orders',
    singular: 'Order',
    description: 'Control the order rows behind Ecom / COS / Orders.',
    tableTitle: 'Order orchestration',
    strategy: 'OMS records should stay readable in admin so demand handoff, customer context, and fulfillment release all share one order truth.',
    evidence: ['Order ownership is visible', 'Payment and release state stay explicit', 'Commerce Surface can trace demand into OMS cleanly'],
    statusKey: 'status',
    createDefault: () => ({
      orderCode: '',
      channel: 'website',
      market: 'JP',
      customerName: '',
      paymentStatus: 'paid',
      status: 'review'
    }),
    fields: [
      { key: 'orderCode', label: 'Order code', type: 'text', required: true, placeholder: 'OMS-JP-1042' },
      {
        key: 'channel',
        label: 'Channel',
        type: 'select',
        options: [
          { label: 'Website', value: 'website' },
          { label: 'Amazon', value: 'amazon' },
          { label: 'Rakuten', value: 'rakuten' },
          { label: 'Shopee', value: 'shopee' }
        ]
      },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Japan', value: 'JP' },
          { label: 'Vietnam', value: 'VN' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Regional', value: 'SEA' }
        ]
      },
      { key: 'customerName', label: 'Customer', type: 'text', required: true, placeholder: 'Emma Thompson' },
      {
        key: 'paymentStatus',
        label: 'Payment',
        type: 'select',
        options: [
          { label: 'Paid', value: 'paid' },
          { label: 'Pending', value: 'pending' },
          { label: 'Refund review', value: 'refund_review' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Review', value: 'review' },
          { label: 'Released', value: 'released' },
          { label: 'Packed', value: 'packed' },
          { label: 'Closed', value: 'closed' }
        ]
      }
    ],
    toTitle: (record) => String(record.orderCode || 'Untitled OMS order'),
    toMeta: (record) => `${String(record.customerName || 'No customer')} · ${String(record.channel || 'No channel')}`,
    columns: [
      { key: 'channel', label: 'Channel' },
      { key: 'market', label: 'Market' },
      { key: 'paymentStatus', label: 'Payment' },
      { key: 'status', label: 'Status' }
    ]
  },
  fulfillmentControl: {
    group: 'ecom',
    label: 'Fulfillment',
    singular: 'Fulfillment job',
    description: 'Control the job and SLA rows behind Ecom / COS / Fulfillment.',
    tableTitle: 'Fulfillment control',
    strategy: 'Fulfillment should keep job codes, carriers, and SLA posture readable in admin without cluttering the operator runtime.',
    evidence: ['Warehouse handoff stays explicit', 'SLA posture is readable before exceptions explode', 'PrimeOS service and audit views inherit cleaner fulfillment context'],
    statusKey: 'status',
    createDefault: () => ({
      jobCode: '',
      warehouseCode: '',
      carrier: '',
      priority: 'standard',
      slaHours: 24,
      status: 'queued'
    }),
    fields: [
      { key: 'jobCode', label: 'Job code', type: 'text', required: true, placeholder: 'FUL-JP-2201' },
      { key: 'warehouseCode', label: 'Warehouse code', type: 'text', required: true, placeholder: 'CR-JP' },
      { key: 'carrier', label: 'Carrier', type: 'text', required: true, placeholder: 'Yamato' },
      {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        options: [
          { label: 'Standard', value: 'standard' },
          { label: 'Rush', value: 'rush' },
          { label: 'Escalated', value: 'escalated' }
        ]
      },
      { key: 'slaHours', label: 'SLA hours', type: 'number', step: '1', min: 0 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Queued', value: 'queued' },
          { label: 'Picking', value: 'picking' },
          { label: 'Packed', value: 'packed' },
          { label: 'In transit', value: 'in_transit' },
          { label: 'Exception', value: 'exception' }
        ]
      }
    ],
    toTitle: (record) => String(record.jobCode || 'Untitled fulfillment job'),
    toMeta: (record) => `${String(record.warehouseCode || 'No warehouse')} · ${String(record.carrier || 'No carrier')}`,
    columns: [
      { key: 'warehouseCode', label: 'Warehouse' },
      { key: 'carrier', label: 'Carrier' },
      { key: 'slaHours', label: 'SLA' },
      { key: 'status', label: 'Status' }
    ]
  },
  policies: {
    group: 'ecom',
    label: 'Policy & Rule',
    singular: 'Policy rule',
    description: 'Control the guardrails behind Ecom / COS / Policy & Rule.',
    tableTitle: 'Policy library',
    strategy: 'Policy & Rule should stay versioned in admin so OMS, Fulfillment, and Service inherit the same guardrails.',
    evidence: ['Guardrails stay versioned', 'OMS and fulfillment inherit cleaner defaults', 'Policy logic is easier to audit'],
    statusKey: 'isActive',
    createDefault: () => ({
      name: '',
      description: '',
      scope: 'fulfillment',
      defaultDays: 1,
      isActive: true
    }),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Launch Decision Guardrail' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Explain when this policy applies.' },
      {
        key: 'scope',
        label: 'Scope',
        type: 'select',
        options: [
          { label: 'Fulfillment', value: 'fulfillment' },
          { label: 'Intelligence', value: 'intelligence' },
          { label: 'Routing', value: 'routing' },
          { label: 'Catalog', value: 'catalog' },
          { label: 'Identity', value: 'identity' }
        ]
      },
      { key: 'defaultDays', label: 'Default days', type: 'number', step: '1', min: 0 },
      { key: 'isActive', label: 'Active', type: 'boolean' }
    ],
    toTitle: (record) => String(record.name || 'Untitled policy'),
    toMeta: (record) => `${String(record.scope || 'No scope')} · ${Boolean(record.isActive) ? 'Active' : 'Inactive'}`,
    columns: [
      { key: 'scope', label: 'Scope' },
      { key: 'defaultDays', label: 'Days' },
      { key: 'isActive', label: 'Active' },
      { key: 'updatedAt', label: 'Updated' }
    ]
  },
  eventAudit: {
    group: 'ecom',
    label: 'Event & Audit',
    singular: 'Audit event',
    description: 'Control the retained event rows behind Ecom / COS / Event & Audit.',
    tableTitle: 'Event and audit trail',
    strategy: 'Event & Audit should stay explicit in admin so PrimeOS can explain what happened across OMS, fulfillment, service, and AI operator flows.',
    evidence: ['Cross-surface events remain queryable', 'Escalation severity is visible', 'Audit narratives stay grounded in retained evidence'],
    statusKey: 'status',
    createDefault: () => ({
      eventName: '',
      source: 'oms',
      entityRef: '',
      severity: 'info',
      status: 'logged'
    }),
    fields: [
      { key: 'eventName', label: 'Event name', type: 'text', required: true, placeholder: 'Launch approval synced to campaign ops' },
      {
        key: 'source',
        label: 'Source',
        type: 'select',
        options: [
          { label: 'OMS', value: 'oms' },
          { label: 'Fulfillment', value: 'fulfillment' },
          { label: 'Service', value: 'service' },
          { label: 'AI Operator', value: 'ai_operator' },
          { label: 'Intelligence', value: 'intelligence' }
        ]
      },
      { key: 'entityRef', label: 'Entity ref', type: 'text', required: true, placeholder: 'launch_001' },
      {
        key: 'severity',
        label: 'Severity',
        type: 'select',
        options: [
          { label: 'Info', value: 'info' },
          { label: 'Warning', value: 'warning' },
          { label: 'High', value: 'high' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Logged', value: 'logged' },
          { label: 'Reviewed', value: 'reviewed' },
          { label: 'Escalated', value: 'escalated' },
          { label: 'Archived', value: 'archived' }
        ]
      }
    ],
    toTitle: (record) => String(record.eventName || 'Untitled audit event'),
    toMeta: (record) => `${String(record.source || 'No source')} · ${String(record.entityRef || 'No entity')}`,
    columns: [
      { key: 'source', label: 'Source' },
      { key: 'entityRef', label: 'Entity' },
      { key: 'severity', label: 'Severity' },
      { key: 'status', label: 'Status' }
    ]
  },
  campaignOps: {
    group: 'crm',
    label: 'Campaign Ops',
    singular: 'Campaign plan',
    description: 'Control the operating rows behind CRM / Campaign Ops.',
    tableTitle: 'Campaign operations',
    strategy: 'Campaign Ops should inherit approved launch context and execute against the same SKU, owner, and budget truth.',
    evidence: ['Campaigns inherit launch approvals', 'CRM ownership is explicit', 'Budget and channel rows stay readable'],
    statusKey: 'status',
    createDefault: () => ({
      campaignName: '',
      channel: 'tiktok',
      linkedSku: '',
      owner: '',
      budget: 0,
      status: 'ready'
    }),
    fields: [
      { key: 'campaignName', label: 'Campaign name', type: 'text', required: true, placeholder: 'JP refill push wave 01' },
      {
        key: 'channel',
        label: 'Channel',
        type: 'select',
        options: [
          { label: 'TikTok', value: 'tiktok' },
          { label: 'Meta', value: 'meta' },
          { label: 'Rakuten Ads', value: 'rakuten_ads' },
          { label: 'CRM', value: 'crm' }
        ]
      },
      { key: 'linkedSku', label: 'Linked SKU', type: 'text', placeholder: 'CR-NTB-BLK-A5-A4' },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Growth lead' },
      { key: 'budget', label: 'Budget', type: 'number', step: '1', min: 0 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Ready', value: 'ready' },
          { label: 'Active', value: 'active' },
          { label: 'Paused', value: 'paused' },
          { label: 'Closed', value: 'closed' }
        ]
      }
    ],
    toTitle: (record) => String(record.campaignName || 'Untitled campaign'),
    toMeta: (record) => `${String(record.channel || 'No channel')} · ${String(record.linkedSku || 'No SKU')}`,
    columns: [
      { key: 'channel', label: 'Channel' },
      { key: 'owner', label: 'Owner' },
      { key: 'budget', label: 'Budget' },
      { key: 'status', label: 'Status' }
    ]
  },
  contentCreatorOps: {
    group: 'crm',
    label: 'Content & Creator Ops',
    singular: 'Creator ops brief',
    description: 'Control the execution briefs behind CRM / Content & Creator Ops.',
    tableTitle: 'Content and creator operations',
    strategy: 'Creator execution should read approved briefs, linked SKUs, and delivery stages from one admin lane.',
    evidence: ['Content stages stay visible', 'Creator brief ownership is explicit', 'CRM execution traces back to approved decisions'],
    statusKey: 'status',
    createDefault: () => ({
      briefName: '',
      creatorName: '',
      deliverable: 'short_form_video',
      owner: '',
      linkedSku: '',
      status: 'briefing'
    }),
    fields: [
      { key: 'briefName', label: 'Brief name', type: 'text', required: true, placeholder: 'Refill bundle creator proof clip' },
      { key: 'creatorName', label: 'Creator', type: 'text', placeholder: 'Linh Dao' },
      {
        key: 'deliverable',
        label: 'Deliverable',
        type: 'select',
        options: [
          { label: 'Short-form video', value: 'short_form_video' },
          { label: 'Static carousel', value: 'static_carousel' },
          { label: 'Live selling slot', value: 'live_selling' },
          { label: 'Product explainer', value: 'product_explainer' }
        ]
      },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Creator manager' },
      { key: 'linkedSku', label: 'Linked SKU', type: 'text', placeholder: 'CR-NTB-BLK-A5-A4' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Briefing', value: 'briefing' },
          { label: 'In production', value: 'in_production' },
          { label: 'Ready', value: 'ready' },
          { label: 'Published', value: 'published' }
        ]
      }
    ],
    toTitle: (record) => String(record.briefName || 'Untitled content brief'),
    toMeta: (record) => `${String(record.creatorName || 'No creator')} · ${String(record.linkedSku || 'No SKU')}`,
    columns: [
      { key: 'deliverable', label: 'Deliverable' },
      { key: 'owner', label: 'Owner' },
      { key: 'linkedSku', label: 'SKU' },
      { key: 'status', label: 'Status' }
    ]
  },
  leadResponseCapture: {
    group: 'crm',
    label: 'Lead & Response Capture',
    singular: 'Lead flow',
    description: 'Control lead capture and response SLAs behind CRM / Lead & Response Capture.',
    tableTitle: 'Lead capture controls',
    strategy: 'PrimeOS lead workflows need explicit source, owner, and SLA controls so response speed stays consistent.',
    evidence: ['Lead sources are normalized', 'SLA ownership stays visible', 'Response flow is not hidden inside ad ops screens'],
    statusKey: 'status',
    createDefault: () => ({
      flowName: '',
      source: 'landing_page',
      market: 'JP',
      owner: '',
      slaHours: 4,
      status: 'active'
    }),
    fields: [
      { key: 'flowName', label: 'Flow name', type: 'text', required: true, placeholder: 'Notebook inbound lead form' },
      {
        key: 'source',
        label: 'Source',
        type: 'select',
        options: [
          { label: 'Landing page', value: 'landing_page' },
          { label: 'Marketplace chat', value: 'marketplace_chat' },
          { label: 'Live event', value: 'live_event' },
          { label: 'Manual import', value: 'manual_import' }
        ]
      },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Japan', value: 'JP' },
          { label: 'Vietnam', value: 'VN' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Regional', value: 'SEA' }
        ]
      },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'CRM manager' },
      { key: 'slaHours', label: 'SLA hours', type: 'number', step: '1', min: 0 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Watch', value: 'watch' },
          { label: 'Paused', value: 'paused' },
          { label: 'Archived', value: 'archived' }
        ]
      }
    ],
    toTitle: (record) => String(record.flowName || 'Untitled lead flow'),
    toMeta: (record) => `${String(record.source || 'No source')} · ${String(record.market || 'No market')}`,
    columns: [
      { key: 'source', label: 'Source' },
      { key: 'market', label: 'Market' },
      { key: 'slaHours', label: 'SLA' },
      { key: 'status', label: 'Status' }
    ]
  },
  retargetingOutreach: {
    group: 'crm',
    label: 'Retargeting & Outreach',
    singular: 'Retargeting play',
    description: 'Control audience reactivation and outreach rules behind CRM / Retargeting & Outreach.',
    tableTitle: 'Retargeting plays',
    strategy: 'PrimeOS outreach works best when triggers, channels, and cadence are governed in one admin surface.',
    evidence: ['Audience triggers stay explicit', 'Cadence is governed centrally', 'Retargeting stays tied to customer intent data'],
    statusKey: 'status',
    createDefault: () => ({
      audienceName: '',
      channel: 'whatsapp',
      trigger: '',
      cadenceDays: 7,
      owner: '',
      status: 'active'
    }),
    fields: [
      { key: 'audienceName', label: 'Audience', type: 'text', required: true, placeholder: 'Dormant refill buyers' },
      {
        key: 'channel',
        label: 'Channel',
        type: 'select',
        options: [
          { label: 'WhatsApp', value: 'whatsapp' },
          { label: 'Email', value: 'email' },
          { label: 'TikTok', value: 'tiktok' },
          { label: 'LINE', value: 'line' }
        ]
      },
      { key: 'trigger', label: 'Trigger', type: 'text', placeholder: '30 days without reorder' },
      { key: 'cadenceDays', label: 'Cadence days', type: 'number', step: '1', min: 0 },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'CRM ops' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Testing', value: 'testing' },
          { label: 'Paused', value: 'paused' },
          { label: 'Archived', value: 'archived' }
        ]
      }
    ],
    toTitle: (record) => String(record.audienceName || 'Untitled retargeting play'),
    toMeta: (record) => `${String(record.channel || 'No channel')} · ${String(record.trigger || 'No trigger')}`,
    columns: [
      { key: 'channel', label: 'Channel' },
      { key: 'trigger', label: 'Trigger' },
      { key: 'cadenceDays', label: 'Cadence' },
      { key: 'status', label: 'Status' }
    ]
  },
  capitalReadiness: {
    group: 'finance',
    label: 'Capital Readiness',
    singular: 'Capital readiness program',
    description: 'Control the readiness rows behind PrimeOS / Finance / Capital Readiness.',
    tableTitle: 'Capital readiness controls',
    strategy: 'PrimeOS finance should only call a seller or launch ready when the launch, SKU, funding need, and readiness reason are explicit here.',
    evidence: ['Readiness stays tied to a launch and SKU', 'Funding need is explicit before offers are shown', 'PrimeOS can explain why a program is ready or still on watch'],
    statusKey: 'status',
    createDefault: () => ({
      programName: '',
      market: 'JP',
      owner: '',
      linkedLaunch: '',
      linkedSku: '',
      fundingNeed: 0,
      readinessScore: 70,
      readinessReason: '',
      nextReview: '',
      status: 'watch'
    }),
    fields: [
      { key: 'programName', label: 'Program name', type: 'text', required: true, placeholder: 'Japan growth capital package' },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Japan', value: 'JP' },
          { label: 'Vietnam', value: 'VN' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Regional', value: 'SEA' }
        ]
      },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Finance lead' },
      { key: 'linkedLaunch', label: 'Linked launch', type: 'text', placeholder: 'JP notebook refill comeback' },
      { key: 'linkedSku', label: 'Linked SKU', type: 'text', placeholder: 'CR-NTB-BLK-A5-A4' },
      { key: 'fundingNeed', label: 'Funding need', type: 'number', step: '1', min: 0 },
      { key: 'readinessScore', label: 'Readiness score', type: 'number', step: '1', min: 0 },
      { key: 'readinessReason', label: 'Readiness reason', type: 'textarea', placeholder: 'Why PrimeOS believes this program is ready or still on watch.' },
      { key: 'nextReview', label: 'Next review', type: 'text', placeholder: '2026-05-05T09:00:00.000Z' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Watch', value: 'watch' },
          { label: 'Ready', value: 'ready' },
          { label: 'Submitted', value: 'submitted' },
          { label: 'Closed', value: 'closed' }
        ]
      }
    ],
    toTitle: (record) => String(record.programName || 'Untitled capital program'),
    toMeta: (record) => `${String(record.linkedLaunch || 'No launch')} · ${String(record.market || 'No market')}`,
    columns: [
      { key: 'market', label: 'Market' },
      { key: 'linkedSku', label: 'SKU' },
      { key: 'fundingNeed', label: 'Funding' },
      { key: 'owner', label: 'Owner' },
      { key: 'readinessScore', label: 'Score' },
      { key: 'status', label: 'Status' }
    ]
  },
  capitalOffers: {
    group: 'finance',
    label: 'Capital Offers',
    singular: 'Capital offer',
    description: 'Control the offer rows behind PrimeOS / Finance / Capital Offers.',
    tableTitle: 'Capital offer lane',
    strategy: 'Capital offers should turn finance into a real product decision: who is offering, how much, on what terms, and how repayment works.',
    evidence: ['Offer size and fee stay explicit', 'Repayment model is visible before acceptance', 'PrimeOS can compare offers without exposing raw finance ops'],
    statusKey: 'status',
    createDefault: () => ({
      offerName: '',
      providerName: '',
      capitalType: 'campaign_financing',
      market: 'JP',
      owner: '',
      linkedLaunch: '',
      amount: 0,
      feeRate: 0,
      termDays: 30,
      repaymentModel: 'split_settlement',
      status: 'active'
    }),
    fields: [
      { key: 'offerName', label: 'Offer name', type: 'text', required: true, placeholder: 'JP campaign scale line' },
      { key: 'providerName', label: 'Provider name', type: 'text', required: true, placeholder: 'SMBC growth desk' },
      {
        key: 'capitalType',
        label: 'Capital type',
        type: 'select',
        options: [
          { label: 'Campaign financing', value: 'campaign_financing' },
          { label: 'Inventory financing', value: 'inventory_financing' },
          { label: 'Working capital', value: 'working_capital' },
          { label: 'RFQ / invoice financing', value: 'invoice_financing' }
        ]
      },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Japan', value: 'JP' },
          { label: 'Vietnam', value: 'VN' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Regional', value: 'SEA' }
        ]
      },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Partnership lead' },
      { key: 'linkedLaunch', label: 'Linked launch', type: 'text', placeholder: 'JP notebook refill comeback' },
      { key: 'amount', label: 'Offer amount', type: 'number', step: '1', min: 0 },
      { key: 'feeRate', label: 'Fee rate %', type: 'number', step: '0.1', min: 0 },
      { key: 'termDays', label: 'Term days', type: 'number', step: '1', min: 0 },
      {
        key: 'repaymentModel',
        label: 'Repayment model',
        type: 'select',
        options: [
          { label: 'Split settlement', value: 'split_settlement' },
          { label: 'Invoice sweep', value: 'invoice_sweep' },
          { label: 'Wallet deduction', value: 'wallet_deduction' },
          { label: 'Scheduled auto debit', value: 'scheduled_auto_debit' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Onboarding', value: 'onboarding' },
          { label: 'Watch', value: 'watch' },
          { label: 'Closed', value: 'closed' }
        ]
      }
    ],
    toTitle: (record) => String(record.offerName || 'Untitled capital offer'),
    toMeta: (record) => `${String(record.providerName || 'No provider')} · ${String(record.market || 'No market')}`,
    columns: [
      { key: 'capitalType', label: 'Type' },
      { key: 'market', label: 'Market' },
      { key: 'amount', label: 'Amount' },
      { key: 'termDays', label: 'Term' },
      { key: 'status', label: 'Status' }
    ]
  },
  riskTrust: {
    group: 'finance',
    label: 'Risk & Trust',
    singular: 'Risk profile',
    description: 'Control the risk rows behind PrimeOS / Finance / Risk & Trust.',
    tableTitle: 'Risk and trust profiles',
    strategy: 'Risk & Trust should explain what a lender would worry about, what PrimeOS trusts, and what fix is needed before scale.',
    evidence: ['Trust stays explainable', 'Top risk is visible', 'PrimeOS can show one fix before more capital is committed'],
    statusKey: 'status',
    createDefault: () => ({
      profileName: '',
      signalSource: '',
      trustScore: 70,
      severity: 'medium',
      owner: '',
      topRisk: '',
      recommendedFix: '',
      status: 'active'
    }),
    fields: [
      { key: 'profileName', label: 'Profile name', type: 'text', required: true, placeholder: 'Notebook refill trust lane' },
      { key: 'signalSource', label: 'Signal source', type: 'text', placeholder: 'OMS + service history' },
      { key: 'trustScore', label: 'Trust score', type: 'number', step: '1', min: 0 },
      {
        key: 'severity',
        label: 'Severity',
        type: 'select',
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' }
        ]
      },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Risk lead' },
      { key: 'topRisk', label: 'Top risk', type: 'textarea', placeholder: 'What the lender or operator would worry about first.' },
      { key: 'recommendedFix', label: 'Recommended fix', type: 'textarea', placeholder: 'What needs to be fixed before the score should improve.' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Watch', value: 'watch' },
          { label: 'Paused', value: 'paused' },
          { label: 'Archived', value: 'archived' }
        ]
      }
    ],
    toTitle: (record) => String(record.profileName || 'Untitled risk profile'),
    toMeta: (record) => `${String(record.signalSource || 'No source')} · ${String(record.severity || 'No severity')}`,
    columns: [
      { key: 'trustScore', label: 'Trust' },
      { key: 'signalSource', label: 'Source' },
      { key: 'severity', label: 'Severity' },
      { key: 'owner', label: 'Owner' },
      { key: 'status', label: 'Status' }
    ]
  },
  settlementRepayment: {
    group: 'finance',
    label: 'Settlement & Repayment',
    singular: 'Settlement facility',
    description: 'Control the settlement rows behind PrimeOS / Finance / Settlement & Repayment.',
    tableTitle: 'Settlement and repayment lanes',
    strategy: 'PrimeOS finance should make disbursement targets, repayment source, due amounts, and collection mode explicit before money moves.',
    evidence: ['Disbursement target is visible', 'Repayment source is explicit', 'Collection mode and next due stay readable in one lane'],
    statusKey: 'status',
    createDefault: () => ({
      facilityName: '',
      market: 'JP',
      disbursementTarget: '',
      repaymentSource: '',
      outstandingBalance: 0,
      nextDueAmount: 0,
      nextDueDate: '',
      collectionMode: 'split_settlement',
      status: 'scheduled'
    }),
    fields: [
      { key: 'facilityName', label: 'Facility name', type: 'text', required: true, placeholder: 'JP refill launch settlement' },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Japan', value: 'JP' },
          { label: 'Vietnam', value: 'VN' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Regional', value: 'SEA' }
        ]
      },
      { key: 'disbursementTarget', label: 'Disbursement target', type: 'text', placeholder: 'Campaign Ops budget' },
      { key: 'repaymentSource', label: 'Repayment source', type: 'text', placeholder: 'Split settlement from launch revenue' },
      { key: 'outstandingBalance', label: 'Outstanding balance', type: 'number', step: '1', min: 0 },
      { key: 'nextDueAmount', label: 'Next due amount', type: 'number', step: '1', min: 0 },
      { key: 'nextDueDate', label: 'Next due date', type: 'text', placeholder: '2026-05-06T09:00:00.000Z' },
      {
        key: 'collectionMode',
        label: 'Collection mode',
        type: 'select',
        options: [
          { label: 'Split settlement', value: 'split_settlement' },
          { label: 'Invoice sweep', value: 'invoice_sweep' },
          { label: 'Wallet deduction', value: 'wallet_deduction' },
          { label: 'Scheduled auto debit', value: 'scheduled_auto_debit' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Scheduled', value: 'scheduled' },
          { label: 'Collecting', value: 'collecting' },
          { label: 'Overdue', value: 'overdue' },
          { label: 'Closed', value: 'closed' }
        ]
      }
    ],
    toTitle: (record) => String(record.facilityName || 'Untitled settlement facility'),
    toMeta: (record) => `${String(record.disbursementTarget || 'No target')} · ${String(record.market || 'No market')}`,
    columns: [
      { key: 'market', label: 'Market' },
      { key: 'outstandingBalance', label: 'Outstanding' },
      { key: 'nextDueAmount', label: 'Next due' },
      { key: 'collectionMode', label: 'Collection' },
      { key: 'status', label: 'Status' }
    ]
  },
  financePortfolio: {
    group: 'finance',
    label: 'Portfolio / Finance Ops',
    singular: 'Portfolio lane',
    description: 'Control the portfolio rows used by admin-only Finance Ops monitoring.',
    tableTitle: 'Finance portfolio operations',
    strategy: 'Finance Ops should aggregate outstanding balance, funded volume, overdue, recovery, and ROI without cluttering the PrimeOS seller runtime.',
    evidence: ['Total exposure is visible', 'Overdue and recovery stay explicit', 'Admin can read cohort performance without opening runtime towers'],
    statusKey: 'status',
    createDefault: () => ({
      portfolioName: '',
      market: 'Multi-market',
      sellerCohort: '',
      totalOutstanding: 0,
      totalFunded: 0,
      overdueRate: 0,
      roiPercent: 0,
      recoveryRate: 0,
      status: 'healthy'
    }),
    fields: [
      { key: 'portfolioName', label: 'Portfolio name', type: 'text', required: true, placeholder: 'PrimeOS merchant capital book' },
      { key: 'market', label: 'Market', type: 'text', placeholder: 'Multi-market' },
      { key: 'sellerCohort', label: 'Seller cohort', type: 'text', placeholder: 'Growth sellers' },
      { key: 'totalOutstanding', label: 'Total outstanding', type: 'number', step: '1', min: 0 },
      { key: 'totalFunded', label: 'Total funded', type: 'number', step: '1', min: 0 },
      { key: 'overdueRate', label: 'Overdue rate %', type: 'number', step: '0.1', min: 0 },
      { key: 'roiPercent', label: 'ROI %', type: 'number', step: '0.1', min: 0 },
      { key: 'recoveryRate', label: 'Recovery rate %', type: 'number', step: '0.1', min: 0 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Healthy', value: 'healthy' },
          { label: 'Watch', value: 'watch' },
          { label: 'Stressed', value: 'stressed' },
          { label: 'Closed', value: 'closed' }
        ]
      }
    ],
    toTitle: (record) => String(record.portfolioName || 'Untitled finance portfolio'),
    toMeta: (record) => `${String(record.sellerCohort || 'No cohort')} · ${String(record.market || 'No market')}`,
    columns: [
      { key: 'market', label: 'Market' },
      { key: 'totalOutstanding', label: 'Outstanding' },
      { key: 'totalFunded', label: 'Funded' },
      { key: 'roiPercent', label: 'ROI' },
      { key: 'status', label: 'Status' }
    ]
  },
  crmCompact: {
    group: 'customer',
    label: 'CRM Compact',
    singular: 'CRM segment',
    description: 'Control the compact CRM memory behind Customer / CRM Compact.',
    tableTitle: 'CRM compact memory',
    strategy: 'Customer memory should live in an explicit CRM control surface so the next action is repeatable, not ad hoc.',
    evidence: ['Next action stays explicit', 'Segment ownership is visible', 'Customer memory can feed Intelligence again'],
    statusKey: 'status',
    createDefault: () => ({
      segmentName: '',
      market: 'JP',
      owner: '',
      nextAction: '',
      customerCount: 0,
      status: 'active'
    }),
    fields: [
      { key: 'segmentName', label: 'Segment', type: 'text', required: true, placeholder: 'VIP stationery repeaters' },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Japan', value: 'JP' },
          { label: 'Vietnam', value: 'VN' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Regional', value: 'SEA' }
        ]
      },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'CRM manager' },
      { key: 'nextAction', label: 'Next action', type: 'text', placeholder: 'Offer refill bundle in 7 days' },
      { key: 'customerCount', label: 'Customer count', type: 'number', step: '1', min: 0 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Testing', value: 'testing' },
          { label: 'Watch', value: 'watch' },
          { label: 'Archived', value: 'archived' }
        ]
      }
    ],
    toTitle: (record) => String(record.segmentName || 'Untitled CRM segment'),
    toMeta: (record) => `${String(record.market || 'No market')} · ${String(record.nextAction || 'No next action')}`,
    columns: [
      { key: 'market', label: 'Market' },
      { key: 'owner', label: 'Owner' },
      { key: 'customerCount', label: 'Count' },
      { key: 'status', label: 'Status' }
    ]
  },
  serviceDesk: {
    group: 'customer',
    label: 'Service',
    singular: 'Service queue',
    description: 'Control the queue and SLA rows behind Customer / Service.',
    tableTitle: 'Customer service queues',
    strategy: 'Service lanes should expose SLA, queue state, and ownership in admin instead of being hidden in downstream ops noise.',
    evidence: ['Queue SLAs stay visible', 'Service ownership is clear', 'Customer issue handling reads one queue truth'],
    statusKey: 'status',
    createDefault: () => ({
      queueName: '',
      market: 'JP',
      owner: '',
      slaHours: 24,
      openCases: 0,
      status: 'active'
    }),
    fields: [
      { key: 'queueName', label: 'Queue name', type: 'text', required: true, placeholder: 'JP marketplace support' },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Japan', value: 'JP' },
          { label: 'Vietnam', value: 'VN' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Regional', value: 'SEA' }
        ]
      },
      { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Service lead' },
      { key: 'slaHours', label: 'SLA hours', type: 'number', step: '1', min: 0 },
      { key: 'openCases', label: 'Open cases', type: 'number', step: '1', min: 0 },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Watch', value: 'watch' },
          { label: 'Escalated', value: 'escalated' },
          { label: 'Closed', value: 'closed' }
        ]
      }
    ],
    toTitle: (record) => String(record.queueName || 'Untitled service queue'),
    toMeta: (record) => `${String(record.market || 'No market')} · ${String(record.owner || 'No owner')}`,
    columns: [
      { key: 'market', label: 'Market' },
      { key: 'owner', label: 'Owner' },
      { key: 'slaHours', label: 'SLA' },
      { key: 'status', label: 'Status' }
    ]
  },
  admins: {
    group: 'identity',
    label: 'Admins',
    singular: 'Admin',
    description: 'Privileged operators live in their own table so admin authority stays separate from end-user seats.',
    tableTitle: 'Admin registry',
    strategy: 'PrimeOS admin authority should be explicit, auditable, and separate from seller or brand user records.',
    evidence: ['Admin table is isolated from user seats', 'Privilege levels are visible', 'User mode cannot open this table'],
    statusKey: 'status',
    createDefault: () => ({
      fullName: '',
      email: '',
      accessLevel: 'ops_admin',
      workspace: '',
      status: 'active',
      lastSeenAt: new Date().toISOString()
    }),
    fields: [
      { key: 'fullName', label: 'Full name', type: 'text', required: true, placeholder: 'Aiko Tanaka' },
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'aiko.tanaka@primeos.jp' },
      {
        key: 'accessLevel',
        label: 'Access level',
        type: 'select',
        options: [
          { label: 'Super admin', value: 'super_admin' },
          { label: 'Ops admin', value: 'ops_admin' },
          { label: 'Catalog admin', value: 'catalog_admin' },
          { label: 'Support admin', value: 'support_admin' }
        ]
      },
      { key: 'workspace', label: 'Workspace', type: 'text', placeholder: 'Global control room' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Invited', value: 'invited' },
          { label: 'Suspended', value: 'suspended' }
        ]
      },
      { key: 'lastSeenAt', label: 'Last seen', type: 'text', placeholder: '2026-04-23T01:05:00.000Z' }
    ],
    toTitle: (record) => String(record.fullName || 'Untitled admin'),
    toMeta: (record) => `${String(record.accessLevel || 'No level')} · ${String(record.email || 'No email')}`,
    columns: [
      { key: 'accessLevel', label: 'Access' },
      { key: 'workspace', label: 'Workspace' },
      { key: 'status', label: 'Status' },
      { key: 'lastSeenAt', label: 'Last seen' }
    ]
  },
  users: {
    group: 'identity',
    label: 'Users',
    singular: 'User',
    description: 'PrimeOS user seats belong in a separate table so sellers and brand users do not get mixed with admins.',
    tableTitle: 'User directory',
    strategy: 'Separate user seats make permission conversations cleaner and stop the admin story from getting tangled.',
    evidence: ['Seller and brand seats are isolated', 'Identity cleanup is easier to audit', 'Admin and user tables stay distinct in the database'],
    statusKey: 'status',
    createDefault: () => ({
      fullName: '',
      email: '',
      company: '',
      market: 'VN',
      seatType: 'seller',
      status: 'active'
    }),
    fields: [
      { key: 'fullName', label: 'Full name', type: 'text', required: true, placeholder: 'Emma Thompson' },
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'emma.thompson@primeos.jp' },
      { key: 'company', label: 'Company', type: 'text', placeholder: 'CyberRecord Japan' },
      {
        key: 'market',
        label: 'Market',
        type: 'select',
        options: [
          { label: 'Vietnam', value: 'VN' },
          { label: 'Japan', value: 'JP' },
          { label: 'Singapore', value: 'SG' },
          { label: 'Malaysia', value: 'MY' },
          { label: 'Thailand', value: 'TH' }
        ]
      },
      {
        key: 'seatType',
        label: 'Seat type',
        type: 'select',
        options: [
          { label: 'Seller', value: 'seller' },
          { label: 'Brand manager', value: 'brand_manager' },
          { label: 'Partner', value: 'partner' },
          { label: 'Viewer', value: 'viewer' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Invited', value: 'invited' },
          { label: 'Suspended', value: 'suspended' }
        ]
      }
    ],
    toTitle: (record) => String(record.fullName || 'Untitled user'),
    toMeta: (record) => `${String(record.company || 'No company')} · ${String(record.email || 'No email')}`,
    columns: [
      { key: 'market', label: 'Market' },
      { key: 'seatType', label: 'Seat type' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' }
    ]
  }
};

const resourceIcons: Record<ResourceKey, LucideIcon> = {
  intelligenceCreators: BarChart3,
  intelligenceCustomers: HeartHandshake,
  launchDecisions: PanelsTopLeft,
  products: Package2,
  listings: Store,
  inventoryBrain: BrainCircuit,
  warehouses: Warehouse,
  omsOrders: ShoppingCart,
  fulfillmentControl: Truck,
  policies: ShieldCheck,
  eventAudit: Workflow,
  campaignOps: Megaphone,
  contentCreatorOps: MessageSquareText,
  leadResponseCapture: UserRoundCheck,
  retargetingOutreach: Target,
  capitalReadiness: CircleDollarSign,
  capitalOffers: ClipboardList,
  riskTrust: Gauge,
  settlementRepayment: Workflow,
  financePortfolio: LayoutGrid,
  crmCompact: HeartHandshake,
  serviceDesk: ClipboardList,
  admins: ShieldUser,
  users: Users
};

const groupIcons: Record<ResourceGroupKey, LucideIcon> = {
  intelligence: BarChart3,
  ecom: Store,
  crm: RadioTower,
  finance: CircleDollarSign,
  customer: HeartHandshake,
  identity: ShieldUser
};

const languageOptions = [
  { code: 'us', label: 'US', emoji: '🇺🇸' },
  { code: 'jp', label: 'JP', emoji: '🇯🇵' },
  { code: 'vn', label: 'VN', emoji: '🇻🇳' }
] as const;

type LanguageCode = (typeof languageOptions)[number]['code'];

function createEmptyRecordsState() {
  return {
    intelligenceCreators: [],
    intelligenceCustomers: [],
    launchDecisions: [],
    products: [],
    listings: [],
    inventoryBrain: [],
    warehouses: [],
    omsOrders: [],
    fulfillmentControl: [],
    policies: [],
    eventAudit: [],
    campaignOps: [],
    contentCreatorOps: [],
    leadResponseCapture: [],
    retargetingOutreach: [],
    capitalReadiness: [],
    capitalOffers: [],
    riskTrust: [],
    settlementRepayment: [],
    financePortfolio: [],
    crmCompact: [],
    serviceDesk: [],
    admins: [],
    users: []
  } as Record<ResourceKey, AdminRecord[]>;
}

function createEmptySelectedState() {
  return {
    intelligenceCreators: null,
    intelligenceCustomers: null,
    launchDecisions: null,
    products: null,
    listings: null,
    inventoryBrain: null,
    warehouses: null,
    omsOrders: null,
    fulfillmentControl: null,
    policies: null,
    eventAudit: null,
    campaignOps: null,
    contentCreatorOps: null,
    leadResponseCapture: null,
    retargetingOutreach: null,
    capitalReadiness: null,
    capitalOffers: null,
    riskTrust: null,
    settlementRepayment: null,
    financePortfolio: null,
    crmCompact: null,
    serviceDesk: null,
    admins: null,
    users: null
  } as Record<ResourceKey, string | null>;
}

function createEmptyDraftState() {
  return {
    intelligenceCreators: resourceConfig.intelligenceCreators.createDefault(),
    intelligenceCustomers: resourceConfig.intelligenceCustomers.createDefault(),
    launchDecisions: resourceConfig.launchDecisions.createDefault(),
    products: resourceConfig.products.createDefault(),
    listings: resourceConfig.listings.createDefault(),
    inventoryBrain: resourceConfig.inventoryBrain.createDefault(),
    warehouses: resourceConfig.warehouses.createDefault(),
    omsOrders: resourceConfig.omsOrders.createDefault(),
    fulfillmentControl: resourceConfig.fulfillmentControl.createDefault(),
    policies: resourceConfig.policies.createDefault(),
    eventAudit: resourceConfig.eventAudit.createDefault(),
    campaignOps: resourceConfig.campaignOps.createDefault(),
    contentCreatorOps: resourceConfig.contentCreatorOps.createDefault(),
    leadResponseCapture: resourceConfig.leadResponseCapture.createDefault(),
    retargetingOutreach: resourceConfig.retargetingOutreach.createDefault(),
    capitalReadiness: resourceConfig.capitalReadiness.createDefault(),
    capitalOffers: resourceConfig.capitalOffers.createDefault(),
    riskTrust: resourceConfig.riskTrust.createDefault(),
    settlementRepayment: resourceConfig.settlementRepayment.createDefault(),
    financePortfolio: resourceConfig.financePortfolio.createDefault(),
    crmCompact: resourceConfig.crmCompact.createDefault(),
    serviceDesk: resourceConfig.serviceDesk.createDefault(),
    admins: resourceConfig.admins.createDefault(),
    users: resourceConfig.users.createDefault()
  } as Record<ResourceKey, AdminRecord>;
}

function cloneRecord(record: AdminRecord) {
  return JSON.parse(JSON.stringify(record)) as AdminRecord;
}

function formatValue(value: AdminValue) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '0';
  return value ? String(value) : '—';
}

function formatRelativeTime(value: AdminValue) {
  if (!value || typeof value !== 'string') return '—';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function isImageValue(value: AdminValue) {
  return typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('http'));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Could not read image file.'));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Could not read image file.'));
    };

    reader.readAsDataURL(file);
  });
}

function recordMatchesQuery(record: AdminRecord, query: string) {
  if (!query.trim()) return true;
  const haystack = Object.values(record)
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value))
    .filter((value) => !value.startsWith('data:image/'))
    .map((value) => value.toLowerCase())
    .join(' ');

  return haystack.includes(query.trim().toLowerCase());
}

function sortRecords(records: AdminRecord[], resource: ResourceKey, sortMode: SortMode) {
  const nextRecords = [...records];
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

  nextRecords.sort((left, right) => {
    if (sortMode === 'updated') {
      const leftTime = Date.parse(String(left.updatedAt || left.createdAt || ''));
      const rightTime = Date.parse(String(right.updatedAt || right.createdAt || ''));
      return rightTime - leftTime;
    }

    if (sortMode === 'status') {
      const leftStatus = getStatusLabel(resource, left) || '';
      const rightStatus = getStatusLabel(resource, right) || '';
      return collator.compare(leftStatus, rightStatus);
    }

    const leftTitle = resourceConfig[resource].toTitle(left);
    const rightTitle = resourceConfig[resource].toTitle(right);
    return collator.compare(leftTitle, rightTitle);
  });

  return nextRecords;
}

function getResourceIcon(resource: ResourceKey) {
  return resourceIcons[resource];
}

function getToneClass(value: string) {
  if (['published', 'active', 'healthy'].includes(value)) return 'tone-positive';
  if (['review', 'syncing', 'invited'].includes(value)) return 'tone-warning';
  if (['error', 'archived', 'inactive', 'paused', 'attention', 'suspended'].includes(value)) return 'tone-danger';
  return 'tone-neutral';
}

function getStatusLabel(resource: ResourceKey, record: AdminRecord) {
  const key = resourceConfig[resource].statusKey;
  if (!key) return null;
  const value = record[key];
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
  return value ? String(value) : null;
}

function isBlankAdminValue(value: AdminValue) {
  return value === undefined || value === null || String(value).trim() === '';
}

function validateDraft(resource: ResourceKey, record: AdminRecord) {
  const config = resourceConfig[resource];

  for (const field of config.fields) {
    const value = record[field.key];

    if (field.required && isBlankAdminValue(value)) {
      return `${field.label} is required.`;
    }

    if (field.type === 'number' && !isBlankAdminValue(value)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return `${field.label} must be a valid number.`;
      }

      if (field.min !== undefined && value < field.min) {
        return `${field.label} must be at least ${field.min}.`;
      }
    }

    if (field.type === 'email' && !isBlankAdminValue(value) && !String(value).includes('@')) {
      return `${field.label} must be a valid email.`;
    }
  }

  return null;
}

class RequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requestJson<T>(path: string, token: string | null, init?: RequestInit) {
  const headers = new Headers(init?.headers);

  if (init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new RequestError(errorBody.message || `Request failed: ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

function LoginScreen({
  busy,
  error,
  onLogin
}: {
  busy: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLogin(email, password);
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-visual">
          <img src="/brand-logo.svg" alt="Prime OS logo" className="login-logo" />
          <div className="login-kicker">PrimeOS staging control room</div>
          <h1>Sign in to manage backend data safely.</h1>
          <p>
            Admin can create, edit, delete, and reset control-plane records. User can review runtime data only.
          </p>
        </div>

        <form className="login-form" onSubmit={submitLogin}>
          <div className="login-form-head">
            <span className="login-lock">
              <LockKeyhole className="glyph-icon" />
            </span>
            <div>
              <div className="card-label">Protected admin</div>
              <h2>Login</h2>
            </div>
          </div>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="admin@company.com"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter staging password"
              required
            />
          </label>

          {error ? <div className="error-banner">{error}</div> : null}

          <button type="submit" className="button button-primary login-submit" disabled={busy}>
            <LockKeyhole className="button-icon" />
            <span>{busy ? 'Signing in...' : 'Sign in'}</span>
          </button>

          <p className="login-note">
            Use the staging account configured through the server environment.
          </p>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [authToken, setAuthToken] = useState<string | null>(adminAuthToken);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeResource, setActiveResource] = useState<ResourceKey>('intelligenceCreators');
  const [records, setRecords] = useState<Record<ResourceKey, AdminRecord[]>>(createEmptyRecordsState);
  const [selectedId, setSelectedId] = useState<Record<ResourceKey, string | null>>(createEmptySelectedState);
  const [draft, setDraft] = useState<Record<ResourceKey, AdminRecord>>(createEmptyDraftState);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [language, setLanguage] = useState<LanguageCode>('us');
  const [sidebarThemeMode, setSidebarThemeMode] = useState<'light' | 'dark'>('light');
  const [openGroups, setOpenGroups] = useState<Record<ResourceGroupKey, boolean>>({
    intelligence: true,
    ecom: false,
    crm: false,
    finance: false,
    customer: false,
    identity: false
  });
  const [backendMessage, setBackendMessage] = useState('Connecting to backend...');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentConfig = resourceConfig[activeResource];
  const currentRecords = records[activeResource];
  const currentSelectedId = selectedId[activeResource];
  const currentDraft = draft[activeResource];
  const currentPermission = session?.resourcePermissions[activeResource];
  const currentCount = meta?.resourceCounts[activeResource] ?? currentRecords.length;
  const currentGroup = resourceGroups.find((group) => group.resources.includes(activeResource)) ?? resourceGroups[0];
  const isIntelligenceControl = currentGroup.key === 'intelligence';
  const ActiveResourceIcon = getResourceIcon(activeResource);
  const ActiveGroupIcon = groupIcons[currentGroup.key];
  const filteredRecords = useMemo(
    () => currentRecords.filter((record) => recordMatchesQuery(record, searchQuery)),
    [currentRecords, searchQuery]
  );
  const sortedRecords = useMemo(
    () => sortRecords(filteredRecords, activeResource, sortMode),
    [filteredRecords, activeResource, sortMode]
  );

  useEffect(() => {
    setOpenGroups((current) => ({
      ...current,
      [currentGroup.key]: true
    }));
  }, [currentGroup.key]);

  async function handleLogin(email: string, password: string) {
    setLoginBusy(true);
    setLoginError(null);

    try {
      const loginResponse = await requestJson<LoginResponse>('/api/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      adminAuthToken = loginResponse.token;
      setAuthToken(loginResponse.token);
      setSession(loginResponse.session);
      setBackendMessage(`${loginResponse.session.roleLabel} signed in`);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Login failed';
      setLoginError(message);
      setBackendMessage('Login required');
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    const tokenToRevoke = authToken;
    if (tokenToRevoke) {
      await requestJson('/api/auth/logout', tokenToRevoke, { method: 'POST' }).catch(() => undefined);
    }

    adminAuthToken = null;
    window.sessionStorage.removeItem(authTokenStorageKey);
    setAuthToken(null);
    setSession(null);
    setMeta(null);
    setRecords(createEmptyRecordsState());
    setSelectedId(createEmptySelectedState());
    setDraft(createEmptyDraftState());
    setBackendMessage('Signed out');
    setLoginError(null);
  }

  async function loadAll(token: string | null = authToken) {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [sessionResponse, metaResponse] = await Promise.all([
        requestJson<SessionResponse>('/api/session', token),
        requestJson<MetaResponse>('/api/meta', token)
      ]);

      const nextRecords = createEmptyRecordsState();
      const visibleResourceEntries = await Promise.all(
        sessionResponse.visibleResources.map(async (resource) => [
          resource,
          await requestJson<AdminRecord[]>(`/api/${resource}`, token)
        ] as const)
      );

      for (const [resource, resourceRecords] of visibleResourceEntries) {
        nextRecords[resource] = resourceRecords;
      }

      const nextSelected = createEmptySelectedState();
      const nextDraft = createEmptyDraftState();
      for (const resource of resourceOrder) {
        nextSelected[resource] = nextRecords[resource][0]?.id ? String(nextRecords[resource][0].id) : null;
        nextDraft[resource] = nextRecords[resource][0]
          ? cloneRecord(nextRecords[resource][0])
          : resourceConfig[resource].createDefault();
      }

      setSession(sessionResponse);
      setMeta(metaResponse);
      setRecords(nextRecords);
      setSelectedId(nextSelected);
      setDraft(nextDraft);
      setActiveResource((current) => (
        sessionResponse.visibleResources.includes(current)
          ? current
          : sessionResponse.visibleResources[0] ?? 'products'
      ));
      setBackendMessage(`${sessionResponse.roleLabel} synced • ${formatRelativeTime(metaResponse.updatedAt)}`);
    } catch (nextError) {
      if (nextError instanceof RequestError && nextError.status === 401) {
        adminAuthToken = null;
        window.sessionStorage.removeItem(authTokenStorageKey);
        setAuthToken(null);
        setLoginError('Session expired. Please sign in again.');
      }

      setError(nextError instanceof Error ? nextError.message : 'Failed to load admin workspace');
      setBackendMessage('Backend unavailable');
      setSession(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(authToken).catch(() => undefined);
  }, [authToken]);

  useEffect(() => {
    if (!currentSelectedId) {
      setDraft((current) => ({
        ...current,
        [activeResource]: resourceConfig[activeResource].createDefault()
      }));
      return;
    }

    const matched = currentRecords.find((record) => String(record.id) === currentSelectedId);
    if (!matched) {
      return;
    }

    setDraft((current) => ({
      ...current,
      [activeResource]: cloneRecord(matched)
    }));
  }, [activeResource, currentRecords, currentSelectedId]);

  function openRecord(resource: ResourceKey, recordId: string) {
    const record = records[resource].find((item) => String(item.id) === recordId);
    if (!record) return;

    setSelectedId((current) => ({
      ...current,
      [resource]: recordId
    }));
    setDraft((current) => ({
      ...current,
      [resource]: cloneRecord(record)
    }));
  }

  function openNewRecord() {
    if (!currentPermission?.write) return;

    setSelectedId((current) => ({
      ...current,
      [activeResource]: null
    }));
    setDraft((current) => ({
      ...current,
      [activeResource]: resourceConfig[activeResource].createDefault()
    }));
  }

  function updateDraftField(field: FieldConfig, rawValue: string | boolean) {
    const nextValue = field.type === 'number'
      ? rawValue === '' ? undefined : Number(rawValue)
      : rawValue;

    setDraft((current) => ({
      ...current,
      [activeResource]: {
        ...current[activeResource],
        [field.key]: nextValue
      }
    }));
  }

  async function updateDraftImage(field: FieldConfig, file: File | null) {
    if (!file) return;

    try {
      const imageUrl = await readFileAsDataUrl(file);
      updateDraftField(field, imageUrl);
      setError(null);
      setBackendMessage(`${field.label} ready to save`);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Image upload failed';
      setError(message);
      setBackendMessage(`Image upload failed • ${message}`);
    }
  }

  async function saveRecord() {
    if (!currentPermission?.write) {
      setError('This role is read-only for the current table.');
      return;
    }

    const validationMessage = validateDraft(activeResource, currentDraft);
    if (validationMessage) {
      setError(validationMessage);
      setBackendMessage(`Save blocked • ${validationMessage}`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const hasId = Boolean(currentDraft.id);
      const path = hasId ? `/api/${activeResource}/${currentDraft.id}` : `/api/${activeResource}`;
      const method = hasId ? 'PUT' : 'POST';
      const payload = { ...currentDraft };

      if (!hasId) {
        delete payload.id;
      }

      const savedRecord = await requestJson<AdminRecord>(path, authToken, {
        method,
        body: JSON.stringify(payload)
      });

      await loadAll(authToken);
      setActiveResource(activeResource);
      setSelectedId((current) => ({
        ...current,
        [activeResource]: String(savedRecord.id)
      }));
      setDraft((current) => ({
        ...current,
        [activeResource]: cloneRecord(savedRecord)
      }));
      setBackendMessage(`${currentConfig.singular} ${hasId ? 'updated' : 'created'} successfully`);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Save failed';
      setError(message);
      setBackendMessage(`Save failed • ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord() {
    if (!currentPermission?.write) {
      setError('This role is read-only for the current table.');
      return;
    }

    if (!currentSelectedId) return;

    const confirmed = window.confirm(`Delete this ${currentConfig.singular.toLowerCase()}? This action cannot be undone.`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await requestJson(`/api/${activeResource}/${currentSelectedId}`, authToken, {
        method: 'DELETE'
      });
      await loadAll(authToken);
      setBackendMessage(`${currentConfig.singular} deleted successfully`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  async function resetAdminData() {
    if (!session?.canReset) {
      setError('Only admin mode can reset seed data.');
      return;
    }

    const confirmed = window.confirm('Reset backend seed data for all PrimeOS admin tables?');
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await requestJson('/api/admin/reset', authToken, { method: 'POST' });
      await loadAll(authToken);
      setBackendMessage('Backend seed data reset');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  }

  const statusLabel = currentDraft ? getStatusLabel(activeResource, currentDraft) : null;
  const visibleResources = session?.visibleResources ?? [];
  const adminAccessLabel = session?.resourcePermissions.admins.read
    ? session.resourcePermissions.admins.write ? 'Full CRUD' : 'Read only'
    : 'Hidden';
  const userAccessLabel = session?.resourcePermissions.users.write
    ? 'Full CRUD'
    : session?.resourcePermissions.users.read ? 'Read only' : 'Hidden';
  const pageTitle = isIntelligenceControl ? `${currentConfig.label} Control Room` : `${currentConfig.label} Admin`;
  const pageDescription = currentPermission?.write
    ? isIntelligenceControl
      ? `Admin owns this Intelligence table end-to-end. PrimeOS only reads these rows and turns them into runtime CTA for users.`
      : `Keep ${currentConfig.label.toLowerCase()} data clean in admin so PrimeOS runtime surfaces stay focused on execution, intelligence, and selling workflows.`
    : `Review the same ${currentConfig.label.toLowerCase()} data in a read-only surface without exposing mutation controls to non-admin users.`;
  const decisionQuestion = currentPermission?.write
    ? `Which ${currentConfig.singular.toLowerCase()} records are ready to be trusted across PrimeOS?`
    : `Which ${currentConfig.singular.toLowerCase()} records should this user be allowed to review without editing?`;
  const decisionHandoff = currentPermission?.write
    ? isIntelligenceControl
      ? 'Admin commits the source-of-truth here; PrimeOS consumes it as read-only runtime intelligence and turns it into next-step CTA.'
      : 'Clean records here, confirm ownership, then let PrimeOS web inherit a calmer, more trustworthy operating state.'
    : 'User preview mirrors the same data shape, but keeps write access locked so the control room stays safe.';
  const searchPlaceholder = isIntelligenceControl
    ? 'Search creator, segment, decision, SKU, market...'
    : 'Search product, SKU, order, lead, customer, alert...';
  const intelligenceResourceCards = intelligenceAdminResources.map((resource) => ({
    resource,
    label: resourceConfig[resource].label,
    description: resourceConfig[resource].description,
    count: meta?.resourceCounts[resource] ?? records[resource].length,
    href: runtimePreviewHrefs[resource],
    isActive: activeResource === resource
  }));
  const discoveryChips = [
    'Search-first workflow',
    currentPermission?.write ? 'Role-aware CRUD' : 'Read-only preview',
    `${currentGroup.label} lane`
  ];
  const evidenceSignals = [
    {
      label: 'Control signal',
      value: currentConfig.strategy
    },
    {
      label: 'Access posture',
      value: session?.description || 'Access model loading...'
    },
    {
      label: 'Backend state',
      value: backendMessage
    },
    {
      label: 'Identity split',
      value: `Admins: ${adminAccessLabel} · Users: ${userAccessLabel}`
    }
  ];
  const metricCards = [
    {
      label: 'Tracked records',
      value: String(currentCount),
      detail: `Rows inside the active ${currentConfig.label.toLowerCase()} surface.`,
      icon: ActiveResourceIcon,
      tone: 'metric-card-blue'
    },
    {
      label: 'Writable surfaces',
      value: String(meta?.writableResourceCount ?? 0),
      detail: currentPermission?.write
        ? 'Admin mode can commit changes across the visible control surfaces.'
        : 'User mode keeps every mutation path locked.',
      icon: currentPermission?.write ? SquarePen : Eye,
      tone: currentPermission?.write ? 'metric-card-green' : 'metric-card-slate'
    },
    {
      label: 'Admin table',
      value: String(meta?.adminCount ?? 0),
      detail: 'Privileged operators are stored separately from PrimeOS user seats.',
      icon: ShieldUser,
      tone: 'metric-card-violet'
    },
    {
      label: 'User table',
      value: String(meta?.userCount ?? 0),
      detail: 'Seller, brand, partner, and viewer seats stay in their own directory.',
      icon: Users,
      tone: 'metric-card-amber'
    }
  ];

  if (!authToken) {
    return (
      <LoginScreen
        busy={loginBusy}
        error={loginError}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img
            src="/brand-logo.svg"
            alt="Prime OS logo"
            className="brand-logo"
          />
          <div className="brand-copy">
            <span className="brand-title">Prime OS</span>
            <span className="brand-subtitle">Closed-loop commerce platform</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          <button type="button" className="nav-overview">
            <span className="nav-folder-copy">
              <LayoutGrid className="glyph-icon" />
              <span>Overview</span>
            </span>
          </button>
          {resourceGroups.map((group) => {
            const isGroupActive = group.resources.includes(activeResource);
            const isOpen = openGroups[group.key];
            const GroupIcon = groupIcons[group.key];

            return (
              <section key={group.key} className="nav-folder">
                <button
                  type="button"
                  className={`nav-folder-trigger ${isGroupActive ? 'nav-folder-trigger-active' : ''}`}
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                >
                  <span className="nav-folder-copy">
                    <GroupIcon className="glyph-icon" />
                    <span>{group.label}</span>
                  </span>
                  <ChevronRight className={`nav-folder-chevron ${isOpen ? 'nav-folder-chevron-open' : ''}`} />
                </button>
                {isOpen ? (
                  <div className={`nav-folder-children ${isGroupActive ? 'nav-folder-children-active' : ''}`}>
                    {group.resources.map((resource) => {
                      const canRead = Boolean(session?.resourcePermissions[resource]?.read);
                      const count = canRead ? (meta?.resourceCounts[resource] ?? records[resource].length) : null;
                      const ResourceIcon = getResourceIcon(resource);

                      return (
                        <button
                          key={resource}
                          type="button"
                          className={`nav-item ${activeResource === resource ? 'nav-item-active' : ''} ${!canRead ? 'nav-item-locked' : ''}`}
                          onClick={() => canRead && setActiveResource(resource)}
                          disabled={!canRead}
                        >
                          <span className="nav-item-glyph">
                            <ResourceIcon className="glyph-icon" />
                          </span>
                          <span className="nav-item-copy">
                            <span className="nav-item-title">{resourceConfig[resource].label}</span>
                            <span className="nav-item-meta">{canRead ? resourceConfig[resource].description : 'Hidden in the current role'}</span>
                          </span>
                          <span className="nav-item-count">{count ?? '—'}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-controls">
            <button
              type="button"
              className={`theme-toggle ${sidebarThemeMode === 'dark' ? 'theme-toggle-active' : ''}`}
              onClick={() => setSidebarThemeMode((current) => current === 'light' ? 'dark' : 'light')}
              aria-label="Toggle theme preview"
            >
              <span className="theme-toggle-track">
                <span className="theme-toggle-thumb">
                  <MoonStar className="glyph-icon" />
                </span>
              </span>
            </button>

            <div className="language-toggle" aria-label="Language preview">
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`language-pill ${language === option.code ? 'language-pill-active' : ''}`}
                  onClick={() => setLanguage(option.code)}
                  aria-pressed={language === option.code}
                >
                  <span>{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="topbar">
          <label className="search-field">
            <Search className="search-icon" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <div className="topbar-account">
            <span>{session?.account?.fullName || 'PrimeOS account'}</span>
            <strong>{session?.roleLabel || 'Checking session'}</strong>
          </div>
          <button type="button" className="button button-secondary topbar-logout" onClick={handleLogout}>
            <LogOut className="button-icon" />
            <span>Logout</span>
          </button>
        </header>

        <main className="workspace">
          <section className="page-header-card">
            <div className="page-header-copy">
              <div className="hero-eyebrow">Prime OS Admin</div>
              <div className="page-title-row">
                <h1>{pageTitle}</h1>
                <span className="page-area-chip">
                  <ActiveGroupIcon className="glyph-icon" />
                  <span>Admin Area</span>
                </span>
              </div>
              <p>{pageDescription}</p>
            </div>
            <div className="page-header-side">
              <div className="sync-pill sync-pill-compact">
                <span className="status-dot" />
                {backendMessage}
              </div>
              <div className="button-row">
                <button type="button" className="button button-secondary" onClick={() => loadAll(authToken)} disabled={loading || saving}>
                  <RefreshCcw className="button-icon" />
                  <span>Refresh</span>
                </button>
                <button type="button" className="button button-secondary" onClick={resetAdminData} disabled={!session?.canReset || saving}>
                  <RotateCcw className="button-icon" />
                  <span>Reset seed</span>
                </button>
                <button type="button" className="button button-primary" onClick={saveRecord} disabled={!currentPermission?.write || saving}>
                  <Save className="button-icon" />
                  <span>{saving ? 'Saving...' : currentSelectedId ? `Save ${currentConfig.singular}` : `Create ${currentConfig.singular}`}</span>
                </button>
              </div>
            </div>
          </section>

          {isIntelligenceControl ? (
            <section className="surface-card intelligence-flow-card">
              <div className="surface-card-header">
                <div>
                  <div className="card-label">Intelligence Control Plane</div>
                  <h2>Admin owns the Intelligence source of truth</h2>
                  <p>Creators, Customers, and Launch Decisions are edited here first. PrimeOS users only see the read-only runtime result and the CTA generated from this data.</p>
                </div>
                <div className="surface-chip-row">
                  <span className="surface-chip">Read-only in PrimeOS</span>
                  <span className="surface-chip">CRUD stays here</span>
                  <span className="surface-chip">CTA comes from data state</span>
                </div>
              </div>
              <div className="intelligence-flow-grid">
                {intelligenceResourceCards.map((item) => {
                  const ResourceIcon = getResourceIcon(item.resource);
                  return (
                    <article
                      key={item.resource}
                      className={`intelligence-flow-tile ${item.isActive ? 'intelligence-flow-tile-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="intelligence-flow-tile-button"
                        onClick={() => setActiveResource(item.resource)}
                      >
                        <div className="intelligence-flow-tile-head">
                          <span className="nav-item-glyph">
                            <ResourceIcon className="glyph-icon" />
                          </span>
                          <span className="nav-item-count">{item.count}</span>
                        </div>
                        <div className="intelligence-flow-tile-copy">
                          <strong>{item.label}</strong>
                          <p>{item.description}</p>
                        </div>
                      </button>
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-link"
                        >
                          Preview PrimeOS runtime
                        </a>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="decision-banner">
            <div className="decision-banner-question">
              <strong>You decide:</strong> {decisionQuestion}
            </div>
            <div className="decision-banner-handoff">
              {decisionHandoff}
              <span className="decision-banner-arrow">-&gt;</span>
            </div>
          </section>

          <section className="metrics-grid">
            {metricCards.map((metric) => (
              <article key={metric.label} className={`metric-card ${metric.tone}`}>
                <div className="metric-card-head">
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-bubble">
                    <metric.icon className="glyph-icon" />
                  </span>
                </div>
                <strong className="metric-value">{metric.value}</strong>
                <p className="metric-detail">{metric.detail}</p>
              </article>
            ))}
          </section>

          {error ? (
            <div className="error-banner">{error}</div>
          ) : null}

          <section className="workspace-upper">
            <div className="surface-card discovery-card">
              <div className="surface-card-header">
                <div>
                  <div className="card-label">{currentConfig.label}</div>
                  <h2>{currentConfig.singular} search and governance</h2>
                  <p>Apply search-first cleanup, review ownership, then manage trusted rows in one dense admin workspace.</p>
                </div>
                <div className="surface-chip-row">
                  {discoveryChips.map((chip) => (
                    <span key={chip} className="surface-chip">{chip}</span>
                  ))}
                </div>
              </div>

              <div className="filter-grid">
                <label className="filter-field">
                  <span className="field-label">Search query</span>
                  <input
                    className="input"
                    type="search"
                    placeholder={`Search ${currentConfig.singular.toLowerCase()}, SKU, status, market...`}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>

                <label className="filter-field">
                  <span className="field-label">Domain</span>
                  <select
                    className="input"
                    value={currentGroup.key}
                    onChange={(event) => {
                      const nextGroup = resourceGroups.find((group) => group.key === event.target.value);
                      const nextResource = nextGroup?.resources.find((resource) => session?.resourcePermissions[resource]?.read);
                      if (nextResource) {
                        setActiveResource(nextResource);
                      }
                    }}
                  >
                    {resourceGroups.map((group) => (
                      <option key={group.key} value={group.key}>{group.label}</option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span className="field-label">Signed in as</span>
                  <input
                    className="input"
                    value={session?.account?.email || 'Checking session...'}
                    disabled
                    readOnly
                  />
                </label>

                <label className="filter-field">
                  <span className="field-label">Sort by</span>
                  <select
                    className="input"
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                  >
                    <option value="updated">Recently updated</option>
                    <option value="title">Name</option>
                    <option value="status">Status</option>
                  </select>
                </label>
              </div>

              <div className="record-list">
                {sortedRecords.map((record) => {
                  const rowStatus = getStatusLabel(activeResource, record);
                  const rowImage = isImageValue(record.imageUrl) ? String(record.imageUrl) : null;
                  return (
                    <button
                      type="button"
                      key={String(record.id)}
                      className={`record-row ${currentSelectedId === record.id ? 'record-row-active' : ''}`}
                          onClick={() => openRecord(activeResource, String(record.id))}
                    >
                      <div className="record-heading">
                        <div className={`record-glyph ${rowImage ? 'record-glyph-photo' : ''}`}>
                          {rowImage ? (
                            <img src={rowImage} alt={currentConfig.toTitle(record)} className="record-glyph-image" />
                          ) : (
                            <ActiveResourceIcon className="glyph-icon" />
                          )}
                        </div>
                        <div className="record-main">
                          <div className="record-title-row">
                            <span className="record-title">{currentConfig.toTitle(record)}</span>
                            {rowStatus ? (
                              <span className={`status-badge ${getToneClass(String(rowStatus))}`}>{rowStatus}</span>
                            ) : null}
                          </div>
                          <p className="record-meta">{currentConfig.toMeta(record)}</p>
                        </div>
                      </div>

                      <div className="record-columns">
                        {currentConfig.columns.map((column) => (
                          <div className="record-column" key={column.key}>
                            <span className="record-column-label">{column.label}</span>
                            <span className="record-column-value">
                              {column.key.toLowerCase().includes('at')
                                ? formatRelativeTime(record[column.key])
                                : formatValue(record[column.key])}
                            </span>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}

                {!loading && sortedRecords.length === 0 ? (
                  <div className="empty-state">
                    No {currentConfig.label.toLowerCase()} match the current search. Try another query or create a fresh record.
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="surface-card recommendation-card">
              <div className="card-label">Prime recommendation strip</div>
              <h2>Keep admin cleanup separate from PrimeOS runtime</h2>
              <p>{currentConfig.strategy}</p>

              <div className="recommendation-callout">
                <div className="card-label">Recommended move</div>
                <strong>
                  {currentPermission?.write
                    ? `Clean the ${currentConfig.label.toLowerCase()} table, confirm access ownership, then push trusted records back into PrimeOS surfaces.`
                    : `Review the ${currentConfig.label.toLowerCase()} table in preview mode while admin controls remain protected.`}
                </strong>
                <p>{currentConfig.evidence[0]}</p>
              </div>

              <div className="recommendation-stats">
                <article className="recommendation-stat">
                  <span className="metric-label">Target table</span>
                  <strong>{currentConfig.label}</strong>
                  <p>{currentGroup.label}</p>
                </article>
                <article className="recommendation-stat">
                  <span className="metric-label">Access mode</span>
                  <strong>{currentPermission?.write ? 'Full CRUD' : 'Read only'}</strong>
                  <p>{session?.roleLabel || 'Loading'}</p>
                </article>
                <article className="recommendation-stat">
                  <span className="metric-label">Records ready</span>
                  <strong>{currentCount}</strong>
                  <p>{statusLabel || 'Mixed status'}</p>
                </article>
              </div>

              <div className="button-row">
                <button type="button" className="button button-secondary" onClick={openNewRecord} disabled={!currentPermission?.write}>
                  <Plus className="button-icon" />
                  <span>New {currentConfig.singular}</span>
                </button>
                <button type="button" className="button button-primary" onClick={saveRecord} disabled={!currentPermission?.write || saving}>
                  <Save className="button-icon" />
                  <span>{saving ? 'Saving...' : `Save ${currentConfig.singular}`}</span>
                </button>
                <button type="button" className="button button-danger" onClick={deleteRecord} disabled={!currentPermission?.write || !currentSelectedId || saving}>
                  <Trash2 className="button-icon" />
                  <span>Delete</span>
                </button>
              </div>
            </aside>
          </section>

          <section className="workspace-lower">
            <section className="surface-card evidence-card">
              <div className="surface-card-header">
                <div>
                  <div className="card-label">Prime evidence board</div>
                  <h2>Why this control surface is active right now</h2>
                  <p>Make the admin room explain itself like Intelligence does, not just show a blank CRUD table.</p>
                </div>
                <span className="confidence-pill">{visibleResources.length} active surfaces</span>
              </div>

              <div className="evidence-grid">
                {evidenceSignals.map((signal) => (
                  <article key={signal.label} className="evidence-tile">
                    <span className="metric-label">{signal.label}</span>
                    <strong>{signal.value}</strong>
                  </article>
                ))}
              </div>

              <div className="evidence-chip-row">
                {currentConfig.evidence.map((item) => (
                  <span key={item} className="surface-chip">{item}</span>
                ))}
              </div>
            </section>

            <div className="right-rail">
              <section className="surface-card editor-card">
                <div className="surface-card-header">
                  <div>
                    <div className="card-label">{currentSelectedId ? `Edit ${currentConfig.singular}` : `New ${currentConfig.singular}`}</div>
                    <h2>{currentSelectedId ? currentConfig.toTitle(currentDraft) : `Create ${currentConfig.singular.toLowerCase()}`}</h2>
                    <p>{currentPermission?.write ? 'Changes here write back to the dedicated admin backend.' : 'This table is read-only in the current role.'}</p>
                  </div>
                </div>

                <div className="editor-fields">
                  {currentConfig.fields.map((field) => (
                    <label key={field.key} className={`field field-${field.type}`}>
                      <span className="field-label">
                        {field.label}
                        {field.required ? <span className="required-dot">*</span> : null}
                      </span>

                      {field.type === 'image' ? (
                        <div className="image-field-shell">
                          <div className="image-field-preview">
                            {isImageValue(currentDraft[field.key]) ? (
                              <img
                                src={String(currentDraft[field.key])}
                                alt={String(currentDraft.creatorName || currentConfig.singular)}
                                className="image-field-preview-image"
                              />
                            ) : (
                              <div className="image-field-placeholder">
                                <ImagePlus className="glyph-icon" />
                                <span>No creator image yet</span>
                              </div>
                            )}
                          </div>
                          <div className="button-row">
                            <label className={`button button-secondary ${!currentPermission?.write ? 'button-disabled' : ''}`}>
                              <ImagePlus className="button-icon" />
                              <span>{isImageValue(currentDraft[field.key]) ? 'Replace image' : 'Upload image'}</span>
                              <input
                                className="image-upload-input"
                                type="file"
                                accept="image/*"
                                disabled={!currentPermission?.write}
                                onChange={(event) => {
                                  const file = event.target.files?.[0] ?? null;
                                  void updateDraftImage(field, file);
                                  event.currentTarget.value = '';
                                }}
                              />
                            </label>
                            {isImageValue(currentDraft[field.key]) ? (
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => updateDraftField(field, '')}
                                disabled={!currentPermission?.write}
                              >
                                Clear image
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {field.type === 'textarea' ? (
                        <textarea
                          className="input"
                          value={String(currentDraft[field.key] ?? '')}
                          placeholder={field.placeholder}
                          onChange={(event) => updateDraftField(field, event.target.value)}
                          disabled={!currentPermission?.write}
                        />
                      ) : null}

                      {field.type === 'text' || field.type === 'email' ? (
                        <input
                          className="input"
                          type={field.type === 'email' ? 'email' : 'text'}
                          value={String(currentDraft[field.key] ?? '')}
                          placeholder={field.placeholder}
                          onChange={(event) => updateDraftField(field, event.target.value)}
                          disabled={!currentPermission?.write}
                        />
                      ) : null}

                      {field.type === 'number' ? (
                        <input
                          className="input"
                          type="number"
                          value={String(currentDraft[field.key] ?? '')}
                          min={field.min}
                          step={field.step}
                          onChange={(event) => updateDraftField(field, event.target.value)}
                          disabled={!currentPermission?.write}
                        />
                      ) : null}

                      {field.type === 'select' ? (
                        <select
                          className="input"
                          value={String(currentDraft[field.key] ?? '')}
                          onChange={(event) => updateDraftField(field, event.target.value)}
                          disabled={!currentPermission?.write}
                        >
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      {field.type === 'boolean' ? (
                        <button
                          type="button"
                          className={`toggle ${currentDraft[field.key] ? 'toggle-on' : ''}`}
                          onClick={() => updateDraftField(field, !Boolean(currentDraft[field.key]))}
                          disabled={!currentPermission?.write}
                        >
                          <span className="toggle-knob" />
                          <span>{Boolean(currentDraft[field.key]) ? 'Enabled' : 'Disabled'}</span>
                        </button>
                      ) : null}
                    </label>
                  ))}
                </div>

                <div className="editor-footer">
                  <div className="audit-line">
                    <span>Record ID</span>
                    <strong>{currentSelectedId || 'New record'}</strong>
                  </div>
                  <div className="audit-line">
                    <span>Last touched</span>
                    <strong>{formatRelativeTime(currentDraft.updatedAt)}</strong>
                  </div>
                </div>
              </section>

              <section className="surface-card permission-card">
                <div className="surface-card-header">
                  <div>
                    <div className="card-label">Access model</div>
                    <h2>Admin / user split</h2>
                    <p>Database tables are separated and the UI now reflects that split more clearly.</p>
                  </div>
                  <span className={`mode-chip ${session?.canWrite ? 'mode-chip-admin' : 'mode-chip-user'}`}>
                    {session?.roleLabel || 'Loading'}
                  </span>
                </div>

                <div className="permission-list">
                  <article className="permission-row">
                    <div>
                      <strong>Admins table</strong>
                      <p>Privileged operators, access levels, and admin workspaces.</p>
                    </div>
                    <span className={`status-badge ${adminAccessLabel === 'Full CRUD' ? 'tone-positive' : adminAccessLabel === 'Hidden' ? 'tone-danger' : 'tone-warning'}`}>
                      {adminAccessLabel}
                    </span>
                  </article>
                  <article className="permission-row">
                    <div>
                      <strong>Users table</strong>
                      <p>Seller, brand, partner, and viewer seats stored separately from admins.</p>
                    </div>
                    <span className={`status-badge ${userAccessLabel === 'Full CRUD' ? 'tone-positive' : userAccessLabel === 'Read only' ? 'tone-warning' : 'tone-danger'}`}>
                      {userAccessLabel}
                    </span>
                  </article>
                  <article className="permission-row">
                    <div>
                      <strong>Current table</strong>
                      <p>{currentConfig.description}</p>
                    </div>
                    <span className={`status-badge ${currentPermission?.write ? 'tone-positive' : 'tone-warning'}`}>
                      {currentPermission?.write ? 'Writable' : 'Read only'}
                    </span>
                  </article>
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>

    </div>
  );
}

export default App;
