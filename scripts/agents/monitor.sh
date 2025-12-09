#!/bin/bash

# AgentWorks - Agent Monitoring Dashboard
# Real-time monitoring of agent execution and project status

set -e

PROJECT_ID=${1:-""}
MODE=${2:-"dashboard"}

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: Project ID required"
    echo "Usage: $0 <project-id> [mode]"
    echo ""
    echo "Modes:"
    echo "  dashboard  - Interactive monitoring dashboard (default)"
    echo "  status     - Quick status summary"
    echo "  agents     - Agent activity monitor"
    echo "  usage      - Usage and billing monitor"
    echo "  terminal   - Live terminal view"
    echo ""
    exit 1
fi

PROJECT_DIR="projects/$PROJECT_ID"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory not found: $PROJECT_DIR"
    exit 1
fi

PROJECT_CONFIG="$PROJECT_DIR/project.json"
PROJECT_NAME=$(jq -r '.name' "$PROJECT_CONFIG")

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

case "$MODE" in
    "dashboard")
        echo -e "${CYAN}🚀 AgentWorks Monitoring Dashboard${NC}"
        echo "=================================="
        echo -e "${BLUE}Project:${NC} $PROJECT_NAME ($PROJECT_ID)"
        echo -e "${BLUE}Updated:${NC} $(jq -r '.updated // "Unknown"' "$PROJECT_CONFIG")"
        echo -e "${BLUE}Status:${NC} $(jq -r '.status // "Unknown"' "$PROJECT_CONFIG")"
        echo ""
        
        # Lane Status Overview
        echo -e "${CYAN}📋 Lane Status Overview${NC}"
        echo "----------------------"
        
        CURRENT_LANE=0
        for lane in {0..10}; do
            LANE_STATUS=$(jq -r ".lanes[\"$lane\"].status // \"inactive\"" "$PROJECT_CONFIG")
            LANE_CARD_COUNT=$(jq -r ".lanes[\"$lane\"].cards | length // 0" "$PROJECT_CONFIG")
            
            case "$LANE_STATUS" in
                "active")    COLOR=$GREEN; STATUS_ICON="🟢" ;;
                "completed") COLOR=$BLUE; STATUS_ICON="🔵" ;;
                "ready")     COLOR=$YELLOW; STATUS_ICON="🟡" ;;
                *)          COLOR=$RED; STATUS_ICON="⚫" ;;
            esac
            
            LANE_NAME=$(case $lane in
                0) echo "Vision & CoPilot" ;;
                1) echo "PRD / MVP" ;;
                2) echo "Research" ;;
                3) echo "Architecture" ;;
                4) echo "Planning" ;;
                5) echo "Scaffolding" ;;
                6) echo "Build" ;;
                7) echo "Test & QA" ;;
                8) echo "Deploy" ;;
                9) echo "Docs" ;;
                10) echo "Optimize" ;;
            esac)
            
            echo -e "Lane $lane: ${COLOR}$STATUS_ICON $LANE_NAME${NC} ($LANE_CARD_COUNT cards)"
            
            if [ "$LANE_STATUS" = "active" ]; then
                CURRENT_LANE=$lane
            fi
        done
        
        echo ""
        echo -e "${CYAN}🤖 Active Agents${NC}"
        echo "---------------"
        
        ACTIVE_AGENTS=$(jq -r '.agents | to_entries[] | select(.value.active == true) | .key' "$PROJECT_CONFIG")
        if [ -z "$ACTIVE_AGENTS" ]; then
            echo "No active agents"
        else
            for agent in $ACTIVE_AGENTS; do
                LAST_RUN=$(jq -r ".agents.$agent.last_run // \"Never\"" "$PROJECT_CONFIG")
                LAST_STATUS=$(jq -r ".agents.$agent.last_status // \"Unknown\"" "$PROJECT_CONFIG")
                PROVIDER=$(jq -r ".agents.$agent.provider" "$PROJECT_CONFIG")
                
                case "$LAST_STATUS" in
                    "completed") COLOR=$GREEN; STATUS_ICON="✅" ;;
                    "failed")    COLOR=$RED; STATUS_ICON="❌" ;;
                    *)          COLOR=$YELLOW; STATUS_ICON="⏳" ;;
                esac
                
                echo -e "• ${COLOR}$STATUS_ICON $agent${NC} ($provider) - Last: $LAST_RUN"
            done
        fi
        
        echo ""
        echo -e "${CYAN}💰 Usage Summary${NC}"
        echo "----------------"
        
        TOTAL_CALLS=$(jq -r '.usage.total_calls // 0' "$PROJECT_CONFIG")
        TOTAL_COST=$(jq -r '.usage.total_cost // 0' "$PROJECT_CONFIG")
        TOTAL_PRICE=$(jq -r '.usage.total_price // 0' "$PROJECT_CONFIG")
        
        echo "• Total API calls: $TOTAL_CALLS"
        echo "• Provider cost: \$$(printf "%.4f" "$TOTAL_COST")"
        echo "• Customer price: \$$(printf "%.4f" "$TOTAL_PRICE")"
        
        if [ "$TOTAL_PRICE" != "0" ] && [ "$TOTAL_COST" != "0" ]; then
            MARGIN=$(echo "scale=2; ($TOTAL_PRICE - $TOTAL_COST) / $TOTAL_PRICE * 100" | bc -l)
            echo "• Margin: ${MARGIN}%"
        fi
        
        echo ""
        echo -e "${CYAN}🎯 Current Focus${NC}"
        echo "----------------"
        echo "Lane $CURRENT_LANE: $(case $CURRENT_LANE in
            0) echo "Complete Blueprint and strategy definition" ;;
            1) echo "Generate PRD and define MVP scope" ;;
            2) echo "Research technical requirements" ;;
            3) echo "Design system architecture" ;;
            4) echo "Break down features into tasks" ;;
            5) echo "Setup development infrastructure" ;;
            6) echo "Implement core features" ;;
            7) echo "Test and ensure quality" ;;
            8) echo "Deploy to production" ;;
            9) echo "Create documentation" ;;
            10) echo "Optimize and improve" ;;
        esac)"
        
        # Show recent activity
        echo ""
        echo -e "${CYAN}📊 Recent Activity${NC}"
        echo "------------------"
        
        # Find recent terminal sessions
        if [ -d "$PROJECT_DIR/logs/terminal" ]; then
            RECENT_SESSIONS=$(find "$PROJECT_DIR/logs/terminal" -name "session.json" -exec stat -c "%Y %n" {} \; 2>/dev/null | sort -nr | head -3)
            
            if [ -n "$RECENT_SESSIONS" ]; then
                while read -r timestamp session_file; do
                    SESSION_DATA=$(cat "$session_file" 2>/dev/null || echo '{}')
                    AGENT_NAME=$(echo "$SESSION_DATA" | jq -r '.agentName // "unknown"')
                    SESSION_STATUS=$(echo "$SESSION_DATA" | jq -r '.status // "unknown"')
                    START_TIME=$(echo "$SESSION_DATA" | jq -r '.startTime // "unknown"')
                    
                    case "$SESSION_STATUS" in
                        "completed") COLOR=$GREEN; STATUS_ICON="✅" ;;
                        "failed")    COLOR=$RED; STATUS_ICON="❌" ;;
                        "running")   COLOR=$YELLOW; STATUS_ICON="🔄" ;;
                        *)          COLOR=$BLUE; STATUS_ICON="⚫" ;;
                    esac
                    
                    FORMATTED_TIME=$(date -d "$START_TIME" "+%m/%d %H:%M" 2>/dev/null || echo "$START_TIME")
                    echo -e "• ${COLOR}$STATUS_ICON $AGENT_NAME${NC} - $FORMATTED_TIME ($SESSION_STATUS)"
                done <<< "$RECENT_SESSIONS"
            else
                echo "No recent activity"
            fi
        else
            echo "No activity logs found"
        fi
        ;;
        
    "status")
        echo "📊 Project Status: $PROJECT_NAME"
        echo "================================"
        
        PROJECT_STATUS=$(jq -r '.status // "unknown"' "$PROJECT_CONFIG")
        echo "Status: $PROJECT_STATUS"
        
        # Count cards by lane
        echo ""
        echo "Cards by Lane:"
        for lane in {0..10}; do
            COUNT=$(jq -r ".lanes[\"$lane\"].cards | length // 0" "$PROJECT_CONFIG")
            if [ "$COUNT" -gt 0 ]; then
                echo "  Lane $lane: $COUNT cards"
            fi
        done
        
        # Agent summary
        echo ""
        echo "Agent Status:"
        jq -r '.agents | to_entries[] | select(.value.active == true) | "  \(.key): \(.value.last_status // "ready")"' "$PROJECT_CONFIG"
        ;;
        
    "agents")
        echo "🤖 Agent Activity Monitor"
        echo "========================="
        
        # List all agents with details
        jq -r '.agents | to_entries[] | "\(.key)|\(.value.provider)|\(.value.model)|\(.value.active // false)|\(.value.last_run // "never")|\(.value.last_status // "unknown")"' "$PROJECT_CONFIG" | \
        while IFS='|' read -r agent provider model active last_run status; do
            if [ "$active" = "true" ]; then
                echo -e "${GREEN}🟢${NC} $agent ($provider/$model) - $status @ $last_run"
            else
                echo -e "${RED}🔴${NC} $agent ($provider/$model) - inactive"
            fi
        done
        ;;
        
    "usage")
        echo "💰 Usage and Billing Monitor"
        echo "============================"
        
        # Generate usage report
        if command -v node >/dev/null 2>&1; then
            node scripts/tools/usage-tracker.js analytics "$PROJECT_ID" "7d" 2>/dev/null || echo "Usage analytics not available"
        else
            # Fallback to basic usage info
            echo "Total calls: $(jq -r '.usage.total_calls // 0' "$PROJECT_CONFIG")"
            echo "Total cost: \$$(jq -r '.usage.total_cost // 0' "$PROJECT_CONFIG")"
            echo "Total price: \$$(jq -r '.usage.total_price // 0' "$PROJECT_CONFIG")"
        fi
        ;;
        
    "terminal")
        echo "🖥️  Live Terminal Monitor"
        echo "========================"
        
        # Find most recent active session
        LATEST_SESSION=""
        if [ -d "$PROJECT_DIR/logs/terminal" ]; then
            LATEST_SESSION=$(find "$PROJECT_DIR/logs/terminal" -name "session.json" -exec grep -l '"status": "running"' {} \; 2>/dev/null | head -1)
            
            if [ -n "$LATEST_SESSION" ]; then
                RUN_ID=$(basename "$(dirname "$LATEST_SESSION")")
                echo "Streaming session: $RUN_ID"
                echo "Press Ctrl+C to exit"
                echo ""
                
                # Stream logs
                tail -f "$PROJECT_DIR/logs/terminal/$RUN_ID/terminal.log" 2>/dev/null || \
                echo "No active terminal session found"
            else
                echo "No active terminal sessions found"
                echo ""
                echo "Recent completed sessions:"
                find "$PROJECT_DIR/logs/terminal" -name "session.json" -exec stat -c "%Y %n" {} \; 2>/dev/null | \
                sort -nr | head -5 | while read -r timestamp session_file; do
                    SESSION_DATA=$(cat "$session_file" 2>/dev/null || echo '{}')
                    AGENT_NAME=$(echo "$SESSION_DATA" | jq -r '.agentName // "unknown"')
                    SESSION_STATUS=$(echo "$SESSION_DATA" | jq -r '.status // "unknown"')
                    RUN_ID=$(basename "$(dirname "$session_file")")
                    
                    echo "• $AGENT_NAME ($SESSION_STATUS) - $RUN_ID"
                done
            fi
        else
            echo "No terminal logs directory found"
        fi
        ;;
        
    *)
        echo "❌ Unknown mode: $MODE"
        echo "Available modes: dashboard, status, agents, usage, terminal"
        exit 1
        ;;
esac

echo ""
echo "💡 Tip: Run '$0 $PROJECT_ID <mode>' to switch views"
echo "   Available modes: dashboard | status | agents | usage | terminal"