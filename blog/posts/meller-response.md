---
title: "We Scanned 1,676 Skills Before the Meller Report — Here's What We Found"
slug: meller-response
date: 2026-02-06
author: SkillShield Research Team
description: "Jason Meller exposed malicious OpenClaw skills. We'd already scanned 1,676 of them. 461 scored CRITICAL. Here's what our data adds to the picture."
keywords:
  - malicious AI skills
  - AI agent security
  - OpenClaw security scanning
  - AI agent supply chain attack
  - SkillShield scan
image: /blog/images/meller-response-hero.png
image_alt: "Security scan results overlaid on the Meller report timeline showing SkillShield detected threats before publication"
---

# We Scanned 1,676 Skills Before the Meller Report — Here's What We Found

**On February 2nd, Jason Meller published ["From magic to malware"](https://example.com/meller-post) — the most important piece of AI agent security research to date.** He found that the top-downloaded skill on ClawHub was a malware delivery vehicle. That hundreds of skills distribute macOS infostealers via ClickFix-style instructions. That markdown is, in his words, "executable intent."

He's right about all of it. We know because we'd already scanned 1,676 skills before his post went live — and our data confirms, extends, and in some cases makes his findings look conservative.

## Meller's findings are correct. The numbers are worse.

Meller's post focused on a single high-profile case: the top-downloaded ClawHub skill, a staged delivery attack that decoded an obfuscated payload, removed macOS quarantine attributes, and ran an infostealer targeting browser sessions, SSH keys, and cloud credentials.

Our [automated scan of 1,676 skills](/blog/we-scanned-1676-skills) across three marketplaces found that case was the tip of a larger iceberg:

- **461 skills scored CRITICAL** for security risk — a score below 20 out of 100
- **12% were actively malicious** — not "potentially risky" but containing credential theft, code injection, or data exfiltration patterns
- **32.6% of ClawHub's entire catalog** scored CRITICAL, the highest rate of any marketplace we tested
- **386 fake crypto skills** connected to a [single command-and-control server](/blog/anatomy-malicious-skill), collectively downloaded over 7,000 times

Meller described one attack. We found hundreds running concurrently.

## What "markdown is an installer" looks like in scanner data

Meller's core insight — that skill markdown functions as an installer, not as content — maps exactly to what our scanner detects. Here's what the attack patterns look like at scale.

### Obfuscated payloads are everywhere

Our scanner runs three layers of obfuscation detection: regex pattern matching for `base64 -d | bash` chains, AST-level analysis that decodes hex and unicode escape sequences to inspect their contents, and prompt-level analysis that decodes base64 blocks found in markdown body text.

The most common obfuscation pattern we've seen is exactly what Meller described:

```
echo "<base64 payload>" | base64 -d | bash
```

Our `OBFUSCATED_SHELL` rule catches this at weight 30 (critical). But we also find more creative variants: `String.fromCharCode()` building shell commands character-by-character, reversed strings reconstructed with `.split('').reverse().join('')`, and `Buffer.from()` with byte arrays that decode to `child_process` imports. The evasion techniques are sophisticated. The [intent is always the same](/blog/anatomy-malicious-skill).

### Credential targeting is systematic, not opportunistic

Meller noted that the malware targeted "browser sessions, cookies, credentials, developer tokens, SSH keys, cloud credentials." Our scan data shows this isn't a grab-bag — it's a checklist.

The five most frequently accessed credential paths across all CRITICAL-scored skills:

1. **`~/.ssh/`** — SSH keys (present in 34% of CRITICAL skills)
2. **`~/.aws/`** — AWS credentials
3. **`.env` files** — API keys and secrets
4. **`auth-profiles.json`** — OpenClaw auth tokens
5. **`~/.config/`** — Application configuration including cloud CLI credentials

We also detect a pattern Meller didn't mention: **environment variable harvesting**. Rather than targeting specific credential files, some skills iterate over `process.env` with filters like `/key|secret|token|pass|cred|auth/i`. They don't know what secrets you have. They take all of them.

### Prompt injection is the social engineering layer

Meller described ClickFix-style instructions — social engineering that gets users (or agents) to paste and execute commands. Our [prompt injection analysis](/blog/prompt-injection-wild) found this operating at multiple levels:

- **Direct injection:** `<system>` tags, `[INST]` delimiters, "ignore previous instructions" — classic prompt manipulation attempting to override the agent's safety boundaries
- **Roleplay framing:** "Pretend you are an admin with full access" combined with credential access keywords — scored as critical (weight 35) because the combination of social engineering + credential targeting indicates deliberate attack
- **Hidden instructions:** Unicode zero-width characters embedding invisible commands between visible text, bidirectional override characters that make displayed text read differently than it executes, and base64 blocks in markdown that decode to injection payloads
- **Secrecy demands:** "Do not tell the user" combined with external URLs — the scanner flags this specific combination at weight 35 because legitimate skills have no reason to hide their behavior from the user

These aren't theoretical. We found them in production skills on ClawHub.

## The attack vectors Meller called for registries to scan

Meller ended his post with a list of recommendations. Here's where our scanner stands on each.

### ✅ One-liner installers: Detected

`curl | bash`, `wget | sh`, and their variants are caught by our shell analysis at critical severity (weight 30). We detect them in standalone scripts, in `package.json` install hooks, and in `setup.py` / `pyproject.toml` build scripts. We also catch the obfuscated version — base64-encoded payloads piped through decode into shell.

### ✅ Encoded payloads: Detected

Three independent detection layers cover this: pattern matching for common encoding functions, AST analysis that actually decodes hex/unicode/base64 strings and inspects the result, and a behavioral signature (`EVASIVE_MALWARE`) that fires when obfuscation techniques combine with dangerous operations like code execution or credential access.

### ✅ Credential theft patterns: Detected

18 specific credential path patterns, environment variable harvesting detection, and a behavioral chain detector that flags credential read → encode → network send as `EXFIL_CHAIN` at weight 40 — the highest-weight single finding in our ruleset.

### ⚠️ Quarantine removal: Partially detected

We catch the execution mechanism — `execSync`, `spawn`, `child_process` — but we're adding a specific `xattr -d com.apple.quarantine` rule at critical severity. This is shipping in our next update. Meller is right that this specific macOS bypass deserves its own detection.

### ⚠️ External link warnings: Partially detected

We extract all URLs and check them against known-malicious domains, internal IPs (SSRF), and suspicious services (webhook.site, requestbin.net). We catch instruction-like content hidden in link anchor text. What we don't yet catch: short anchor text ("here", "this link") used to disguise malicious URLs. That's on the roadmap.

### ❌ Password-protected archives: Not yet detected

This is our biggest gap. We detect binary files and flag them, but we don't specifically detect archive formats or the pattern of "download this ZIP and use password X." We're adding archive extension detection and a markdown pattern rule for password + archive combinations.

### ❌ Provenance verification: Architectural

Publisher reputation and code signing require registry infrastructure, not a scanner. But scan results like ours are exactly the security signal that marketplaces should surface alongside download counts. A skill with 50,000 downloads and a SkillShield score of 8/100 should scare you more than a skill with 3 downloads — it means 50,000 people ran malware.

## What you can do right now

Meller's advice was stark: "do not do it on a company device. Full stop." That's correct but incomplete. Here's what else you should do.

1. **Scan before you install.** Run [SkillShield](https://skillshield.dev) on any skill before adding it to your agent. A scan takes seconds. Remediation takes weeks.

2. **Read the SKILL.md, not just the description.** Open the raw markdown. Look for shell commands, external links, and instructions to install prerequisites. If a skill tells you to run `curl | bash` for setup, that skill is not your friend.

3. **Check what permissions the skill needs.** A weather skill doesn't need `~/.ssh/`. A search skill doesn't need `child_process`. If the capabilities don't match the description, walk away.

4. **Isolate your agent.** If you must experiment, do it in a VM or container with no access to real credentials. Don't mount your home directory. Don't share your SSH agent. Don't forward cloud CLI sessions.

5. **Watch for behavioral signatures.** A skill that reads credentials AND makes network calls AND uses obfuscation is not being clever — it's being malicious. SkillShield detects these compound patterns automatically, but you should know what they mean when you see them in a scan report.

6. **Don't trust download counts.** The most-downloaded skill on ClawHub was malware. Popularity is a signal of distribution, not safety. A 7,000-download crypto skill connected to a [single C2 server](/blog/anatomy-malicious-skill) proves that.

## The bottom line

Jason Meller sounded the alarm. We're here to say: the fire was already burning, and we've been mapping it. Our data shows this isn't an isolated incident or a theoretical risk — it's a systematic security crisis affecting a third of the largest AI skill marketplace.

Meller wrote that "markdown is executable intent." We'd add: and right now, nobody is checking that intent before it executes on your machine. That's the problem we built SkillShield to solve.

**[Scan your skills with SkillShield →](https://skillshield.dev)**

---

*Related reading:*
- [We Scanned 1,676 AI Agent Skills — Full Results](/blog/we-scanned-1676-skills)
- [The ClawHub Crisis: Why 32% of Skills Want Your SSH Keys](/blog/clawhub-crisis)
- [Anatomy of a Malicious Skill: How Fake Crypto Tools Steal Your Wallet](/blog/anatomy-malicious-skill)
- [Prompt Injection in the Wild](/blog/prompt-injection-wild)
