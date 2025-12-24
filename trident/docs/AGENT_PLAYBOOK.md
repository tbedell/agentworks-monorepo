# AgentWorks Trident - Agent Playbook

**Version**: 1.0
**Author**: Thomas R. Bedell
**Date**: December 24, 2024

---

## Overview

This playbook defines the AI agents that power Trident workflows. Unlike the development-focused agents in AgentWorks Studio, Trident agents are **operations specialists** designed to execute business processes with Speed, Leverage, and Precision.

---

## Agent Philosophy

### The Trident Agent Principles

1. **Deterministic Over Creative**: Agents follow SOPs exactly. No improvisation.
2. **Action Over Analysis**: Agents execute, not deliberate.
3. **Escalation Over Failure**: When uncertain, escalate to human. Never guess.
4. **Audit Over Silence**: Log every action. Prove every decision.

### Agent vs Human Responsibility

| Task Type | Agent Responsibility | Human Responsibility |
|-----------|---------------------|---------------------|
| Routine data collection | 100% automated | Review exceptions |
| Standard communications | Draft and send | Review escalations |
| Decision with clear rules | Execute per rules | Define rules |
| Ambiguous situations | Flag and pause | Make decision |
| Financial transactions | Prepare and queue | Approve and release |

---

## Agent Registry (Trident Operations)

### 1. Collections Agent

**Role**: Manage accounts receivable and payment collection

**System Prompt**:
```
You are a professional collections agent. Your job is to collect outstanding invoices
while maintaining positive customer relationships.

RULES:
1. Always be polite but firm
2. Follow the escalation schedule exactly
3. Never threaten legal action unless authorized
4. Log every customer interaction
5. Escalate accounts over 90 days to human review

ESCALATION SCHEDULE:
- Day 1 after due: Friendly reminder email
- Day 7: Follow-up email with payment link
- Day 14: Phone call script (via SMS)
- Day 30: Formal demand letter
- Day 60: Final notice before escalation
- Day 90: Escalate to human
```

**Capabilities**:
- Send emails via connected email service
- Send SMS via Twilio
- Update invoice status in QuickBooks/Xero
- Calculate interest and late fees
- Generate collection reports

**Trident Metrics**:
- Velocity: Reduce DSO from 45 to 7 days
- Leverage: Handle 500+ accounts per instance
- Precision: 99.9% follow-up compliance

---

### 2. Lead Nurture Agent

**Role**: Re-engage cold leads and warm them for sales

**System Prompt**:
```
You are a professional lead nurture specialist. Your job is to re-engage cold leads
and qualify them for sales follow-up.

RULES:
1. Personalize every message using available data
2. Never be pushy or aggressive
3. Focus on providing value, not selling
4. Track engagement signals (opens, clicks, replies)
5. Escalate hot leads (3+ engagements) to sales immediately

SEQUENCE:
- Day 0: Initial re-engagement email
- Day 3: Value content email (case study, guide)
- Day 7: Question email (discovery)
- Day 14: Social proof email (testimonial)
- Day 21: Direct ask email (meeting request)
- Day 30: Break-up email (last chance)

QUALIFICATION CRITERIA:
- Hot: 3+ email opens, 1+ reply
- Warm: 2+ email opens, no reply
- Cold: 0-1 opens, no engagement
```

**Capabilities**:
- Send personalized emails
- Track email engagement
- Update CRM lead status
- Schedule meetings via calendar
- Generate lead score

**Trident Metrics**:
- Velocity: Re-engage within 24 hours of trigger
- Leverage: Nurture 1,000+ leads per instance
- Precision: 100% sequence completion

---

### 3. Onboarding Agent

**Role**: Manage employee onboarding process

**System Prompt**:
```
You are an HR onboarding specialist. Your job is to ensure every new hire
has a smooth, complete onboarding experience.

RULES:
1. Send welcome package on hire date - 7 days
2. Collect all required documents before Day 1
3. Schedule orientation meetings
4. Assign training courses
5. Follow up on incomplete items daily
6. Escalate blocked items to HR manager

DOCUMENT CHECKLIST:
- [ ] I-9 Form
- [ ] W-4 Form
- [ ] Direct deposit authorization
- [ ] Emergency contact info
- [ ] Benefits enrollment
- [ ] Handbook acknowledgment
- [ ] Equipment request

TRAINING CHECKLIST:
- [ ] Company overview
- [ ] Security training
- [ ] Harassment prevention
- [ ] Role-specific training
```

**Capabilities**:
- Send document collection links
- Track document completion
- Schedule calendar events
- Assign training in LMS
- Generate onboarding status reports

**Trident Metrics**:
- Velocity: Complete onboarding in 2 hours active time
- Leverage: Handle 50+ concurrent hires
- Precision: 100% document collection

---

### 4. Patient Engagement Agent

**Role**: Manage patient communication and appointment adherence

**System Prompt**:
```
You are a patient engagement specialist. Your job is to ensure patients
attend appointments and follow care plans.

RULES:
1. Always maintain HIPAA compliance
2. Use friendly, non-clinical language
3. Provide clear appointment details
4. Offer rescheduling, not cancellation
5. Escalate no-shows to care coordinator

REMINDER SEQUENCE (Appointments):
- 7 days before: Email confirmation
- 2 days before: SMS reminder
- 1 day before: SMS with prep instructions
- 2 hours before: Final SMS reminder
- After no-show: Follow-up call request

RECALL SEQUENCE (Preventive Care):
- Due date - 30 days: Email reminder
- Due date - 14 days: SMS + email
- Due date - 7 days: Phone call request
- Due date: Final reminder
- Due date + 14 days: Escalate to care team
```

**Capabilities**:
- Send HIPAA-compliant messages
- Schedule appointments
- Update patient records
- Generate adherence reports
- Integrate with EHR systems

**Trident Metrics**:
- Velocity: Send reminders same-day
- Leverage: Manage 5,000+ patients per instance
- Precision: 95%+ show rate

---

### 5. Compliance Tracker Agent

**Role**: Track and collect compliance documents from subcontractors

**System Prompt**:
```
You are a compliance tracking specialist for construction projects. Your job is to
ensure all subcontractors maintain valid insurance and documentation.

RULES:
1. Never allow work without valid COI
2. Verify coverage amounts meet project requirements
3. Track expiration dates proactively
4. Send renewal reminders 30 days before expiry
5. Escalate non-compliant subs to project manager

REQUIRED DOCUMENTS:
- [ ] Certificate of Insurance (COI)
- [ ] W-9 Form
- [ ] Signed contract
- [ ] Safety certification
- [ ] Lien waiver (per payment)

COI REQUIREMENTS:
- General Liability: $1M per occurrence, $2M aggregate
- Auto Liability: $1M combined single limit
- Workers Comp: Statutory limits
- Umbrella: $5M (projects over $500K)

VERIFICATION PROCESS:
1. Receive document upload
2. Extract key data (coverage, dates, limits)
3. Validate against requirements
4. Flag discrepancies
5. Update compliance status
6. Notify project manager of changes
```

**Capabilities**:
- Extract data from uploaded documents (OCR/AI)
- Verify insurance coverage
- Track expiration dates
- Send automated reminders
- Generate compliance reports

**Trident Metrics**:
- Velocity: Verify documents in < 1 hour
- Leverage: Track 100+ subcontractors per project
- Precision: 99%+ compliance rate

---

## Agent Node Types

Trident workflows use specialized node types for business operations:

### Communication Nodes

| Node Type | Purpose | Parameters |
|-----------|---------|------------|
| `email` | Send/receive emails | to, subject, body, template |
| `sms` | Send SMS messages | to, body, template |
| `notification` | In-app notifications | userId, message, type |

### Financial Nodes

| Node Type | Purpose | Parameters |
|-----------|---------|------------|
| `invoice` | Create/send invoices | customerId, lineItems, dueDate |
| `payment` | Process payments | invoiceId, amount, method |
| `reminder` | Send payment reminders | invoiceId, template, channel |

### Scheduling Nodes

| Node Type | Purpose | Parameters |
|-----------|---------|------------|
| `calendar` | Create/update events | title, start, end, attendees |
| `appointment` | Book appointments | providerId, patientId, type |
| `wait` | Delay execution | duration, unit |

### Document Nodes

| Node Type | Purpose | Parameters |
|-----------|---------|------------|
| `document` | Generate documents | template, data, format |
| `form` | Collect form data | formId, assignee, deadline |
| `signature` | Request e-signature | documentId, signers |

### Logic Nodes

| Node Type | Purpose | Parameters |
|-----------|---------|------------|
| `condition` | Branch on condition | expression, trueTarget, falseTarget |
| `loop` | Iterate over collection | collection, itemVariable |
| `ai_analyze` | AI classification | input, categories, confidence |
| `ai_generate` | AI content creation | prompt, maxTokens, temperature |

### Control Nodes

| Node Type | Purpose | Parameters |
|-----------|---------|------------|
| `trigger` | Start workflow | type (schedule, webhook, event) |
| `approval` | Human approval gate | approver, message, timeout |
| `escalation` | Escalate to human | assignee, reason, priority |

---

## Workflow Templates

### Template 1: Invoice Chaser

```yaml
name: Invoice Chaser
trigger: daily_schedule (9:00 AM)

nodes:
  - id: get_overdue
    type: database
    query: SELECT * FROM invoices WHERE due_date < NOW() AND status = 'unpaid'

  - id: loop_invoices
    type: loop
    collection: get_overdue.results

  - id: check_days_overdue
    type: condition
    expression: item.days_overdue

  - id: send_reminder_email
    type: email
    template: friendly_reminder
    when: days_overdue < 7

  - id: send_followup_email
    type: email
    template: followup_reminder
    when: days_overdue >= 7 AND days_overdue < 14

  - id: send_demand_letter
    type: email
    template: demand_letter
    when: days_overdue >= 30 AND days_overdue < 60

  - id: escalate_to_human
    type: escalation
    when: days_overdue >= 90
    assignee: ar_manager
    reason: "Invoice {invoice_number} is 90+ days overdue"

  - id: log_action
    type: database
    action: INSERT INTO collection_log (invoice_id, action, timestamp)
```

### Template 2: Lead Resurrection

```yaml
name: Lead Resurrection
trigger: manual_or_scheduled

nodes:
  - id: get_cold_leads
    type: database
    query: SELECT * FROM leads WHERE last_activity < NOW() - INTERVAL '90 days'

  - id: loop_leads
    type: loop
    collection: get_cold_leads.results

  - id: enrich_lead
    type: ai_analyze
    prompt: "Analyze this lead and personalize outreach: {lead.data}"

  - id: send_reengagement_email
    type: email
    template: reengagement_1
    personalization: enrich_lead.output

  - id: wait_3_days
    type: wait
    duration: 3
    unit: days

  - id: check_engagement
    type: condition
    expression: lead.email_opened OR lead.email_clicked

  - id: send_value_email
    type: email
    template: value_content
    when: NOT engaged

  - id: escalate_hot_lead
    type: escalation
    when: engaged
    assignee: sales_rep
    reason: "Hot lead: {lead.name} engaged with reengagement"
```

### Template 3: Patient Recall

```yaml
name: Patient Recall
trigger: daily_schedule (8:00 AM)

nodes:
  - id: get_due_patients
    type: database
    query: |
      SELECT * FROM patients
      WHERE next_preventive_care < NOW() + INTERVAL '30 days'
      AND recall_status = 'pending'

  - id: loop_patients
    type: loop
    collection: get_due_patients.results

  - id: calculate_urgency
    type: condition
    expression: days_until_due

  - id: send_email_reminder
    type: email
    template: preventive_care_reminder
    when: days_until_due > 14

  - id: send_sms_reminder
    type: sms
    template: preventive_care_sms
    when: days_until_due <= 14 AND days_until_due > 7

  - id: request_phone_call
    type: escalation
    when: days_until_due <= 7
    assignee: care_coordinator
    reason: "Patient {patient.name} needs preventive care call"

  - id: update_recall_status
    type: database
    action: UPDATE patients SET recall_status = 'contacted'
```

---

## Agent Configuration

### Provider Settings

| Agent Type | Recommended Provider | Model | Temperature |
|------------|---------------------|-------|-------------|
| Collections | OpenAI | gpt-4-turbo | 0.3 |
| Lead Nurture | Anthropic | claude-3-sonnet | 0.5 |
| Onboarding | OpenAI | gpt-4-turbo | 0.2 |
| Patient Engagement | OpenAI | gpt-4-turbo | 0.3 |
| Compliance Tracker | Anthropic | claude-3-sonnet | 0.1 |

### Token Limits

| Agent Type | Max Tokens (Input) | Max Tokens (Output) |
|------------|-------------------|---------------------|
| Collections | 4,000 | 1,000 |
| Lead Nurture | 8,000 | 2,000 |
| Onboarding | 4,000 | 1,000 |
| Patient Engagement | 4,000 | 1,000 |
| Compliance Tracker | 8,000 | 2,000 |

### Rate Limits

| Agent Type | Max Executions/Hour | Max Emails/Day |
|------------|--------------------|-----------------|
| Collections | 100 | 500 |
| Lead Nurture | 50 | 1,000 |
| Onboarding | 200 | 200 |
| Patient Engagement | 500 | 2,000 |
| Compliance Tracker | 100 | 100 |

---

## Escalation Protocols

### When to Escalate

| Trigger | Escalation Target | Response SLA |
|---------|-------------------|--------------|
| Invoice 90+ days overdue | AR Manager | 24 hours |
| Lead replies with objection | Sales Rep | 1 hour |
| Document rejected 2+ times | HR Manager | 4 hours |
| Patient no-show 2+ times | Care Coordinator | Same day |
| COI coverage insufficient | Project Manager | Immediate |

### Escalation Message Format

```
Subject: [ESCALATION] {entity_type}: {entity_name}

Priority: {HIGH | MEDIUM | LOW}
Workflow: {workflow_name}
Triggered: {timestamp}

SITUATION:
{brief description of what triggered escalation}

ATTEMPTED ACTIONS:
- {action_1} at {timestamp_1}: {result_1}
- {action_2} at {timestamp_2}: {result_2}

RECOMMENDED ACTION:
{what the human should do}

ENTITY DETAILS:
{relevant entity information}

[View in Dashboard] [Mark Resolved]
```

---

## Audit Logging

### Log Entry Format

```json
{
  "id": "log_uuid",
  "timestamp": "2024-12-24T10:30:00Z",
  "workflowId": "workflow_uuid",
  "executionId": "execution_uuid",
  "agentType": "collections",
  "action": "email_sent",
  "entityType": "invoice",
  "entityId": "inv_12345",
  "summary": "Sent friendly reminder email for Invoice #12345",
  "details": {
    "template": "friendly_reminder",
    "recipient": "customer@example.com",
    "subject": "Friendly Reminder: Invoice #12345 Due"
  },
  "result": "success",
  "durationMs": 1250
}
```

### Human-Readable Log Display

Instead of showing raw logs, the Insight Log displays:

| Time | Action | Summary |
|------|--------|---------|
| 10:30 AM | Email Sent | Sent friendly reminder for Invoice #12345 to customer@example.com |
| 10:31 AM | Status Updated | Marked Invoice #12345 as "Reminder Sent" |
| 10:45 AM | Escalation | Escalated Invoice #67890 (90+ days) to AR Manager |

---

## Error Handling

### Retry Strategy

| Error Type | Retry Count | Backoff |
|------------|-------------|---------|
| Rate limit | 3 | Exponential (1s, 2s, 4s) |
| Timeout | 2 | Linear (5s, 10s) |
| API error (5xx) | 3 | Exponential (5s, 10s, 20s) |
| Auth error (401) | 0 | Escalate immediately |
| Validation error | 0 | Log and skip |

### Failure Notifications

When a workflow fails after retries:
1. Log error with full context
2. Update execution status to "failed"
3. Send notification to workflow owner
4. Create escalation ticket (if configured)

---

## Security Considerations

### Data Handling

1. **PII Masking**: Mask sensitive data in logs (email → e***@example.com)
2. **Encryption**: All credentials encrypted at rest
3. **Token Rotation**: OAuth tokens refreshed before expiry
4. **Audit Trail**: Immutable logs for all data access

### Compliance

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| HIPAA | PHI protection | Encryption, access controls, BAA |
| GDPR | Data rights | Export, deletion, consent tracking |
| SOC 2 | Security controls | Audit logs, access reviews |
| PCI DSS | Payment data | No storage, tokenization |

---

## Agent Metrics & Monitoring

### Key Performance Indicators

| Metric | Calculation | Target |
|--------|-------------|--------|
| Success Rate | (Completed / Total) × 100 | > 95% |
| Average Execution Time | Sum(duration) / Count | < 30s |
| Escalation Rate | (Escalated / Total) × 100 | < 10% |
| Error Rate | (Failed / Total) × 100 | < 2% |

### Alerting Thresholds

| Condition | Alert Level | Action |
|-----------|-------------|--------|
| Success rate < 90% | Warning | Notify owner |
| Success rate < 80% | Critical | Pause workflow |
| Error rate > 5% | Warning | Notify owner |
| Error rate > 10% | Critical | Pause workflow |
| Execution backlog > 100 | Warning | Scale up |

---

**Agents don't replace humans. They amplify them.**

Speed. Leverage. Precision.
