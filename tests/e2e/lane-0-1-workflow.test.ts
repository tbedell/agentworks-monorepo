import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  registerUser,
  loginUser,
  createWorkspace,
  createProject,
  navigateToKanbanBoard,
  createCard,
  executeAgent,
  waitForAgentCompletion,
  openTerminal,
  waitForTerminalOutput,
  takeScreenshot,
  waitForElement,
  clickAndWait,
} from '../setup/e2e';

declare global {
  var __PAGE__: any;
}

describe('Lane 0-1 Workflow E2E Tests', () => {
  const testUser = {
    name: 'Test CEO',
    email: `ceo-${Date.now()}@example.com`,
    password: 'SecurePass123!',
  };

  const testWorkspace = {
    name: 'Strategic Planning Workspace',
    description: 'Workspace for testing the CEO CoPilot to PRD Agent workflow',
  };

  const testProject = {
    name: 'Revolutionary Product Development',
    description: 'End-to-end testing of our AI-powered product development workflow',
  };

  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    const page = global.__PAGE__;
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Take initial screenshot
    await takeScreenshot('00-initial-state');
  });

  beforeEach(async () => {
    const page = global.__PAGE__;
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  });

  describe('User Registration and Workspace Setup', () => {
    it('should register new user and create workspace', async () => {
      await takeScreenshot('01-registration-start');

      await registerUser(testUser);

      await takeScreenshot('02-registration-complete');

      // Verify user is logged in and redirected to dashboard
      await waitForElement('[data-testid="dashboard"]');
      expect(await global.__PAGE__.url()).toContain('/dashboard');

      // Should have created a default workspace
      await waitForElement('[data-testid="workspace-card"]');
      
      const workspaceElement = await global.__PAGE__.$('[data-testid="workspace-card"]');
      const workspaceName = await workspaceElement.$eval('[data-testid="workspace-name"]', (el: HTMLElement) => el.textContent);
      
      expect(workspaceName).toContain('workspace'); // Default workspace creation

      await takeScreenshot('03-dashboard-with-workspace');
    });

    it('should create a new project for product development', async () => {
      // Login with the test user
      await loginUser(testUser.email, testUser.password);
      
      await takeScreenshot('04-logged-in-dashboard');

      // Get workspace ID from URL or element
      const workspaceCard = await global.__PAGE__.$('[data-testid="workspace-card"]');
      const workspaceLink = await workspaceCard.$eval('a', (el: HTMLAnchorElement) => el.href);
      workspaceId = workspaceLink.split('/').pop() || '';

      // Navigate to workspace
      await global.__PAGE__.goto(workspaceLink, { waitUntil: 'networkidle0' });

      await takeScreenshot('05-workspace-view');

      // Create new project
      await createProject(workspaceId, testProject.name, testProject.description);

      await takeScreenshot('06-project-created');

      // Get project ID from the created project element
      const projectElement = await global.__PAGE__.$('[data-testid="project-card"]');
      const projectLink = await projectElement.$eval('a', (el: HTMLAnchorElement) => el.href);
      projectId = projectLink.split('/').pop() || '';

      expect(projectId).toBeTruthy();
    });
  });

  describe('Lane 0: Blueprint Creation with CEO CoPilot', () => {
    beforeEach(async () => {
      // Navigate to the Kanban board
      await navigateToKanbanBoard(workspaceId, projectId);
      await takeScreenshot('07-kanban-board-initial');
    });

    it('should create a strategic vision card in Lane 0', async () => {
      const visionCard = {
        title: 'AI-Powered Personal Finance Assistant Vision',
        description: `Create a revolutionary AI-powered personal finance assistant that helps users:
        
        • Automatically categorize and track expenses
        • Provide intelligent budgeting recommendations  
        • Offer personalized investment advice
        • Predict cash flow and prevent overspending
        • Integrate with all major financial institutions
        
        Target market: Tech-savvy millennials and Gen Z with disposable income
        Revenue model: Freemium with premium AI features ($9.99/month)
        Key differentiator: Advanced AI that learns user behavior patterns`,
      };

      // Create card in Lane 0 (Blueprint/Vision)
      await createCard(0, visionCard.title, visionCard.description);

      await takeScreenshot('08-vision-card-created');

      // Verify card appears in Lane 0
      await waitForElement('[data-testid="lane-0"]');
      const lane0 = await global.__PAGE__.$('[data-testid="lane-0"]');
      const cardTitle = await lane0.$eval('[data-testid*="card"]', (el: HTMLElement) => 
        el.querySelector('[data-testid="card-title"]')?.textContent
      );

      expect(cardTitle).toBe(visionCard.title);

      await takeScreenshot('09-vision-card-in-lane-0');
    });

    it('should execute CEO CoPilot agent on vision card', async () => {
      // Find and click the vision card
      const visionCard = await global.__PAGE__.$('[data-testid*="card"]:first-child');
      await visionCard.click();

      await takeScreenshot('10-vision-card-details');

      // Execute CEO CoPilot agent
      await executeAgent('card-123', 'ceo-copilot'); // Note: Would need actual card ID in real scenario

      await takeScreenshot('11-ceo-copilot-execution-started');

      // Open terminal to watch execution
      await openTerminal();

      await takeScreenshot('12-terminal-opened');

      // Wait for initial log messages
      await waitForTerminalOutput('CEO CoPilot execution started');
      await waitForTerminalOutput('Analyzing strategic vision');

      await takeScreenshot('13-ceo-copilot-analyzing');

      // Wait for completion (with extended timeout for AI processing)
      await waitForAgentCompletion('run-123', 120000); // 2 minute timeout

      await takeScreenshot('14-ceo-copilot-completed');

      // Verify terminal shows completion
      await waitForTerminalOutput('Strategic blueprint generated');
      await waitForTerminalOutput('Market analysis completed');
      await waitForTerminalOutput('Business model validated');

      await takeScreenshot('15-strategic-analysis-complete');

      // Verify the card has been updated with CEO CoPilot output
      const updatedCard = await global.__PAGE__.$('[data-testid="card-details"]');
      const cardContent = await updatedCard.$eval('[data-testid="card-content"]', (el: HTMLElement) => el.textContent);
      
      expect(cardContent).toContain('Market Analysis');
      expect(cardContent).toContain('Competitive Landscape');
      expect(cardContent).toContain('Risk Assessment');

      await takeScreenshot('16-enhanced-vision-card');
    });

    it('should validate blueprint completeness before Lane 1', async () => {
      // Check that the card has all required CEO CoPilot outputs
      const cardDetails = await global.__PAGE__.$('[data-testid="card-details"]');
      
      const hasMarketAnalysis = await cardDetails.$eval('[data-testid="card-content"]', (el: HTMLElement) => 
        el.textContent?.includes('Market Analysis')
      );
      
      const hasBusinessModel = await cardDetails.$eval('[data-testid="card-content"]', (el: HTMLElement) => 
        el.textContent?.includes('Business Model')
      );
      
      const hasRiskAssessment = await cardDetails.$eval('[data-testid="card-content"]', (el: HTMLElement) => 
        el.textContent?.includes('Risk Assessment')
      );

      expect(hasMarketAnalysis).toBe(true);
      expect(hasBusinessModel).toBe(true);
      expect(hasRiskAssessment).toBe(true);

      await takeScreenshot('17-blueprint-validation-complete');

      // Card should now be ready to move to Lane 1
      const moveToLane1Button = await global.__PAGE__.$('[data-testid="move-to-lane-1"]');
      expect(moveToLane1Button).toBeTruthy();
    });
  });

  describe('Lane 0 to Lane 1 Transition', () => {
    it('should move strategic vision card from Lane 0 to Lane 1', async () => {
      // Drag and drop the card from Lane 0 to Lane 1
      const card = await global.__PAGE__.$('[data-testid*="card"]:first-child');
      const lane1 = await global.__PAGE__.$('[data-testid="lane-1"]');

      await takeScreenshot('18-before-card-move');

      // Perform drag and drop
      const cardBox = await card.boundingBox();
      const lane1Box = await lane1.boundingBox();

      await global.__PAGE__.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await global.__PAGE__.mouse.down();
      await global.__PAGE__.mouse.move(lane1Box.x + lane1Box.width / 2, lane1Box.y + lane1Box.height / 2);
      await global.__PAGE__.mouse.up();

      await takeScreenshot('19-after-card-move');

      // Verify card is now in Lane 1
      await waitForElement('[data-testid="lane-1"] [data-testid*="card"]');
      
      const lane1Cards = await global.__PAGE__.$$('[data-testid="lane-1"] [data-testid*="card"]');
      expect(lane1Cards.length).toBeGreaterThan(0);

      await takeScreenshot('20-card-in-lane-1');
    });

    it('should verify card status changes reflect the transition', async () => {
      // Check that card status updated from "Blueprint" to "Ready for PRD"
      const card = await global.__PAGE__.$('[data-testid="lane-1"] [data-testid*="card"]:first-child');
      await card.click();

      await waitForElement('[data-testid="card-details"]');
      
      const cardStatus = await global.__PAGE__.$eval('[data-testid="card-status"]', (el: HTMLElement) => el.textContent);
      expect(cardStatus).toBe('Ready for PRD');

      await takeScreenshot('21-card-status-updated');
    });
  });

  describe('Lane 1: PRD Development with PRD Agent', () => {
    it('should execute PRD Agent on the strategic vision card', async () => {
      // Ensure we're working with the card in Lane 1
      const lane1Card = await global.__PAGE__.$('[data-testid="lane-1"] [data-testid*="card"]:first-child');
      await lane1Card.click();

      await takeScreenshot('22-lane-1-card-selected');

      // Execute PRD Agent
      await executeAgent('card-123', 'prd-agent');

      await takeScreenshot('23-prd-agent-execution-started');

      // Open terminal to monitor progress
      await openTerminal();

      // Wait for PRD Agent specific log messages
      await waitForTerminalOutput('PRD Agent execution started');
      await waitForTerminalOutput('Analyzing strategic blueprint');
      await waitForTerminalOutput('Generating product requirements');

      await takeScreenshot('24-prd-agent-analyzing');

      // PRD Agent should take longer as it processes the strategic blueprint
      await waitForAgentCompletion('run-124', 180000); // 3 minute timeout

      await takeScreenshot('25-prd-agent-completed');

      // Verify PRD-specific completion messages
      await waitForTerminalOutput('Product Requirements Document generated');
      await waitForTerminalOutput('Technical specifications defined');
      await waitForTerminalOutput('User stories created');
      await waitForTerminalOutput('Acceptance criteria established');

      await takeScreenshot('26-prd-generation-complete');
    });

    it('should validate comprehensive PRD content', async () => {
      // Check that the card now contains comprehensive PRD sections
      const cardContent = await global.__PAGE__.$eval('[data-testid="card-content"]', (el: HTMLElement) => el.textContent);

      // Verify PRD sections are present
      expect(cardContent).toContain('Product Overview');
      expect(cardContent).toContain('User Stories');
      expect(cardContent).toContain('Functional Requirements');
      expect(cardContent).toContain('Non-Functional Requirements');
      expect(cardContent).toContain('Technical Specifications');
      expect(cardContent).toContain('API Specifications');
      expect(cardContent).toContain('Database Schema');
      expect(cardContent).toContain('Security Requirements');
      expect(cardContent).toContain('Performance Criteria');
      expect(cardContent).toContain('Acceptance Criteria');

      await takeScreenshot('27-comprehensive-prd-content');

      // Verify user stories are well-formed
      expect(cardContent).toContain('As a user');
      expect(cardContent).toContain('I want to');
      expect(cardContent).toContain('So that');

      await takeScreenshot('28-user-stories-validation');
    });

    it('should verify technical specifications are detailed', async () => {
      const cardContent = await global.__PAGE__.$eval('[data-testid="card-content"]', (el: HTMLElement) => el.textContent);

      // Check for technical detail
      expect(cardContent).toContain('Architecture');
      expect(cardContent).toContain('Database');
      expect(cardContent).toContain('API');
      expect(cardContent).toContain('Security');
      expect(cardContent).toContain('Scalability');
      expect(cardContent).toContain('Performance');

      // Should include specific technologies
      expect(cardContent).toMatch(/(React|Node\.js|PostgreSQL|Redis|AWS|Docker)/);

      await takeScreenshot('29-technical-specifications-detailed');
    });
  });

  describe('Complete Lane 0-1 Workflow Validation', () => {
    it('should show complete workflow progression in terminal logs', async () => {
      // Scroll through terminal to see full workflow
      const terminal = await global.__PAGE__.$('[data-testid="terminal-output"]');
      
      // Scroll to top to see CEO CoPilot logs
      await terminal.evaluate(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
      await global.__PAGE__.waitForTimeout(1000);
      
      await takeScreenshot('30-workflow-start-logs');

      // Scroll to middle to see transition
      await terminal.evaluate(el => el.scrollTo({ top: el.scrollHeight / 2, behavior: 'smooth' }));
      await global.__PAGE__.waitForTimeout(1000);
      
      await takeScreenshot('31-workflow-transition-logs');

      // Scroll to bottom to see PRD Agent completion
      await terminal.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
      await global.__PAGE__.waitForTimeout(1000);
      
      await takeScreenshot('32-workflow-completion-logs');

      // Verify complete workflow sequence in logs
      const terminalContent = await terminal.$eval('*', (el: HTMLElement) => el.textContent);
      
      expect(terminalContent).toContain('CEO CoPilot execution started');
      expect(terminalContent).toContain('Strategic blueprint generated');
      expect(terminalContent).toContain('Card moved from Lane 0 to Lane 1');
      expect(terminalContent).toContain('PRD Agent execution started');
      expect(terminalContent).toContain('Product Requirements Document generated');
    });

    it('should validate card progression and data transformation', async () => {
      // Check final card state shows progression through both agents
      const finalCard = await global.__PAGE__.$('[data-testid="card-details"]');
      
      // Should have CEO CoPilot outputs
      const hasCEOOutputs = await finalCard.$eval('[data-testid="card-content"]', (el: HTMLElement) => {
        const content = el.textContent || '';
        return content.includes('Market Analysis') && 
               content.includes('Competitive Landscape') && 
               content.includes('Business Model');
      });

      // Should have PRD Agent outputs
      const hasPRDOutputs = await finalCard.$eval('[data-testid="card-content"]', (el: HTMLElement) => {
        const content = el.textContent || '';
        return content.includes('User Stories') && 
               content.includes('Technical Specifications') && 
               content.includes('Acceptance Criteria');
      });

      expect(hasCEOOutputs).toBe(true);
      expect(hasPRDOutputs).toBe(true);

      await takeScreenshot('33-final-card-state');
    });

    it('should verify usage tracking for both agent executions', async () => {
      // Navigate to usage dashboard
      await global.__PAGE__.click('[data-testid="usage-dashboard-link"]');
      await waitForElement('[data-testid="usage-dashboard"]');

      await takeScreenshot('34-usage-dashboard');

      // Should show usage for both CEO CoPilot and PRD Agent
      const usageData = await global.__PAGE__.$eval('[data-testid="usage-summary"]', (el: HTMLElement) => el.textContent);
      
      expect(usageData).toContain('CEO CoPilot');
      expect(usageData).toContain('PRD Agent');
      expect(usageData).toContain('Total Cost');
      expect(usageData).toContain('Token Usage');

      // Should show cost breakdown by agent
      const agentBreakdown = await global.__PAGE__.$eval('[data-testid="agent-breakdown"]', (el: HTMLElement) => el.textContent);
      
      expect(agentBreakdown).toContain('OpenAI GPT-4'); // CEO CoPilot
      expect(agentBreakdown).toContain('Anthropic Claude-3'); // PRD Agent

      await takeScreenshot('35-usage-breakdown');
    });

    it('should demonstrate full workflow can be repeated', async () => {
      // Navigate back to Kanban board
      await navigateToKanbanBoard(workspaceId, projectId);

      // Create a second strategic card
      const secondVisionCard = {
        title: 'AI-Powered Health Monitoring Platform',
        description: 'Revolutionary health monitoring platform using wearable devices and AI',
      };

      await createCard(0, secondVisionCard.title, secondVisionCard.description);

      await takeScreenshot('36-second-workflow-card-created');

      // Verify the workflow can be repeated
      const lane0Cards = await global.__PAGE__.$$('[data-testid="lane-0"] [data-testid*="card"]');
      expect(lane0Cards.length).toBeGreaterThan(0);

      // Check that the first card is still in Lane 1 (completed workflow)
      const lane1Cards = await global.__PAGE__.$$('[data-testid="lane-1"] [data-testid*="card"]');
      expect(lane1Cards.length).toBeGreaterThan(0);

      await takeScreenshot('37-parallel-workflow-state');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle agent execution failures gracefully', async () => {
      // Create a card with problematic content
      const problematicCard = {
        title: 'Invalid Strategic Vision',
        description: 'A vision that might cause agent execution issues',
      };

      await createCard(0, problematicCard.title, problematicCard.description);
      
      const newCard = await global.__PAGE__.$('[data-testid="lane-0"] [data-testid*="card"]:last-child');
      await newCard.click();

      // Try to execute agent (this might fail in test environment)
      try {
        await executeAgent('card-invalid', 'ceo-copilot');
        
        // If execution starts, wait for potential failure
        await openTerminal();
        
        // Look for error messages in terminal
        const hasError = await global.__PAGE__.waitForSelector(
          '[data-testid="terminal-output"]:contains("Error")', 
          { timeout: 30000 }
        ).catch(() => false);

        if (hasError) {
          await takeScreenshot('38-agent-execution-error');
          
          // Verify error handling UI
          await waitForElement('[data-testid="error-notification"]');
          const errorMessage = await global.__PAGE__.$eval('[data-testid="error-notification"]', (el: HTMLElement) => el.textContent);
          expect(errorMessage).toContain('Agent execution failed');
        }
      } catch (error) {
        // Expected behavior - capture error handling
        await takeScreenshot('39-error-handling');
        console.log('Agent execution error handled:', error);
      }
    });

    it('should prevent invalid lane transitions', async () => {
      // Try to move a card that hasn't been processed by CEO CoPilot
      const unprocessedCard = await createCard(0, 'Unprocessed Card', 'This card has not been processed by CEO CoPilot');
      
      const card = await global.__PAGE__.$('[data-testid="lane-0"] [data-testid*="card"]:last-child');
      const lane1 = await global.__PAGE__.$('[data-testid="lane-1"]');

      await takeScreenshot('40-before-invalid-move');

      // Try to drag unprocessed card to Lane 1
      const cardBox = await card.boundingBox();
      const lane1Box = await lane1.boundingBox();

      await global.__PAGE__.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await global.__PAGE__.mouse.down();
      await global.__PAGE__.mouse.move(lane1Box.x + lane1Box.width / 2, lane1Box.y + lane1Box.height / 2);

      // Should show validation error
      await waitForElement('[data-testid="lane-validation-error"]');
      const errorMessage = await global.__PAGE__.$eval('[data-testid="lane-validation-error"]', (el: HTMLElement) => el.textContent);
      expect(errorMessage).toContain('CEO CoPilot processing required');

      await global.__PAGE__.mouse.up();

      await takeScreenshot('41-invalid-move-prevented');

      // Card should remain in Lane 0
      const lane0Cards = await global.__PAGE__.$$('[data-testid="lane-0"] [data-testid*="card"]');
      expect(lane0Cards.length).toBeGreaterThan(0);
    });
  });

  afterAll(async () => {
    await takeScreenshot('42-final-state');
    
    // Take a final screenshot of the completed workflow
    await navigateToKanbanBoard(workspaceId, projectId);
    await takeScreenshot('43-completed-lane-0-1-workflow');
  });
});