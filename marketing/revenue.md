# AgentWorks Revenue Model & Financial Projections

**Document Owner:** C-Suite / Finance
**Last Updated:** December 2024

---

## 1. Executive Summary

AgentWorks operates a dual-revenue model:
1. **Founding Member Launch** - One-time lifetime licenses ($224K projected)
2. **Ongoing SaaS Subscriptions** - Monthly/yearly recurring revenue

This document outlines all pricing tiers, API allocations, cost structures, and revenue projections.

---

## 2. Developer Subscription Tiers

### Monthly Pricing

| Plan | Monthly Price | Target Audience | Key Value Prop |
|------|---------------|-----------------|----------------|
| **Starter** | $0 | Explorers, evaluators | Try before you buy |
| **Pro** | $49 | Indie devs, small teams | Full-featured development |
| **Enterprise** | $199 | Agencies, larger teams | Unlimited scale + compliance |

### Yearly Pricing (20% Discount)

| Plan | Monthly Price | Yearly Price | Annual Total | Savings |
|------|---------------|--------------|--------------|---------|
| **Starter** | $0 | $0 | $0 | - |
| **Pro** | $49 | $39/mo | $468/year | $120 (20%) |
| **Enterprise** | $199 | $159/mo | $1,908/year | $480 (20%) |

### Feature Comparison

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| **Projects** | 3 | Unlimited | Unlimited |
| **Agent Runs/Day** | 5 | 100 | Unlimited |
| **Kanban Board** | Basic | Full (all lanes) | Full + Custom |
| **CEO CoPilot** | - | ✓ | ✓ |
| **Multi-Provider LLM** | - | ✓ | ✓ |
| **Workspace Members** | 1 | 5 | Unlimited |
| **Usage Analytics** | - | ✓ | ✓ |
| **SSO** | - | - | ✓ |
| **SLA Guarantee** | - | - | ✓ |
| **Custom Integrations** | - | - | ✓ |
| **Support Level** | Community | Priority | Dedicated |

---

## 3. API Limits & Usage Allocations

### Agent Runs by Tier

| Tier | Daily Runs | Monthly Runs | Overage Rate |
|------|------------|--------------|--------------|
| **Starter** | 5 | ~150 | N/A (hard limit) |
| **Pro** | 100 | ~3,000 | $0.25/run |
| **Enterprise** | Unlimited | Unlimited | Included |

### Founding Member API Allocations

| Founder Tier | Monthly API Calls | Overage Rate | Discount vs Standard |
|--------------|-------------------|--------------|---------------------|
| **Diamond** | 2,000 | $0.10/call | 60% off |
| **Gold** | 1,500 | $0.12/call | 52% off |
| **Silver** | 1,000 | $0.15/call | 40% off |
| **Standard** | - | $0.25/call | - |

### API Call Definition
- **1 Agent Run = 1+ API Calls** depending on agent complexity
- Simple agents (single LLM call): 1 API call
- Complex agents (multi-step, tool use): 3-10 API calls
- Full workflow execution: 10-50 API calls

### Provider Cost Structure

| Provider | Model | Input Cost | Output Cost | Avg Call Cost |
|----------|-------|------------|-------------|---------------|
| **OpenAI** | GPT-4 Turbo | $0.01/1K | $0.03/1K | ~$0.02 |
| **Anthropic** | Claude 3.5 Sonnet | $0.003/1K | $0.015/1K | ~$0.01 |
| **Google** | Gemini 1.5 Pro | $0.00125/1K | $0.005/1K | ~$0.005 |

---

## 4. Pricing Formula & Margins

### AgentWorks Markup Formula

```
User Price = ceil((2 × Provider Cost) / 0.25) × 0.25
```

**Rules:**
- Minimum 2× markup on all provider costs
- Billing in $0.25 increments
- Target gross margin: ≥50%

### Example Calculations

| Provider Cost | 2× Markup | Rounded to $0.25 | User Pays | Actual Margin |
|---------------|-----------|------------------|-----------|---------------|
| $0.01 | $0.02 | $0.25 | $0.25 | 96% |
| $0.05 | $0.10 | $0.25 | $0.25 | 80% |
| $0.10 | $0.20 | $0.25 | $0.25 | 60% |
| $0.15 | $0.30 | $0.50 | $0.50 | 70% |
| $0.25 | $0.50 | $0.50 | $0.50 | 50% |
| $0.50 | $1.00 | $1.00 | $1.00 | 50% |

---

## 5. Revenue Projections

### Phase 1: Founding Member Launch

| Tier | Spots | Price | Revenue |
|------|-------|-------|---------|
| Diamond | 100 | $299 | $29,900 |
| Gold | 300 | $249 | $74,700 |
| Silver | 600 | $199 | $119,400 |
| **TOTAL** | **1,000** | - | **$224,000** |

### Phase 2: SaaS Subscription Growth (Year 1 Post-Launch)

#### Monthly Subscriber Projections

| Month | Starter | Pro | Enterprise | MRR |
|-------|---------|-----|------------|-----|
| 1 | 500 | 50 | 5 | $3,445 |
| 2 | 750 | 80 | 8 | $5,512 |
| 3 | 1,000 | 120 | 12 | $8,268 |
| 4 | 1,200 | 160 | 16 | $11,024 |
| 5 | 1,400 | 200 | 20 | $13,780 |
| 6 | 1,600 | 250 | 25 | $17,225 |
| 7 | 1,800 | 300 | 30 | $20,670 |
| 8 | 2,000 | 350 | 35 | $24,115 |
| 9 | 2,200 | 400 | 40 | $27,560 |
| 10 | 2,400 | 450 | 45 | $31,005 |
| 11 | 2,600 | 500 | 50 | $34,450 |
| 12 | 2,800 | 550 | 55 | $37,895 |

#### Year 1 SaaS Revenue Summary

| Metric | Value |
|--------|-------|
| **End of Year MRR** | $37,895 |
| **ARR Run Rate** | $454,740 |
| **Total Year 1 Subscription Revenue** | ~$235,000 |
| **Pro Subscribers (Month 12)** | 550 |
| **Enterprise Subscribers (Month 12)** | 55 |

### Phase 3: Combined Revenue (Year 1)

| Revenue Stream | Amount |
|----------------|--------|
| Founding Member Launch | $224,000 |
| Year 1 Subscriptions | $235,000 |
| Overage Revenue (Est.) | $15,000 |
| **TOTAL YEAR 1 REVENUE** | **$474,000** |

---

## 6. Cost Structure

### Fixed Costs (Monthly)

| Category | Monthly Cost | Annual Cost |
|----------|--------------|-------------|
| GCP Infrastructure | $2,500 | $30,000 |
| Domain & SSL | $50 | $600 |
| Monitoring & Logging | $200 | $2,400 |
| Email/Marketing Tools | $300 | $3,600 |
| Support Tools | $150 | $1,800 |
| **Total Fixed** | **$3,200** | **$38,400** |

### Variable Costs (Per User Activity)

| Cost Type | Rate | Notes |
|-----------|------|-------|
| LLM Provider Costs | ~$0.01-0.02/call | Depends on model |
| Payment Processing | 2.9% + $0.30 | Stripe fees |
| Bandwidth/Storage | ~$0.01/GB | GCP rates |

### Cost Projections (Year 1)

| Category | Amount |
|----------|--------|
| Fixed Costs | $38,400 |
| LLM Provider Costs (Est. 500K calls) | $7,500 |
| Payment Processing (2.9% of $474K) | $13,746 |
| Infrastructure Scaling | $6,000 |
| **Total Year 1 Costs** | **$65,646** |

---

## 7. Profit Analysis

### Year 1 Profitability

| Metric | Amount |
|--------|--------|
| **Total Revenue** | $474,000 |
| **Total Costs** | $65,646 |
| **Gross Profit** | $408,354 |
| **Gross Margin** | 86.2% |

### Revenue by Category

```
┌─────────────────────────────────────────────────────┐
│  YEAR 1 REVENUE BREAKDOWN                           │
│                                                     │
│  Founding Members    ████████████████  $224,000     │
│  Subscriptions       █████████████████ $235,000     │
│  Overage Revenue     ██                $15,000      │
│                                                     │
│  TOTAL: $474,000                                    │
└─────────────────────────────────────────────────────┘
```

### Profit Margins by Revenue Type

| Revenue Type | Revenue | COGS | Gross Profit | Margin |
|--------------|---------|------|--------------|--------|
| Founding Members | $224,000 | $0 | $224,000 | 100% |
| Pro Subscriptions | $168,000* | $5,000 | $163,000 | 97% |
| Enterprise Subs | $52,000* | $2,000 | $50,000 | 96% |
| Overage | $15,000 | $7,500 | $7,500 | 50% |

*Estimated based on subscriber growth curve

---

## 8. Affiliate Commission Impact

### Commission Structure by Tier

| Affiliate Tier | Commission Rate | Payout on Silver ($199) | Payout on Gold ($249) | Payout on Diamond ($299) |
|----------------|-----------------|-------------------------|----------------------|-------------------------|
| Standard | 30% | $59.70 | $74.70 | $89.70 |
| Silver | 35% | $69.65 | $87.15 | $104.65 |
| Gold | 40% | $79.60 | $99.60 | $119.60 |
| Platinum | 50% | $99.50 | $124.50 | $149.50 |

### Affiliate Revenue Impact (Founding Members)

Assuming 40% of founding member sales come through affiliates:

| Metric | Calculation | Amount |
|--------|-------------|--------|
| Affiliate-Driven Sales | 400 founders × avg $224 | $89,600 |
| Avg Commission Rate | 35% (weighted) | - |
| Total Affiliate Payouts | $89,600 × 35% | $31,360 |
| Net Revenue After Affiliates | $224,000 - $31,360 | $192,640 |

### Subscription Affiliate Commissions

| Plan | First Month Commission | Recurring Commission |
|------|----------------------|---------------------|
| Pro ($49) | 30% ($14.70) | 10% ($4.90) for 12 mo |
| Enterprise ($199) | 30% ($59.70) | 10% ($19.90) for 12 mo |

---

## 9. Unit Economics

### Pro Subscriber LTV

| Metric | Value |
|--------|-------|
| Monthly Price | $49 |
| Avg Lifetime (Months) | 18 |
| Gross LTV | $882 |
| Churn Rate (Est.) | 5%/month |
| Net LTV | $750 |

### Enterprise Subscriber LTV

| Metric | Value |
|--------|-------|
| Monthly Price | $199 |
| Avg Lifetime (Months) | 24 |
| Gross LTV | $4,776 |
| Churn Rate (Est.) | 3%/month |
| Net LTV | $4,200 |

### Customer Acquisition Cost (CAC) Targets

| Channel | Target CAC | LTV:CAC Ratio (Pro) | LTV:CAC Ratio (Ent) |
|---------|------------|---------------------|---------------------|
| Organic/SEO | $25 | 30:1 | 168:1 |
| Content Marketing | $50 | 15:1 | 84:1 |
| Paid Ads | $100 | 7.5:1 | 42:1 |
| Affiliate | $75* | 10:1 | 56:1 |

*Commission paid on conversion

---

## 10. Three-Year Revenue Forecast

### Optimistic Scenario

| Year | Founders | Subscriptions | Overage | Total Revenue |
|------|----------|---------------|---------|---------------|
| Year 1 | $224,000 | $235,000 | $15,000 | $474,000 |
| Year 2 | - | $650,000 | $50,000 | $700,000 |
| Year 3 | - | $1,200,000 | $120,000 | $1,320,000 |

### Conservative Scenario

| Year | Founders | Subscriptions | Overage | Total Revenue |
|------|----------|---------------|---------|---------------|
| Year 1 | $180,000* | $150,000 | $10,000 | $340,000 |
| Year 2 | - | $400,000 | $30,000 | $430,000 |
| Year 3 | - | $700,000 | $60,000 | $760,000 |

*Assumes 80% of founding member spots filled

### Profit Projections (Optimistic)

| Year | Revenue | Costs | Profit | Margin |
|------|---------|-------|--------|--------|
| Year 1 | $474,000 | $65,646 | $408,354 | 86% |
| Year 2 | $700,000 | $120,000 | $580,000 | 83% |
| Year 3 | $1,320,000 | $200,000 | $1,120,000 | 85% |

---

## 11. Key Performance Indicators (KPIs)

### Revenue KPIs

| KPI | Target | Tracking Frequency |
|-----|--------|-------------------|
| MRR Growth | 20%/month | Weekly |
| ARR | $500K by EOY1 | Monthly |
| Net Revenue Retention | >100% | Monthly |
| Expansion Revenue | 15% of MRR | Monthly |

### Customer KPIs

| KPI | Target | Tracking Frequency |
|-----|--------|-------------------|
| Free-to-Paid Conversion | 5% | Weekly |
| Pro-to-Enterprise Upgrade | 10% | Monthly |
| Churn Rate (Pro) | <5%/month | Weekly |
| Churn Rate (Enterprise) | <3%/month | Monthly |

### Operational KPIs

| KPI | Target | Tracking Frequency |
|-----|--------|-------------------|
| API Call Volume | 100K+/month | Daily |
| Cost per API Call | <$0.02 | Weekly |
| Infrastructure Cost % | <10% of revenue | Monthly |
| Support Ticket Volume | <50/week | Daily |

---

## 12. Summary: Total Revenue Opportunity

### Year 1 Revenue Summary

| Stream | Revenue | % of Total |
|--------|---------|------------|
| Founding Members | $224,000 | 47% |
| Subscriptions | $235,000 | 50% |
| Overage | $15,000 | 3% |
| **TOTAL** | **$474,000** | 100% |

### Year 1 Profit Summary

| Metric | Amount |
|--------|--------|
| Gross Revenue | $474,000 |
| Affiliate Payouts | ($31,360) |
| Operating Costs | ($65,646) |
| **Net Profit** | **$377,000** |
| **Net Margin** | **79.5%** |

### Break-Even Analysis

| Metric | Value |
|--------|-------|
| Monthly Fixed Costs | $3,200 |
| Avg Revenue per Pro Sub | $49 |
| Break-Even Subscribers | 66 Pro subscribers |
| Time to Break-Even | Month 2 (projected) |

---

*Financial projections are estimates based on market analysis and growth assumptions. Actual results may vary.*
