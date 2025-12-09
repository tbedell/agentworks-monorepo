# AgentWorks Discord Server Template

## Server Settings

**Name:** AgentWorks Community
**Icon:** AgentWorks logo (Zap icon in gradient square)
**Banner:** Kanban board visualization with agents

### Verification Level
- Medium (must be registered for 5 minutes)

### Default Notifications
- Only @mentions

---

## Roles (Top to Bottom)

### Staff Roles
| Role | Color | Permissions | Description |
|------|-------|-------------|-------------|
| 🔷 Founder | #6366f1 | Admin | Thomas + core team |
| 🛠️ Team | #8b5cf6 | Manage Messages, Kick | Full-time team |
| 🤖 Bot | #3b82f6 | Varies | Automated bots |

### Community Roles
| Role | Color | How to Get | Perks |
|------|-------|------------|-------|
| 💎 Founding 50 | #f59e0b (Gold) | First 50 lifetime buyers | Exclusive channel, direct founder access |
| 🚀 Early Bird | #10b981 (Green) | Early lifetime buyers | Exclusive channel |
| 🧪 Beta Tester | #ec4899 (Pink) | Invited from waitlist | Beta access, feedback channel |
| ⭐ Top Referrer | #eab308 (Yellow) | 10+ referrals | Special badge |
| 👋 Member | #94a3b8 (Gray) | Join server | Basic access |

### Auto-Roles (Bot Assigned)
| Role | Trigger |
|------|---------|
| 📧 Waitlist | Verified email connection |
| 🏆 Contributor | Helpful answers (reaction threshold) |

---

## Channel Structure

### 📢 INFO (Read-Only)
```
├── #welcome
│   └── Welcome message, rules, how to get started
├── #announcements
│   └── Major updates, launches, breaking changes
├── #changelog
│   └── Weekly feature updates, bug fixes
└── #roadmap
    └── Public roadmap, voting on features
```

### 💬 COMMUNITY
```
├── #general
│   └── General discussion, introductions
├── #show-your-project
│   └── Share what you've built with AgentWorks
├── #wins
│   └── Celebrate launches, milestones
└── #random
    └── Off-topic, memes, fun
```

### 🛠️ SUPPORT
```
├── #getting-started
│   └── New user questions, onboarding help
├── #help
│   └── Technical support, troubleshooting
├── #bug-reports
│   └── Report issues (template enforced)
└── #feature-requests
    └── Suggest new features (voting enabled)
```

### 💡 FEEDBACK (Role-Gated: Beta Tester+)
```
├── #beta-feedback
│   └── Direct feedback from beta users
├── #ux-discussion
│   └── UI/UX improvement ideas
└── #agent-ideas
    └── New agent suggestions
```

### 🎯 FOUNDERS CIRCLE (Role-Gated: Founding 50)
```
├── #founders-chat
│   └── Direct access to team
├── #early-previews
│   └── See features before anyone else
└── #founders-voice
    └── Voice channel for live discussions
```

### 🔧 RESOURCES
```
├── #tutorials
│   └── How-to guides, video links
├── #docs
│   └── Documentation links, FAQ
└── #integrations
    └── Third-party tools, APIs
```

### 🎙️ VOICE
```
├── 🔊 Office Hours
│   └── Weekly live Q&A with team
├── 🔊 Co-working
│   └── Silent co-working, focus time
└── 🔊 Hangout
    └── Casual voice chat
```

---

## Welcome Message (#welcome)

```markdown
# Welcome to AgentWorks! 👋

**The Kanban for AI Development**
11 specialist agents. One Blueprint. Zero chaos.

## Quick Start

1️⃣ **Introduce yourself** in #general
2️⃣ **Check the #roadmap** to see what's coming
3️⃣ **Share your project** in #show-your-project
4️⃣ **Get help** in #getting-started or #help

## Roles

💎 **Founding 50** - First 50 lifetime buyers (exclusive access)
🚀 **Early Bird** - Early lifetime deal holders
🧪 **Beta Tester** - Invited from waitlist
⭐ **Top Referrer** - 10+ waitlist referrals

## Rules

✅ Be respectful and constructive
✅ Search before asking (docs first!)
✅ Share your wins and learnings
✅ Help others when you can

❌ No spam or self-promotion
❌ No NSFW content
❌ No harassment or toxicity

## Links

🔗 [Website](https://agentworks.dev)
🔗 [Documentation](https://docs.agentworks.dev)
🔗 [Waitlist](https://agentworks.dev/waitlist)
🔗 [Twitter](https://twitter.com/AgentWorksDev)

**Questions?** Ask in #help or ping @Team
```

---

## Announcements Template (#announcements)

```markdown
# 🚀 [Feature Name] is Live!

**What's new:**
- Feature 1
- Feature 2
- Feature 3

**How to use it:**
1. Step 1
2. Step 2
3. Step 3

**Docs:** [Link]

**Feedback?** Drop it in #feature-requests

---
*AgentWorks v0.X.X • [Date]*
```

---

## Changelog Template (#changelog)

```markdown
## 📋 Changelog - Week of [Date]

### ✨ New Features
- **[Feature Name]** - Brief description

### 🐛 Bug Fixes
- Fixed issue with X
- Resolved Y behavior

### 🔧 Improvements
- Performance improvement for Z
- Updated UI for A

### 📚 Docs
- Added guide for B
- Updated FAQ with C

---
*Full changelog: [Link to GitHub releases]*
```

---

## Bug Report Template (#bug-reports)

Enforce with Discord's forum channel or a bot:

```markdown
**Bug Description:**
[Clear description of the issue]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Browser: 
- OS: 
- AgentWorks version: 

**Screenshots/Logs:**
[Attach if applicable]
```

---

## Feature Request Template (#feature-requests)

```markdown
**Feature Title:**
[Short, descriptive title]

**Problem:**
[What problem does this solve?]

**Proposed Solution:**
[How would this work?]

**Alternatives Considered:**
[Other ways to solve this]

**Additional Context:**
[Screenshots, examples, etc.]

---
React with 👍 to vote!
```

---

## Bots to Add

### MEE6 or Carl-bot
- Auto-roles on join
- Welcome messages
- Moderation (auto-mod, warnings)
- Reaction roles

### Ticket Bot (Ticket Tool, etc.)
- Private support tickets
- Bug report handling

### Statbot or Server Stats
- Member analytics
- Activity tracking

### GitHub Bot
- Changelog notifications
- Issue/PR updates

### Custom Webhook
- Waitlist milestone announcements
- New blog post notifications

---

## Weekly Events

| Day | Time (PT) | Event | Channel |
|-----|-----------|-------|---------|
| Tuesday | 10am | Office Hours (Voice) | #office-hours |
| Thursday | 12pm | Demo Day (Voice) | #office-hours |
| Friday | 3pm | Changelog Review | #changelog |

---

## Moderation Guidelines

### Warning System
1. Verbal warning (DM)
2. 24-hour mute
3. 7-day mute
4. Permanent ban

### Auto-Mod Rules
- No invite links (except whitelisted)
- No excessive caps
- No repeated messages (spam)
- No banned words (slurs, etc.)

### Escalation
- @Team for questions
- @Founder for serious issues

---

## Growth Tactics

1. **Waitlist Integration**
   - "Join our Discord" after waitlist signup
   - Exclusive updates for Discord members

2. **Referral Program**
   - Top 10 referrers get ⭐ role
   - Leaderboard posted weekly

3. **Community Highlights**
   - Weekly "Member Spotlight"
   - Best projects shared on Twitter

4. **Exclusive Content**
   - Beta features shown in Discord first
   - Founder AMAs (monthly)

5. **Cross-Promotion**
   - Discord link in email signatures
   - Mentioned in all content

---

## Launch Day Checklist

- [ ] All channels created
- [ ] Roles configured
- [ ] Welcome message posted
- [ ] Bots configured and tested
- [ ] Moderation rules set
- [ ] Team roles assigned
- [ ] Invite link generated (never expires)
- [ ] Linked in website footer
- [ ] Linked in email footer
- [ ] Linked in social bios
