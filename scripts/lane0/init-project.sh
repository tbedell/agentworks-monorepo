#!/bin/bash

# AgentWorks - Lane 0: Initialize Project
# Creates a new project with Blueprint card and initial structure

set -e

PROJECT_NAME=${1:-"New AgentWorks Project"}
PROJECT_ID=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')

echo "🚀 Initializing AgentWorks Project: $PROJECT_NAME"
echo "📁 Project ID: $PROJECT_ID"

# Create project directories
echo "📂 Creating project structure..."
mkdir -p "projects/$PROJECT_ID/docs"
mkdir -p "projects/$PROJECT_ID/src"
mkdir -p "projects/$PROJECT_ID/tests"
mkdir -p "projects/$PROJECT_ID/scripts"

# Initialize project configuration
cat > "projects/$PROJECT_ID/project.json" << EOF
{
  "id": "$PROJECT_ID",
  "name": "$PROJECT_NAME",
  "status": "active",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "lanes": {
    "0": { "name": "Vision & CoPilot Planning", "cards": [] },
    "1": { "name": "PRD / MVP Definition", "cards": [] },
    "2": { "name": "Research", "cards": [] },
    "3": { "name": "Architecture & Stack", "cards": [] },
    "4": { "name": "Planning & Task Breakdown", "cards": [] },
    "5": { "name": "Scaffolding / Setup", "cards": [] },
    "6": { "name": "Build", "cards": [] },
    "7": { "name": "Test & QA", "cards": [] },
    "8": { "name": "Deploy", "cards": [] },
    "9": { "name": "Docs & Training", "cards": [] },
    "10": { "name": "Learn & Optimize", "cards": [] }
  },
  "agents": {
    "ceo_copilot": { "provider": "openai", "model": "gpt-4-turbo", "active": true },
    "strategy": { "provider": "openai", "model": "gpt-4-turbo", "active": false },
    "storyboard_ux": { "provider": "openai", "model": "gpt-4-turbo", "active": false },
    "prd": { "provider": "openai", "model": "gpt-4-turbo", "active": false },
    "mvp": { "provider": "openai", "model": "gpt-4-turbo", "active": false },
    "research": { "provider": "openai", "model": "gpt-4-turbo", "active": false },
    "architect": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "active": false },
    "planner": { "provider": "openai", "model": "gpt-4-turbo", "active": false },
    "devops": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "active": false },
    "dev_backend": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "active": false },
    "dev_frontend": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "active": false },
    "qa": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "active": false },
    "troubleshooter": { "provider": "google", "model": "gemini-1.5-pro", "active": false },
    "docs": { "provider": "openai", "model": "gpt-4-turbo", "active": false },
    "refactor": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "active": false }
  },
  "usage": {
    "total_calls": 0,
    "total_cost": 0.0,
    "total_price": 0.0,
    "calls_by_agent": {},
    "calls_by_provider": {}
  }
}
EOF

# Create initial Blueprint card
BLUEPRINT_CARD_ID=$(date +%s)
cat > "projects/$PROJECT_ID/docs/BLUEPRINT_CARD_$BLUEPRINT_CARD_ID.json" << EOF
{
  "id": "$BLUEPRINT_CARD_ID",
  "type": "Blueprint",
  "title": "$PROJECT_NAME - Project Blueprint",
  "description": "Define the project vision, strategy, and high-level requirements through CEO CoPilot Q&A session.",
  "lane": 0,
  "status": "pending",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "owner": "$(git config user.name || echo 'Unknown')",
  "assignee": "ceo_copilot",
  "tags": ["blueprint", "vision", "strategy"],
  "dependencies": [],
  "agent_runs": [],
  "artifacts": {
    "blueprint": "projects/$PROJECT_ID/docs/BLUEPRINT.md",
    "strategy": "projects/$PROJECT_ID/docs/STRATEGY.md",
    "ux_storyboards": "projects/$PROJECT_ID/docs/UX_STORYBOARDS.md"
  },
  "acceptance_criteria": [
    "Complete CEO CoPilot Q&A session covering problem, users, goals, constraints",
    "Generate comprehensive project Blueprint document",
    "Define product strategy with positioning and feature buckets",
    "Create initial UX storyboards and user flows",
    "Obtain human approval for Blueprint before moving to Lane 1"
  ]
}
EOF

# Create initial Blueprint skeleton
cat > "projects/$PROJECT_ID/docs/BLUEPRINT.md" << EOF
# $PROJECT_NAME - Project Blueprint

**Version:** 1.0  
**Date:** $(date +%Y-%m-%d)  
**Owner:** $(git config user.name || echo 'Unknown')  
**Editors:** CEO CoPilot Agent, Strategy Agent  

---

## 1. Problem Statement

*To be completed during CEO CoPilot Q&A session*

---

## 2. Vision

*To be completed during Strategy Agent analysis*

---

## 3. Target Users

*To be completed during CEO CoPilot Q&A session*

---

## 4. Goals

*To be completed during CEO CoPilot Q&A session*

---

## 5. Constraints & Assumptions

*To be completed during CEO CoPilot Q&A session*

---

## 6. High-Level Solution

*To be completed during Strategy Agent analysis*

---

## 7. Success Metrics

*To be completed during CEO CoPilot Q&A session*

---

## 8. Risks & Open Questions

*To be completed during CEO CoPilot Q&A session*

---
EOF

# Create agent run log directory
mkdir -p "projects/$PROJECT_ID/logs/agent_runs"

# Create initial project README
cat > "projects/$PROJECT_ID/README.md" << EOF
# $PROJECT_NAME

An AgentWorks-managed project following the agent-native Kanban methodology.

## Project Structure

- \`docs/\` - Project documentation (Blueprint, PRD, MVP, etc.)
- \`src/\` - Source code
- \`tests/\` - Test files
- \`scripts/\` - Project-specific scripts
- \`logs/\` - Agent execution logs

## Current Status

**Lane 0**: Vision & CoPilot Planning  
**Active Card**: Blueprint Card #$BLUEPRINT_CARD_ID  
**Next Step**: Run CEO CoPilot session to complete Blueprint

## Commands

\`\`\`bash
# Start CEO CoPilot session
./scripts/lane0/copilot-session.sh $PROJECT_ID

# Generate strategy analysis
./scripts/lane0/strategy-analysis.sh $PROJECT_ID

# Create UX storyboards
./scripts/lane0/ux-storyboards.sh $PROJECT_ID

# Finalize Blueprint
./scripts/lane0/finalize-blueprint.sh $PROJECT_ID
\`\`\`

## Agent Status

- 🤖 **CEO CoPilot**: Active (OpenAI GPT-4)
- 📋 **Strategy**: Ready (OpenAI GPT-4) 
- 🎨 **Storyboard/UX**: Ready (OpenAI GPT-4)
- 📄 **PRD**: Waiting (OpenAI GPT-4)
- 🎯 **MVP**: Waiting (OpenAI GPT-4)

---

*This project is managed by AgentWorks - Agent-native Kanban Platform*
EOF

echo "✅ Project '$PROJECT_NAME' initialized successfully!"
echo "📋 Blueprint card created: #$BLUEPRINT_CARD_ID"
echo "📂 Project directory: projects/$PROJECT_ID"
echo ""
echo "🚀 Next steps:"
echo "   1. cd projects/$PROJECT_ID"
echo "   2. Run: ../../scripts/lane0/copilot-session.sh $PROJECT_ID"
echo "   3. Complete CEO CoPilot Q&A session"
echo "   4. Review and approve Blueprint"
echo ""
echo "📊 Track progress at: http://localhost:3010/projects/$PROJECT_ID/board"