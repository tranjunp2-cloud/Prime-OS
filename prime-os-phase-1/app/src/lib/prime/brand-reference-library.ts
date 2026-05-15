export type BrandReferenceCategory =
  | 'technology'
  | 'sports'
  | 'lifestyle'
  | 'hospitality'
  | 'fashion-beauty'
  | 'retail'
  | 'sustainability'
  | 'creator-media';

export type BrandReferenceRegion = 'global' | 'us' | 'japan' | 'europe' | 'asia';

export type BrandReferenceMaturity = 'heritage' | 'scale-up' | 'digital-native';

export interface BrandReferenceProfile {
  id: string;
  name: string;
  logoSrc: string;
  logoAlt: string;
  category: BrandReferenceCategory;
  region: BrandReferenceRegion;
  maturity: BrandReferenceMaturity;
  archetype: string;
  positioning: string;
  audience: string;
  voice: string[];
  visualDirection: string[];
  contentPillars: string[];
  strengths: string[];
  watchouts: string[];
  applyToCreateFlow: {
    toneHints: string[];
    visualHints: string[];
    contentHints: string[];
    positioningPrompt: string;
  };
}

export const brandReferenceCategoryLabels: Record<BrandReferenceCategory, string> = {
  technology: 'Technology',
  sports: 'Sports',
  lifestyle: 'Lifestyle',
  hospitality: 'Hospitality',
  'fashion-beauty': 'Fashion / Beauty',
  retail: 'Retail',
  sustainability: 'Sustainability',
  'creator-media': 'Creator / Media',
};

export const brandReferenceRegionLabels: Record<BrandReferenceRegion, string> = {
  asia: 'Asia',
  europe: 'Europe',
  global: 'Global',
  japan: 'Japan',
  us: 'US',
};

export const brandReferenceMaturityLabels: Record<BrandReferenceMaturity, string> = {
  'digital-native': 'Digital Native',
  heritage: 'Heritage',
  'scale-up': 'Scale-up',
};

const brandReferenceProfiles: BrandReferenceProfile[] = [
  {
    id: 'apple',
    name: 'Apple',
    logoSrc: '/images/brand-library/apple.png',
    logoAlt: 'Apple logo reference',
    category: 'technology',
    region: 'global',
    maturity: 'heritage',
    archetype: 'Premium Simplifier',
    positioning: 'Turns advanced technology into calm, premium tools for everyday creative work.',
    audience: 'Creative professionals, operators, families, and teams who value integrated devices and low-friction experiences.',
    voice: ['minimal', 'confident', 'human', 'benefit-led'],
    visualDirection: ['spacious layouts', 'product-first imagery', 'neutral palette', 'precise typography'],
    contentPillars: ['product utility', 'creative possibility', 'privacy and trust', 'ecosystem continuity'],
    strengths: ['Simple product storytelling', 'Strong ecosystem framing', 'Premium visual restraint'],
    watchouts: ['Can feel too polished for community-led brands', 'Premium distance may not fit budget categories'],
    applyToCreateFlow: {
      toneHints: ['clear', 'confident', 'plainspoken'],
      visualHints: ['reduce clutter', 'lead with product benefit', 'use generous whitespace'],
      contentHints: ['show one core use case at a time', 'translate features into outcomes'],
      positioningPrompt: 'What complex thing does this brand make easier, calmer, or more desirable?',
    },
  },
  {
    id: 'nike',
    name: 'Nike',
    logoSrc: '/images/brand-library/nike.png',
    logoAlt: 'Nike logo reference',
    category: 'sports',
    region: 'global',
    maturity: 'heritage',
    archetype: 'Mission Community',
    positioning: 'Frames performance as a personal and collective challenge that anyone can step into.',
    audience: 'Athletes, active consumers, teams, and culture-driven buyers who want identity as much as gear.',
    voice: ['motivational', 'direct', 'energetic', 'inclusive'],
    visualDirection: ['motion imagery', 'bold contrast', 'hero moments', 'athlete focus'],
    contentPillars: ['achievement', 'training rituals', 'community identity', 'sport culture'],
    strengths: ['Emotionally memorable mission language', 'Strong community participation', 'Clear action bias'],
    watchouts: ['High-intensity tone can overpower quieter categories', 'Needs credible proof to avoid empty hype'],
    applyToCreateFlow: {
      toneHints: ['active', 'motivating', 'short'],
      visualHints: ['show movement', 'show people in use context', 'use strong contrast'],
      contentHints: ['turn customer progress into story', 'use rituals and challenges'],
      positioningPrompt: 'What transformation should customers feel ready to begin?',
    },
  },
  {
    id: 'patagonia',
    name: 'Patagonia',
    logoSrc: '/images/brand-library/patagonia.png',
    logoAlt: 'Patagonia logo reference',
    category: 'sustainability',
    region: 'global',
    maturity: 'heritage',
    archetype: 'Mission Community',
    positioning: 'Builds durable outdoor products around environmental responsibility and proof-backed values.',
    audience: 'Outdoor buyers, conscious consumers, activists, and quality-focused customers who expect values to show up in operations.',
    voice: ['principled', 'plain', 'documented', 'urgent'],
    visualDirection: ['outdoor realism', 'earth tones', 'documentary photography', 'repair-forward details'],
    contentPillars: ['environmental proof', 'durability', 'repair and reuse', 'activism'],
    strengths: ['Values are operational, not decorative', 'Strong proof culture', 'Durability supports premium trust'],
    watchouts: ['Values-first brands need real commitments', 'Moral language can feel heavy without humility'],
    applyToCreateFlow: {
      toneHints: ['honest', 'specific', 'evidence-led'],
      visualHints: ['show real use', 'show materials and repair', 'avoid overly staged polish'],
      contentHints: ['document tradeoffs', 'share proof and progress', 'connect product to responsibility'],
      positioningPrompt: 'Which value does the brand prove through actions, not slogans?',
    },
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    logoSrc: '/images/brand-library/airbnb.png',
    logoAlt: 'Airbnb logo reference',
    category: 'hospitality',
    region: 'global',
    maturity: 'scale-up',
    archetype: 'Culture Creator',
    positioning: 'Makes travel feel more personal by connecting guests, hosts, neighborhoods, and belonging.',
    audience: 'Travelers who want local context, flexible stays, and more human alternatives to standard accommodation.',
    voice: ['warm', 'welcoming', 'trust-building', 'story-led'],
    visualDirection: ['real homes', 'human scenes', 'soft warmth', 'destination context'],
    contentPillars: ['belonging', 'host stories', 'local discovery', 'trust and safety'],
    strengths: ['Strong emotional frame', 'Marketplace trust narrative', 'Humanizes inventory'],
    watchouts: ['Trust claims need visible safety mechanics', 'Belonging language can become generic if not grounded'],
    applyToCreateFlow: {
      toneHints: ['warm', 'reassuring', 'human'],
      visualHints: ['show people and place', 'use lived-in details', 'avoid sterile imagery'],
      contentHints: ['feature user stories', 'explain trust steps', 'make service feel personal'],
      positioningPrompt: 'How does the brand make a functional transaction feel more human?',
    },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    logoSrc: '/images/brand-library/spotify.png',
    logoAlt: 'Spotify logo reference',
    category: 'creator-media',
    region: 'global',
    maturity: 'digital-native',
    archetype: 'Culture Creator',
    positioning: 'Turns personal listening behavior into culture, discovery, and shareable identity.',
    audience: 'Listeners, creators, and culture followers who want discovery, personalization, and social expression.',
    voice: ['playful', 'data-aware', 'cultural', 'personal'],
    visualDirection: ['bold color blocks', 'playlist art', 'dynamic type', 'music-culture energy'],
    contentPillars: ['personalization', 'discovery', 'creator connection', 'cultural moments'],
    strengths: ['Personal data becomes story', 'Strong shareability', 'Fresh cultural cadence'],
    watchouts: ['Playful data must respect privacy', 'Trend-driven voice can age quickly'],
    applyToCreateFlow: {
      toneHints: ['playful', 'personal', 'culture-aware'],
      visualHints: ['use expressive color', 'make modules shareable', 'allow variation'],
      contentHints: ['turn behavior into insights', 'create recurring moments', 'invite sharing'],
      positioningPrompt: 'What personal signal can become a useful or shareable brand moment?',
    },
  },
  {
    id: 'ikea',
    name: 'IKEA',
    logoSrc: '/images/brand-library/ikea.png',
    logoAlt: 'IKEA logo reference',
    category: 'retail',
    region: 'global',
    maturity: 'heritage',
    archetype: 'Accessible Everyday',
    positioning: 'Makes functional design feel attainable for everyday homes and everyday budgets.',
    audience: 'Households, students, families, and practical buyers who want useful design without luxury pricing.',
    voice: ['practical', 'friendly', 'optimistic', 'clear'],
    visualDirection: ['room scenes', 'functional layouts', 'bright retail energy', 'modular product systems'],
    contentPillars: ['small-space solutions', 'affordable design', 'home routines', 'assembly and utility'],
    strengths: ['Clear usefulness', 'Strong price-value story', 'Room-level inspiration'],
    watchouts: ['Low-price positioning needs quality reassurance', 'Too much catalog logic can feel impersonal'],
    applyToCreateFlow: {
      toneHints: ['useful', 'friendly', 'plain'],
      visualHints: ['show products in context', 'use practical layouts', 'make benefits scannable'],
      contentHints: ['solve everyday problems', 'show before and after', 'make value concrete'],
      positioningPrompt: 'What everyday problem can the brand solve in a more accessible way?',
    },
  },
  {
    id: 'muji',
    name: 'MUJI',
    logoSrc: '/images/brand-library/muji.png',
    logoAlt: 'MUJI logo reference',
    category: 'lifestyle',
    region: 'japan',
    maturity: 'heritage',
    archetype: 'Premium Simplifier',
    positioning: 'Uses restraint, simplicity, and material honesty to make everyday objects feel calm and useful.',
    audience: 'Minimalist buyers, home organizers, students, and professionals who value quiet function over visible status.',
    voice: ['restrained', 'plain', 'calm', 'functional'],
    visualDirection: ['minimal packaging', 'natural materials', 'soft neutrals', 'quiet product grids'],
    contentPillars: ['everyday utility', 'materials', 'organization', 'calm routines'],
    strengths: ['Anti-noise differentiation', 'Clear material honesty', 'Strong system consistency'],
    watchouts: ['Restraint can feel too quiet in crowded categories', 'Minimalism needs a clear reason to choose'],
    applyToCreateFlow: {
      toneHints: ['calm', 'simple', 'unforced'],
      visualHints: ['use restrained color', 'show material details', 'remove decorative excess'],
      contentHints: ['explain purpose simply', 'show repeated daily use', 'avoid hype'],
      positioningPrompt: 'What can the brand remove to make the customer experience clearer?',
    },
  },
  {
    id: 'uniqlo',
    name: 'Uniqlo',
    logoSrc: '/images/brand-library/uniqlo.png',
    logoAlt: 'Uniqlo logo reference',
    category: 'fashion-beauty',
    region: 'japan',
    maturity: 'heritage',
    archetype: 'Accessible Everyday',
    positioning: 'Positions clothing as functional life infrastructure: simple, reliable, and made for daily use.',
    audience: 'Everyday shoppers, commuters, families, and professionals who want dependable basics with useful innovation.',
    voice: ['functional', 'clear', 'universal', 'practical'],
    visualDirection: ['clean product grids', 'lifestyle basics', 'seasonal utility', 'simple color systems'],
    contentPillars: ['LifeWear utility', 'material innovation', 'seasonal function', 'wardrobe basics'],
    strengths: ['Accessible functional promise', 'Clear product benefit language', 'Broad audience fit'],
    watchouts: ['Universal positioning can flatten personality', 'Innovation claims need simple proof'],
    applyToCreateFlow: {
      toneHints: ['practical', 'clean', 'benefit-first'],
      visualHints: ['show everyday use', 'use simple product composition', 'highlight function'],
      contentHints: ['connect features to daily routines', 'explain material benefits plainly'],
      positioningPrompt: 'How does the brand become part of the customer’s daily operating system?',
    },
  },
  {
    id: 'glossier',
    name: 'Glossier',
    logoSrc: '/images/brand-library/glossier.png',
    logoAlt: 'Glossier logo reference',
    category: 'fashion-beauty',
    region: 'us',
    maturity: 'digital-native',
    archetype: 'Culture Creator',
    positioning: 'Builds beauty around community input, real routines, and a friendly point of view.',
    audience: 'Beauty buyers who want approachable products, social proof, and identity-led self-expression.',
    voice: ['conversational', 'friendly', 'community-led', 'fresh'],
    visualDirection: ['soft color accents', 'real-skin imagery', 'social-first composition', 'simple packaging'],
    contentPillars: ['community routines', 'product education', 'user proof', 'beauty identity'],
    strengths: ['Community-to-product loop', 'Accessible voice', 'Strong social proof mechanics'],
    watchouts: ['Community language must stay authentic', 'Soft aesthetic can be copied easily'],
    applyToCreateFlow: {
      toneHints: ['friendly', 'direct', 'low-pressure'],
      visualHints: ['show real usage', 'use softer contrast', 'make content social-native'],
      contentHints: ['ask customers what they need', 'feature routines', 'turn proof into conversation'],
      positioningPrompt: 'How can the brand make customers feel heard before it sells?',
    },
  },
  {
    id: 'tesla',
    name: 'Tesla',
    logoSrc: '/images/brand-library/tesla.png',
    logoAlt: 'Tesla logo reference',
    category: 'technology',
    region: 'us',
    maturity: 'scale-up',
    archetype: 'Premium Simplifier',
    positioning: 'Reframes mobility and energy as software-led, future-facing systems rather than conventional products.',
    audience: 'Early adopters, technology buyers, performance seekers, and sustainability-curious households.',
    voice: ['future-forward', 'technical', 'bold', 'direct'],
    visualDirection: ['minimal product focus', 'high-contrast surfaces', 'system diagrams', 'performance cues'],
    contentPillars: ['technology shift', 'performance', 'energy ecosystem', 'future infrastructure'],
    strengths: ['Category reframing', 'Strong founder-led narrative', 'Hardware-software integration story'],
    watchouts: ['Bold claims require strong evidence', 'Polarizing voice may not fit trust-sensitive brands'],
    applyToCreateFlow: {
      toneHints: ['direct', 'ambitious', 'technical but clear'],
      visualHints: ['show systems', 'show product precision', 'use future-oriented context'],
      contentHints: ['explain category change', 'connect product to a bigger system'],
      positioningPrompt: 'What old category assumption should this brand challenge?',
    },
  },
  {
    id: 'lego',
    name: 'Lego',
    logoSrc: '/images/brand-library/lego.png',
    logoAlt: 'Lego logo reference',
    category: 'creator-media',
    region: 'europe',
    maturity: 'heritage',
    archetype: 'Culture Creator',
    positioning: 'Turns modular play into imagination, learning, collecting, and cross-generation creativity.',
    audience: 'Children, parents, collectors, educators, and fans who value creativity with tangible structure.',
    voice: ['imaginative', 'optimistic', 'clear', 'family-friendly'],
    visualDirection: ['bright modular color', 'play scenes', 'build steps', 'character worlds'],
    contentPillars: ['imagination', 'learning', 'fan creations', 'collectible worlds'],
    strengths: ['Modularity creates endless stories', 'Strong intergenerational appeal', 'Play and learning combine naturally'],
    watchouts: ['Playful brands still need structure', 'Licensing-style worlds can distract from core promise'],
    applyToCreateFlow: {
      toneHints: ['optimistic', 'clear', 'imaginative'],
      visualHints: ['show modular parts', 'show creation process', 'use playful color with order'],
      contentHints: ['invite participation', 'show what customers can build', 'create repeatable worlds'],
      positioningPrompt: 'What can customers combine, customize, or build with the brand?',
    },
  },
  {
    id: 'starbucks',
    name: 'Starbucks',
    logoSrc: '/images/brand-library/starbucks.png',
    logoAlt: 'Starbucks logo reference',
    category: 'hospitality',
    region: 'global',
    maturity: 'heritage',
    archetype: 'Accessible Everyday',
    positioning: 'Makes coffee a daily ritual, a familiar place, and a loyalty-driven habit.',
    audience: 'Routine-driven coffee buyers, commuters, remote workers, and social consumers who value familiarity and convenience.',
    voice: ['warm', 'familiar', 'seasonal', 'ritual-led'],
    visualDirection: ['warm interiors', 'seasonal cues', 'cup moments', 'menu-led hierarchy'],
    contentPillars: ['daily ritual', 'seasonal launches', 'loyalty moments', 'third-place experience'],
    strengths: ['Habit formation', 'Seasonal product rhythm', 'Accessible premium cueing'],
    watchouts: ['Ritual language can become repetitive', 'Scale can make warmth feel standardized'],
    applyToCreateFlow: {
      toneHints: ['warm', 'familiar', 'steady'],
      visualHints: ['show repeatable rituals', 'use seasonal accents', 'show customer moments'],
      contentHints: ['create recurring reasons to return', 'connect offers to rituals'],
      positioningPrompt: 'What repeatable ritual can the brand own in the customer’s life?',
    },
  },
];

export function buildBrandReferenceLibrary() {
  return brandReferenceProfiles;
}

export function getBrandReferenceProfile(id?: string) {
  if (!id) return brandReferenceProfiles[0];
  return brandReferenceProfiles.find((profile) => profile.id === id) || brandReferenceProfiles[0];
}

export function filterBrandReferenceProfiles(
  query: string,
  category: BrandReferenceCategory | 'all' = 'all',
  filters: {
    region?: BrandReferenceRegion | 'all';
    maturity?: BrandReferenceMaturity | 'all';
  } = {},
) {
  const normalizedQuery = query.trim().toLowerCase();
  const region = filters.region ?? 'all';
  const maturity = filters.maturity ?? 'all';

  return brandReferenceProfiles.filter((profile) => {
    const matchesCategory = category === 'all' || profile.category === category;
    const matchesRegion = region === 'all' || profile.region === region;
    const matchesMaturity = maturity === 'all' || profile.maturity === maturity;
    const searchable = [
      profile.name,
      profile.category,
      brandReferenceCategoryLabels[profile.category],
      profile.region,
      brandReferenceRegionLabels[profile.region],
      profile.maturity,
      brandReferenceMaturityLabels[profile.maturity],
      profile.archetype,
      profile.positioning,
      profile.audience,
      ...profile.voice,
      ...profile.visualDirection,
      ...profile.contentPillars,
      ...profile.strengths,
    ].join(' ').toLowerCase();
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

    return matchesCategory && matchesRegion && matchesMaturity && matchesQuery;
  });
}
