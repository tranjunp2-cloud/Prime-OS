import { type ReactNode, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, Brush, CheckCircle2, Copy, FileText, Image, Info, Library, Megaphone, Palette, PenLine, Plus, Search, Share2, Sparkles, Users, WandSparkles, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n/I18nContext';
import { type Locale } from '@/lib/i18n/dictionaries';
import { buildBrandAiWorkspaceSnapshot, getBrandAiPackage, type BrandAiPackage, type BrandAiStatus } from '@/lib/prime/brand-ai-workspace';
import {
  brandReferenceCategoryLabels,
  brandReferenceMaturityLabels,
  brandReferenceRegionLabels,
  buildBrandReferenceLibrary,
  filterBrandReferenceProfiles,
  getBrandReferenceProfile,
  type BrandReferenceCategory,
  type BrandReferenceMaturity,
  type BrandReferenceProfile,
  type BrandReferenceRegion,
} from '@/lib/prime/brand-reference-library';
import { cn } from '@/lib/utils';

type FoundationView = 'dashboard' | 'library' | 'create' | 'assets' | 'brand';
type QuestionFlowId = 'quick' | 'full';

interface BrandFoundationProject {
  id: string;
  name: string;
  category: string;
  status: 'Draft' | 'Ready' | 'Review';
  progress: number;
  updatedAt: string;
  assets: string[];
  positioning: string;
}

interface QuestionSection {
  id: string;
  title: string;
  description: string;
  icon?: typeof Sparkles;
  questions: Array<{
    id: string;
    label: string;
    placeholder: string;
    helper: string;
    input?: 'text' | 'textarea';
  }>;
}

interface QuestionFlow {
  id: QuestionFlowId;
  title: string;
  subtitle: string;
  duration: string;
  icon: typeof Sparkles;
  sections: QuestionSection[];
}

interface BrandingAgentCopy {
  nav: Array<{ label: string; href: string; view: FoundationView }>;
  library: {
    badge: string;
    title: string;
    description: string;
    createNew: string;
    searchPlaceholder: string;
    all: string;
    profiles: string;
    categories: string;
    archetypes: string;
    ready: string;
    visible: (count: number) => string;
    viewProfile: string;
    useAsInspiration: string;
    positioning: string;
    audience: string;
    voice: string;
    visualDirection: string;
    contentPillars: string;
    strengths: string;
    watchouts: string;
    referenceContext: string;
    inspiredBy: (name: string) => string;
    removeReference: string;
  };
  create: {
    badge: string;
    chooseTitle: string;
    chooseDescription: string;
    outputPackageLabel: string;
    outputPackage: string;
    startFlow: string;
    chooseAgain: string;
    sectionProgress: (current: number, total: number) => string;
    questionsCount: (count: number) => string;
    askAi: string;
    back: string;
    next: string;
    generate: string;
    foundationSuffix: string;
  };
  questionFlows: QuestionFlow[];
}

const dashboardHref = '/intelligence/branding-agent';
const libraryHref = '/intelligence/branding-agent/library';
const createHref = '/intelligence/branding-agent/create';
const assetsHref = '/intelligence/branding-agent/integrations';

const projects: BrandFoundationProject[] = [
  {
    id: 'venus-beauty',
    name: 'Venus Beauty',
    category: 'Clean skincare studio',
    status: 'Review',
    progress: 76,
    updatedAt: 'Today',
    assets: ['Foundation brief', 'Voice guide', 'Launch copy', 'Social prompts'],
    positioning: 'Effortless Japanese-inspired skincare for busy founders who need a calm, premium daily ritual.',
  },
  {
    id: 'atelier-coffee',
    name: 'Atelier Coffee',
    category: 'Premium beverage',
    status: 'Ready',
    progress: 100,
    updatedAt: 'Yesterday',
    assets: ['Brand story', 'Audience profile', 'Color direction', 'Campaign copy'],
    positioning: 'A refined coffee ritual for teams and home brewers who want origin clarity without cafe complexity.',
  },
  {
    id: 'nordic-desk',
    name: 'Nordic Desk',
    category: 'Workspace accessory',
    status: 'Draft',
    progress: 38,
    updatedAt: '2 days ago',
    assets: ['Question draft', 'Audience notes'],
    positioning: 'Minimal desk systems for remote teams who need calmer, more organized work surfaces.',
  },
];

const brandAiUiCopy = {
  'en-US': {
    shell: { product: 'Branding Agent', workflow: 'Brand Foundation Workflow' },
    dashboard: {
      badge: 'Brand Foundation AI',
      title: 'Create a complete brand foundation from guided questions.',
      body: 'Answer a structured question set. The agent turns your answers into brand strategy, voice, audience, visual direction, and launch-ready copy assets.',
      create: 'Create new brand',
    },
    assets: {
      badge: 'Generated brand assets',
      title: 'My Assets',
      hint: 'Review generated brand foundations, voice guides, audience maps, visual directions, and handoff packages created from Branding Agent flows.',
      browse: 'Browse references',
      create: 'Create New',
      metrics: {
        packages: 'Packages',
        packagesDetail: (count: number) => `${count} packages match the current filters.`,
        approved: 'Approved',
        approvedDetail: 'Approved packages are ready to reuse in downstream brand, content, or campaign work.',
        needsReview: 'Needs review',
        needsReviewDetail: 'Review these packages before handoff because one or more sections still need operator approval.',
        readiness: 'Readiness',
        readinessDetail: (count: number) => `${count} sections are reusable across the generated packages.`,
      },
      filters: { all: 'All', approved: 'Approved', review: 'Review', generating: 'Generating', draft: 'Draft' },
      libraryTitle: 'Asset library',
      libraryHint: 'Click a package to inspect generated outputs, evidence quality, risks, and next action in a popup.',
      visible: (count: number) => `${count} visible`,
      search: 'Search assets, brand, owner, market...',
      emptyTitle: 'No assets match this filter',
      emptyBody: 'Create a brand foundation or clear the filter to see generated assets.',
      evidence: 'Evidence',
      confidence: 'Confidence',
      updated: 'Updated',
      preview: 'Generated asset preview',
      nextAction: 'Next action',
      risks: 'Risks',
      owner: 'Owner',
      close: 'Close',
      copyAsset: 'Copy asset',
      openProject: 'Open brand project',
    },
  },
  'ja-JP': {
    shell: { product: 'ブランディングエージェント', workflow: 'ブランド基盤ワークフロー' },
    dashboard: {
      badge: 'ブランド基盤AI',
      title: 'ガイド質問から完全なブランド基盤を作成します。',
      body: '構造化された質問に回答すると、エージェントがブランド戦略、ボイス、オーディエンス、ビジュアル方針、ローンチ用コピーへ変換します。',
      create: '新規ブランド作成',
    },
    assets: {
      badge: '生成済みブランドアセット',
      title: 'マイアセット',
      hint: 'Branding Agentフローで作成されたブランド基盤、ボイスガイド、オーディエンスマップ、ビジュアル方針、ハンドオフパッケージを確認します。',
      browse: '参考を閲覧',
      create: '新規作成',
      metrics: {
        packages: 'パッケージ',
        packagesDetail: (count: number) => `${count}件のパッケージが現在のフィルターに一致しています。`,
        approved: '承認済み',
        approvedDetail: '承認済みパッケージはブランド、コンテンツ、キャンペーン作業で再利用できます。',
        needsReview: 'レビュー必要',
        needsReviewDetail: '一部セクションに運用者承認が必要なため、ハンドオフ前に確認してください。',
        readiness: '準備度',
        readinessDetail: (count: number) => `${count}件のセクションが生成済みパッケージ間で再利用可能です。`,
      },
      filters: { all: 'すべて', approved: '承認済み', review: 'レビュー', generating: '生成中', draft: '下書き' },
      libraryTitle: 'アセットライブラリ',
      libraryHint: 'パッケージをクリックして生成物、根拠品質、リスク、次アクションをポップアップで確認します。',
      visible: (count: number) => `${count}件表示`,
      search: 'アセット、ブランド、所有者、市場を検索...',
      emptyTitle: 'このフィルターに一致するアセットはありません',
      emptyBody: 'ブランド基盤を作成するか、フィルターを解除して生成済みアセットを表示してください。',
      evidence: '根拠',
      confidence: '信頼度',
      updated: '更新',
      preview: '生成アセットプレビュー',
      nextAction: '次アクション',
      risks: 'リスク',
      owner: '所有者',
      close: '閉じる',
      copyAsset: 'アセットをコピー',
      openProject: 'ブランドプロジェクトを開く',
    },
  },
  'vi-VN': {
    shell: { product: 'Branding Agent', workflow: 'Quy trình Brand Foundation' },
    dashboard: {
      badge: 'Brand Foundation AI',
      title: 'Tạo brand foundation hoàn chỉnh từ bộ câu hỏi dẫn dắt.',
      body: 'Trả lời bộ câu hỏi có cấu trúc. Agent biến câu trả lời thành chiến lược brand, voice, audience, visual direction và copy asset sẵn sàng launch.',
      create: 'Tạo brand mới',
    },
    assets: {
      badge: 'Brand asset đã tạo',
      title: 'My Assets',
      hint: 'Rà soát brand foundation, voice guide, audience map, visual direction và handoff package được tạo từ Branding Agent flow.',
      browse: 'Xem tham khảo',
      create: 'Tạo mới',
      metrics: {
        packages: 'Packages',
        packagesDetail: (count: number) => `${count} package khớp bộ lọc hiện tại.`,
        approved: 'Đã duyệt',
        approvedDetail: 'Package đã duyệt có thể tái dùng trong brand, content hoặc campaign downstream.',
        needsReview: 'Cần review',
        needsReviewDetail: 'Review các package này trước handoff vì một hoặc nhiều section còn cần operator duyệt.',
        readiness: 'Độ sẵn sàng',
        readinessDetail: (count: number) => `${count} section có thể tái dùng trên các package đã tạo.`,
      },
      filters: { all: 'Tất cả', approved: 'Đã duyệt', review: 'Review', generating: 'Đang tạo', draft: 'Draft' },
      libraryTitle: 'Thư viện asset',
      libraryHint: 'Bấm một package để xem output, chất lượng evidence, rủi ro và hành động tiếp theo trong popup.',
      visible: (count: number) => `${count} hiển thị`,
      search: 'Tìm asset, brand, owner, thị trường...',
      emptyTitle: 'Không có asset khớp bộ lọc',
      emptyBody: 'Tạo brand foundation hoặc xoá bộ lọc để xem asset đã tạo.',
      evidence: 'Evidence',
      confidence: 'Độ tin cậy',
      updated: 'Cập nhật',
      preview: 'Preview asset đã tạo',
      nextAction: 'Hành động tiếp theo',
      risks: 'Rủi ro',
      owner: 'Owner',
      close: 'Đóng',
      copyAsset: 'Copy asset',
      openProject: 'Mở brand project',
    },
  },
} as Record<Locale, any>;

const brandingAgentCopy: Record<Locale, BrandingAgentCopy> = {
  'en-US': {
    nav: [
      { label: 'Dashboard', href: dashboardHref, view: 'dashboard' },
      { label: 'Brand Library', href: libraryHref, view: 'library' },
      { label: 'My Assets', href: assetsHref, view: 'assets' },
      { label: 'Create New', href: createHref, view: 'create' },
    ],
    library: {
      badge: 'Reference library',
      title: 'Brand Library',
      description: 'Study famous brand patterns before creating your own foundation.',
      createNew: 'Create New',
      searchPlaceholder: 'Search brand, category, positioning, voice...',
      all: 'All',
      profiles: 'profiles',
      categories: 'categories',
      archetypes: 'archetypes',
      ready: 'Ready for inspiration',
      visible: (count) => `${count} visible`,
      viewProfile: 'View profile',
      useAsInspiration: 'Use as inspiration',
      positioning: 'Positioning',
      audience: 'Audience',
      voice: 'Voice',
      visualDirection: 'Visual direction',
      contentPillars: 'Content pillars',
      strengths: 'Strengths',
      watchouts: 'Watchouts',
      referenceContext: 'Reference context',
      inspiredBy: (name) => `Inspired by ${name}`,
      removeReference: 'Remove reference',
    },
    create: {
      badge: 'Create Brand',
      chooseTitle: 'Choose a question set',
      chooseDescription: 'Choose the detail level for your brand foundation. The quick flow creates an instant draft; the detailed flow creates a complete brand asset package.',
      outputPackageLabel: 'Output package',
      outputPackage: 'Brand brief, voice guide, audience profile, content pillars, visual direction',
      startFlow: 'Start flow',
      chooseAgain: 'Choose another question set',
      sectionProgress: (current, total) => `Part ${current} of ${total}`,
      questionsCount: (count) => `${count} question${count === 1 ? '' : 's'}`,
      askAi: 'Ask AI to refine',
      back: 'Back',
      next: 'Next questions',
      generate: 'Generate brand assets',
      foundationSuffix: 'Brand Foundation',
    },
    questionFlows: [
      {
        id: 'quick',
        title: 'Quick',
        subtitle: '3 core questions to create a fast brand foundation draft.',
        duration: '~2 min',
        icon: Zap,
        sections: [
          {
            id: 'quick-core',
            title: 'Quick',
            description: '3 core questions for a fast brand foundation.',
            icon: Zap,
            questions: [
              { id: 'brandName', label: 'What is the brand name and what category does it operate in?', placeholder: 'Example: Venus Beauty - clean skincare studio', helper: 'The brand name and category anchor the entire asset package.', input: 'text' },
              { id: 'valueProposition', label: 'What outcome does the brand help customers achieve?', placeholder: 'Describe the main result or benefit customers receive', helper: 'This is the compact value proposition.' },
              { id: 'usp', label: 'What makes the brand different?', placeholder: 'Describe the USP, proof, style, or unique approach', helper: 'A clear difference helps the agent create sharper positioning.' },
            ],
          },
        ],
      },
      {
        id: 'full',
        title: 'Detailed',
        subtitle: '15 detailed questions for a complete brand strategy.',
        duration: '~10 min',
        icon: WandSparkles,
        sections: [
          {
            id: 'identity',
            title: 'Identity',
            description: 'Core brand information.',
            icon: Sparkles,
            questions: [
              { id: 'brandName', label: 'What is the brand name and what category does it operate in?', placeholder: 'Example: Venus Beauty - clean skincare studio', helper: 'Name and category help the agent understand context before writing assets.', input: 'text' },
              { id: 'valueProposition', label: 'Short description: what does the brand help customers achieve?', placeholder: 'Example: helps busy founders keep a simple but premium skincare routine', helper: 'This value proposition becomes the basis for taglines and landing copy.' },
              { id: 'usp', label: 'What makes the brand different from competitors?', placeholder: 'Describe the USP, method, ingredients, story, or distinctive experience', helper: 'The USP keeps the positioning from becoming generic.' },
              { id: 'missionVision', label: 'What are the brand mission and vision?', placeholder: 'Why does the brand exist, and what does it want to become long term?', helper: 'This answer shapes the brand story.' },
            ],
          },
          {
            id: 'voice',
            title: 'Voice',
            description: 'Brand voice and personality.',
            icon: Users,
            questions: [
              { id: 'tone', label: 'What tone should the brand use?', placeholder: 'professional / friendly / playful / authoritative / casual / inspirational, or describe your own', helper: 'Tone words guide the voice guide and copy style.' },
              { id: 'personality', label: 'If the brand were a person, what would its personality be? How should it refer to itself?', placeholder: 'Example: calm, expert, approachable; use I / we / brand name', helper: 'Personality gives the copy a clearer identity.' },
              { id: 'avoidLanguage', label: 'What language should the brand avoid? Should it mix English with another language?', placeholder: 'Example: avoid hype, avoid slang, use light English in CTAs only', helper: 'Negative direction helps the agent avoid the wrong vibe.' },
            ],
          },
          {
            id: 'audience',
            title: 'Audience',
            description: 'Target customers.',
            icon: Users,
            questions: [
              { id: 'customer', label: 'Who is the primary target customer?', placeholder: 'Age, job, income, location, buying behavior', helper: 'The agent uses this to create personas and a message map.' },
              { id: 'pain', label: 'What problem or pain point does the brand solve?', placeholder: 'Describe pains, barriers, desires, or emotional insight', helper: 'Pain points become hooks and content angles.' },
              { id: 'desiredOutcome', label: 'What outcome should customers get from the product or service?', placeholder: 'Example: more confidence, saved time, better skin, easier operations', helper: 'The desired outcome defines the promise.' },
            ],
          },
          {
            id: 'content',
            title: 'Content',
            description: 'Content strategy.',
            icon: FileText,
            questions: [
              { id: 'contentPillars', label: 'Which content pillars should the brand focus on?', placeholder: 'Example: Education, behind the scenes, case studies, tips and tricks', helper: 'Content pillars turn the brand foundation into a content calendar.' },
              { id: 'channels', label: 'Which main communication channels does the brand use?', placeholder: 'Website, Facebook, Instagram, TikTok, LinkedIn, YouTube, email...', helper: 'Channel context helps the agent choose the right format and CTA.' },
            ],
          },
          {
            id: 'visual',
            title: 'Visuals',
            description: 'Visual direction.',
            icon: Image,
            questions: [
              { id: 'visualStyle', label: 'What visual style do you want, and what are 2-3 representative brand colors?', placeholder: 'Minimal / Bold / Playful / Corporate / Elegant / Modern / Vintage; primary colors', helper: 'The agent uses this to create visual direction and image prompts.' },
              { id: 'photoMood', label: 'What photography or image mood do you like?', placeholder: 'Lifestyle / Studio / Editorial / Candid / Illustration / 3D; warm / cool / vibrant / muted', helper: 'The overall mood keeps visual assets consistent.' },
            ],
          },
          {
            id: 'assets',
            title: 'Assets',
            description: 'Existing assets and goals.',
            icon: Library,
            questions: [
              { id: 'assetsGoals', label: 'List existing assets and business goals for the next 12 months', placeholder: 'Website URL, social links, tagline, hashtags, revenue, market, community...', helper: 'Existing assets help the agent build from real context and prioritize outputs.' },
            ],
          },
        ],
      },
    ],
  },
  'ja-JP': {
    nav: [
      { label: 'ダッシュボード', href: dashboardHref, view: 'dashboard' },
      { label: 'ブランドライブラリ', href: libraryHref, view: 'library' },
      { label: 'マイアセット', href: assetsHref, view: 'assets' },
      { label: '新規作成', href: createHref, view: 'create' },
    ],
    library: {
      badge: 'リファレンスライブラリ',
      title: 'ブランドライブラリ',
      description: '自分のブランド基盤を作る前に、有名ブランドの型を確認できます。',
      createNew: '新規作成',
      searchPlaceholder: 'ブランド、カテゴリ、ポジショニング、声で検索...',
      all: 'すべて',
      profiles: 'プロファイル',
      categories: 'カテゴリ',
      archetypes: '型',
      ready: '参考利用可',
      visible: (count) => `${count} 件表示`,
      viewProfile: '詳細を見る',
      useAsInspiration: '参考に使う',
      positioning: 'ポジショニング',
      audience: 'オーディエンス',
      voice: 'ボイス',
      visualDirection: 'ビジュアル方針',
      contentPillars: 'コンテンツ柱',
      strengths: '強み',
      watchouts: '注意点',
      referenceContext: '参考コンテキスト',
      inspiredBy: (name) => `${name} を参考中`,
      removeReference: '参考を外す',
    },
    create: {
      badge: 'ブランド作成',
      chooseTitle: '質問セットを選択',
      chooseDescription: 'ブランド基盤を作るための質問量を選択します。クイックは即時ドラフト、詳細は完整なブランドアセット一式に向いています。',
      outputPackageLabel: '出力パッケージ',
      outputPackage: 'ブランド概要、ボイスガイド、顧客像、コンテンツ柱、ビジュアル方針',
      startFlow: '開始',
      chooseAgain: '質問セットを選び直す',
      sectionProgress: (current, total) => `${total} パート中 ${current}`,
      questionsCount: (count) => `${count} 問`,
      askAi: 'AIで磨き込む',
      back: '戻る',
      next: '次の質問',
      generate: 'ブランドアセットを生成',
      foundationSuffix: 'ブランド基盤',
    },
    questionFlows: [
      {
        id: 'quick',
        title: 'クイック',
        subtitle: '3つの主要質問でブランド基盤のドラフトをすばやく作成します。',
        duration: '~2分',
        icon: Zap,
        sections: [
          {
            id: 'quick-core',
            title: 'クイック',
            description: 'ブランド基盤をすばやく作るための3つの主要質問。',
            icon: Zap,
            questions: [
              { id: 'brandName', label: 'ブランド名と事業カテゴリは何ですか？', placeholder: '例: Venus Beauty - クリーンスキンケアスタジオ', helper: 'ブランド名とカテゴリが、アセット全体の基準になります。', input: 'text' },
              { id: 'valueProposition', label: 'ブランドは顧客にどんな成果をもたらしますか？', placeholder: '顧客が得る主な結果やベネフィットを記入', helper: 'これは最小構成のバリュープロポジションです。' },
              { id: 'usp', label: 'ブランドの差別化ポイントは何ですか？', placeholder: 'USP、根拠、スタイル、独自のアプローチを記入', helper: '明確な違いが、より鋭いポジショニングにつながります。' },
            ],
          },
        ],
      },
      {
        id: 'full',
        title: '詳細',
        subtitle: '包括的なブランド戦略のための15問。',
        duration: '~10分',
        icon: WandSparkles,
        sections: [
          {
            id: 'identity',
            title: 'アイデンティティ',
            description: 'ブランドの核となる情報。',
            icon: Sparkles,
            questions: [
              { id: 'brandName', label: 'ブランド名と事業カテゴリは何ですか？', placeholder: '例: Venus Beauty - クリーンスキンケアスタジオ', helper: '名前とカテゴリは、アセットを書く前の文脈になります。', input: 'text' },
              { id: 'valueProposition', label: '短く説明すると、ブランドは顧客に何を達成させますか？', placeholder: '例: 忙しい創業者がシンプルで上質なスキンケア習慣を保てる', helper: 'この価値提案がタグラインやランディングコピーの基礎になります。' },
              { id: 'usp', label: '競合と比べて何が違いますか？', placeholder: 'USP、方法、素材、物語、独自体験を記入', helper: 'USPはポジショニングが一般的になりすぎるのを防ぎます。' },
              { id: 'missionVision', label: 'ブランドのミッションとビジョンは何ですか？', placeholder: 'なぜ存在し、長期的に何を目指しますか？', helper: 'この回答がブランドストーリーの骨格になります。' },
            ],
          },
          {
            id: 'voice',
            title: 'トーン',
            description: 'ブランドの声と性格。',
            icon: Users,
            questions: [
              { id: 'tone', label: 'ブランドのトーンはどのようにしたいですか？', placeholder: 'professional / friendly / playful / authoritative / casual / inspirational、または自由記述', helper: 'トーン語はボイスガイドとコピーの書き方を決めます。' },
              { id: 'personality', label: 'ブランドを人に例えるとどんな性格ですか？自称はどうしますか？', placeholder: '例: 落ち着いた専門家、親しみやすい。私たち / ブランド名など', helper: '性格設定によりコピーの個性が明確になります。' },
              { id: 'avoidLanguage', label: '避けたい言葉遣いは何ですか？英語とのミックスは必要ですか？', placeholder: '例: 誇張を避ける、スラングを避ける、CTAだけ軽く英語を使う', helper: '避ける方向性は、ブランドらしくない表現を防ぎます。' },
            ],
          },
          {
            id: 'audience',
            title: '顧客',
            description: 'ターゲット顧客。',
            icon: Users,
            questions: [
              { id: 'customer', label: '主要ターゲット顧客は誰ですか？', placeholder: '年齢、職業、収入、地域、購買行動', helper: 'AIはこの情報からペルソナとメッセージマップを作ります。' },
              { id: 'pain', label: 'ブランドが解決したい顧客の課題や痛みは何ですか？', placeholder: '悩み、障壁、欲求、感情インサイトを記入', helper: 'ペインポイントはフックやコンテンツ角度になります。' },
              { id: 'desiredOutcome', label: '商品やサービス利用後に顧客が得るべき成果は何ですか？', placeholder: '例: 自信が増す、時間を節約する、肌が整う、運用が楽になる', helper: '望ましい成果がブランドの約束を定義します。' },
            ],
          },
          {
            id: 'content',
            title: 'コンテンツ',
            description: 'コンテンツ戦略。',
            icon: FileText,
            questions: [
              { id: 'contentPillars', label: '注力したいコンテンツ柱は何ですか？', placeholder: '例: 教育、舞台裏、事例、Tips & Tricks', helper: 'コンテンツ柱はブランド基盤をコンテンツ計画に変換します。' },
              { id: 'channels', label: '主な発信チャネルは何ですか？', placeholder: 'Website, Facebook, Instagram, TikTok, LinkedIn, YouTube, email...', helper: 'チャネル文脈により適切な形式とCTAを選べます。' },
            ],
          },
          {
            id: 'visual',
            title: 'ビジュアル',
            description: 'ビジュアル方針。',
            icon: Image,
            questions: [
              { id: 'visualStyle', label: '希望するビジュアルスタイルと代表カラー2-3色は何ですか？', placeholder: 'Minimal / Bold / Playful / Corporate / Elegant / Modern / Vintage、主要カラー', helper: 'AIはこれをもとにビジュアル方針と画像プロンプトを作ります。' },
              { id: 'photoMood', label: '好みの写真・画像ムードは何ですか？', placeholder: 'Lifestyle / Studio / Editorial / Candid / Illustration / 3D; warm / cool / vibrant / muted', helper: '全体のムードはビジュアルアセットの一貫性を保ちます。' },
            ],
          },
          {
            id: 'assets',
            title: 'アセット',
            description: '既存アセットと目標。',
            icon: Library,
            questions: [
              { id: 'assetsGoals', label: '既存アセットと今後12か月の事業目標を列挙してください', placeholder: 'Website URL、SNSリンク、タグライン、ハッシュタグ、売上、対象市場、コミュニティ...', helper: '既存アセットがあると、AIはゼロからではなく実際の文脈から優先順位を決められます。' },
            ],
          },
        ],
      },
    ],
  },
  'vi-VN': {
    nav: [
      { label: 'Dashboard', href: dashboardHref, view: 'dashboard' },
      { label: 'Thư viện brand', href: libraryHref, view: 'library' },
      { label: 'My Assets', href: assetsHref, view: 'assets' },
      { label: 'Tạo mới', href: createHref, view: 'create' },
    ],
    library: {
      badge: 'Thư viện tham khảo',
      title: 'Brand Library',
      description: 'Tham khảo pattern của các brand nổi tiếng trước khi tạo foundation riêng.',
      createNew: 'Tạo mới',
      searchPlaceholder: 'Tìm brand, category, positioning, voice...',
      all: 'Tất cả',
      profiles: 'profiles',
      categories: 'categories',
      archetypes: 'archetypes',
      ready: 'Sẵn sàng tham khảo',
      visible: (count) => `${count} hiển thị`,
      viewProfile: 'Xem profile',
      useAsInspiration: 'Dùng làm cảm hứng',
      positioning: 'Positioning',
      audience: 'Audience',
      voice: 'Voice',
      visualDirection: 'Visual direction',
      contentPillars: 'Content pillars',
      strengths: 'Điểm mạnh',
      watchouts: 'Lưu ý',
      referenceContext: 'Ngữ cảnh tham khảo',
      inspiredBy: (name) => `Lấy cảm hứng từ ${name}`,
      removeReference: 'Bỏ tham khảo',
    },
    create: {
      badge: 'Tạo Brand',
      chooseTitle: 'Chọn bộ câu hỏi',
      chooseDescription: 'Chọn mức độ chi tiết cho brand foundation. Flow nhanh dùng cho draft tức thì; flow chi tiết dùng khi cần bộ brand asset đầy đủ.',
      outputPackageLabel: 'Gói đầu ra',
      outputPackage: 'Brand brief, voice guide, audience profile, content pillars, visual direction',
      startFlow: 'Bắt đầu',
      chooseAgain: 'Chọn lại bộ câu hỏi',
      sectionProgress: (current, total) => `Phần ${current} của ${total}`,
      questionsCount: (count) => `${count} câu hỏi`,
      askAi: 'Nhờ AI tinh chỉnh',
      back: 'Quay lại',
      next: 'Tiếp theo',
      generate: 'Tạo brand assets',
      foundationSuffix: 'Brand Foundation',
    },
    questionFlows: [
      {
        id: 'quick',
        title: 'Nhanh gọn',
        subtitle: '3 câu hỏi cốt lõi để tạo brand foundation nhanh chóng.',
        duration: '~2 phút',
        icon: Zap,
        sections: [
          {
            id: 'quick-core',
            title: 'Nhanh gọn',
            description: '3 câu hỏi cốt lõi để tạo brand foundation nhanh.',
            icon: Zap,
            questions: [
              { id: 'brandName', label: 'Brand tên gì và làm trong lĩnh vực gì?', placeholder: 'Ví dụ: Venus Beauty - clean skincare studio', helper: 'Tên và lĩnh vực là điểm neo cho toàn bộ asset.', input: 'text' },
              { id: 'valueProposition', label: 'Brand giúp khách hàng đạt được gì?', placeholder: 'Mô tả kết quả hoặc lợi ích chính khách hàng nhận được', helper: 'Đây là value proposition tối giản.' },
              { id: 'usp', label: 'Điều gì khiến brand khác biệt?', placeholder: 'Nêu USP, bằng chứng, phong cách, hoặc cách tiếp cận riêng', helper: 'Khác biệt rõ giúp agent tạo positioning sắc hơn.' },
            ],
          },
        ],
      },
      {
        id: 'full',
        title: 'Chi tiết',
        subtitle: '15 câu hỏi chi tiết cho chiến lược thương hiệu toàn diện.',
        duration: '~10 phút',
        icon: WandSparkles,
        sections: [
          {
            id: 'identity',
            title: 'Nhận diện',
            description: 'Thông tin cốt lõi về thương hiệu.',
            icon: Sparkles,
            questions: [
              { id: 'brandName', label: 'Brand tên gì và làm trong lĩnh vực gì?', placeholder: 'Ví dụ: Venus Beauty - clean skincare studio', helper: 'Tên và lĩnh vực giúp agent xác định ngữ cảnh trước khi viết asset.', input: 'text' },
              { id: 'valueProposition', label: 'Mô tả ngắn: Brand giúp khách hàng đạt được gì?', placeholder: 'Ví dụ: giúp founder bận rộn có routine skincare đơn giản nhưng cao cấp', helper: 'Đây là value proposition, nền cho tagline và landing copy.' },
              { id: 'usp', label: 'Điều gì khiến brand khác biệt so với đối thủ?', placeholder: 'Nêu USP, phương pháp, nguyên liệu, câu chuyện, hoặc trải nghiệm khác biệt', helper: 'USP giúp tránh positioning chung chung.' },
              { id: 'missionVision', label: 'Sứ mệnh và tầm nhìn của brand là gì?', placeholder: 'Brand tồn tại vì điều gì và muốn trở thành gì trong dài hạn?', helper: 'Câu trả lời này tạo khung brand story.' },
            ],
          },
          {
            id: 'voice',
            title: 'Giọng điệu',
            description: 'Giọng điệu và tính cách thương hiệu.',
            icon: Users,
            questions: [
              { id: 'tone', label: 'Tone bạn muốn dùng cho brand?', placeholder: 'professional / friendly / playful / authoritative / casual / inspirational hoặc tự mô tả', helper: 'Tone words điều khiển cách agent viết voice guide và copy.' },
              { id: 'personality', label: 'Nếu brand là một con người, tính cách sẽ như thế nào? Brand xưng hô thế nào?', placeholder: 'Ví dụ: điềm tĩnh, chuyên gia, gần gũi; xưng mình/tôi/chúng tôi/tên brand', helper: 'Tính cách giúp copy có bản sắc hơn.' },
              { id: 'avoidLanguage', label: 'Ngôn ngữ nào brand TRÁNH dùng? Có mix Anh-Việt không? Mức độ?', placeholder: 'Ví dụ: tránh khoa trương, tránh tiếng lóng, dùng Anh-Việt nhẹ ở CTA', helper: 'Negative direction giúp agent không viết sai vibe.' },
            ],
          },
          {
            id: 'audience',
            title: 'Đối tượng',
            description: 'Khách hàng mục tiêu.',
            icon: Users,
            questions: [
              { id: 'customer', label: 'Đối tượng khách hàng chính là ai?', placeholder: 'Tuổi, nghề nghiệp, thu nhập, vị trí địa lý, hành vi mua hàng', helper: 'Agent dùng thông tin này để tạo persona và message map.' },
              { id: 'pain', label: 'Khách hàng đang gặp vấn đề hoặc nỗi đau gì mà brand muốn giải quyết?', placeholder: 'Mô tả nỗi đau, rào cản, mong muốn hoặc insight cảm xúc', helper: 'Pain points chuyển thành hook và content angles.' },
              { id: 'desiredOutcome', label: 'Kết quả mong muốn của khách hàng khi dùng sản phẩm hoặc dịch vụ là gì?', placeholder: 'Ví dụ: tự tin hơn, tiết kiệm thời gian, đẹp hơn, vận hành nhẹ hơn', helper: 'Desired outcome giúp định nghĩa promise.' },
            ],
          },
          {
            id: 'content',
            title: 'Nội dung',
            description: 'Chiến lược nội dung.',
            icon: FileText,
            questions: [
              { id: 'contentPillars', label: 'Những chủ đề nội dung nào bạn muốn tập trung?', placeholder: 'Ví dụ: Giáo dục, Behind the scenes, Case studies, Tips & Tricks', helper: 'Content pillars biến brand foundation thành lịch content.' },
              { id: 'channels', label: 'Các kênh truyền thông chính bạn sử dụng là gì?', placeholder: 'Website, Facebook, Instagram, TikTok, LinkedIn, YouTube, Zalo...', helper: 'Channel context giúp agent chọn format và CTA đúng.' },
            ],
          },
          {
            id: 'visual',
            title: 'Hình ảnh',
            description: 'Phong cách hình ảnh.',
            icon: Image,
            questions: [
              { id: 'visualStyle', label: 'Phong cách hình ảnh bạn muốn và 2-3 màu sắc đại diện cho brand?', placeholder: 'Minimal / Bold / Playful / Corporate / Elegant / Modern / Vintage; màu chính', helper: 'Agent dùng để tạo visual direction và prompt hình ảnh.' },
              { id: 'photoMood', label: 'Phong cách hình ảnh hoặc photography bạn thích?', placeholder: 'Lifestyle / Studio / Editorial / Candid / Illustration / 3D; warm / cool / vibrant / muted', helper: 'Mood tổng thể giúp asset hình ảnh đồng bộ.' },
            ],
          },
          {
            id: 'assets',
            title: 'Tài sản',
            description: 'Tài sản và mục tiêu.',
            icon: Library,
            questions: [
              { id: 'assetsGoals', label: 'Liệt kê các assets hiện có và mục tiêu kinh doanh 12 tháng tới', placeholder: 'Website URL, social links, tagline, hashtags, doanh thu, thị trường, cộng đồng...', helper: 'Asset hiện có giúp agent không tạo từ con số 0 và biết ưu tiên đầu ra.' },
            ],
          },
        ],
      },
    ],
  },
};

function getBrandingAgentCopy(locale: Locale): BrandingAgentCopy {
  return brandingAgentCopy[locale] ?? brandingAgentCopy['en-US'];
}

const assetTemplates = [
  { label: 'Brand Foundation Brief', icon: FileText, detail: 'Mission, audience, positioning, promise, proof, and guardrails.' },
  { label: 'Voice & Messaging Guide', icon: PenLine, detail: 'Tone rules, phrase bank, value props, claims to avoid.' },
  { label: 'Visual Direction', icon: Palette, detail: 'Color palette, typography mood, imagery rules, logo prompt.' },
  { label: 'Content Starter Pack', icon: Megaphone, detail: 'Bio, tagline, hooks, social content pillars, CTA variants.' },
];

function resolveView(pathname: string): FoundationView {
  if (pathname.endsWith('/create')) return 'create';
  if (pathname.endsWith('/library')) return 'library';
  if (pathname.endsWith('/integrations')) return 'assets';
  if (pathname === dashboardHref || pathname === '/intelligence/brand-ai') return 'dashboard';
  return 'brand';
}

function InfoHint({ children, label = 'More information' }: { children: ReactNode; label?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground" aria-label={label}>
            <Info className="size-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 text-xs leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getStatusLabel(status: BrandAiStatus) {
  return {
    approved: 'Approved',
    draft: 'Draft',
    generating: 'Generating',
    review_needed: 'Needs review',
    shared: 'Shared',
  }[status];
}

function getStatusBadgeClass(status: BrandAiStatus) {
  if (status === 'approved' || status === 'shared') return 'border-success/20 bg-success/10 text-success';
  if (status === 'review_needed') return 'border-warning/20 bg-warning/10 text-warning-foreground';
  if (status === 'generating') return 'border-primary/20 bg-primary/10 text-primary';
  return 'border-border bg-muted text-muted-foreground';
}

function buildAssetBody(pkg: BrandAiPackage) {
  return [
    `${pkg.name} is a ${pkg.category.toLowerCase()} package for ${pkg.market}.`,
    pkg.primaryGoal,
    `Recommended action: ${pkg.recommendedAction}`,
    `Readiness ${pkg.readiness}%, evidence coverage ${pkg.evidenceCoverage}%, confidence ${pkg.confidence}%.`,
  ].join('\n\n');
}

function FoundationShell({ activeView, children }: { activeView: FoundationView; children: ReactNode }) {
  const { locale } = useI18n();
  const copy = getBrandingAgentCopy(locale);
  const uiCopy = brandAiUiCopy[locale];

  return (
    <div className="-m-4 min-h-[calc(100vh-70px)] bg-background px-4 py-5 md:-m-6 md:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="surface-toolbar flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/70 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <div>
              <div className="text-lg font-semibold text-foreground">{uiCopy.shell.product}</div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{uiCopy.shell.workflow}</div>
            </div>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1">
            {copy.nav.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activeView === item.view || (activeView === 'brand' && item.view === 'assets')
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function DashboardScreen() {
  const { locale } = useI18n();
  const copy = getBrandingAgentCopy(locale);
  const uiCopy = brandAiUiCopy[locale];
  const fullFlow = copy.questionFlows.find((flow) => flow.id === 'full') ?? copy.questionFlows[0];

  return (
    <div className="space-y-6">
      <section className="surface-solid rounded-lg border border-border/70 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">{uiCopy.dashboard.badge}</Badge>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{uiCopy.dashboard.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{uiCopy.dashboard.body}</p>
          </div>
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link to={createHref}><Plus className="mr-2 size-4" />{uiCopy.dashboard.create}</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {assetTemplates.map((asset) => {
            const Icon = asset.icon;
            return (
              <div key={asset.label} className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <Icon className="size-5 text-primary" />
                <div className="mt-3 font-semibold text-foreground">{asset.label}</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{asset.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="surface-solid rounded-lg border-border/70 shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">Recent brand foundations <InfoHint>These are generated brand asset workspaces, not product or campaign records.</InfoHint></CardTitle>
            <Button asChild variant="outline"><Link to={assetsHref}>View assets</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.map((project) => (
              <Link key={project.id} to={`/intelligence/branding-agent/${project.id}`} className="grid gap-4 rounded-lg border bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-muted/30 md:grid-cols-[1fr_120px_160px_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-foreground">{project.name}</div>
                    <Badge variant="outline" className={project.status === 'Ready' ? 'border-success/20 bg-success/10 text-success' : project.status === 'Review' ? 'border-warning/20 bg-warning/10 text-warning-foreground' : 'border-border bg-muted text-muted-foreground'}>{project.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{project.positioning}</p>
                </div>
                <div className="text-sm text-muted-foreground">{project.category}</div>
                <div>
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{project.progress}%</span></div>
                  <Progress value={project.progress} className="h-2" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-solid rounded-lg border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Question flow</CardTitle>
            <p className="text-sm text-muted-foreground">The system builds assets from answers, not from linked PrimeOS modules.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {fullFlow.sections.map((section, index) => (
              <div key={section.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
                <div>
                  <div className="font-medium">{section.title}</div>
                  <div className="text-xs text-muted-foreground">{copy.create.questionsCount(section.questions.length)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReferenceContextStrip({ profile, copy }: { profile: BrandReferenceProfile; copy: BrandingAgentCopy }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">{copy.library.referenceContext}</Badge>
          <div className="mt-2 text-lg font-semibold text-foreground">{copy.library.inspiredBy(profile.name)}</div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{profile.positioning}</p>
        </div>
        <Button asChild variant="outline">
          <Link to={createHref}>{copy.library.removeReference}</Link>
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[...profile.applyToCreateFlow.toneHints, ...profile.applyToCreateFlow.visualHints.slice(0, 2)].map((hint) => (
          <Badge key={hint} variant="outline" className="border-primary/15 bg-background text-primary">{hint}</Badge>
        ))}
      </div>
    </div>
  );
}

function BrandReferenceLogo({ profile, size = 'md' }: { profile: BrandReferenceProfile; size?: 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-white shadow-sm',
        size === 'lg' ? 'h-20 w-28 p-3' : 'h-14 w-20 p-2',
      )}
    >
      <img
        src={profile.logoSrc}
        alt={profile.logoAlt}
        className="max-h-full max-w-full object-contain"
        loading="lazy"
      />
    </span>
  );
}

function CreateFoundationScreen() {
  const { locale } = useI18n();
  const copy = getBrandingAgentCopy(locale);
  const [searchParams] = useSearchParams();
  const referenceId = searchParams.get('reference') ?? undefined;
  const referenceProfile = referenceId ? getBrandReferenceProfile(referenceId) : null;
  const [selectedFlowId, setSelectedFlowId] = useState<QuestionFlowId | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const selectedFlow = copy.questionFlows.find((flow) => flow.id === selectedFlowId);
  const sections = selectedFlow?.sections ?? [];
  const activeSection = sections[activeSectionIndex];
  const completed = sections.reduce((count, section) => count + section.questions.filter((question) => answers[question.id]?.trim()).length, 0);
  const total = sections.reduce((count, section) => count + section.questions.length, 0);
  const progress = Math.round((completed / total) * 100);

  const updateAnswer = (id: string, value: string) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  const selectFlow = (flowId: QuestionFlowId) => {
    setSelectedFlowId(flowId);
    setActiveSectionIndex(0);
  };

  const goNext = () => setActiveSectionIndex((index) => Math.min(index + 1, sections.length - 1));
  const goBack = () => setActiveSectionIndex((index) => Math.max(index - 1, 0));

  if (!selectedFlow || !activeSection) {
    return (
      <div className="w-full space-y-6">
        {referenceProfile ? <ReferenceContextStrip profile={referenceProfile} copy={copy} /> : null}
        <div className="surface-solid rounded-lg border border-border/70 p-5 shadow-sm md:p-6">
          <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">{copy.create.badge}</Badge>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{copy.create.chooseTitle}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{copy.create.chooseDescription}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{copy.create.outputPackageLabel}</div>
              <div className="mt-2 text-sm font-medium text-foreground">{copy.create.outputPackage}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {copy.questionFlows.map((flow) => {
            const Icon = flow.icon;
            return (
              <button
                key={flow.id}
                type="button"
                onClick={() => selectFlow(flow.id)}
                className={cn(
                  'group rounded-lg border border-border/70 bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </span>
                  <Badge variant="outline">{flow.duration}</Badge>
                </div>
                <div className="mt-5 text-2xl font-semibold text-foreground">{flow.title}</div>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{flow.subtitle}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  {copy.create.startFlow} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const ActiveIcon = activeSection.icon ?? Sparkles;

  return (
    <div className="w-full space-y-6">
      {referenceProfile ? <ReferenceContextStrip profile={referenceProfile} copy={copy} /> : null}
      <div className="surface-solid rounded-lg border border-border/70 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button type="button" onClick={() => setSelectedFlowId(null)} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft className="size-4" /> {copy.create.chooseAgain}
            </button>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{selectedFlow.title} {copy.create.foundationSuffix}</h1>
          </div>
          <Badge className="rounded-full border-primary/20 bg-primary/10 px-4 py-1 text-primary" variant="outline">{selectedFlow.duration}</Badge>
        </div>

        <div className="mt-5 flex gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1">
          {sections.map((section, index) => {
            const Icon = section.icon ?? Sparkles;
            const active = index === activeSectionIndex;
            const sectionComplete = section.questions.every((question) => answers[question.id]?.trim());
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionIndex(index)}
                aria-current={active ? 'step' : undefined}
                className={cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/70 hover:text-foreground')}
              >
                {sectionComplete ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                {section.title}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground"><span>{copy.create.sectionProgress(activeSectionIndex + 1, sections.length)}</span><span>{Number.isFinite(progress) ? progress : 0}%</span></div>
          <Progress value={Number.isFinite(progress) ? progress : 0} className="h-2" />
        </div>
      </div>

      <div>
        <Card className="surface-solid rounded-lg border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ActiveIcon className="size-5" />
                  </span>
                  <div>
                    <CardTitle className="text-xl text-foreground">{activeSection.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{activeSection.description} · {copy.create.questionsCount(activeSection.questions.length)}</p>
                  </div>
                </div>
              </div>
              <Button variant="outline"><Sparkles className="mr-2 size-4" />{copy.create.askAi}</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {activeSection.questions.map((question, questionIndex) => (
              <div key={question.id} className="border-t border-border/70 py-5 first:border-t-0 first:pt-0">
                <label htmlFor={`branding-${question.id}`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">{questionIndex + 1}</span>
                  {question.label}
                  <InfoHint>{question.helper}</InfoHint>
                </label>
                {question.input === 'text' ? (
                  <Input id={`branding-${question.id}`} className="mt-3 bg-background" value={answers[question.id] ?? ''} onChange={(event) => updateAnswer(question.id, event.target.value)} placeholder={question.placeholder} aria-describedby={`branding-${question.id}-helper`} />
                ) : (
                  <Textarea id={`branding-${question.id}`} className="mt-3 min-h-28 bg-background" value={answers[question.id] ?? ''} onChange={(event) => updateAnswer(question.id, event.target.value)} placeholder={question.placeholder} aria-describedby={`branding-${question.id}-helper`} />
                )}
                <p id={`branding-${question.id}-helper`} className="mt-2 text-xs leading-5 text-muted-foreground">{question.helper}</p>
              </div>
            ))}

            <div className="flex flex-wrap justify-between gap-3 border-t border-border/70 pt-5">
              <Button variant="outline" onClick={goBack} disabled={activeSectionIndex === 0}>{copy.create.back}</Button>
              {activeSectionIndex === sections.length - 1 ? (
                <Button asChild className="bg-primary text-white hover:bg-primary/90">
                  <Link to="/intelligence/branding-agent/venus-beauty">{copy.create.generate} <ArrowRight className="ml-2 size-4" /></Link>
                </Button>
              ) : (
                <Button onClick={goNext} className="bg-primary text-white hover:bg-primary/90">{copy.create.next} <ArrowRight className="ml-2 size-4" /></Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BrandLibraryScreen() {
  const { locale } = useI18n();
  const copy = getBrandingAgentCopy(locale);
  const library = useMemo(() => buildBrandReferenceLibrary(), []);
  const [profileDetailId, setProfileDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BrandReferenceCategory | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<BrandReferenceRegion | 'all'>('all');
  const [maturityFilter, setMaturityFilter] = useState<BrandReferenceMaturity | 'all'>('all');
  const filteredProfiles = filterBrandReferenceProfiles(query, categoryFilter, { maturity: maturityFilter, region: regionFilter });
  const detailProfile = profileDetailId ? library.find((profile) => profile.id === profileDetailId) : null;
  const categoryOptions = useMemo(
    () => Array.from(new Set(library.map((profile) => profile.category))),
    [library],
  );
  const regionOptions = useMemo(
    () => Array.from(new Set(library.map((profile) => profile.region))),
    [library],
  );
  const maturityOptions = useMemo(
    () => Array.from(new Set(library.map((profile) => profile.maturity))),
    [library],
  );
  const archetypeCount = useMemo(() => new Set(library.map((profile) => profile.archetype)).size, [library]);

  return (
    <div className="space-y-6">
      <section className="surface-solid rounded-lg border border-border/70 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">{copy.library.badge}</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{copy.library.title}</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">{copy.library.description}</p>
          </div>
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link to={createHref}><Plus className="mr-2 size-4" />{copy.library.createNew}</Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: copy.library.profiles, value: library.length },
          { label: copy.library.categories, value: categoryOptions.length },
          { label: copy.library.archetypes, value: archetypeCount },
          { label: copy.library.ready, value: <CheckCircle2 className="size-5 text-success" /> },
        ].map((metric) => (
          <div key={metric.label} className="surface-solid rounded-lg border border-border/70 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</div>
          </div>
        ))}
      </div>

      <Card className="surface-solid rounded-lg border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Library className="size-5 text-primary" />
              {copy.library.title}
            </CardTitle>
            <Badge variant="outline">{copy.library.visible(filteredProfiles.length)}</Badge>
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.library.searchPlaceholder} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[560px]">
              <select
                aria-label="Filter brand category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as BrandReferenceCategory | 'all')}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">{copy.library.all} categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{brandReferenceCategoryLabels[category]}</option>
                ))}
              </select>
              <select
                aria-label="Filter brand region"
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value as BrandReferenceRegion | 'all')}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">{copy.library.all} regions</option>
                {regionOptions.map((region) => (
                  <option key={region} value={region}>{brandReferenceRegionLabels[region]}</option>
                ))}
              </select>
              <select
                aria-label="Filter brand maturity"
                value={maturityFilter}
                onChange={(event) => setMaturityFilter(event.target.value as BrandReferenceMaturity | 'all')}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">{copy.library.all} maturity</option>
                {maturityOptions.map((maturity) => (
                  <option key={maturity} value={maturity}>{brandReferenceMaturityLabels[maturity]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1">
            <button
              type="button"
              aria-pressed={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
              className={cn('whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', categoryFilter === 'all' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/70 hover:text-foreground')}
            >
              {copy.library.all}
            </button>
            {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={categoryFilter === category}
                  onClick={() => setCategoryFilter(category)}
                  className={cn('whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', categoryFilter === category ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/70 hover:text-foreground')}
                >
                  {brandReferenceCategoryLabels[category]}
                </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Library className="mx-auto size-8 text-muted-foreground" />
              <div className="mt-3 font-semibold text-foreground">No reference profiles match this filter</div>
              <p className="mt-1 text-sm text-muted-foreground">Clear search or category filters to return to the full library.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQuery('');
                  setCategoryFilter('all');
                  setRegionFilter('all');
                  setMaturityFilter('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setProfileDetailId(profile.id)}
                className="group flex min-h-[220px] w-full flex-col rounded-lg border border-border/70 bg-muted/10 p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <BrandReferenceLogo profile={profile} />
                    <div className="flex flex-wrap items-center gap-2">
                      <div>
                        <div className="font-semibold text-foreground">{profile.name}</div>
                        <div className="mt-1 text-sm font-medium text-primary">{profile.archetype}</div>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    {copy.library.viewProfile} <ArrowRight className="size-3" />
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{brandReferenceCategoryLabels[profile.category]}</Badge>
                  <Badge variant="outline">{brandReferenceRegionLabels[profile.region]}</Badge>
                  <Badge variant="outline">{brandReferenceMaturityLabels[profile.maturity]}</Badge>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{profile.positioning}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {profile.voice.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="border-primary/15 bg-primary/5 text-primary">{tag}</Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(detailProfile)} onOpenChange={(open) => !open && setProfileDetailId(null)}>
        {detailProfile ? (
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto p-0">
            <DialogHeader className="border-b border-border/70 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
                <div>
                  <div className="flex items-center gap-4">
                    <BrandReferenceLogo profile={detailProfile} size="lg" />
                    <div>
                      <Badge variant="outline">{brandReferenceCategoryLabels[detailProfile.category]}</Badge>
                      <DialogTitle className="mt-3 text-2xl text-foreground">{detailProfile.name}</DialogTitle>
                      <DialogDescription className="mt-2 text-sm font-medium text-primary">{detailProfile.archetype}</DialogDescription>
                    </div>
                  </div>
                </div>
                <Button asChild className="bg-primary text-white hover:bg-primary/90">
                  <Link to={`${createHref}?reference=${detailProfile.id}`}>{copy.library.useAsInspiration}</Link>
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Region</div>
                  <div className="mt-1 text-foreground">{brandReferenceRegionLabels[detailProfile.region]}</div>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Maturity</div>
                  <div className="mt-1 text-foreground">{brandReferenceMaturityLabels[detailProfile.maturity]}</div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  { label: copy.library.positioning, body: detailProfile.positioning },
                  { label: copy.library.audience, body: detailProfile.audience },
                ].map((section) => (
                  <div key={section.label} className="rounded-lg border border-border/70 bg-muted/10 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section.label}</div>
                    <p className="mt-2 text-sm leading-6 text-foreground">{section.body}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  { label: copy.library.voice, values: detailProfile.voice },
                  { label: copy.library.visualDirection, values: detailProfile.visualDirection },
                  { label: copy.library.contentPillars, values: detailProfile.contentPillars },
                ].map((section) => (
                  <div key={section.label} className="rounded-lg border border-border/70 bg-muted/10 p-4">
                    <div className="text-sm font-semibold text-foreground">{section.label}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {section.values.map((value) => (
                        <Badge key={value} variant="outline">{value}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-success/20 bg-success/5 p-4">
                  <div className="text-sm font-semibold text-foreground">{copy.library.strengths}</div>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {detailProfile.strengths.map((strength) => <li key={strength}>- {strength}</li>)}
                  </ul>
                </div>
                <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
                  <div className="text-sm font-semibold text-foreground">{copy.library.watchouts}</div>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {detailProfile.watchouts.map((watchout) => <li key={watchout}>- {watchout}</li>)}
                  </ul>
                </div>
              </div>
            </div>
            <DialogFooter className="border-t border-border/70 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setProfileDetailId(null)}>Close</Button>
              <Button asChild className="bg-primary text-white hover:bg-primary/90">
                <Link to={`${createHref}?reference=${detailProfile.id}`}>{copy.library.useAsInspiration}</Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function MyAssetsScreen() {
  const { locale } = useI18n();
  const uiCopy = brandAiUiCopy[locale];
  const snapshot = useMemo(() => buildBrandAiWorkspaceSnapshot(), []);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BrandAiStatus>('all');

  const filteredPackages = snapshot.packages.filter((pkg) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || [pkg.name, pkg.category, pkg.market, pkg.owner].some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const detailPackage = detailId ? snapshot.packages.find((pkg) => pkg.id === detailId) : null;
  const filterOptions: Array<{ id: 'all' | BrandAiStatus; label: string }> = [
    { id: 'all', label: uiCopy.assets.filters.all },
    { id: 'approved', label: uiCopy.assets.filters.approved },
    { id: 'review_needed', label: uiCopy.assets.filters.review },
    { id: 'generating', label: uiCopy.assets.filters.generating },
    { id: 'draft', label: uiCopy.assets.filters.draft },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-solid rounded-lg border border-border/70 p-5 shadow-sm md:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
          <div>
            <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">{uiCopy.assets.badge}</Badge>
            <h1 className="mt-3 flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {uiCopy.assets.title}
              <InfoHint>{uiCopy.assets.hint}</InfoHint>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button variant="outline" asChild><Link to={libraryHref}><Library className="mr-2 size-4" />{uiCopy.assets.browse}</Link></Button>
            <Button asChild className="bg-primary text-white hover:bg-primary/90"><Link to={createHref}><Plus className="mr-2 size-4" />{uiCopy.assets.create}</Link></Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: uiCopy.assets.metrics.packages, value: snapshot.metrics.activePackages, detail: uiCopy.assets.metrics.packagesDetail(filteredPackages.length), icon: Library },
          { label: uiCopy.assets.metrics.approved, value: snapshot.metrics.approvedPackages, detail: uiCopy.assets.metrics.approvedDetail, icon: BadgeCheck },
          { label: uiCopy.assets.metrics.needsReview, value: snapshot.metrics.reviewNeeded, detail: uiCopy.assets.metrics.needsReviewDetail, icon: Info },
          { label: uiCopy.assets.metrics.readiness, value: `${snapshot.metrics.averageReadiness}%`, detail: uiCopy.assets.metrics.readinessDetail(snapshot.metrics.reusableContext), icon: CheckCircle2 },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="surface-solid rounded-lg border border-border/70 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {metric.label}
                    <InfoHint>{metric.detail}</InfoHint>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</div>
                </div>
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="surface-solid rounded-lg border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                {uiCopy.assets.libraryTitle}
                <InfoHint>{uiCopy.assets.libraryHint}</InfoHint>
              </CardTitle>
            </div>
            <Badge variant="outline">{uiCopy.assets.visible(filteredPackages.length)}</Badge>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={uiCopy.assets.search} />
            </div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={statusFilter === option.id}
                  onClick={() => setStatusFilter(option.id)}
                  className={cn('whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', statusFilter === option.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/70 hover:text-foreground')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPackages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Library className="mx-auto size-8 text-muted-foreground" />
              <div className="mt-3 font-semibold text-foreground">{uiCopy.assets.emptyTitle}</div>
              <p className="mt-1 text-sm text-muted-foreground">{uiCopy.assets.emptyBody}</p>
            </div>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-3">
            {filteredPackages.map((pkg) => {
              const approvedSections = pkg.sections.filter((section) => section.state === 'approved').length;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setDetailId(pkg.id)}
                  className="group flex min-h-[320px] w-full flex-col rounded-lg border border-border/70 bg-muted/10 p-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </span>
                    <Badge variant="outline" className={getStatusBadgeClass(pkg.status)}>{getStatusLabel(pkg.status)}</Badge>
                  </div>
                  <div className="mt-4">
                    <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
                      {pkg.name}
                      <InfoHint>{pkg.primaryGoal}</InfoHint>
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{pkg.category}</Badge>
                      <Badge variant="outline">{pkg.market}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          Readiness
                          <InfoHint>Overall readiness based on section scores, evidence coverage, confidence, and review state.</InfoHint>
                        </span>
                        <span>{pkg.readiness}%</span>
                      </div>
                      <Progress value={pkg.readiness} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/40 p-2">
                        <div className="inline-flex items-center gap-1 text-muted-foreground">
                          Evidence
                          <InfoHint>How much source context supports the package.</InfoHint>
                        </div>
                        <div className="mt-1 font-semibold text-foreground">{pkg.evidenceCoverage}%</div>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <div className="inline-flex items-center gap-1 text-muted-foreground">
                          Confidence
                          <InfoHint>Estimated confidence of the generated brand direction.</InfoHint>
                        </div>
                        <div className="mt-1 font-semibold text-foreground">{pkg.confidence}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline">{approvedSections}/{pkg.sections.length} approved</Badge>
                    <Badge variant="outline">{pkg.owner}</Badge>
                    <span className="inline-flex items-center">
                      <InfoHint>{pkg.recommendedAction}</InfoHint>
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-5 text-sm">
                    <span className="text-muted-foreground">Updated {pkg.freshness}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      View details <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(detailPackage)} onOpenChange={(open) => !open && setDetailId(null)}>
        {detailPackage ? (
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto p-0">
            <DialogHeader className="border-b border-border/70 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
                <div>
                  <Badge variant="outline" className={getStatusBadgeClass(detailPackage.status)}>{getStatusLabel(detailPackage.status)}</Badge>
                  <DialogTitle className="mt-3 text-2xl text-foreground">{detailPackage.name}</DialogTitle>
                  <DialogDescription className="mt-2 max-w-2xl text-sm leading-6">{detailPackage.primaryGoal}</DialogDescription>
                </div>
                <Button asChild className="bg-primary text-white hover:bg-primary/90"><Link to={detailPackage.route}>Open brand project</Link></Button>
              </div>
            </DialogHeader>
            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { label: uiCopy.assets.metrics.readiness, value: `${detailPackage.readiness}%` },
                  { label: uiCopy.assets.evidence, value: `${detailPackage.evidenceCoverage}%` },
                  { label: uiCopy.assets.confidence, value: `${detailPackage.confidence}%` },
                  { label: uiCopy.assets.updated, value: detailPackage.freshness },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                    <div className="mt-2 text-lg font-semibold text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/70 bg-muted/10 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{uiCopy.assets.preview}</div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground">{buildAssetBody(detailPackage)}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detailPackage.sections.map((section) => (
                      <div key={section.id} className="rounded-lg border border-border/70 bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-semibold text-foreground">{section.label}</div>
                          <Badge variant="outline">{section.score}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-border/70 bg-muted/10 p-4">
                    <div className="text-sm font-semibold text-foreground">{uiCopy.assets.nextAction}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{detailPackage.recommendedAction}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/10 p-4">
                    <div className="text-sm font-semibold text-foreground">{uiCopy.assets.risks}</div>
                    <div className="mt-3 space-y-2">
                      {detailPackage.risks.map((risk) => (
                        <div key={risk.label} className="rounded-lg border border-border/70 bg-background p-3">
                          <Badge variant="outline" className={risk.severity === 'high' ? 'border-destructive/20 bg-destructive/10 text-destructive' : risk.severity === 'medium' ? 'border-warning/20 bg-warning/10 text-warning-foreground' : ''}>{risk.severity}</Badge>
                          <p className="mt-2 text-sm leading-6 text-foreground">{risk.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{uiCopy.assets.owner}: {risk.owner}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="border-t border-border/70 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDetailId(null)}>{uiCopy.assets.close}</Button>
              <Button variant="outline"><Copy className="mr-2 size-4" />{uiCopy.assets.copyAsset}</Button>
              <Button asChild className="bg-primary text-white hover:bg-primary/90"><Link to={detailPackage.route}>{uiCopy.assets.openProject}</Link></Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function BrandAssetScreen() {
  const { pathname } = useLocation();
  const brandId = pathname.split('/').filter(Boolean)[2];
  const project = getBrandAiPackage(brandId);
  const icons = [FileText, Users, Palette, PenLine, Image, Library];
  const assetCards = project.sections.map((section, index) => ({
    label: section.label,
    icon: icons[index % icons.length],
    body: section.insight,
    score: section.score,
    state: section.state,
  }));

  return (
    <div className="space-y-6">
      <section className="surface-solid rounded-lg border border-border/70 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to={assetsHref} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-4" /> My Assets
            </Link>
            <Badge className="border-success/20 bg-success/10 text-success" variant="outline"><BadgeCheck className="mr-1 size-3" />Generated assets</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{project.name}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{project.primaryGoal}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline"><Brush className="mr-2 size-4" />Regenerate style</Button>
            <Button className="bg-primary text-white hover:bg-primary/90"><Share2 className="mr-2 size-4" />Share pack</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {assetCards.map((asset) => {
          const Icon = asset.icon;
          return (
            <Card key={asset.label} className="surface-solid rounded-lg border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground"><Icon className="size-5 text-primary" />{asset.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 text-muted-foreground">{asset.body}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Badge variant="outline">{asset.score}</Badge>
                  <Button variant="outline"><Copy className="mr-2 size-4" />Copy asset</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function PrimeBrandAiPage() {
  const { pathname } = useLocation();
  const activeView = useMemo(() => resolveView(pathname), [pathname]);

  return (
    <FoundationShell activeView={activeView}>
      {activeView === 'dashboard' ? <DashboardScreen /> : null}
      {activeView === 'library' ? <BrandLibraryScreen /> : null}
      {activeView === 'create' ? <CreateFoundationScreen /> : null}
      {activeView === 'assets' ? <MyAssetsScreen /> : null}
      {activeView === 'brand' ? <BrandAssetScreen /> : null}
    </FoundationShell>
  );
}
