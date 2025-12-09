# AgentWorks Social Media Launch Guide

## Platform Strategy Overview

| Platform | Priority | Audience | Content Type | Frequency |
|----------|----------|----------|--------------|-----------|
| **Discord** | HIGH | Beta testers, power users | Community, support, feedback | Daily |
| **Reddit** | HIGH | Developers, indie hackers | Discussion, Show HN style | 2-3x/week |
| **LinkedIn** | MEDIUM | Founders, agencies, B2B | Thought leadership, updates | 3-4x/week |
| **Twitter/X** | MEDIUM | Dev community, tech | Quick updates, threads | Daily |
| **YouTube** | MEDIUM | Tutorial seekers | Demos, tutorials, updates | 1-2x/week |
| **Blog** | HIGH | SEO, all audiences | Deep content, changelogs | 2x/week |
| Instagram | LOW | Skip for now | - | - |
| Facebook | LOW | Skip for now | - | - |
| Telegram | LOW | Skip for now | - | - |

---

## Discord Server

### Why Discord (not Telegram)
- Better for structured communities with multiple channels
- Role-based access (beta testers, founders, etc.)
- Bot integration for automation
- Voice channels for office hours
- Screen sharing for support

### Server Structure
See: `Discord-Server-Template.md`

---

## Reddit Strategy

### Target Subreddits

**Primary (High Value):**
- r/SaaS (150K members) - Share journey, get feedback
- r/startups (1.2M) - Launch announcements
- r/webdev (2.1M) - Technical discussions
- r/programming (6.5M) - Technical deep dives

**Secondary:**
- r/artificial (700K) - AI focus
- r/learnprogramming (4M) - Beginner-friendly content
- r/indiehackers (Hacker News crosspost potential)
- r/nocode (50K) - Vibe coding angle

### Content Types

1. **Launch Post** (r/SaaS, r/startups)
```
Title: Show r/SaaS: We built an AI dev platform with 11 specialist agents on a Kanban board

Hey r/SaaS! After 6 months of building, we're ready to share AgentWorks.

The problem: Current AI coding tools use one AI for everything. Strategy, architecture, code, tests, docs - all one model trying to do it all.

Our solution: 11+ specialist agents, each optimized for their lane:
- Lane 0: CEO CoPilot + Strategy Agent (GPT-4)
- Lane 3: Architect Agent (Claude)
- Lane 6: Dev Agents - Backend + Frontend (Claude)
- Lane 7: QA Agent (Claude)
...and more

We call it "Blueprint-driven development" - you define the vision, agents execute.

Looking for feedback on:
1. Does this resonate with your workflow?
2. What agents would you add?
3. Would transparent usage pricing matter to you?

[Link to waitlist - agentworks.dev/waitlist]

Happy to answer any questions!
```

2. **Technical Deep Dive** (r/programming, r/webdev)
```
Title: How we route LLM requests to 4 different providers based on task type

We're building an AI dev platform and hit an interesting challenge: different LLMs are better at different things.

GPT-4: Great at strategy, planning, documentation
Claude: Better at code generation, debugging
Gemini: Good at troubleshooting, research
...

Here's how we built a provider router that automatically selects the best model:

[Technical explanation with code snippets]

Curious if others have tackled multi-model orchestration?
```

3. **Journey Post** (r/SaaS, r/startups)
```
Title: From $0 to 1,847 waitlist signups in 2 weeks - what worked

Week 1: 
- Launched landing page with viral referral system
- Each referral moves you up the waitlist
- Founder pricing tiers with countdown

Week 2:
- Posted on r/SaaS (this community!)
- YouTube demo video (3 min)
- LinkedIn founder journey posts

What worked:
- Referral tiers (3 refs = beta access, 25 = free lifetime)
- Transparent pricing comparison vs competitors
- Building in public updates

What didn't:
- Cold email outreach
- Generic "we're building X" posts

AMA about the launch!
```

### Reddit Rules
- 10:1 rule - 10 value comments for every self-promotion
- Engage genuinely in communities first
- Never spam the same post across subreddits
- Respond to every comment on your posts
- Use text posts, not link posts (higher engagement)

---

## LinkedIn Strategy

### Profile Optimization (Founder)
- Headline: "Building AgentWorks - The Kanban for AI Development | 11 Agents, One Blueprint"
- Featured: Link to waitlist, demo video
- About: Story of why you're building this

### Content Pillars

1. **Founder Journey (40%)**
   - Building in public updates
   - Challenges and solutions
   - Metrics and milestones
   - Team growth

2. **Technical Insights (30%)**
   - How multi-agent orchestration works
   - Provider mixing decisions
   - Architecture deep dives

3. **Industry Commentary (20%)**
   - Vibe coding trends
   - AI development future
   - Competitor analysis (thoughtful, not attacking)

4. **Product Updates (10%)**
   - Feature launches
   - Waitlist milestones
   - Beta announcements

### Post Formats

**Carousel (Highest Engagement):**
- "5 reasons single-AI coding tools are chaos"
- "How we route to 4 LLM providers"
- "Our 11-lane development pipeline"

**Text Posts with Hook:**
```
I just deleted 10,000 lines of code.

And it felt amazing.

Here's what happened:

[Story about AI-assisted refactoring]

The lesson: [Insight]

We're building AgentWorks to make this the default, not the exception.

Link in comments.
```

**Video Posts:**
- 60-second product demos
- Behind-the-scenes dev updates
- Talking head insights

### Posting Schedule
- Tuesday 8-10am: Technical insight
- Wednesday 12-2pm: Founder journey
- Thursday 8-10am: Industry commentary
- Saturday 9-11am: Casual/personal

---

## Twitter/X Strategy

### Profile Setup
- Handle: @AgentWorksDev (or similar)
- Bio: "11 AI agents. One Kanban board. Ship faster. | Join the waitlist: [link]"
- Pinned: Demo video or waitlist announcement

### Content Types

**Threads (Weekly):**
```
🧵 Why we're building AgentWorks:

1/ The problem with AI coding tools today:

One AI tries to do everything.
- Strategy? AI.
- Architecture? Same AI.
- Code? Same AI.
- Tests? Same AI.
- Docs? Same AI.

That's like hiring one person for your entire company.

2/ What if you had specialists?

- CEO CoPilot for oversight
- Strategy Agent for planning
- Architect Agent for design
- Dev Agents for code
- QA Agent for testing

Each using the best LLM for their job.

3/ That's AgentWorks.

GPT-4 handles strategy.
Claude writes the code.
Gemini debugs issues.

All on a visual Kanban board.

4/ Want early access?

Join 1,800+ developers on the waitlist:
agentworks.dev/waitlist

Refer friends → move up the list.
Top 50 get $149 lifetime access.

/thread
```

**Daily Posts:**
- Dev updates (1-2 sentences + screenshot)
- Metrics ("Just hit 2,000 waitlist signups!")
- Engagement (Reply to AI/dev conversations)
- Retweets of relevant content with commentary

### Hashtags
- #buildinpublic
- #vibecoding
- #AIdev
- #indiehackers
- #saas

---

## YouTube Strategy

### Channel Setup
- Name: AgentWorks
- Banner: Product screenshot + tagline
- About: Detailed description with links

### Video Types

1. **Product Demos (Priority)**
   - "AgentWorks in 3 Minutes" (launch video)
   - "Building a SaaS with 11 AI Agents"
   - "From Idea to Deployed App in 7 Days"

2. **Tutorials**
   - "How to Create Your First Blueprint"
   - "Multi-Agent Development Workflow"
   - "Setting Up Your First Project"

3. **Comparisons**
   - "AgentWorks vs Lovable - Which is Right for You?"
   - "Why We Chose Multi-Agent over Single-AI"

4. **Behind the Scenes**
   - Weekly dev logs
   - "How We Built X Feature"
   - Team introductions

### Video Format
- Hook (0-5 sec): Bold claim or question
- Problem (5-30 sec): Pain point
- Solution (30 sec - 2 min): Demo
- CTA (final 10 sec): Waitlist link

### Thumbnail Style
- Consistent branding (purple/blue gradient)
- Bold text overlay
- Face + product screenshot
- High contrast

---

## Blog Strategy

### Platform
Host on: blog.agentworks.dev (subdomain)
Or: Use Ghost, Hashnode, or dev.to

### Content Calendar

**Week 1:**
- "Why We Built AgentWorks: The Problem with Single-AI Coding Tools"
- Changelog: Initial feature set

**Week 2:**
- "11 Agents, 11 Lanes: How Blueprint-Driven Development Works"
- Technical: "Our Multi-Provider LLM Router"

**Week 3:**
- "GPT-4 vs Claude vs Gemini: Why We Mix Providers"
- Case Study: "Building X with AgentWorks"

**Week 4:**
- "From Idea to Production in 7 Days: A Real Example"
- Comparison: "AgentWorks vs [Competitor]"

### SEO Targets
- "ai coding tools 2025"
- "vibe coding platforms"
- "multi-agent development"
- "ai app builder comparison"
- "lovable alternative"
- "replit alternative"

### Post Format
- 1,500-2,500 words
- Clear headers (H2, H3)
- Code snippets where relevant
- Screenshots/GIFs
- Internal links
- CTA at end (waitlist)

---

## Launch Sequence

### Pre-Launch (Now)
1. Set up all social profiles
2. Start building audience with value content
3. Collect waitlist signups
4. Build Discord community

### Soft Launch (Week 4)
1. Invite top 50 waitlist to beta
2. Collect feedback
3. Fix critical issues
4. Get testimonials

### Public Launch (Week 6-8)
1. Product Hunt launch
2. Hacker News "Show HN"
3. Reddit launch posts
4. YouTube demo video
5. Press outreach (TechCrunch, VentureBeat)
6. Email waitlist with launch announcement

### Post-Launch
1. Continue content cadence
2. Respond to all feedback
3. Weekly changelog posts
4. Monthly metrics updates

---

## Metrics to Track

### Waitlist
- Total signups
- Daily growth rate
- Referral conversion rate
- Top referrers

### Social
- Followers per platform
- Engagement rate
- Click-through to waitlist
- Viral coefficient

### Content
- Blog traffic
- Video views
- Time on page
- Conversion to waitlist

---

## Tools

- **Scheduling**: Buffer, Hootsuite, or Typefully (Twitter)
- **Analytics**: Google Analytics, Plausible, or Fathom
- **Email**: Resend, SendGrid, or ConvertKit
- **Referral Tracking**: Built-in or Viral Loops
- **Design**: Figma, Canva for social graphics
- **Video**: Loom, Screen Studio, or OBS

---

## Quick Reference: First Posts

### Twitter
"We're building the Kanban for AI development. 11 specialist agents. One Blueprint. Zero chaos. Join 1,800+ developers on the waitlist: [link] #buildinpublic"

### LinkedIn
"After 6 months of building, I'm excited to share what we've been working on. AgentWorks: an AI development platform where 11 specialist agents collaborate on a Kanban board. [Story + CTA]"

### Reddit
"Show r/SaaS: We built an AI dev platform with 11 specialist agents instead of one jack-of-all-trades AI. Looking for feedback from the community. [Details + AMA]"

### YouTube
"AgentWorks in 3 Minutes - Watch 11 AI Agents Build an App" [Demo video]
