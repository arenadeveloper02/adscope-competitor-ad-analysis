import type { AdPlatform, Competitor, CompetitorAd } from '@/lib/types'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function cleanDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
}

const COMPETITOR_SEEDS: Array<{ name: string; domain: string; matchScore: number }> = [
  { name: 'AdVantage Labs', domain: 'advantagelabs.io', matchScore: 94 },
  { name: 'MarketPulse', domain: 'marketpulse.com', matchScore: 89 },
  { name: 'BrandRivals', domain: 'brandrivals.co', matchScore: 82 },
  { name: 'ClickStorm Media', domain: 'clickstorm.io', matchScore: 76 },
  { name: 'FunnelForge', domain: 'funnelforge.app', matchScore: 68 },
]

const PLATFORMS: AdPlatform[] = ['Google Ads', 'Meta', 'LinkedIn', 'TikTok']

const HEADLINES: string[] = [
  'Outrank Every Rival in 30 Days',
  'Stop Guessing. Start Converting.',
  'The Growth Stack Marketers Trust',
  'Your Ads, Supercharged by Data',
  'Turn Clicks Into Loyal Customers',
  'Smarter Campaigns. Bigger Wins.',
]

const COPIES: string[] = [
  'Join 10,000+ teams using real-time insights to cut ad spend by 32% while doubling qualified leads.',
  'Launch high-performing campaigns in minutes with AI-assisted creative and automated A/B testing.',
  'See exactly what your competitors are running — then beat them with data-backed creative decisions.',
  'From first click to closed deal: unify your funnel analytics and grow revenue predictably.',
  'Get a free audit of your ad account and discover the 5 leaks draining your budget today.',
  'Trusted by growth teams at fast-scaling startups. Book a demo and see results in your first week.',
]

export async function fetchCompetitors(domain: string): Promise<Competitor[]> {
  await delay(1500)
  const seedTag = Date.now()
  const cleaned = cleanDomain(domain)
  if (!cleaned) return []
  return COMPETITOR_SEEDS.map((seed, index) => ({
    id: `comp-${seedTag}-${index}`,
    name: seed.name,
    domain: seed.domain,
    matchScore: seed.matchScore,
  }))
}

export async function fetchSingleCompetitor(domain: string): Promise<Competitor | null> {
  await delay(1500)
  const cleaned = cleanDomain(domain)
  if (!cleaned) return null
  const label = cleaned.split('.')[0] ?? cleaned
  const name = label.charAt(0).toUpperCase() + label.slice(1)
  const matchScore = 60 + Math.floor(Math.random() * 36)
  return {
    id: `comp-${Date.now()}-manual`,
    name: `${name} (Manual)`,
    domain: cleaned,
    matchScore,
  }
}

export async function fetchCompetitorAds(
  selectedCompetitorIds: string[],
  competitors: Competitor[]
): Promise<CompetitorAd[]> {
  await delay(1500)
  const ads: CompetitorAd[] = []
  selectedCompetitorIds.forEach((id, cIndex) => {
    const competitor = competitors.find((c) => c.id === id)
    if (!competitor) return
    const adsPerCompetitor = 2
    for (let i = 0; i < adsPerCompetitor; i++) {
      const pick = cIndex * adsPerCompetitor + i
      const headline = HEADLINES[pick % HEADLINES.length] ?? HEADLINES[0]
      const copy = COPIES[pick % COPIES.length] ?? COPIES[0]
      const platform = PLATFORMS[pick % PLATFORMS.length] ?? 'Google Ads'
      ads.push({
        id: `ad-${competitor.id}-${i}`,
        competitorId: competitor.id,
        competitorName: competitor.name,
        headline,
        copy,
        platform,
      })
    }
  })
  return ads
}
