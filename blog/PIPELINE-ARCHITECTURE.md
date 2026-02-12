# SkillShield Blog Pipeline — Technical Architecture

## Overview

Automated daily blog content pipeline for skillshield.dev, built entirely on Cloudflare infrastructure. The system monitors security news sources, filters for AI agent/skill relevance, generates blog posts, queues them for review, and publishes to the site.

**Target cadence:** 1 post per day, published at ~08:00 UTC
**Hosting:** Cloudflare Pages (part of the existing skillshield.dev deployment)
**Runtime:** Cloudflare Workers (cron trigger + API routes)
**Storage:** Cloudflare KV (content) + D1 (metadata/tracking)

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     CRON TRIGGER (08:00 UTC)                     │
│                    Cloudflare Worker Schedule                     │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SOURCE MONITORING LAYER                        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ RSS Feeds│  │Reddit API│  │Google    │  │ Hacker News   │   │
│  │ (Cisco,  │  │(free tier│  │News RSS  │  │ API           │   │
│  │ Vectra,  │  │r/cyber,  │  │          │  │               │   │
│  │ OWASP..) │  │r/AI...)  │  │          │  │               │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘   │
│       └──────────────┴────────────┴───────────────┘             │
│                           │                                      │
│                           ▼                                      │
│               ┌───────────────────────┐                          │
│               │  Relevance Filter     │                          │
│               │  (keyword + semantic) │                          │
│               └───────────┬───────────┘                          │
│                           │                                      │
│                           ▼                                      │
│               ┌───────────────────────┐                          │
│               │  Deduplication        │                          │
│               │  (D1 hash store)      │                          │
│               └───────────┬───────────┘                          │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CONTENT GENERATION LAYER                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LLM API (Claude Sonnet via Anthropic API)               │   │
│  │  • Source article(s) as context                          │   │
│  │  • Blog style guide as system prompt                     │   │
│  │  • SEO keyword targeting                                 │   │
│  │  • Internal linking to existing posts                    │   │
│  └─────────────────────┬────────────────────────────────────┘   │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Image Sourcing                                          │   │
│  │  • Unsplash API (free, commercial license)               │   │
│  │  • DALL-E / Kimi (custom hero images for flagships)      │   │
│  │  • SkillShield brand overlay                             │   │
│  └─────────────────────┬────────────────────────────────────┘   │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    REVIEW & PUBLISH LAYER                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Review Queue (D1 + KV)                                  │   │
│  │  • Status: draft → review → approved → published         │   │
│  │  • Manual approval via admin endpoint or Telegram bot    │   │
│  └─────────────────────┬────────────────────────────────────┘   │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Publish to Cloudflare Pages                             │   │
│  │  • Write markdown to KV                                  │   │
│  │  • Trigger static build (or serve from KV via Worker)    │   │
│  │  • Update sitemap.xml and RSS feed                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Source Monitoring — RSS Feeds

### Security Research Blogs

| Source | RSS Feed URL | Relevance |
|--------|-------------|-----------|
| Cisco Talos Blog | `https://blog.talosintelligence.com/rss/` | AI agent threats, malware analysis |
| Cisco AI Security | `https://blogs.cisco.com/ai/feed` | Direct AI agent security coverage |
| Vectra AI Blog | `https://www.vectra.ai/blog/rss.xml` | Agent community attacks (Moltbook) |
| DarkTrace Blog | `https://www.darktrace.com/blog/rss` | AI cybersecurity trends |
| OWASP Blog | `https://owasp.org/feed.xml` | Standards, top 10 updates |
| Human Security | `https://www.humansecurity.com/learn/blog/rss` | Bot/agent abuse |
| eSecurity Planet | `https://www.esecurityplanet.com/feed/` | AI threat landscape |
| Guardz Blog | `https://guardz.com/blog/feed/` | SMB AI security |
| Socket.dev Blog | `https://socket.dev/blog/feed` | Supply chain attacks (npm/PyPI parallel) |
| Protecto.ai Blog | `https://www.protecto.ai/blog/feed` | AI agent risks, excessive agency |
| Kiteworks Blog | `https://www.kiteworks.com/feed/` | Enterprise data protection |
| Snyk Blog | `https://snyk.io/blog/feed/` | Supply chain security |
| Trail of Bits | `https://blog.trailofbits.com/feed/` | Security research |
| Wiz Blog | `https://www.wiz.io/blog/rss.xml` | Cloud + AI security |

### General Tech/Security News (RSS)

| Source | RSS Feed URL | Notes |
|--------|-------------|-------|
| Google News (AI security) | `https://news.google.com/rss/search?q=AI+agent+security` | Broad coverage |
| Google News (prompt injection) | `https://news.google.com/rss/search?q=prompt+injection+attack` | Specific topic |
| Google News (AI supply chain) | `https://news.google.com/rss/search?q=AI+supply+chain+attack` | Specific topic |
| The Hacker News | `https://feeds.feedburner.com/TheHackersNews` | General infosec |
| BleepingComputer | `https://www.bleepingcomputer.com/feed/` | Security news |
| Krebs on Security | `https://krebsonsecurity.com/feed/` | Investigation-style |

---

## Source Monitoring — APIs

### Reddit API (Free Tier)

**Access:** OAuth2 app (script type), free tier
**Rate limit:** 100 requests per minute (more than sufficient)
**Cost:** Free for non-commercial use (blog content qualifies)

**Subreddits to monitor:**
- `r/cybersecurity` — general infosec discussion
- `r/artificial` — AI community
- `r/OpenClaw` — direct ecosystem monitoring
- `r/netsec` — technical security research
- `r/MachineLearning` — AI research with security implications
- `r/AIAgents` — emerging community

**Query strategy:**
```
Search: "AI agent" OR "prompt injection" OR "malicious plugin" OR "skill security" OR "agent marketplace"
Sort: relevance, past 24h
Limit: 25 per subreddit
```

### Hacker News API

**Access:** Public, no auth required
**Endpoint:** `https://hacker-news.firebaseio.com/v0/`
**Cost:** Free
**Rate limit:** Generous, no documented limit

**Strategy:**
- Fetch top/new stories
- Filter by title keywords: "AI agent," "prompt injection," "supply chain," "plugin security," "LLM"
- Check comment count (high-comment stories = community interest)
- Fetch and analyze linked article if relevant

### X/Twitter — BLOCKED (MVP Skip)

**Problem:** X API Basic tier costs $200/month for 15,000 reads. Free tier is 100 reads/day — useless for monitoring.

**Recommendation for MVP:** Skip X entirely. The sources above provide comprehensive coverage.

**Future option — Grok API:**
When available and priced competitively, Grok API can serve as a proxy for X/Twitter content since it has native access to X data. Monitor pricing; if it's materially cheaper than $200/mo, integrate as a secondary source.

**Alternative workaround:** Nitter RSS feeds (if still operational) or manual curation of key accounts into an RSS-compatible format.

---

## Content Generation Flow

### Step 1: Source Collection (Daily, 08:00 UTC)

```javascript
async function collectSources(env) {
  const sources = await Promise.allSettled([
    fetchRSSFeeds(env.RSS_FEEDS),        // All RSS feeds in parallel
    fetchRedditPosts(env.REDDIT_TOKEN),   // Reddit API
    fetchHackerNews(),                     // HN API
  ]);
  
  return flattenResults(sources);
}
```

### Step 2: Relevance Filtering

Two-stage filter to avoid wasting LLM calls:

**Stage 1 — Keyword filter (fast, free):**
```javascript
const RELEVANCE_KEYWORDS = [
  'ai agent', 'prompt injection', 'malicious skill', 'malicious plugin',
  'agent marketplace', 'supply chain attack', 'ai security',
  'agentic ai', 'tool poisoning', 'credential theft',
  'openclaw', 'clawhub', 'moltbook', 'autogpt',
  'llm security', 'ai plugin', 'mcp server', 'agent framework',
  'owasp agentic', 'reverse shell', 'data exfiltration'
];

function keywordFilter(articles) {
  return articles.filter(article => {
    const text = `${article.title} ${article.summary}`.toLowerCase();
    return RELEVANCE_KEYWORDS.some(kw => text.includes(kw));
  });
}
```

**Stage 2 — LLM relevance check (cheap, batch):**
```javascript
async function semanticFilter(articles, env) {
  // Batch all titles+summaries into a single LLM call
  const prompt = `Rate each article 1-10 for relevance to AI agent security, 
    skill/plugin marketplace security, and supply chain attacks. 
    Return only articles scoring ≥ 7.`;
  
  // Use Sonnet for cost efficiency
  return await callLLM(env.ANTHROPIC_KEY, 'claude-sonnet', prompt, articles);
}
```

### Step 3: Deduplication

```sql
-- D1 schema for tracking processed sources
CREATE TABLE processed_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url_hash TEXT UNIQUE NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  blog_post_id TEXT  -- NULL if filtered out, post ID if used
);

CREATE INDEX idx_url_hash ON processed_sources(url_hash);
CREATE INDEX idx_processed_at ON processed_sources(processed_at);
```

```javascript
async function deduplicate(articles, db) {
  const newArticles = [];
  for (const article of articles) {
    const hash = await sha256(article.url);
    const existing = await db.prepare(
      'SELECT 1 FROM processed_sources WHERE url_hash = ?'
    ).bind(hash).first();
    
    if (!existing) {
      newArticles.push(article);
      await db.prepare(
        'INSERT INTO processed_sources (url_hash, source_url, title) VALUES (?, ?, ?)'
      ).bind(hash, article.url, article.title).run();
    }
  }
  return newArticles;
}
```

### Step 4: Content Generation

```javascript
async function generatePost(sourceArticles, env) {
  const styleGuide = await env.KV.get('blog:style-guide');
  const existingPosts = await env.KV.list({ prefix: 'blog:post:' });
  
  const prompt = `You are the SkillShield Research Team blog writer.
    
${styleGuide}

SOURCE ARTICLES:
${sourceArticles.map(a => `- ${a.title}: ${a.summary}\n  URL: ${a.url}`).join('\n')}

EXISTING POSTS (for internal linking):
${existingPosts.keys.map(k => `- ${k.name}`).join('\n')}

Write a 1200-2000 word blog post based on these sources. Follow the style guide exactly.
Include internal links to relevant existing posts.
Return JSON: { title, slug, description, keywords, content (markdown) }`;

  return await callLLM(env.ANTHROPIC_KEY, 'claude-sonnet-4-5', prompt);
}
```

### Step 5: Image Sourcing

```javascript
async function sourceImage(post, env) {
  // Try Unsplash first (free)
  const query = extractImageQuery(post.keywords);
  const unsplashResult = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${env.UNSPLASH_KEY}` } }
  );
  
  if (unsplashResult.ok) {
    const data = await unsplashResult.json();
    if (data.results.length > 0) {
      const image = data.results[0];
      return {
        url: image.urls.regular,
        alt: `${post.title} - ${image.alt_description}`,
        credit: `Photo by ${image.user.name} on Unsplash`
      };
    }
  }
  
  // Fallback: DALL-E for custom hero
  // (only for high-priority posts — costs ~$0.04/image)
  return await generateCustomImage(post, env);
}
```

### Step 6: Review Queue

```javascript
async function queueForReview(post, env) {
  const id = crypto.randomUUID();
  
  // Store in KV
  await env.KV.put(`blog:draft:${id}`, JSON.stringify(post));
  
  // Track in D1
  await env.DB.prepare(`
    INSERT INTO blog_posts (id, title, slug, status, created_at, source_urls)
    VALUES (?, ?, ?, 'draft', datetime('now'), ?)
  `).bind(id, post.title, post.slug, JSON.stringify(post.sourceUrls)).run();
  
  // Notify via Telegram (or webhook)
  await notifyReviewer(post, id, env);
  
  return id;
}
```

---

## Worker Code Structure

```
skillshield-blog-worker/
├── src/
│   ├── index.ts              # Main worker entry point
│   ├── cron.ts               # Scheduled handler (daily pipeline)
│   ├── routes/
│   │   ├── blog.ts           # GET /blog, GET /blog/:slug
│   │   ├── admin.ts          # POST /admin/approve, /admin/reject
│   │   ├── rss.ts            # GET /blog/feed.xml
│   │   └── sitemap.ts        # GET /sitemap.xml
│   ├── sources/
│   │   ├── rss.ts            # RSS feed fetcher + parser
│   │   ├── reddit.ts         # Reddit API client
│   │   ├── hackernews.ts     # HN API client
│   │   └── index.ts          # Source aggregator
│   ├── pipeline/
│   │   ├── filter.ts         # Keyword + semantic filtering
│   │   ├── dedup.ts          # Deduplication logic
│   │   ├── generate.ts       # LLM content generation
│   │   ├── images.ts         # Image sourcing (Unsplash + DALL-E)
│   │   └── publish.ts        # KV/Pages publishing
│   ├── llm/
│   │   └── client.ts         # Anthropic API client
│   └── utils/
│       ├── hash.ts           # SHA-256 helpers
│       └── markdown.ts       # Markdown processing
├── wrangler.toml
├── package.json
└── tsconfig.json
```

### wrangler.toml

```toml
name = "skillshield-blog"
main = "src/index.ts"
compatibility_date = "2026-02-01"

[triggers]
crons = ["0 8 * * *"]  # Daily at 08:00 UTC

[[kv_namespaces]]
binding = "KV"
id = "<kv-namespace-id>"

[[d1_databases]]
binding = "DB"
database_name = "skillshield-blog"
database_id = "<d1-database-id>"

[vars]
SITE_URL = "https://skillshield.dev"
BLOG_PATH = "/blog"

# Secrets (set via wrangler secret put):
# ANTHROPIC_KEY
# UNSPLASH_KEY
# REDDIT_CLIENT_ID
# REDDIT_CLIENT_SECRET
# TELEGRAM_BOT_TOKEN
# TELEGRAM_CHAT_ID
```

### Main Worker Entry Point

```typescript
// src/index.ts
import { handleBlogRoutes } from './routes/blog';
import { handleAdminRoutes } from './routes/admin';
import { handleRSS } from './routes/rss';
import { handleSitemap } from './routes/sitemap';
import { runDailyPipeline } from './cron';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith('/blog/feed'))
      return handleRSS(request, env);
    if (url.pathname.startsWith('/blog/admin'))
      return handleAdminRoutes(request, env);
    if (url.pathname === '/sitemap.xml')
      return handleSitemap(request, env);
    if (url.pathname.startsWith('/blog'))
      return handleBlogRoutes(request, env);
    
    return new Response('Not found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDailyPipeline(env));
  }
};
```

### Cron Handler

```typescript
// src/cron.ts
import { collectSources } from './sources';
import { filterRelevant } from './pipeline/filter';
import { deduplicate } from './pipeline/dedup';
import { generatePost } from './pipeline/generate';
import { sourceImage } from './pipeline/images';
import { queueForReview } from './pipeline/publish';

export async function runDailyPipeline(env: Env) {
  console.log('[Pipeline] Starting daily run');
  
  // 1. Collect from all sources
  const rawArticles = await collectSources(env);
  console.log(`[Pipeline] Collected ${rawArticles.length} raw articles`);
  
  // 2. Filter for relevance
  const relevant = await filterRelevant(rawArticles, env);
  console.log(`[Pipeline] ${relevant.length} relevant articles`);
  
  // 3. Deduplicate against processed history
  const fresh = await deduplicate(relevant, env.DB);
  console.log(`[Pipeline] ${fresh.length} new articles after dedup`);
  
  if (fresh.length === 0) {
    console.log('[Pipeline] No new material. Skipping generation.');
    return;
  }
  
  // 4. Select best cluster for today's post
  const selectedSources = selectBestCluster(fresh, 3); // Top 3 related articles
  
  // 5. Generate blog post
  const post = await generatePost(selectedSources, env);
  console.log(`[Pipeline] Generated: "${post.title}"`);
  
  // 6. Source hero image
  const image = await sourceImage(post, env);
  post.image = image;
  
  // 7. Queue for review
  const postId = await queueForReview(post, env);
  console.log(`[Pipeline] Queued for review: ${postId}`);
  
  return postId;
}
```

---

## Blog Serving Strategy

### Option A: KV-Served (Recommended for MVP)

Blog posts stored in KV, served by the Worker. Simpler deployment, no build step.

```typescript
// Serve published posts from KV
async function serveBlogPost(slug: string, env: Env): Promise<Response> {
  const post = await env.KV.get(`blog:published:${slug}`, 'json');
  if (!post) return new Response('Not found', { status: 404 });
  
  const html = renderBlogPost(post); // Markdown → HTML with template
  return new Response(html, {
    headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' }
  });
}
```

### Option B: Static Build (Future)

When post volume grows, switch to static generation:
- Worker writes markdown files to R2
- Triggers a Pages build via API
- Pages serves the static HTML
- Better caching, lower compute costs

---

## Review & Approval Workflow

### Telegram Notification

When a post is generated, send a preview to the admin Telegram chat:

```typescript
async function notifyReviewer(post: Post, id: string, env: Env) {
  const message = `📝 *New Blog Post Draft*\n\n` +
    `*Title:* ${post.title}\n` +
    `*Keywords:* ${post.keywords.join(', ')}\n` +
    `*Sources:* ${post.sourceUrls.length} articles\n\n` +
    `Preview: ${env.SITE_URL}/blog/admin/preview/${id}\n\n` +
    `Reply with:\n` +
    `/approve ${id}\n` +
    `/reject ${id} [reason]`;
  
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    })
  });
}
```

### Admin Endpoints

```typescript
// POST /blog/admin/approve/:id
// POST /blog/admin/reject/:id
// GET  /blog/admin/preview/:id
// GET  /blog/admin/queue  (list all drafts)
```

---

## Cost Analysis (Monthly)

| Component | Cost | Notes |
|-----------|------|-------|
| Cloudflare Worker | Free tier | 100K requests/day |
| Cloudflare KV | Free tier | 100K reads, 1K writes/day |
| Cloudflare D1 | Free tier | 5M rows read, 100K writes/day |
| Anthropic API (Sonnet) | ~$3-5/mo | ~30 posts × ~4K tokens each |
| Unsplash API | Free | 50 req/hour |
| Reddit API | Free | Non-commercial |
| Hacker News API | Free | No auth needed |
| **Total** | **~$3-5/mo** | Almost entirely LLM cost |

---

## D1 Schema

```sql
-- Blog posts metadata
CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  keywords TEXT,  -- JSON array
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, review, approved, published, rejected
  source_urls TEXT,  -- JSON array
  image_url TEXT,
  image_alt TEXT,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status ON blog_posts(status);
CREATE INDEX idx_slug ON blog_posts(slug);
CREATE INDEX idx_published_at ON blog_posts(published_at);

-- Processed source tracking (dedup)
CREATE TABLE processed_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url_hash TEXT UNIQUE NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  blog_post_id TEXT REFERENCES blog_posts(id)
);

CREATE INDEX idx_url_hash ON processed_sources(url_hash);

-- Pipeline run log
CREATE TABLE pipeline_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  articles_collected INTEGER DEFAULT 0,
  articles_relevant INTEGER DEFAULT 0,
  articles_new INTEGER DEFAULT 0,
  post_generated BOOLEAN DEFAULT FALSE,
  post_id TEXT REFERENCES blog_posts(id),
  error TEXT
);
```

---

## MVP Scope vs Future

### MVP (Build Now)
- [x] RSS feed monitoring (top 10 feeds)
- [x] Keyword filtering
- [x] Deduplication
- [x] LLM content generation (Sonnet)
- [x] Unsplash image sourcing
- [x] KV-served blog posts
- [x] Telegram review notifications
- [x] Admin approve/reject endpoints
- [x] RSS feed output (`/blog/feed.xml`)
- [x] Sitemap generation

### Phase 2 (Next)
- [ ] Reddit API integration
- [ ] Hacker News monitoring
- [ ] Semantic relevance filtering (LLM-based)
- [ ] Custom DALL-E hero images for flagship posts
- [ ] Static build pipeline (Pages)
- [ ] Analytics integration (Cloudflare Web Analytics, free)

### Phase 3 (Future)
- [ ] Grok API integration for X/Twitter monitoring (when pricing is competitive)
- [ ] Multi-post generation (topic clusters)
- [ ] A/B testing headlines
- [ ] Automated social sharing (Telegram channel, LinkedIn)
- [ ] Community contributions / guest posts
- [ ] Newsletter integration (Buttondown or Resend)

---

## Implementation Timeline

| Day | Deliverable |
|-----|-------------|
| 1 | D1 schema, KV setup, Worker scaffold, wrangler.toml |
| 2 | RSS feed fetcher, keyword filter, dedup logic |
| 3 | LLM integration (Sonnet), content generation prompt |
| 4 | Image sourcing (Unsplash), blog template renderer |
| 5 | Admin routes, Telegram notifications, review flow |
| 6 | Blog serving (KV → HTML), RSS feed output, sitemap |
| 7 | Testing, deploy, seed blog posts loaded into KV |

**Total estimated build time: 1 week**
