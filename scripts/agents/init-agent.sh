#!/bin/bash

# AgentWorks - Initialize Agent for Card
# Sets up agent execution environment and validates prerequisites

set -e

AGENT_NAME=${1:-""}
CARD_ID=${2:-""}
PROJECT_ID=${3:-""}

if [ -z "$AGENT_NAME" ] || [ -z "$CARD_ID" ]; then
    echo "❌ Error: Agent name and card ID required"
    echo "Usage: $0 <agent-name> <card-id> [project-id]"
    echo ""
    echo "Available agents:"
    echo "  • ceo_copilot     - CEO CoPilot Agent (strategic oversight)"
    echo "  • strategy        - Strategy Agent (market analysis)" 
    echo "  • storyboard_ux   - Storyboard/UX Agent (user flows)"
    echo "  • prd             - PRD Agent (requirements)"
    echo "  • mvp             - MVP Agent (scope definition)"
    echo "  • research        - Research Agent (external research)"
    echo "  • architect       - Architect Agent (system design)"
    echo "  • planner         - Planner Agent (task breakdown)"
    echo "  • devops          - DevOps Agent (infrastructure)"
    echo "  • dev_backend     - Backend Dev Agent (API implementation)"
    echo "  • dev_frontend    - Frontend Dev Agent (UI implementation)"
    echo "  • qa              - QA Agent (testing)"
    echo "  • troubleshooter  - Troubleshooting Agent (debugging)"
    echo "  • docs            - Documentation Agent (docs generation)"
    echo "  • refactor        - Refactor Agent (code improvement)"
    exit 1
fi

# Auto-detect project if not provided
if [ -z "$PROJECT_ID" ]; then
    # Look for project in current directory or parent
    if [ -f "project.json" ]; then
        PROJECT_ID=$(jq -r '.id' project.json)
    elif [ -f "../project.json" ]; then
        PROJECT_ID=$(jq -r '.id' ../project.json)
    else
        echo "❌ Error: Could not auto-detect project ID"
        echo "Either run from project directory or specify: $0 $AGENT_NAME $CARD_ID <project-id>"
        exit 1
    fi
fi

echo "🤖 Initializing Agent: $AGENT_NAME"
echo "🎯 Target Card: $CARD_ID" 
echo "📁 Project: $PROJECT_ID"

PROJECT_DIR="projects/$PROJECT_ID"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory not found: $PROJECT_DIR"
    exit 1
fi

PROJECT_CONFIG="$PROJECT_DIR/project.json"
if [ ! -f "$PROJECT_CONFIG" ]; then
    echo "❌ Error: Project configuration not found: $PROJECT_CONFIG"
    exit 1
fi

# Validate agent configuration
AGENT_CONFIG=$(jq -r ".agents.$AGENT_NAME // null" "$PROJECT_CONFIG")
if [ "$AGENT_CONFIG" = "null" ]; then
    echo "❌ Error: Agent '$AGENT_NAME' not configured for this project"
    echo "Available agents: $(jq -r '.agents | keys | join(", ")' "$PROJECT_CONFIG")"
    exit 1
fi

# Check if agent is enabled
AGENT_ENABLED=$(jq -r ".agents.$AGENT_NAME.active // false" "$PROJECT_CONFIG")
if [ "$AGENT_ENABLED" != "true" ]; then
    echo "⚠️  Warning: Agent '$AGENT_NAME' is not active"
    echo "Activating agent for this execution..."
    
    # Temporarily activate agent
    jq ".agents.$AGENT_NAME.active = true" "$PROJECT_CONFIG" > "$PROJECT_CONFIG.tmp"
    mv "$PROJECT_CONFIG.tmp" "$PROJECT_CONFIG"
fi

# Find and load card
echo "🔍 Loading card $CARD_ID..."

CARD_FILE=""
CARD_DATA=""

# Search in feature cards
for file in "$PROJECT_DIR"/cards/features/*.json; do
    if [ -f "$file" ]; then
        CARD_ID_CHECK=$(jq -r '.id' "$file" 2>/dev/null || echo "")
        if [ "$CARD_ID_CHECK" = "$CARD_ID" ] || [[ "$(basename "$file")" == *"$CARD_ID"* ]]; then
            CARD_FILE="$file"
            CARD_DATA=$(cat "$file")
            break
        fi
    fi
done

# Search in other card types if not found in features
if [ -z "$CARD_FILE" ]; then
    for card_type in tasks bugs docs; do
        for file in "$PROJECT_DIR"/cards/$card_type/*.json 2>/dev/null; do
            if [ -f "$file" ]; then
                CARD_ID_CHECK=$(jq -r '.id' "$file" 2>/dev/null || echo "")
                if [ "$CARD_ID_CHECK" = "$CARD_ID" ] || [[ "$(basename "$file")" == *"$CARD_ID"* ]]; then
                    CARD_FILE="$file"
                    CARD_DATA=$(cat "$file")
                    break 2
                fi
            fi
        done
    done
fi

if [ -z "$CARD_FILE" ]; then
    echo "❌ Error: Card $CARD_ID not found in project $PROJECT_ID"
    exit 1
fi

echo "✅ Found card: $CARD_FILE"

# Extract card information
CARD_TITLE=$(echo "$CARD_DATA" | jq -r '.title')
CARD_LANE=$(echo "$CARD_DATA" | jq -r '.lane')
CARD_STATUS=$(echo "$CARD_DATA" | jq -r '.status')
CARD_TYPE=$(echo "$CARD_DATA" | jq -r '.type')

echo "📋 Card Details:"
echo "   Title: $CARD_TITLE"
echo "   Type: $CARD_TYPE"
echo "   Lane: $CARD_LANE ($(scripts/tools/card-automator.js lane-name $CARD_LANE 2>/dev/null || echo "Lane $CARD_LANE"))"
echo "   Status: $CARD_STATUS"

# Validate agent can work on this lane
AGENT_LANES=$(jq -r ".agents.$AGENT_NAME.lanes[]? // empty" "$PROJECT_CONFIG" | tr '\n' ' ')
if [ -n "$AGENT_LANES" ]; then
    LANE_ALLOWED="false"
    for allowed_lane in $AGENT_LANES; do
        if [ "$allowed_lane" = "$CARD_LANE" ]; then
            LANE_ALLOWED="true"
            break
        fi
    done
    
    if [ "$LANE_ALLOWED" = "false" ]; then
        echo "⚠️  Warning: Agent $AGENT_NAME not typically used in Lane $CARD_LANE"
        echo "   Allowed lanes: $AGENT_LANES"
        echo "   Proceeding anyway..."
    fi
fi

# Get agent provider configuration
AGENT_PROVIDER=$(jq -r ".agents.$AGENT_NAME.provider" "$PROJECT_CONFIG")
AGENT_MODEL=$(jq -r ".agents.$AGENT_NAME.model" "$PROJECT_CONFIG")

echo "🔧 Agent Configuration:"
echo "   Provider: $AGENT_PROVIDER"
echo "   Model: $AGENT_MODEL"
echo "   Status: Active"

# Setup execution environment
EXEC_DIR="$PROJECT_DIR/executions"
mkdir -p "$EXEC_DIR"

EXEC_ID="exec_$(date +%s)_${AGENT_NAME}_${CARD_ID}"
EXEC_PATH="$EXEC_DIR/$EXEC_ID"
mkdir -p "$EXEC_PATH"

echo "📂 Execution Environment:"
echo "   Execution ID: $EXEC_ID"
echo "   Working Directory: $EXEC_PATH"

# Create execution manifest
cat > "$EXEC_PATH/manifest.json" << EOF
{
  "execution_id": "$EXEC_ID",
  "agent_name": "$AGENT_NAME", 
  "card_id": "$CARD_ID",
  "project_id": "$PROJECT_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "status": "initialized",
  "agent_config": {
    "provider": "$AGENT_PROVIDER",
    "model": "$AGENT_MODEL"
  },
  "card_info": {
    "title": "$CARD_TITLE",
    "type": "$CARD_TYPE", 
    "lane": $CARD_LANE,
    "status": "$CARD_STATUS",
    "file_path": "$(realpath --relative-to="$PROJECT_DIR" "$CARD_FILE")"
  },
  "context": {
    "project_config": "project.json",
    "card_file": "$(basename "$CARD_FILE")",
    "docs_available": [],
    "dependencies": []
  }
}
EOF

# Gather context documents
echo "📚 Gathering context documents..."
DOCS_AVAILABLE=()

for doc in BLUEPRINT.md PRD.md MVP.md STRATEGY_ANALYSIS.md UX_STORYBOARDS.md ARCHITECTURE.md; do
    if [ -f "$PROJECT_DIR/docs/$doc" ]; then
        DOCS_AVAILABLE+=("$doc")
        cp "$PROJECT_DIR/docs/$doc" "$EXEC_PATH/"
        echo "   ✅ $doc"
    else
        echo "   ❌ $doc (not available)"
    fi
done

# Copy card file to execution context
cp "$CARD_FILE" "$EXEC_PATH/card.json"

# Update manifest with available docs
jq --argjson docs "$(printf '%s\n' "${DOCS_AVAILABLE[@]}" | jq -R . | jq -s .)" \
   '.context.docs_available = $docs' \
   "$EXEC_PATH/manifest.json" > "$EXEC_PATH/manifest.tmp"
mv "$EXEC_PATH/manifest.tmp" "$EXEC_PATH/manifest.json"

# Create agent execution script
cat > "$EXEC_PATH/execute.sh" << EOF
#!/bin/bash
# Generated execution script for $AGENT_NAME on $CARD_ID

echo "🚀 Starting agent execution: $AGENT_NAME"
echo "📋 Card: $CARD_ID - $CARD_TITLE"
echo "🕒 Started: \$(date)"

# Execute agent via card automator
cd "$(dirname "$(dirname "$EXEC_PATH")")"
node scripts/tools/card-automator.js run "$PROJECT_ID" "$CARD_ID" "$AGENT_NAME" "\$@"

echo "🕒 Completed: \$(date)"
EOF

chmod +x "$EXEC_PATH/execute.sh"

# Create terminal viewing script  
cat > "$EXEC_PATH/terminal.sh" << EOF
#!/bin/bash
# View terminal logs for this execution

echo "🖥️  AgentWorks Terminal Viewer"
echo "Agent: $AGENT_NAME | Card: $CARD_ID"
echo "----------------------------------------"

# Find latest terminal session for this card
LATEST_SESSION=\$(ls -t ../../logs/terminal/ 2>/dev/null | head -1)

if [ -n "\$LATEST_SESSION" ]; then
    echo "📺 Showing latest session: \$LATEST_SESSION"
    node ../../scripts/tools/terminal-logger.js show "\$LATEST_SESSION"
else
    echo "❌ No terminal sessions found"
    echo "Run ./execute.sh first to generate terminal logs"
fi
EOF

chmod +x "$EXEC_PATH/terminal.sh"

echo ""
echo "✅ Agent initialization complete!"
echo ""
echo "🚀 Next Steps:"
echo "   1. Execute agent:    cd $EXEC_PATH && ./execute.sh"
echo "   2. View terminal:    cd $EXEC_PATH && ./terminal.sh"
echo "   3. Check results:    ls $EXEC_PATH/"
echo ""
echo "💡 Advanced usage:"
echo "   • Custom prompt:     ./execute.sh \"Custom prompt here\""
echo "   • Direct execution:  node $PROJECT_DIR/scripts/tools/card-automator.js run $PROJECT_ID $CARD_ID $AGENT_NAME"
echo "   • Monitor logs:      tail -f $PROJECT_DIR/logs/terminal/*/terminal.log"
echo ""
echo "🔧 Execution Details:"
echo "   Execution ID: $EXEC_ID"
echo "   Working Dir:  $EXEC_PATH"
echo "   Context Docs: ${#DOCS_AVAILABLE[@]} available"
echo "   Agent Ready:  ✅"