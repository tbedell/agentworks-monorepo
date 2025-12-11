#!/bin/bash

# AgentWorks Backup Script
# Backs up code changes to GitHub develop branch every 6 hours

REPO_DIR="/AgentWorks"
LOG_FILE="/var/log/agentworks-backup.log"

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Change to repository directory
cd "$REPO_DIR" || { echo "[$(date '+%Y-%m-%d %H:%M:%S')] Error: Cannot access $REPO_DIR" >> "$LOG_FILE"; exit 1; }

# Log the backup attempt
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..." >> "$LOG_FILE"

# Stash any local changes first
git stash push -m "Backup stashed changes at $(date)" 2>> "$LOG_FILE"

# Ensure we're on the develop branch
git checkout develop 2>> "$LOG_FILE"
if [ $? -ne 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Error: Cannot switch to develop branch" >> "$LOG_FILE"
    git stash pop 2>> "$LOG_FILE"
    exit 1
fi

# Pull latest changes from develop
git pull origin develop 2>> "$LOG_FILE"

# Add all changes
git add -A

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] No changes to commit" >> "$LOG_FILE"
    git stash pop 2>> "$LOG_FILE" 2>/dev/null
    exit 0
fi

# Get list of changed files for commit message
CHANGED_FILES=$(git diff --cached --name-only | head -20 | tr '\n' ', ' | sed 's/,$//')
FILE_COUNT=$(git diff --cached --name-only | wc -l)

# Create commit message with timestamp and changed files
if [ "$FILE_COUNT" -gt 20 ]; then
    COMMIT_MSG="Backup $(date '+%Y-%m-%d %H:%M:%S') - $FILE_COUNT files changed

Changed files (first 20):
$CHANGED_FILES

... and $((FILE_COUNT - 20)) more files"
else
    COMMIT_MSG="Backup $(date '+%Y-%m-%d %H:%M:%S') - $FILE_COUNT files changed

Changed files:
$CHANGED_FILES"
fi

# Commit changes
git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Error: Failed to commit changes" >> "$LOG_FILE"
    git stash pop 2>> "$LOG_FILE"
    exit 1
fi

# Push to remote develop branch (NEVER to main)
git push origin develop >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed successfully" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Error: Failed to push to remote" >> "$LOG_FILE"
fi

# Restore any stashed changes
git stash pop 2>> "$LOG_FILE" 2>/dev/null
