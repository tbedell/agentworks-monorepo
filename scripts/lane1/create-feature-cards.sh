#!/bin/bash

# AgentWorks - Lane 1: Create Feature Cards from MVP Definition
# Generates Kanban cards for all MVP features and organizes them by priority

set -e

PROJECT_ID=${1:-""}

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: Project ID required"
    echo "Usage: $0 <project-id>"
    exit 1
fi

PROJECT_DIR="projects/$PROJECT_ID"
PROJECT_CONFIG="$PROJECT_DIR/project.json"
MVP_FILE="$PROJECT_DIR/docs/MVP.md"

if [ ! -f "$MVP_FILE" ]; then
    echo "❌ Error: MVP definition not found: $MVP_FILE"
    echo "Define MVP first: ./scripts/lane1/define-mvp.sh $PROJECT_ID"
    exit 1
fi

PROJECT_NAME=$(jq -r '.name' "$PROJECT_CONFIG")
echo "🃏 Creating Feature Cards for Project: $PROJECT_NAME ($PROJECT_ID)"

# Create feature card generation log
CARD_LOG="$PROJECT_DIR/logs/agent_runs/feature_cards_$(date +%s).log"
echo "🃏 Feature Card Generation - $(date)" > "$CARD_LOG"
echo "Project: $PROJECT_NAME ($PROJECT_ID)" >> "$CARD_LOG"
echo "----------------------------------------" >> "$CARD_LOG"

# Create cards directory
CARDS_DIR="$PROJECT_DIR/cards"
mkdir -p "$CARDS_DIR"/{features,tasks,bugs,docs}

# Generate feature cards (would analyze MVP.md and create specific cards)
echo "📋 Generating feature cards from MVP definition..." | tee -a "$CARD_LOG"

# MVP Core Features (MUST HAVE)
cat > "$CARDS_DIR/features/FEATURE_001_user_auth.json" << EOF
{
  "id": "FEATURE_001",
  "type": "Feature",
  "priority": "MUST_HAVE",
  "title": "User Authentication & Registration",
  "description": "Core user authentication system with signup, login, password reset, and basic profile management.",
  "lane": 2,
  "status": "ready",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "assignee": "",
  "tags": ["mvp", "auth", "core"],
  "acceptance_criteria": [
    "Users can register with email/password",
    "Users can log in with valid credentials",
    "Password reset functionality works via email",
    "Basic user profile management available",
    "Session management and logout implemented"
  ],
  "user_stories": [
    "As a new user, I want to create an account so that I can access the platform",
    "As a returning user, I want to log in securely so that I can use my account",
    "As a user, I want to reset my password if I forget it",
    "As a user, I want to manage my profile information"
  ],
  "estimated_effort": "5 days",
  "dependencies": [],
  "agents_required": ["architect", "dev_backend", "dev_frontend", "qa"],
  "technical_notes": "OAuth integration for future enhancement, basic email verification required"
}
EOF

cat > "$CARDS_DIR/features/FEATURE_002_core_workflow.json" << EOF
{
  "id": "FEATURE_002", 
  "type": "Feature",
  "priority": "MUST_HAVE",
  "title": "Core User Workflow",
  "description": "Primary value-delivering workflow that represents the main user journey and core business logic.",
  "lane": 2,
  "status": "ready",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "assignee": "",
  "tags": ["mvp", "core", "workflow"],
  "acceptance_criteria": [
    "Users can complete the primary workflow end-to-end",
    "All critical business logic implemented correctly",
    "Proper error handling and validation in place",
    "Success feedback and next steps provided",
    "Mobile-responsive interface"
  ],
  "user_stories": [
    "As a user, I want to [complete core action] so that I [receive primary value]",
    "As a user, I want clear guidance through the process",
    "As a user, I want to see my progress and results",
    "As a user, I want to save/export my work"
  ],
  "estimated_effort": "8 days",
  "dependencies": ["FEATURE_001"],
  "agents_required": ["architect", "dev_backend", "dev_frontend", "qa"],
  "technical_notes": "Core business logic implementation, primary database entities"
}
EOF

cat > "$CARDS_DIR/features/FEATURE_003_dashboard.json" << EOF
{
  "id": "FEATURE_003",
  "type": "Feature", 
  "priority": "MUST_HAVE",
  "title": "User Dashboard",
  "description": "Main interface hub with navigation, recent activity, quick actions, and status overview.",
  "lane": 2,
  "status": "ready",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "assignee": "",
  "tags": ["mvp", "ui", "dashboard"],
  "acceptance_criteria": [
    "Clean, intuitive dashboard interface",
    "Primary navigation clearly visible",
    "Recent activity/history displayed",
    "Quick access to core actions",
    "Responsive design for mobile/tablet"
  ],
  "user_stories": [
    "As a user, I want a central hub to access all features",
    "As a user, I want to see my recent activity at a glance", 
    "As a user, I want quick access to common actions",
    "As a user, I want clear navigation to all sections"
  ],
  "estimated_effort": "4 days",
  "dependencies": ["FEATURE_001"],
  "agents_required": ["dev_frontend", "storyboard_ux", "qa"],
  "technical_notes": "Component-based design, state management, routing"
}
EOF

# MVP Enhancement Features (SHOULD HAVE)
cat > "$CARDS_DIR/features/FEATURE_004_onboarding.json" << EOF
{
  "id": "FEATURE_004",
  "type": "Feature",
  "priority": "SHOULD_HAVE", 
  "title": "User Onboarding & Tutorial",
  "description": "Guided onboarding experience to help new users understand the platform and reach first value quickly.",
  "lane": 2,
  "status": "ready",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "assignee": "",
  "tags": ["mvp", "onboarding", "ux"],
  "acceptance_criteria": [
    "Interactive onboarding flow for new users",
    "Progress indicators and skip options",
    "Contextual help and tooltips",
    "Empty states with clear next steps",
    "Optional tutorial replay functionality"
  ],
  "user_stories": [
    "As a new user, I want guided setup so I can get started quickly",
    "As a new user, I want to understand key features without being overwhelmed",
    "As a user, I want to skip onboarding if I'm already familiar",
    "As a user, I want to access help when I need it"
  ],
  "estimated_effort": "3 days",
  "dependencies": ["FEATURE_003"],
  "agents_required": ["storyboard_ux", "dev_frontend", "qa"],
  "technical_notes": "Progressive disclosure, localStorage for progress tracking"
}
EOF

cat > "$CARDS_DIR/features/FEATURE_005_settings.json" << EOF
{
  "id": "FEATURE_005",
  "type": "Feature",
  "priority": "SHOULD_HAVE",
  "title": "User Settings & Preferences", 
  "description": "User account settings, preferences, and configuration options.",
  "lane": 2,
  "status": "ready",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "assignee": "",
  "tags": ["mvp", "settings", "profile"],
  "acceptance_criteria": [
    "User profile editing functionality",
    "Email/notification preferences",
    "Privacy and data settings",
    "Account security options",
    "Theme/display preferences"
  ],
  "user_stories": [
    "As a user, I want to update my profile information",
    "As a user, I want to control notification settings",
    "As a user, I want to manage my privacy preferences",
    "As a user, I want to change my password securely"
  ],
  "estimated_effort": "3 days",
  "dependencies": ["FEATURE_001"],
  "agents_required": ["dev_backend", "dev_frontend", "qa"],
  "technical_notes": "Form validation, secure password updates, preference persistence"
}
EOF

# Future Features (COULD HAVE)
cat > "$CARDS_DIR/features/FEATURE_006_analytics.json" << EOF
{
  "id": "FEATURE_006",
  "type": "Feature",
  "priority": "COULD_HAVE",
  "title": "User Analytics & Insights",
  "description": "Usage analytics, activity tracking, and user insights dashboard.",
  "lane": 2,
  "status": "backlog", 
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "assignee": "",
  "tags": ["analytics", "insights", "v1.1"],
  "acceptance_criteria": [
    "User activity tracking and visualization",
    "Usage statistics and trends",
    "Performance metrics dashboard",
    "Export capabilities for data",
    "Privacy-compliant data collection"
  ],
  "user_stories": [
    "As a user, I want to see my usage patterns and progress",
    "As a user, I want insights into my activity trends",
    "As a user, I want to export my data",
    "As an admin, I want aggregate usage statistics"
  ],
  "estimated_effort": "5 days",
  "dependencies": ["FEATURE_002", "FEATURE_003"],
  "agents_required": ["architect", "dev_backend", "dev_frontend"],
  "technical_notes": "Analytics integration, data visualization, GDPR compliance"
}
EOF

cat > "$CARDS_DIR/features/FEATURE_007_collaboration.json" << EOF
{
  "id": "FEATURE_007",
  "type": "Feature",
  "priority": "COULD_HAVE",
  "title": "Collaboration Features",
  "description": "Team collaboration, sharing, and multi-user workflows.",
  "lane": 2,
  "status": "backlog",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "assignee": "",
  "tags": ["collaboration", "sharing", "v1.2"],
  "acceptance_criteria": [
    "Share work with other users",
    "Team/workspace functionality", 
    "Real-time collaboration features",
    "Permission and access controls",
    "Activity feeds and notifications"
  ],
  "user_stories": [
    "As a user, I want to share my work with team members",
    "As a user, I want to collaborate in real-time",
    "As a team admin, I want to manage user permissions",
    "As a user, I want to see team activity and updates"
  ],
  "estimated_effort": "10 days",
  "dependencies": ["FEATURE_001", "FEATURE_002"],
  "agents_required": ["architect", "dev_backend", "dev_frontend", "qa"],
  "technical_notes": "Multi-tenancy, real-time sync, WebSocket implementation"
}
EOF

echo "🃏 Generated 7 feature cards successfully" | tee -a "$CARD_LOG"

# Create Epic card that groups MVP features
cat > "$CARDS_DIR/features/EPIC_001_mvp_release.json" << EOF
{
  "id": "EPIC_001",
  "type": "Epic",
  "priority": "MUST_HAVE",
  "title": "$PROJECT_NAME MVP Release",
  "description": "Complete MVP implementation including core authentication, primary workflow, and essential user experience features.",
  "lane": 1,
  "status": "in_progress",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "assignee": "ceo_copilot",
  "tags": ["epic", "mvp", "release"],
  "child_features": [
    "FEATURE_001", "FEATURE_002", "FEATURE_003", 
    "FEATURE_004", "FEATURE_005"
  ],
  "acceptance_criteria": [
    "All MUST_HAVE features completed and tested",
    "All SHOULD_HAVE features completed (if time permits)",
    "End-to-end user workflow functional",
    "Performance and security requirements met",
    "User acceptance testing passed"
  ],
  "success_metrics": [
    "User signup and activation rate",
    "Core workflow completion rate", 
    "User retention after first use",
    "Time to first value < 5 minutes",
    "Customer satisfaction score > 4.0/5.0"
  ],
  "estimated_effort": "4-6 weeks",
  "target_completion": "$(date -d '+6 weeks' +%Y-%m-%d)",
  "dependencies": [],
  "agents_required": ["ceo_copilot", "architect", "planner", "dev_backend", "dev_frontend", "qa", "docs"],
  "technical_notes": "Foundation for all future development, focus on core value delivery"
}
EOF

echo "📊 Created MVP Epic to group all core features" | tee -a "$CARD_LOG"

# Create card summary report
cat > "$PROJECT_DIR/docs/FEATURE_CARD_SUMMARY.md" << EOF
# Feature Card Summary - $PROJECT_NAME

**Generated:** $(date +%Y-%m-%d\ %H:%M:%S)  
**Based on:** MVP Definition v1.0  
**Total Cards Created:** 8 (1 Epic + 7 Features)

---

## Epic Overview

### EPIC_001: $PROJECT_NAME MVP Release
- **Scope:** Complete MVP with core features
- **Timeline:** 4-6 weeks  
- **Features:** 5 core features (3 MUST + 2 SHOULD)
- **Success Metrics:** User activation, workflow completion, retention

---

## Feature Breakdown by Priority

### 🔴 MUST HAVE Features (MVP Core)
*Essential features that define MVP viability*

| ID | Feature | Effort | Dependencies |
|----|---------|--------|--------------|
| **FEATURE_001** | User Authentication & Registration | 5 days | None |
| **FEATURE_002** | Core User Workflow | 8 days | FEATURE_001 |
| **FEATURE_003** | User Dashboard | 4 days | FEATURE_001 |

**Total Core Effort:** 17 days

### 🟡 SHOULD HAVE Features (MVP Enhancement)  
*Important features that improve MVP experience*

| ID | Feature | Effort | Dependencies |
|----|---------|--------|--------------|
| **FEATURE_004** | User Onboarding & Tutorial | 3 days | FEATURE_003 |
| **FEATURE_005** | User Settings & Preferences | 3 days | FEATURE_001 |

**Total Enhancement Effort:** 6 days

### 🔵 COULD HAVE Features (Future Versions)
*Post-MVP features for v1.1 and beyond*

| ID | Feature | Target Version | Effort |
|----|---------|----------------|--------|
| **FEATURE_006** | User Analytics & Insights | v1.1 | 5 days |
| **FEATURE_007** | Collaboration Features | v1.2 | 10 days |

---

## Development Timeline

### Phase 1: Foundation (Week 1-2)
- Infrastructure setup and core architecture
- **FEATURE_001**: Authentication system
- **FEATURE_003**: Basic dashboard

### Phase 2: Core Value (Week 3-4)  
- **FEATURE_002**: Primary workflow implementation
- Integration and end-to-end testing
- **FEATURE_004**: Onboarding (if time permits)

### Phase 3: Polish & Launch (Week 5-6)
- **FEATURE_005**: Settings (if time permits)
- Quality assurance and bug fixes
- Performance optimization
- Launch preparation

---

## Agent Assignments

### Architecture Phase (Lane 3)
- **Architect Agent**: Design system architecture for all features
- **Research Agent**: Investigate technical requirements

### Development Phase (Lane 6)
- **Dev Backend Agent**: API and database implementation
- **Dev Frontend Agent**: UI components and user experience
- **DevOps Agent**: Infrastructure and deployment setup

### Quality Phase (Lane 7)
- **QA Agent**: Test planning and execution
- **Troubleshooter Agent**: Bug investigation and fixes

---

## Card Management

### Card Storage
All feature cards are stored in: \`$PROJECT_DIR/cards/features/\`

### Card Status Flow
1. **Ready** → Available for development
2. **In Progress** → Currently being worked on  
3. **Review** → Completed, awaiting approval
4. **Done** → Accepted and merged
5. **Backlog** → Future development (COULD HAVE features)

### Card Updates
- Use \`./scripts/lane1/update-card-status.sh FEATURE_ID STATUS\`
- Track progress in project.json lanes configuration
- Agent runs automatically update card status

---

## Success Criteria

### MVP Launch Readiness
- [ ] All MUST_HAVE features completed (FEATURE_001, 002, 003)
- [ ] At least 1 SHOULD_HAVE feature completed  
- [ ] End-to-end workflows tested and functional
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] User acceptance testing passed

### Post-MVP Iterations
- **v1.1 (MVP + 4 weeks):** Add analytics and remaining SHOULD_HAVE features
- **v1.2 (MVP + 8 weeks):** Begin collaboration features
- **v2.0 (MVP + 12 weeks):** Major feature expansion based on user feedback

---

## Next Steps

1. **Architecture Design:** \`./scripts/build/design-architecture.sh $PROJECT_ID\`
2. **Task Breakdown:** \`./scripts/build/breakdown-tasks.sh $PROJECT_ID\` 
3. **Development Start:** Begin with FEATURE_001 (Authentication)

---

*Feature cards generated by AgentWorks based on MVP Definition v1.0*
EOF

echo "📋 Feature card summary generated" | tee -a "$CARD_LOG"

# Update project status with feature cards
jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
  '.feature_cards = {
    "total": 8,
    "epic": 1, 
    "must_have": 3,
    "should_have": 2,
    "could_have": 2,
    "estimated_effort_days": 23
  } |
  .lanes["1"].cards += [{"type": "feature_cards", "status": "completed", "created": $timestamp, "artifact": "cards/features/"}] |
  .lanes["1"].status = "completed" |
  .lanes["1"].completed_at = $timestamp |
  .lanes["2"].status = "ready" |
  .status = "lane2_ready" |
  .updated = $timestamp' \
  "$PROJECT_CONFIG" > "$PROJECT_CONFIG.tmp" && mv "$PROJECT_CONFIG.tmp" "$PROJECT_CONFIG"

echo "" | tee -a "$CARD_LOG"
echo "✅ Feature Card Generation Complete!" | tee -a "$CARD_LOG"
echo "" | tee -a "$CARD_LOG"
echo "📊 Generated Cards Summary:"
echo "   🔴 MUST HAVE: 3 features (17 days effort)"
echo "   🟡 SHOULD HAVE: 2 features (6 days effort)" 
echo "   🔵 COULD HAVE: 2 features (future versions)"
echo "   📋 Epic: 1 MVP release epic"
echo ""
echo "✅ Lane 1 Complete - Ready for Architecture"
echo "➡️ Lane 2 Activated - Research & Architecture Phase"
echo ""
echo "📂 Feature Cards Location: $PROJECT_DIR/cards/features/"
echo "📄 Summary Report: $PROJECT_DIR/docs/FEATURE_CARD_SUMMARY.md"
echo ""
echo "🚀 Next Steps:"
echo "   1. Design architecture: ./scripts/build/design-architecture.sh $PROJECT_ID"
echo "   2. Research requirements: ./scripts/build/research-requirements.sh $PROJECT_ID" 
echo "   3. Break down tasks: ./scripts/build/breakdown-tasks.sh $PROJECT_ID"