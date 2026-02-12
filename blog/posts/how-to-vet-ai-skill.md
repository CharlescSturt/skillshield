---
title: "How to Vet an AI Skill Before Installing It (A Security Checklist)"
slug: how-to-vet-ai-skill
date: 2026-02-06
author: SkillShield Research Team
description: "A practical 10-point security checklist for vetting AI agent skills before installation. Based on patterns from 1,676 scanned skills and real-world attacks."
keywords:
  - AI skill security checklist
  - how to check if AI skill is safe
  - AI agent plugin vulnerabilities
  - AI agent security
  - vet AI agent skills
image: /blog/images/how-to-vet-hero.png
image_alt: "Security checklist for vetting AI agent skills before installation"
---

# How to Vet an AI Skill Before Installing It (A Security Checklist)

**Installing an AI agent skill is a trust decision.** You're granting code access to your file system, your network, your credentials, and everything your agent can reach. When [12% of marketplace skills are malicious](/blog/we-scanned-1676-skills) and [32.6% of ClawHub skills score CRITICAL](/blog/clawhub-crisis), "just install it and see" is not a strategy.

This is the security checklist we use. Ten checks, in order of priority, that take less than 15 minutes and will catch the majority of malicious or dangerous skills before they touch your system.

## Before You Start: The 30-Second Smell Test

Before running through the full checklist, ask three questions:

1. **Do I actually need this skill?** Every installed skill is attack surface. If you're installing a "productivity booster" because it sounds cool, you're adding risk for no operational value.

2. **Could a built-in capability do this instead?** Many skills replicate functionality that the agent framework already provides. Check the docs before adding a dependency.

3. **Am I installing from a vetted source?** A skill from a known security researcher's GitHub is fundamentally different from a random ClawHub listing. Provenance matters.

If you pass the smell test, proceed to the checklist.

## The 10-Point Security Checklist

### ✅ 1. Check the Publisher

**What to look for:**
- Does the publisher have a verifiable identity? (GitHub profile with history, personal site, professional presence)
- How old is the publisher account? (Accounts created days before skill publication are red flags)
- What other skills have they published? Are those skills reputable?
- Do they have commits to legitimate open-source projects?

**Red flags:**
- Brand-new accounts with no history
- Publisher name that mimics a known brand ("0penClaw" vs "OpenClaw")
- Multiple skills published in quick succession (common in [mass-campaign attacks](/blog/anatomy-malicious-skill))
- No way to contact the publisher

**Why it matters:** The [386-skill crypto campaign](/blog/anatomy-malicious-skill) used dozens of accounts, each publishing 5-15 skills. The accounts were created weeks before the campaign and had no prior history. Publisher vetting alone would have flagged 90% of them.

### ✅ 2. Read the Source Code

**What to look for:**
- Is the source code available and complete? (Skills without source code should never be installed)
- Does the code do what the description says it does? (A "markdown formatter" doesn't need network access)
- Are there any obvious red flags?

**Specific patterns to search for:**

```bash
# Credential access
grep -r "id_rsa\|\.ssh\|\.aws\|credentials\|\.env" ./skill-dir/

# Network exfiltration
grep -r "fetch\|axios\|http\.\|curl\|XMLHttpRequest" ./skill-dir/

# Code execution
grep -r "eval\|exec\|spawn\|child_process\|Function(" ./skill-dir/

# Encoding (used to hide payloads)
grep -r "base64\|atob\|btoa\|Buffer\.from" ./skill-dir/

# File system operations beyond expected scope
grep -r "readFile\|writeFile\|readdir\|homedir" ./skill-dir/
```

**Red flags:**
- Obfuscated or minified code (legitimate skills have no reason to obfuscate)
- Base64-encoded strings (often used to hide URLs or payloads)
- Network calls to domains unrelated to the skill's purpose
- File system access outside the skill's stated scope

**Why it matters:** Code review catches the majority of malicious skills. The [crypto campaign skills](/blog/anatomy-malicious-skill) all contained obvious credential-reading code — obvious to anyone who looked. Most people didn't look.

### ✅ 3. Analyze Declared Permissions

**What to look for:**
- Does the skill declare what it needs access to? (Many don't — that itself is a concern)
- Are the declared permissions proportional to the skill's purpose?
- Does a "text formatting" skill request network access? (No.)
- Does a "weather checker" request file system access? (No.)

**The proportionality test:**

| Skill Purpose | Reasonable Permissions | Suspicious Permissions |
|--------------|----------------------|----------------------|
| Text formatter | None (pure computation) | Network, file system, env vars |
| API client | Network (specific domain) | File system, SSH, cloud creds |
| Dev tools | File system (project dir only) | SSH keys, cloud creds, browser data |
| Deployment tool | Network, limited file system | Full home dir, browser data |

**Red flags:**
- Permissions far exceeding what the skill needs
- Vague permission descriptions ("needs system access for full functionality")
- No permission declaration at all (assume it wants everything)

### ✅ 4. Check Network Behavior

**What to look for:**
- What domains does the skill connect to?
- Are those domains related to the skill's stated purpose?
- Can you verify who owns those domains?

**How to check:**

```bash
# Extract URLs from skill code
grep -roE 'https?://[a-zA-Z0-9._/-]+' ./skill-dir/

# Look up domain registration
whois suspicious-domain.io

# Check if domain is on threat lists
# (use VirusTotal, AbuseIPDB, or similar)
```

**Red flags:**
- Connections to recently registered domains
- Domains with privacy-protected WHOIS records (common for C2 infrastructure)
- Endpoints named to look like legitimate services (`analytics-cdn.io`, `telemetry-api.net`)
- Multiple unrelated domains (skill calls home to more than one server)

**Why it matters:** Every malicious skill in the [crypto campaign](/blog/anatomy-malicious-skill) connected to the same C2 infrastructure. The domain was registered two months before the campaign and used a privacy proxy. A 30-second WHOIS lookup would have raised immediate suspicion.

### ✅ 5. Run an Automated Scan

**What to do:**
Run the skill through [SkillShield](https://skillshield.dev) or equivalent automated analysis before installation.

Automated scanning catches patterns that manual review misses:
- **Behavioral analysis:** Does the code path lead to credential access even if it's not obvious from a surface read?
- **Obfuscation detection:** Is the skill hiding its true behavior behind encoding, dynamic execution, or indirect references?
- **Known malicious patterns:** Does the skill match signatures of known attacks?
- **Prompt injection detection:** Does the skill's output contain instruction-like patterns?

**Score interpretation (SkillShield):**
- **80-100 (LOW risk):** No significant issues detected. Proceed with normal caution.
- **50-79 (MEDIUM risk):** Some concerns found. Review the specific findings before installing.
- **20-49 (HIGH risk):** Significant issues. Do not install without thorough manual review.
- **0-19 (CRITICAL risk):** Do not install. Multiple malicious indicators detected.

**Why it matters:** Manual review is necessary but not sufficient. You can read code, but can you follow every execution path? Trace every dynamic require? Decode every base64 string? Automated tools do this systematically, every time.

### ✅ 6. Check Update History

**What to look for:**
- When was the skill last updated?
- What changed in recent updates?
- Has the skill changed hands or maintainers?

**Red flags:**
- A long-dormant skill that suddenly receives an update (possible account takeover)
- Updates that add network connectivity or credential access to a previously offline skill
- Changelog that doesn't match the actual code changes
- New maintainer added shortly before a major update

**Why it matters:** Supply chain attacks frequently work by compromising legitimate packages. The npm `event-stream` incident started when a new maintainer was added to a popular package — and then injected a cryptocurrency stealer. The same pattern applies to AI skills.

### ✅ 7. Verify Download Count and Reviews

**What to look for:**
- Do the download numbers seem organic? (1,000 downloads on a skill published yesterday is suspicious)
- Are the reviews from accounts with their own history?
- Do negative reviews mention security concerns?

**Red flags:**
- Inflated download counts (purchased or bot-generated)
- Reviews that all sound similar or were posted in a short time window
- No reviews at all on a skill with high download counts
- Reviews that only mention features, never security

**What this ISN'T:** This is not a reliable security check. It's a social signal. High downloads don't mean safe. The [crypto campaign](/blog/anatomy-malicious-skill) had thousands of downloads. But combined with other checks, review patterns can surface anomalies.

### ✅ 8. Test in Isolation

**What to do:**
Before running a skill on your primary machine, test it in an isolated environment:

```bash
# Docker isolation (quick and dirty)
docker run -it --rm -v $(pwd)/skill-dir:/skill:ro \
  --network=none node:20 bash

# Or use a dedicated VM/sandbox
```

**What to observe:**
- Does the skill function as described?
- Does it attempt network connections? (`--network=none` will make these fail visibly)
- Does it try to access files outside its directory?
- Does it produce error messages that reveal what it's looking for?

**Why it matters:** Running in isolation turns malicious behavior into visible errors. A skill that silently exfiltrates your SSH keys on your real machine will throw network errors in a disconnected container — immediately revealing its intent.

### ✅ 9. Monitor After Installation

**What to do:**
Even after a skill passes all checks, monitor its behavior during the first few uses:

- Watch network traffic for unexpected connections
- Monitor file system access for credential store reads
- Check if new skills have been installed without your request
- Review agent logs for unusual behavior or suppressed warnings

**Tools:**
- `lsof -i` — list network connections
- `fs_usage` (macOS) or `inotifywait` (Linux) — monitor file system access
- Network monitoring proxy (mitmproxy, Charles Proxy) — inspect outgoing traffic

**Why it matters:** Some malicious skills use delayed activation — they behave normally for the first few invocations, then activate their payload later. The [OWASP Agentic AI framework](/blog/owasp-top-10-ai-agents) calls this out under ASI09 (Insufficient Logging and Monitoring).

### ✅ 10. Maintain an Inventory

**What to do:**
Keep a list of every installed skill with:
- Name and version
- Publisher
- Date installed
- Last security review date
- SkillShield score
- Business justification (why is it installed?)

Review this inventory monthly. Remove anything you're not actively using. Every installed skill is attack surface — minimize it.

## The Quick Reference Card

For teams that need a printable version:

```
AI SKILL SECURITY CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Publisher verified (real identity, account age)
□ Source code reviewed (no obfuscation, no unexpected access)
□ Permissions proportional (does it need what it asks for?)
□ Network behavior checked (domains verified, no C2 indicators)
□ Automated scan passed (SkillShield score ≥ 50)
□ Update history clean (no suspicious changes)
□ Reviews examined (organic patterns)
□ Tested in isolation (sandbox first)
□ Post-install monitoring active
□ Added to skill inventory

RISK DECISION:
  All 10 pass → Install with monitoring
  1-2 minor flags → Review flags, proceed if justified
  Any CRITICAL flag → Do not install
  Automated scan < 20 → Do not install, report to marketplace
```

## The Bottom Line

Vetting an AI skill takes 15 minutes. Recovering from a compromised credential store takes weeks. The math is straightforward.

This checklist won't catch every possible attack — nothing will. But it will catch the vast majority of malicious skills we've documented across our [scan of 1,676 skills](/blog/we-scanned-1676-skills). The attacks we're seeing in the wild are not sophisticated. They're successful because nobody's checking.

Start checking.

**[Automate your skill vetting with SkillShield →](https://skillshield.dev)**

---

*Related reading:*
- [We Scanned 1,676 AI Agent Skills. Here's What We Found.](/blog/we-scanned-1676-skills)
- [The ClawHub Crisis: Why 32% of Skills Want Your SSH Keys](/blog/clawhub-crisis)
- [OWASP's Top 10 for AI Agents: What Every Developer Needs to Know](/blog/owasp-top-10-ai-agents)
