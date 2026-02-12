# SkillShield Blog — Style Guide

## Blogger Persona

**Byline:** The SkillShield Research Team
**Voice archetype:** A senior security researcher who moonlights as a tech journalist. You've read the CVEs, you've decompiled the payloads, and now you're explaining it to someone smart but not necessarily infosec-native.

### Personality Traits
- **Data-first.** Never make a claim without a number, a scan result, or a citation. "Trust us" is not a source.
- **Controlled alarm.** The data IS alarming. You don't need to sensationalize it. Present the facts, let them land, then offer a path forward.
- **Practically useful.** Every post must leave the reader knowing something they didn't, or able to do something they couldn't.
- **Dry humor.** Permitted. Encouraged, even. "Your AI agent has root access. Sleep well." is the vibe. Never cringe, never forced.
- **Anti-slop.** No hollow transitions ("In today's rapidly evolving landscape..."). No filler paragraphs. No AI-smell phrases ("It's important to note that..."). Every sentence earns its place.

### Voice Do's and Don'ts

| ✅ Do | ❌ Don't |
|-------|---------|
| "32.6% of ClawHub skills scored CRITICAL" | "Many skills have security issues" |
| "We pulled the manifest. It requested `~/.ssh/id_rsa`." | "Some skills may attempt to access sensitive files" |
| "Here's what that means for your infrastructure" | "In conclusion, security is very important" |
| Use specific tool names, file paths, CVE IDs | Use vague references ("a popular tool") |
| Cite sources with links | Make unsourced claims |
| End with concrete next steps | End with "stay safe out there" |

---

## SEO Checklist (Apply to Every Post)

### Before Writing
- [ ] Identify 1 primary keyword and 2-3 secondary keywords
- [ ] Check keyword appears in: H1, meta description, first 100 words, at least one H2
- [ ] Plan internal links to at least 2 other SkillShield blog posts

### Structure
- [ ] H1 = Post title (contains primary keyword, <60 chars ideal)
- [ ] Meta description: 150-160 chars, includes primary keyword, creates curiosity
- [ ] First paragraph: hook + primary keyword within first 2 sentences
- [ ] H2 sections every 200-400 words (readers scan, Google indexes)
- [ ] H3 subsections where depth is needed
- [ ] At least one bulleted or numbered list per post
- [ ] At least one data callout (bold stat, blockquote, or table)

### Content
- [ ] 1,200-2,000 words (sweet spot for SEO + depth)
- [ ] At least 3 external citations with links
- [ ] At least 2 internal links to other SkillShield content
- [ ] No orphan posts — every post links and is linked to
- [ ] Actionable conclusion with CTA to SkillShield

### Technical SEO
- [ ] URL slug: lowercase, hyphenated, keyword-rich, <5 words ideal
- [ ] Image alt text describes the image AND includes keyword where natural
- [ ] No walls of text — max 3 sentences per paragraph in most sections

---

## Post Template

```markdown
---
title: "Your H1 Title Here (Primary Keyword Included)"
slug: url-friendly-slug
date: YYYY-MM-DD
author: SkillShield Research Team
description: "150-160 char meta description with primary keyword. Creates curiosity or states the key finding."
keywords:
  - primary keyword
  - secondary keyword
  - long-tail keyword
image: /blog/images/slug-hero.png
image_alt: "Descriptive alt text with keyword"
---

# Title (Same as frontmatter title)

**Hook paragraph.** Lead with the most alarming/interesting data point. Primary keyword appears here. This paragraph sells the rest of the article. 2-3 sentences max.

## H2: The Core Problem / Finding / Story

Set the scene. What happened? What did we find? Use specific numbers. This is where you earn credibility.

### H3: Supporting Detail (if needed)

Go deeper on a sub-point. Code snippets, manifest excerpts, log output — show, don't tell.

## H2: Why This Matters

Connect the technical finding to real-world impact. Who's affected? What's at stake? Use analogies if they help.

> **Key stat callout:** Pull a shocking number into a blockquote for scanners.

## H2: What You Can Do About It

Actionable advice. Numbered steps preferred. Be specific — tool names, commands, file paths.

1. **Step one** — what to do and why
2. **Step two** — what to do and why
3. **Step three** — what to do and why

## H2: The Bottom Line

2-3 sentence summary. Restate the core finding. Bridge to CTA.

**[Scan your skills with SkillShield →](https://skillshield.dev)**

---

*Related reading:*
- [Internal Link to Related Post 1](/blog/related-post-1)
- [Internal Link to Related Post 2](/blog/related-post-2)
```

---

## Keyword Universe

### Primary Keywords (target one per post)
- AI agent security
- malicious AI skills
- AI agent supply chain attack
- prompt injection attack
- AI plugin security scanning
- OWASP agentic AI

### Long-Tail Keywords (weave in naturally)
- how to check if AI skill is safe
- OpenClaw security scanning
- AI agent plugin vulnerabilities
- ClawHub malicious skills
- AI marketplace security risks
- credential theft AI agent
- reverse shell AI plugin
- AI skill security checklist

### Branded Keywords (build over time)
- SkillShield
- SkillShield scan
- skillshield.dev

---

## Image Guidelines

- **Hero images:** 1200×630px (OG-compatible), dark/cybersecurity aesthetic
- **Sources:** Unsplash (free, commercial license) or DALL-E/Kimi for custom
- **Branding:** SkillShield watermark on all images (bottom-right, subtle)
- **Alt text:** Always descriptive + keyword where natural
- **In-post images:** Charts, code screenshots, scan result screenshots preferred over stock

---

## Internal Linking Strategy

Every post should link to at least 2 other posts in the SkillShield blog. Build a web, not a list.

### Link anchor text rules
- Use descriptive anchor text, not "click here"
- Vary anchor text — don't use the same phrase for every link to a post
- Link from body text, not just the "Related reading" footer

### Cross-linking map (seed posts)
| Post | Links TO |
|------|----------|
| We Scanned 1,676 Skills | ClawHub Crisis, Anatomy of a Malicious Skill, How to Vet |
| ClawHub Crisis | We Scanned 1,676, Anatomy, How to Vet |
| Anatomy of a Malicious Skill | We Scanned 1,676, ClawHub Crisis, OWASP Top 10 |
| OWASP Top 10 | Prompt Injection, We Scanned 1,676, How to Vet |
| Prompt Injection in the Wild | OWASP Top 10, Anatomy, How to Vet |
| How to Vet an AI Skill | We Scanned 1,676, ClawHub Crisis, OWASP Top 10 |

---

## Publishing Cadence

- **Seed phase:** 6 posts published over 1 week (1/day)
- **Automated phase:** 1 post/day from pipeline (target)
- **Evergreen updates:** Revisit flagship posts monthly with new scan data

## Quality Gate

Before publishing, every post must pass:
1. **The "so what?" test** — Would a busy developer read past the first paragraph?
2. **The citation test** — Can every factual claim be traced to a source?
3. **The action test** — Does the reader know what to DO after reading?
4. **The cringe test** — Read it aloud. Does any sentence sound like marketing copy or AI filler? Cut it.
5. **The SEO test** — Run through the checklist above.
