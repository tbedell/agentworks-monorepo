#!/bin/bash

# AgentWorks - Lane 0: Finalize Blueprint
# Prepares Blueprint for human review and approval

set -e

PROJECT_ID=${1:-""}

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: Project ID required"
    echo "Usage: $0 <project-id>"
    exit 1
fi

PROJECT_DIR="projects/$PROJECT_ID"
BLUEPRINT_FILE="$PROJECT_DIR/docs/BLUEPRINT.md"
STRATEGY_FILE="$PROJECT_DIR/docs/STRATEGY_ANALYSIS.md"
UX_FILE="$PROJECT_DIR/docs/UX_STORYBOARDS.md"

# Verify all prerequisites exist
MISSING_FILES=()
[ ! -f "$BLUEPRINT_FILE" ] && MISSING_FILES+=("BLUEPRINT.md")
[ ! -f "$STRATEGY_FILE" ] && MISSING_FILES+=("STRATEGY_ANALYSIS.md")
[ ! -f "$UX_FILE" ] && MISSING_FILES+=("UX_STORYBOARDS.md")

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "❌ Error: Missing required files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "   • $file"
    done
    echo ""
    echo "Complete all Lane 0 steps first:"
    echo "   1. ./scripts/lane0/copilot-session.sh $PROJECT_ID"
    echo "   2. ./scripts/lane0/strategy-analysis.sh $PROJECT_ID <session-id>"
    echo "   3. ./scripts/lane0/ux-storyboards.sh $PROJECT_ID"
    exit 1
fi

echo "📋 Finalizing Blueprint for Project: $PROJECT_ID"
echo "🔍 Preparing comprehensive review package..."

# Create finalization log
FINAL_LOG="$PROJECT_DIR/logs/agent_runs/finalize_blueprint_$(date +%s).log"
echo "📋 Blueprint Finalization - $(date)" > "$FINAL_LOG"
echo "Project: $PROJECT_ID" >> "$FINAL_LOG"
echo "----------------------------------------" >> "$FINAL_LOG"

# Load project configuration
PROJECT_CONFIG="$PROJECT_DIR/project.json"
PROJECT_NAME=$(jq -r '.name' "$PROJECT_CONFIG")

# Generate comprehensive Blueprint summary
cat > "$PROJECT_DIR/docs/BLUEPRINT_SUMMARY.md" << EOF
# $PROJECT_NAME - Blueprint Summary

**Project ID:** $PROJECT_ID  
**Generated:** $(date +%Y-%m-%d\ %H:%M:%S)  
**Status:** Ready for Human Review  

---

## 🎯 Executive Summary

*[Auto-generated summary of key decisions and recommendations]*

### Project Vision
- **Problem:** *[Core problem being solved]*
- **Users:** *[Primary target audience]*  
- **Solution:** *[High-level solution approach]*
- **Value:** *[Unique value proposition]*

### Strategic Positioning
- **Market Opportunity:** *[Market size and validation]*
- **Competitive Advantage:** *[Key differentiators]*
- **Infrastructure Choice:** *[Selected technical profile]*
- **Go-to-Market:** *[User acquisition strategy]*

### Success Criteria
- **MVP Timeline:** *[Target timeline for first release]*
- **Key Metrics:** *[Primary success indicators]*
- **Risk Mitigation:** *[Top risks and responses]*

---

## 📊 Artifacts Created

| Document | Status | Description |
|----------|--------|-------------|
| **BLUEPRINT.md** | ✅ Complete | Full project blueprint with vision, goals, constraints |
| **STRATEGY_ANALYSIS.md** | ✅ Complete | Strategic positioning and competitive analysis |
| **UX_STORYBOARDS.md** | ✅ Complete | User flows, wireframes, and interaction patterns |
| **QA_SESSION_*.md** | ✅ Complete | CEO CoPilot Q&A responses and analysis |

---

## 🤖 Agent Contributions

### CEO CoPilot Agent (OpenAI GPT-4)
- ✅ **Q&A Session:** Guided structured requirements gathering
- ✅ **Vision Definition:** Established project vision and goals
- ✅ **Success Metrics:** Defined measurable success criteria

### Strategy Agent (OpenAI GPT-4)
- ✅ **Market Analysis:** Assessed competitive landscape
- ✅ **Feature Prioritization:** Organized features into strategic buckets
- ✅ **Risk Assessment:** Identified and planned risk mitigation

### Storyboard/UX Agent (OpenAI GPT-4)
- ✅ **User Flows:** Designed core user journey maps
- ✅ **Wireframes:** Created text-based interface layouts
- ✅ **Interaction Patterns:** Defined UX standards and accessibility

---

## ✅ Approval Checklist

Please review each section and confirm approval:

### Strategy & Vision
- [ ] **Problem definition is clear and compelling**
- [ ] **Target users are well-defined and reachable**
- [ ] **Competitive advantage is sustainable**
- [ ] **Market opportunity is validated**

### Technical Approach  
- [ ] **Infrastructure choice aligns with requirements**
- [ ] **Technology stack is appropriate for team skills**
- [ ] **Architecture can scale to projected usage**
- [ ] **Integration requirements are feasible**

### User Experience
- [ ] **User flows deliver value efficiently**
- [ ] **Onboarding gets users to first value quickly**
- [ ] **Core workflows are intuitive and efficient**
- [ ] **Mobile experience is properly considered**

### Business Model
- [ ] **Revenue model is clear and validated**
- [ ] **Success metrics are measurable and meaningful**
- [ ] **Timeline is realistic given constraints**
- [ ] **Resource requirements are understood**

### Risk Management
- [ ] **Key risks have been identified**
- [ ] **Mitigation strategies are practical**
- [ ] **Fallback plans exist for major risks**
- [ ] **Dependencies are manageable**

---

## 🚀 Next Steps After Approval

Once this Blueprint is approved:

### Lane 1: PRD & MVP Definition
1. **PRD Agent** will generate detailed Product Requirements Document
2. **MVP Agent** will define minimal viable product scope
3. Feature cards will be created in Kanban board

### Lane 2-3: Research & Architecture  
4. **Research Agent** will investigate technical requirements
5. **Architect Agent** will design detailed system architecture

### Lane 4+: Implementation Planning
6. **Planner Agent** will break features into development tasks
7. **Development Agents** will begin implementation

---

## 🎮 Approval Actions

**To approve this Blueprint:**
```bash
# Approve and move to Lane 1
./scripts/lane1/approve-blueprint.sh $PROJECT_ID

# Request revisions (returns to Q&A)
./scripts/lane0/revise-blueprint.sh $PROJECT_ID
```

**To review individual documents:**
- 📄 Full Blueprint: \`cat $PROJECT_DIR/docs/BLUEPRINT.md\`
- 🧠 Strategy Analysis: \`cat $PROJECT_DIR/docs/STRATEGY_ANALYSIS.md\`  
- 🎨 UX Storyboards: \`cat $PROJECT_DIR/docs/UX_STORYBOARDS.md\`
- 💬 Q&A Session: \`ls $PROJECT_DIR/docs/QA_SESSION_*.md\`

---

## 💡 Blueprint Quality Score

*[Automated assessment of Blueprint completeness]*

| Category | Score | Comments |
|----------|-------|----------|
| **Vision Clarity** | *[A-F grade]* | *[Assessment notes]* |
| **Market Validation** | *[A-F grade]* | *[Assessment notes]* |
| **Technical Feasibility** | *[A-F grade]* | *[Assessment notes]* |
| **User Experience** | *[A-F grade]* | *[Assessment notes]* |
| **Risk Assessment** | *[A-F grade]* | *[Assessment notes]* |

**Overall Grade:** *[A-F]* - *[Summary assessment]*

---

*This summary was generated by AgentWorks CEO CoPilot for project approval review.*
EOF

echo "📄 Blueprint summary generated" | tee -a "$FINAL_LOG"

# Update Blueprint with final status
sed -i 's/- \[ \] \*\*Human Review:\*\* Pending/- [⏳] **Human Review:** Ready for Approval/' "$BLUEPRINT_FILE"
sed -i 's/- \[ \] \*\*Blueprint Approved:\*\* Pending/- [⏳] **Blueprint Approved:** Awaiting Decision/' "$BLUEPRINT_FILE"

# Create approval script reference
cat > "$PROJECT_DIR/APPROVE_BLUEPRINT.sh" << EOF
#!/bin/bash
# Quick approval script for this project
echo "🎯 Approving Blueprint for $PROJECT_NAME..."
./../../scripts/lane1/approve-blueprint.sh $PROJECT_ID
EOF
chmod +x "$PROJECT_DIR/APPROVE_BLUEPRINT.sh"

# Update project status to ready for approval
jq --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
  '.status = "blueprint_ready" |
   .lanes["0"].status = "ready_for_approval" |
   .lanes["0"].cards += [{"type": "blueprint_finalization", "status": "completed", "created": $timestamp}] |
   .updated = $timestamp' \
  "$PROJECT_CONFIG" > "$PROJECT_CONFIG.tmp" && mv "$PROJECT_CONFIG.tmp" "$PROJECT_CONFIG"

echo "" | tee -a "$FINAL_LOG"
echo "🎉 Blueprint finalization completed!" | tee -a "$FINAL_LOG"
echo "" | tee -a "$FINAL_LOG"
echo "📋 Review Package Created:" | tee -a "$FINAL_LOG"
echo "   • Blueprint Summary: $PROJECT_DIR/docs/BLUEPRINT_SUMMARY.md" | tee -a "$FINAL_LOG"
echo "   • Full Blueprint: $PROJECT_DIR/docs/BLUEPRINT.md" | tee -a "$FINAL_LOG"  
echo "   • Strategy Analysis: $PROJECT_DIR/docs/STRATEGY_ANALYSIS.md" | tee -a "$FINAL_LOG"
echo "   • UX Storyboards: $PROJECT_DIR/docs/UX_STORYBOARDS.md" | tee -a "$FINAL_LOG"
echo "" | tee -a "$FINAL_LOG"
echo "✅ Lane 0 Complete - All Agent Work Finished"
echo "⏳ Ready for Human Review & Approval"
echo ""
echo "📖 Review the Blueprint:"
echo "   cat $PROJECT_DIR/docs/BLUEPRINT_SUMMARY.md"
echo ""
echo "🚀 Approve Blueprint and move to Lane 1:"
echo "   ./scripts/lane1/approve-blueprint.sh $PROJECT_ID"
echo "   OR"
echo "   cd $PROJECT_DIR && ./APPROVE_BLUEPRINT.sh"
echo ""
echo "🔄 Request revisions (back to Q&A):"
echo "   ./scripts/lane0/revise-blueprint.sh $PROJECT_ID"