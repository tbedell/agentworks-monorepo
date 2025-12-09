# AgentWorks Cloud – Claude Code Integration

**Document:** Claude_Code_Integration.md
**Product:** AgentWorks Cloud (Multi-Tenant BYOA Vibe Coding Platform)
**Owner:** Architecture / Engineering
**Version:** 1.0
**Date:** 2025-12-08

---

## Overview

This document describes how AgentWorks supports Claude Code as the **user's dev tool** inside the dev environment. AgentWorks does not own, re-sell, or share Claude Code—it simply provides a standard Linux environment where users can install and run the official Claude CLI on their own.

---

## 1. Guiding Principles

1. **User-owned, user-controlled**
   Claude Code is treated as the **user's personal development tool**, running inside their AgentWorks dev environment exactly as it would on their own laptop.

2. **No shared Anthropic accounts**
   AgentWorks **does not** provide or share Anthropic accounts, Claude Console workspaces, or API keys. All Claude Code usage is authenticated and billed to the **user's own Anthropic account** (individual or enterprise).

3. **No proprietary protocol hacking**
   AgentWorks does **not** intercept, proxy, or re-implement Claude Code's private protocols. We only provide a standard Linux shell + network access so the user can install and run the official `claude` CLI on their own.

4. **Separation from AgentWorks agents**
   - AgentWorks' own automation (CoPilot + build agents) uses **standard LLM APIs** (Anthropic, OpenAI, etc.) via BYOA credentials configured in the Provider settings.
   - Claude Code, if used, is a **side-by-side tool** under the user's control, not part of the AgentWorks orchestration pipeline.

---

## 2. Scope of Integration

### In Scope

- Provide a dev environment (container) with:
  - Linux shell
  - Network access to Anthropic endpoints
  - Persistent home directory (for Claude Code config/cache)
- Provide documentation/instructions inside the Terminal tab guiding the user to:
  - Install Claude Code using the **official instructions**
  - Authenticate with their own Anthropic account
- Allow the user to run `claude` commands interactively in the terminal.

### Out of Scope

- Pre-configuring or storing any user's `ANTHROPIC_AUTH_TOKEN` or Claude Console Pro/Max credentials in the control plane.
- Automatically installing Claude Code **and** silently authenticating it on behalf of the user.
- Using a single Anthropic account/workspace for multiple AgentWorks tenants.
- Wrapping or reselling Claude Code as an AgentWorks-branded service.

---

## 3. Dev Environment Setup for Claude Code

### 3.1 Container Image Requirements

The base dev environment image MUST include:

- A standard Linux shell (bash/zsh)
- `curl`, `wget`, `git`
- Node.js (optional but recommended, since one of the install paths is via `npm`)
- A persistent home directory mounted at, e.g.:

```text
/home/devuser
  .config/claude-code/    # Claude CLI config (created by official installer)
  .cache/                 # Any CLI caches
  /workspace              # Project repo from GitHub
```

**Note:** The actual Claude Code installation binaries and configs are created by the user via the official installer, not by AgentWorks.

### 3.2 Network Access

Dev environment pods must be allowed outbound connections to:

- Anthropic's endpoints used by Claude Code (as documented by Anthropic).
- Any Anthropic-supported enterprise gateways (Bedrock, Vertex, Foundry) the user's org has configured.

**Network policy:**

- No MITM / proxying of Claude Code traffic with custom hacks.
- Standard TLS outbound connections only, controlled by Anthropic's official CLI and configs.

---

## 4. User Flow: Installing Claude Code in AgentWorks

### Step 1: Open Terminal in AgentWorks

User opens the Terminal tab for a project.

AgentWorks:
- Starts or reuses the dev environment.
- Establishes a WebSocket session to the shell.

The terminal prints a short message:

```
Claude Code is supported as a user-installed tool.

To install Claude Code, follow the official instructions at:
https://code.claude.com/docs/en/setup

All authentication is between you and Anthropic; AgentWorks never sees your Claude credentials.
```

### Step 2: User Installs Claude Code (Inside the Terminal)

The user follows Anthropic's documentation and chooses one of the official install paths (e.g., curl script, package manager, npm, etc.). Example (subject to their docs):

```bash
# Example only – actual command should follow Anthropic's latest docs
curl -fsSL https://code.claude.com/install.sh | bash
```

or

```bash
npm install -g claude-code
```

This:
- Downloads and installs the official `claude` CLI.
- Writes configs under `/home/devuser/.config/claude-code` or similar.
- Does not involve AgentWorks APIs.

### Step 3: User Authenticates Claude Code

The first time the user runs:

```bash
claude
```

or

```bash
claude login
```

the CLI will:
- Prompt for Anthropic login / auth method (Claude Console Pro/Max, Anthropic workspace, or enterprise integration).
- Open a URL or ask for a token, per Anthropic's UX.

The authentication process is between the user and Anthropic:
- Any tokens are stored locally inside the dev environment's home directory.
- AgentWorks does not log, intercept, or persist those tokens in the control plane.

### Step 4: Using Claude Code Inside AgentWorks

Once authenticated, the user can:

Run Claude Code inline:

```bash
claude edit src/components/Button.tsx
claude help
claude chat
```

Use the `claude` CLI exactly as they would on a local laptop, but via the browser terminal.

**AgentWorks' responsibilities:**
- Provide a stable environment where Claude Code can run.
- Provide persistent storage for CLI config and caches across sessions.
- Do not modify CLI behavior or intercept CLI network traffic.

---

## 5. Security & Data Handling

### 5.1 Claude Auth Tokens Stay in the Dev Environment

- Any `ANTHROPIC_AUTH_TOKEN` or equivalent credential created/used by Claude Code resides only in the dev environment's filesystem/environment variables.
- The control plane never reads or writes these values.
- Dev environment logs must redact any environment variables or CLI output that might contain sensitive tokens.

### 5.2 No Sharing Between Tenants

- Dev environments are single-tenant and single-project scoped.
- Claude Code configuration is per-environment (which is tied to a tenant project).
- We never copy a dev environment's `.config/claude-code` across tenants.

### 5.3 User Responsibility Warning

In the Terminal and/or Settings, show a clear warning:

```
When you install and use Claude Code in this environment, you are using your own
Anthropic account. All usage is billed by Anthropic under your account. AgentWorks
is not responsible for your Anthropic billing, and we do not see your Claude credentials.
```

### 5.4 Environment Lifecycle

**If dev environments are ephemeral:**
- Document that Claude Code will need to be re-installed and re-authenticated per environment lifecycle, unless home directories are persisted.

**If home directories are persisted via volume:**
- Ensure volumes are scoped per tenant/project and not reused.

---

## 6. Relationship to AgentWorks Agents

### 6.1 AgentWorks Orchestrator (Built-in Agents)

Uses the Provider/BYOA configuration in the control plane:
- Anthropic API key or enterprise config stored in Secret Manager.
- Calls Anthropic's standard API endpoints (or Bedrock/Vertex) as a typical LLM integration.

Drives:
- CoPilot Q&A and doc generation.
- Card → Run Card pipelines.
- Automated file edits/tests via MCP tools.

### 6.2 Claude Code (User Tool)

- Runs independently in the same dev environment.
- The user manually invokes it in the terminal.
- There is no automatic AgentWorks → Claude CLI integration in MVP:
  - No "Run Card via Claude CLI".
  - No Claude CLI-based automation from our side.

This protects us from crossing TOS lines where we might appear to be reselling Claude Code itself.

### 6.3 Future (Optional) Integrations

If Anthropic explicitly approves deeper integration (via written agreement), we could:
- Add optional "Run via Claude Code" card actions that shell out to `claude` inside the env.
- Add MCP servers or tools that the Claude CLI can interact with more directly.

Until that's in place, Claude Code remains a purely user-operated tool in the environment.

---

## 7. Compliance Checklist

To ensure we don't violate Anthropic's TOS or AUP:

- [ ] No shared Anthropic accounts/workspaces across tenants.
- [ ] No storage of Claude Code auth tokens in the control plane database.
- [ ] No reverse engineering, scraping, or re-implementing Claude Code's internal APIs.
- [ ] All Anthropic API usage by AgentWorks agents uses standard API contracts with tenant-provided keys.
- [ ] Clear UX messaging that Claude Code usage is:
  - Optional
  - User-installed
  - Billed and governed by Anthropic directly.
- [ ] Easy path to disable Claude Code in dev images if Anthropic requires changes.

---

## 8. Summary

| Aspect | AgentWorks Agents | Claude Code |
|--------|-------------------|-------------|
| **Ownership** | AgentWorks orchestrates | User owns and controls |
| **Authentication** | BYOA Provider config (control plane) | User's own Anthropic account (dev env only) |
| **Billing** | Via user's BYOA provider keys | Direct to user's Anthropic account |
| **Integration** | Built into card/lane automation | Manual CLI usage in terminal |
| **Token Storage** | Secret Manager (tenant-scoped) | Local dev environment only |
| **TOS Compliance** | Standard API usage | User-installed, user-authenticated |

---

**Document Control:**
- **Created by:** Architecture Team
- **Reviewed by:** Engineering, Legal
- **Approved by:** Product Owner
- **Next Review:** Before MVP launch
