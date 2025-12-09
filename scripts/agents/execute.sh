#!/bin/bash

# AgentWorks - Execute Agent with Enhanced Orchestration
# Orchestrates agent execution with full context and monitoring

set -e

AGENT_NAME=${1:-""}
PROJECT_ID=${2:-""}
CARD_ID=${3:-""}
CUSTOM_PROMPT=${4:-""}

if [ -z "$AGENT_NAME" ] || [ -z "$PROJECT_ID" ] || [ -z "$CARD_ID" ]; then
    echo "❌ Error: Agent name, project ID, and card ID required"
    echo "Usage: $0 <agent-name> <project-id> <card-id> [custom-prompt]"
    echo ""
    echo "Example: $0 architect my-project FEATURE_001"
    exit 1
fi

echo "🚀 AgentWorks - Agent Execution Orchestrator"
echo "============================================="
echo "🤖 Agent: $AGENT_NAME"
echo "📁 Project: $PROJECT_ID" 
echo "🎯 Card: $CARD_ID"
echo "🕒 Started: $(date)"

# Initialize agent if needed
if [ ! -d "projects/$PROJECT_ID/executions" ]; then
    echo "🔧 Initializing agent environment..."
    ./scripts/agents/init-agent.sh "$AGENT_NAME" "$CARD_ID" "$PROJECT_ID"
fi

# Start terminal logger
echo "📱 Starting terminal logger..."
RUN_ID=$(node scripts/tools/terminal-logger.js start "$PROJECT_ID" "$CARD_ID" "$AGENT_NAME" "orchestrated")

echo "📊 Terminal Session: $RUN_ID"

# Log execution start
node scripts/tools/terminal-logger.js log "$RUN_ID" "system" "AgentWorks orchestrator started"
node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Agent: $AGENT_NAME | Project: $PROJECT_ID | Card: $CARD_ID"

# Load project and card information
PROJECT_CONFIG="projects/$PROJECT_ID/project.json"
if [ ! -f "$PROJECT_CONFIG" ]; then
    node scripts/tools/terminal-logger.js log "$RUN_ID" "error" "Project configuration not found: $PROJECT_CONFIG"
    node scripts/tools/terminal-logger.js end "$RUN_ID" "failed" "Project configuration missing"
    exit 1
fi

PROJECT_NAME=$(jq -r '.name' "$PROJECT_CONFIG")
node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Project: $PROJECT_NAME"

# Validate agent configuration
AGENT_CONFIG=$(jq -r ".agents.$AGENT_NAME // null" "$PROJECT_CONFIG")
if [ "$AGENT_CONFIG" = "null" ]; then
    node scripts/tools/terminal-logger.js log "$RUN_ID" "error" "Agent $AGENT_NAME not configured in project"
    node scripts/tools/terminal-logger.js end "$RUN_ID" "failed" "Agent not configured"
    exit 1
fi

AGENT_PROVIDER=$(jq -r ".agents.$AGENT_NAME.provider" "$PROJECT_CONFIG")
AGENT_MODEL=$(jq -r ".agents.$AGENT_NAME.model" "$PROJECT_CONFIG")

node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Provider: $AGENT_PROVIDER | Model: $AGENT_MODEL"

# Load available context
CONTEXT_SUMMARY=""
DOCS_COUNT=0

for doc in BLUEPRINT.md PRD.md MVP.md STRATEGY_ANALYSIS.md UX_STORYBOARDS.md ARCHITECTURE.md; do
    if [ -f "projects/$PROJECT_ID/docs/$doc" ]; then
        DOCS_COUNT=$((DOCS_COUNT + 1))
        CONTEXT_SUMMARY="$CONTEXT_SUMMARY $doc"
    fi
done

if [ $DOCS_COUNT -gt 0 ]; then
    node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Context available: $DOCS_COUNT documents ($CONTEXT_SUMMARY)"
else
    node scripts/tools/terminal-logger.js log "$RUN_ID" "warning" "No context documents available"
fi

# Execute pre-execution hooks (if any)
if [ -f "projects/$PROJECT_ID/hooks/pre-agent.sh" ]; then
    node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Running pre-execution hooks..."
    if bash "projects/$PROJECT_ID/hooks/pre-agent.sh" "$AGENT_NAME" "$CARD_ID"; then
        node scripts/tools/terminal-logger.js log "$RUN_ID" "success" "Pre-execution hooks completed"
    else
        node scripts/tools/terminal-logger.js log "$RUN_ID" "warning" "Pre-execution hooks failed, continuing..."
    fi
fi

# Execute agent via card automator
node scripts/tools/terminal-logger.js log "$RUN_ID" "agent" "Starting $AGENT_NAME agent execution..."

if [ -n "$CUSTOM_PROMPT" ]; then
    node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Using custom prompt: ${CUSTOM_PROMPT:0:100}..."
    AGENT_RESULT=$(node scripts/tools/card-automator.js run "$PROJECT_ID" "$CARD_ID" "$AGENT_NAME" "$CUSTOM_PROMPT")
else
    node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Using agent-generated prompt"
    AGENT_RESULT=$(node scripts/tools/card-automator.js run "$PROJECT_ID" "$CARD_ID" "$AGENT_NAME")
fi

# Parse agent result
if echo "$AGENT_RESULT" | grep -q '"success": true'; then
    node scripts/tools/terminal-logger.js log "$RUN_ID" "success" "Agent execution completed successfully"
    
    # Extract usage information if available
    if echo "$AGENT_RESULT" | jq -e '.usage' >/dev/null 2>&1; then
        TOKENS=$(echo "$AGENT_RESULT" | jq -r '.usage.totalTokens // "unknown"')
        COST=$(echo "$AGENT_RESULT" | jq -r '.cost.price // 0')
        node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Usage: $TOKENS tokens, \$$COST cost"
    fi
    
    # Log output summary
    if echo "$AGENT_RESULT" | jq -e '.content' >/dev/null 2>&1; then
        OUTPUT_LENGTH=$(echo "$AGENT_RESULT" | jq -r '.content | length')
        node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Generated output: $OUTPUT_LENGTH characters"
    fi
    
    EXECUTION_STATUS="completed"
    EXECUTION_SUMMARY="Agent $AGENT_NAME executed successfully"
    
else
    node scripts/tools/terminal-logger.js log "$RUN_ID" "error" "Agent execution failed"
    
    if echo "$AGENT_RESULT" | jq -e '.error' >/dev/null 2>&1; then
        ERROR_MSG=$(echo "$AGENT_RESULT" | jq -r '.error')
        node scripts/tools/terminal-logger.js log "$RUN_ID" "error" "Error: $ERROR_MSG"
    fi
    
    EXECUTION_STATUS="failed"
    EXECUTION_SUMMARY="Agent $AGENT_NAME execution failed"
fi

# Execute post-execution hooks (if any)
if [ -f "projects/$PROJECT_ID/hooks/post-agent.sh" ]; then
    node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Running post-execution hooks..."
    if bash "projects/$PROJECT_ID/hooks/post-agent.sh" "$AGENT_NAME" "$CARD_ID" "$EXECUTION_STATUS"; then
        node scripts/tools/terminal-logger.js log "$RUN_ID" "success" "Post-execution hooks completed"
    else
        node scripts/tools/terminal-logger.js log "$RUN_ID" "warning" "Post-execution hooks failed"
    fi
fi

# Update project metrics
node scripts/tools/terminal-logger.js log "$RUN_ID" "info" "Updating project metrics..."

CURRENT_CALLS=$(jq -r '.usage.total_calls' "$PROJECT_CONFIG")
NEW_CALLS=$((CURRENT_CALLS + 1))

jq --arg agent "$AGENT_NAME" --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
   --arg status "$EXECUTION_STATUS" --argjson calls "$NEW_CALLS" \
   '.usage.total_calls = $calls |
    .agents[$agent].last_run = $timestamp |
    .agents[$agent].last_status = $status |
    .updated = $timestamp' \
   "$PROJECT_CONFIG" > "$PROJECT_CONFIG.tmp"
mv "$PROJECT_CONFIG.tmp" "$PROJECT_CONFIG"

# End terminal session
node scripts/tools/terminal-logger.js log "$RUN_ID" "system" "Agent orchestration completed"
node scripts/tools/terminal-logger.js end "$RUN_ID" "$EXECUTION_STATUS" "$EXECUTION_SUMMARY"

echo ""
echo "🏁 Agent Execution Complete"
echo "=========================="
echo "🤖 Agent: $AGENT_NAME"
echo "📊 Status: $EXECUTION_STATUS"
echo "📱 Terminal Session: $RUN_ID"
echo "🕒 Completed: $(date)"

if [ "$EXECUTION_STATUS" = "completed" ]; then
    echo "✅ SUCCESS: Agent executed successfully"
    echo ""
    echo "📋 Next Steps:"
    echo "   • View results: cat projects/$PROJECT_ID/artifacts/$CARD_ID/${AGENT_NAME}_output.md"
    echo "   • Check terminal: node scripts/tools/terminal-logger.js show $RUN_ID"
    echo "   • View card status: find projects/$PROJECT_ID/cards -name '*$CARD_ID*' -exec cat {} +"
    echo "   • Update card: scripts/tools/card-automator.js status $PROJECT_ID $CARD_ID completed"
    
else
    echo "❌ FAILED: Agent execution encountered errors"
    echo ""
    echo "🔍 Debug Steps:"
    echo "   • View terminal: node scripts/tools/terminal-logger.js show $RUN_ID"
    echo "   • Check logs: tail -f projects/$PROJECT_ID/logs/terminal/$RUN_ID/terminal.log"
    echo "   • Retry execution: $0 $AGENT_NAME $PROJECT_ID $CARD_ID"
    echo "   • Check agent config: jq '.agents.$AGENT_NAME' $PROJECT_CONFIG"
    
fi

echo ""
echo "📊 Project Usage Summary:"
echo "   • Total agent calls: $(jq -r '.usage.total_calls' "$PROJECT_CONFIG")"
echo "   • Last updated: $(jq -r '.updated' "$PROJECT_CONFIG")"

# Return appropriate exit code
if [ "$EXECUTION_STATUS" = "completed" ]; then
    exit 0
else
    exit 1
fi