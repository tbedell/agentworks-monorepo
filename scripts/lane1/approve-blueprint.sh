#!/bin/bash

# AgentWorks - Lane 1: Approve Blueprint and Generate PRD
# Approves completed Blueprint and initiates PRD generation

set -e

PROJECT_ID=${1:-""}

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: Project ID required"
    echo "Usage: $0 <project-id>"
    exit 1
fi

PROJECT_DIR="projects/$PROJECT_ID"
BLUEPRINT_FILE="$PROJECT_DIR/docs/BLUEPRINT.md"
PROJECT_CONFIG="$PROJECT_DIR/project.json"

if [ ! -f "$BLUEPRINT_FILE" ]; then
    echo "❌ Error: Blueprint not found: $BLUEPRINT_FILE"
    echo "Complete Lane 0 first: ./scripts/lane0/init-project.sh"
    exit 1
fi

PROJECT_NAME=$(jq -r '.name' "$PROJECT_CONFIG")
echo "🎯 Approving Blueprint for Project: $PROJECT_NAME ($PROJECT_ID)"
echo "📋 Transitioning to Lane 1: PRD & MVP Definition"

# Create approval log
APPROVAL_LOG="$PROJECT_DIR/logs/agent_runs/blueprint_approval_$(date +%s).log"
echo "🎯 Blueprint Approval - $(date)" > "$APPROVAL_LOG"
echo "Project: $PROJECT_NAME ($PROJECT_ID)" >> "$APPROVAL_LOG"
echo "----------------------------------------" >> "$APPROVAL_LOG"

# Update Blueprint with approval
sed -i 's/- \[⏳\] \*\*Blueprint Approved:\*\* Awaiting Decision/- [✅] **Blueprint Approved:** $(date +%Y-%m-%d)/' "$BLUEPRINT_FILE"

# Generate approval record
cat > "$PROJECT_DIR/docs/BLUEPRINT_APPROVAL.md" << EOF
# Blueprint Approval Record

**Project:** $PROJECT_NAME  
**Project ID:** $PROJECT_ID  
**Approved:** $(date +%Y-%m-%d\ %H:%M:%S)  
**Approved By:** $(git config user.name || echo 'Unknown')  

---

## Approval Summary

✅ **Blueprint has been approved and is now the official project specification**

### What This Means
- Vision, strategy, and UX direction are locked
- PRD generation can begin based on approved Blueprint
- Development planning can proceed with confidence
- Changes to core vision now require formal change management

### Approved Documents
- [x] **BLUEPRINT.md** - Core project specification
- [x] **STRATEGY_ANALYSIS.md** - Market and competitive positioning  
- [x] **UX_STORYBOARDS.md** - User flows and interface design
- [x] **QA_SESSION_*.md** - Requirements gathering session

---

## Lane 1 Activation

With Blueprint approval, the following agents are now active:

### PRD Agent (OpenAI GPT-4)
- **Objective:** Generate comprehensive Product Requirements Document
- **Input:** Approved Blueprint + Strategy Analysis + UX Storyboards
- **Output:** Detailed functional and non-functional requirements

### MVP Agent (OpenAI GPT-4)  
- **Objective:** Define minimal viable product scope
- **Input:** Generated PRD
- **Output:** MVP feature list and exclusion criteria

---

## Next Steps

1. **PRD Generation:** ./scripts/lane1/generate-prd.sh $PROJECT_ID
2. **MVP Definition:** ./scripts/lane1/define-mvp.sh $PROJECT_ID  
3. **Feature Card Creation:** ./scripts/lane1/create-feature-cards.sh $PROJECT_ID

---

## Change Management

Any changes to approved Blueprint require:
- Formal change request documentation
- Impact analysis on PRD and downstream work
- Re-approval if changes affect core vision or strategy
- Update to all dependent documents

---

*Blueprint approved and Lane 1 activated on $(date)*
EOF

echo "✅ Blueprint approved and documented" | tee -a "$APPROVAL_LOG"

# Update project status - move to Lane 1
jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" --arg approver "$(git config user.name || echo 'Unknown')" \
  '.status = "lane1_active" |
   .blueprint_approved = true |
   .blueprint_approval = {
     "approved_by": $approver,
     "approved_at": $timestamp,
     "version": "1.0"
   } |
   .lanes["0"].status = "completed" |
   .lanes["0"].completed_at = $timestamp |
   .lanes["1"].status = "active" |
   .lanes["1"].activated_at = $timestamp |
   .agents.prd.active = true |
   .agents.mvp.active = true |
   .updated = $timestamp' \
  "$PROJECT_CONFIG" > "$PROJECT_CONFIG.tmp" && mv "$PROJECT_CONFIG.tmp" "$PROJECT_CONFIG"

echo "🔄 Project status updated - Lane 1 activated" | tee -a "$APPROVAL_LOG"

# Auto-generate PRD
echo "🚀 Auto-starting PRD generation..." | tee -a "$APPROVAL_LOG"
"$PWD/scripts/lane1/generate-prd.sh" "$PROJECT_ID" | tee -a "$APPROVAL_LOG"

echo "" | tee -a "$APPROVAL_LOG"
echo "🎉 Blueprint Approval Complete!" | tee -a "$APPROVAL_LOG"
echo "" | tee -a "$APPROVAL_LOG"
echo "📊 Status Update:"
echo "   ✅ Lane 0 (Vision & Planning): Completed" 
echo "   🚀 Lane 1 (PRD & MVP): Active"
echo "   📄 PRD Generation: Started"
echo ""
echo "📋 Next Steps:"
echo "   1. Review generated PRD: cat $PROJECT_DIR/docs/PRD.md"
echo "   2. Define MVP scope: ./scripts/lane1/define-mvp.sh $PROJECT_ID"
echo "   3. Create feature cards: ./scripts/lane1/create-feature-cards.sh $PROJECT_ID"
echo ""
echo "📂 New Files Created:"
echo "   • $PROJECT_DIR/docs/BLUEPRINT_APPROVAL.md"
echo "   • $PROJECT_DIR/docs/PRD.md (in progress)"
echo "   • $APPROVAL_LOG"