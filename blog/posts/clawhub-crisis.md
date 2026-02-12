---
title: "The ClawHub Crisis: Why 32% of Skills Want Your SSH Keys"
slug: clawhub-crisis
date: 2026-02-06
author: SkillShield Research Team
description: "32.6% of ClawHub skills score CRITICAL for security risk. We analyzed the marketplace and found systematic credential theft, reverse shells, and zero vetting."
keywords:
  - ClawHub malicious skills
  - AI agent security
  - credential theft AI agent
  - OpenClaw security
  - AI marketplace security risks
image: /blog/images/clawhub-crisis-hero.png
image_alt: "ClawHub marketplace with 32.6% CRITICAL security risk overlay"
---

# The ClawHub Crisis: Why 32% of Skills Want Your SSH Keys

**ClawHub is OpenClaw's official community marketplace.** It hosts hundreds of skills that extend what your AI agent can do — from code deployment to database management to crypto trading. It also has a 32.6% CRITICAL security risk rate, the highest of any AI agent marketplace we've tested. Nearly one in three skills on ClawHub is a serious threat to your infrastructure.

We're going to show you exactly what we found, why it's happening, and what ClawHub would need to fix to become a marketplace you can actually trust.

## The Scan Results

As part of our [comprehensive scan of 1,676 AI agent skills](/blog/we-scanned-1676-skills), we analyzed every publicly available skill on ClawHub. The results were worse than any other marketplace by a significant margin.

ClawHub's breakdown:

| Risk Level | Percentage |
|-----------|------------|
| 🔴 CRITICAL | 32.6% |
| 🟠 HIGH | 5.8% |
| 🟡 MEDIUM | 11.3% |
| ✅ LOW | 50.3% |

For comparison, the next-worst marketplace we tested had an 18.2% CRITICAL rate. ClawHub is nearly double.

> **One in three.** If you've installed three skills from ClawHub, statistically one of them is a CRITICAL security risk.

## What They're After

When a skill scores CRITICAL on SkillShield, it's not because of a stylistic concern. It's because the skill exhibits patterns associated with active exploitation. Here's what ClawHub's CRITICAL-rated skills are doing:

### SSH Keys and Cloud Credentials

The single most common pattern: skills that access `~/.ssh/`, `~/.aws/credentials`, `~/.config/gcloud/`, or similar credential stores, then transmit their contents to external servers.

Why SSH keys? Because they're the skeleton key to modern infrastructure. With your SSH private key, an attacker can:

- Access any server you've configured for key-based auth
- Push code to your Git repositories
- Tunnel through bastion hosts into private networks
- Pivot laterally across your entire infrastructure

And unlike a password, you probably don't rotate your SSH keys. Some developers have used the same `id_rsa` for years. One compromised key can unlock an entire career's worth of access.

We found skills that disguise credential access in creative ways:

- **"Backup Helper"** skills that "helpfully" back up your config files — including `.ssh/` and `.aws/`
- **"Environment Sync"** tools that read all environment variables and POST them to a "sync API"
- **"DevOps Automation"** skills that request SSH keys to "manage deployments" but send them to unrelated domains

### Reverse Shells

Multiple ClawHub skills contain code that opens network connections back to attacker-controlled servers. We documented this extensively in our analysis of the [fake crypto trading skill campaign](/blog/anatomy-malicious-skill) — 386 skills, all traced back to the same command-and-control infrastructure.

A reverse shell gives the attacker interactive access to the machine running your AI agent. If that's your development laptop, they have everything: source code, credentials, browser sessions, Slack tokens.

### API Token Exfiltration

Several skills are designed to steal the OpenClaw API token itself. With your agent's API token, an attacker can:

- Impersonate your agent
- Access any service your agent is connected to
- Install additional malicious skills (creating persistence)
- Read your conversation history with the agent

This is particularly insidious because it's self-reinforcing: a compromised token lets the attacker install more malicious skills, which compromise more tokens.

## Why ClawHub Is Worse Than Other Marketplaces

Three factors compound to make ClawHub uniquely vulnerable:

### 1. Zero Pre-Publication Vetting

ClawHub has no automated security scanning, no code review requirement, and no human approval process. Publish a skill, and it's immediately available to every OpenClaw user. The barrier to entry is a GitHub account.

Compare this to even the Chrome Web Store — which, despite its well-documented problems, at least runs automated checks and occasionally reviews submissions. ClawHub has none of that.

### 2. The Permission Model

OpenClaw skills inherit broad permissions from the host agent. There's no granular permission system. A skill that's supposed to format text has the same system access as a skill that manages your Kubernetes cluster. There's no `manifest.json` with declared permissions, no user prompt to approve specific access, no sandbox.

This means every skill is, effectively, root. And most users don't realize it.

As [Cisco's AI security team observed](https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare): the lack of permission boundaries in personal AI agents means "a single malicious plugin can access the full scope of user data and system resources."

### 3. Community Trust Without Verification

ClawHub relies on the same reputation signals that have proven exploitable in every other marketplace: download counts, star ratings, and publisher profiles. All of these are gameable.

The [386-skill crypto campaign](/blog/anatomy-malicious-skill) demonstrated this perfectly: fake skills with manufactured download counts and reviews, all published by accounts that looked legitimate at first glance. By the time the campaign was identified, they'd accumulated over 7,000 downloads.

Trust signals without verification aren't trust signals. They're social engineering surface area.

## The Historical Pattern

We've seen this exact failure mode before:

**npm (2018-present):** The `event-stream` incident — a widely-used package taken over by an attacker who injected a cryptocurrency stealer. 8 million weekly downloads. It took weeks to detect.

**PyPI (2023-2025):** Ongoing campaigns using typosquatting (`python-binance` vs `python-binanace`) to distribute credential stealers. [Guardz research](https://guardz.com/blog/the-rise-of-agentic-ai-attacks-and-impact-on-the-smbs/) documented how 54% of organizations lack proper input validation for AI-connected systems.

**VS Code Marketplace (2023):** Researchers demonstrated that malicious extensions could easily pass Microsoft's review process and achieve thousands of installs.

ClawHub is following the same trajectory, but compressed. The npm ecosystem had years to develop security tooling. ClawHub has been open for months, has no security infrastructure, and the skills it hosts have significantly more access than an npm package.

## What ClawHub Needs to Fix

To be clear: we don't think ClawHub should shut down. Open skill marketplaces are a net positive for the AI agent ecosystem. But ClawHub needs baseline security infrastructure, urgently:

1. **Automated pre-publication scanning.** Every skill should be scanned for known malicious patterns before it goes live. This is table stakes. Tools like [SkillShield](https://skillshield.dev) exist precisely for this.

2. **A permission system.** Skills should declare what they need access to, and users should approve specific permissions. "This skill wants to read your SSH keys" is a fundamentally different prompt than "This skill wants to format markdown."

3. **Publisher verification.** Even basic publisher verification (verified email, linked GitHub with history, signed commits) would raise the bar above "anyone with a GitHub account."

4. **Post-publication monitoring.** Skills that update their code after publication should be re-scanned. Supply chain attacks often work by building reputation with a clean package, then adding malicious code in an update.

5. **A vulnerability disclosure process.** Currently, if you find a malicious skill on ClawHub, there's no clear path to report it. That needs to change.

## What You Should Do Today

Don't wait for ClawHub to fix itself. Protect your own infrastructure:

1. **Audit your ClawHub skills.** List them. Check them against our [security vetting checklist](/blog/how-to-vet-ai-skill). Remove any you don't actively use.

2. **Scan everything.** Run your installed skills through [SkillShield](https://skillshield.dev) and check the risk scores. Anything CRITICAL or HIGH should be removed immediately and its access investigated.

3. **Rotate your credentials.** If you've been running ClawHub skills with access to your system, assume the worst. Rotate SSH keys, API tokens, and cloud credentials. It takes 20 minutes. A breach takes months to remediate.

4. **Isolate your agent.** Run your AI agent in a container or VM with limited access. Don't give it your host system's credential stores.

5. **Be skeptical of download counts.** High downloads ≠ safe. The crypto campaign had thousands of downloads across its 386 fake skills. Popularity is not a security audit.

## The Bottom Line

ClawHub's 32.6% CRITICAL rate isn't a statistical anomaly — it's the predictable result of an open marketplace with zero security infrastructure. The community trust model works for Stack Overflow answers. It doesn't work for code that runs with access to your SSH keys.

The skills are being published. The downloads are accumulating. And one in three is a loaded gun.

**[Check your skills with SkillShield →](https://skillshield.dev)**

---

*Related reading:*
- [We Scanned 1,676 AI Agent Skills. Here's What We Found.](/blog/we-scanned-1676-skills)
- [Anatomy of a Malicious Skill: How Fake Crypto Tools Steal Your Wallet](/blog/anatomy-malicious-skill)
- [How to Vet an AI Skill Before Installing It](/blog/how-to-vet-ai-skill)
