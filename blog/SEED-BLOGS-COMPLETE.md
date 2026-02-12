# Seed Blogs — Delivery Summary

**Status:** ✅ Complete
**Date:** 2026-02-06
**Author:** Subagent blog-seed-writer

---

## Deliverables

### 1. Style Guide ✅
**File:** `blog/STYLE-GUIDE.md`
- Blogger persona ("SkillShield Research Team")
- Voice do's/don'ts with examples
- SEO checklist (pre-write, structure, content, technical)
- Post template with frontmatter schema
- Keyword universe (primary, long-tail, branded)
- Image guidelines
- Internal linking strategy with cross-linking map
- Quality gate (4-point test: so what?, citation, action, cringe)

### 2. Blog Posts ✅ (6 of 6)

All posts saved to `blog/posts/`:

| # | File | Title | Words | Target Keyword |
|---|------|-------|-------|---------------|
| 1 | `we-scanned-1676-skills.md` | We Scanned 1,676 AI Agent Skills. Here's What We Found. | ~1,700 | AI agent security |
| 2 | `clawhub-crisis.md` | The ClawHub Crisis: Why 32% of Skills Want Your SSH Keys | ~1,800 | ClawHub malicious skills |
| 3 | `anatomy-malicious-skill.md` | Anatomy of a Malicious Skill: How Fake Crypto Tools Steal Your Wallet | ~1,900 | malicious AI skills |
| 4 | `owasp-top-10-ai-agents.md` | OWASP's Top 10 for AI Agents: What Every Developer Needs to Know | ~2,000 | OWASP agentic AI |
| 5 | `prompt-injection-wild.md` | Prompt Injection in the Wild: How Hidden Instructions Hijack Agents | ~2,000 | prompt injection attack |
| 6 | `how-to-vet-ai-skill.md` | How to Vet an AI Skill Before Installing It (A Security Checklist) | ~1,900 | AI skill security checklist |

**Quality checklist (all posts):**
- ✅ SEO frontmatter (title, slug, date, author, description, keywords, image)
- ✅ Primary keyword in H1, meta description, first paragraph
- ✅ H2/H3 structure (every 200-400 words)
- ✅ At least 3 external citations with links per post
- ✅ At least 2 internal links per post (cross-linked web)
- ✅ Data-driven (specific numbers from our scans + external sources)
- ✅ Actionable conclusion with CTA to skillshield.dev
- ✅ Dry humor present but not forced
- ✅ No AI slop phrases
- ✅ "Related reading" footer with internal links

**Sources cited across posts:**
- Open Source For U — ClawHub breach coverage
- Cisco AI Security Blog — "OpenClaw is a security nightmare"
- Vectra AI — Moltbook agent community attacks
- Kiteworks — Moltbook enterprise data protection
- Human Security — OWASP Top 10 for Agentic Applications
- Guardz — Agentic AI attack trends (54% stat)
- eSecurity Planet — AI threats 2026 playbook
- DarkTrace — State of AI Cybersecurity 2026
- Protecto.ai — Salesforce Agentforce "ForcedLeak"
- Socket.dev — Software supply chain security

**Internal linking map (implemented):**
```
we-scanned-1676 ←→ clawhub-crisis ←→ anatomy-malicious
     ↕                    ↕                  ↕
 how-to-vet    ←→   owasp-top-10   ←→  prompt-injection
```
All posts link to at least 2 others. No orphan posts.

### 3. Pipeline Architecture ✅
**File:** `blog/PIPELINE-ARCHITECTURE.md`
- Full architecture diagram (ASCII)
- 14 RSS feeds listed with exact URLs
- Reddit API integration (free tier, 6 subreddits)
- Hacker News API integration
- X/Twitter: documented as blocked ($200/mo), recommended Grok API as future alternative
- Content generation flow with code samples (filter → dedup → generate → image → review → publish)
- Worker code structure (directory tree, wrangler.toml, entry point, cron handler)
- D1 schema (3 tables: blog_posts, processed_sources, pipeline_runs)
- Blog serving strategy (KV-served MVP, static build future)
- Telegram review/approval workflow
- Cost analysis: ~$3-5/mo total
- MVP vs Phase 2 vs Phase 3 scope
- 7-day implementation timeline

---

## Recommended Next Steps

1. **Publish seed posts** — Load the 6 posts into the site (manually or via KV)
2. **Generate hero images** — Use Unsplash/DALL-E for each post's hero image
3. **Build the blog Worker** — Follow PIPELINE-ARCHITECTURE.md, ~1 week build
4. **SEO setup** — Submit sitemap to Google Search Console, set up Cloudflare Web Analytics
5. **Social distribution** — Share flagship post ("We Scanned 1,676 Skills") on relevant Reddit subs and HN
