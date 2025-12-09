#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3010',
  screenshotsDir: './test-screenshots',
  timeout: 30000,
  navigationTabs: [
    'Planning',
    'Kanban', 
    'UI Builder',
    'DB Builder',
    'Workflows',
    'Agents',
    'Usage & Billing'
  ]
};

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTabs: config.navigationTabs.length,
    passedTabs: 0,
    failedTabs: 0,
    errors: []
  },
  tabs: {},
  screenshots: [],
  performance: {},
  console: []
};

// Create screenshots directory
if (!fs.existsSync(config.screenshotsDir)) {
  fs.mkdirSync(config.screenshotsDir, { recursive: true });
}

async function main() {
  console.log('🚀 Starting AgentWorks Platform Browser Test');
  console.log(`📅 Test started at: ${testResults.timestamp}`);
  console.log(`🌐 Testing URL: ${config.baseUrl}`);
  console.log(`📋 Testing ${config.navigationTabs.length} navigation tabs\n`);

  let browser;
  let page;

  try {
    // Launch browser
    console.log('🔧 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--window-size=1400,900'
      ],
      defaultViewport: {
        width: 1400,
        height: 900
      }
    });

    page = await browser.newPage();
    
    // Set up console monitoring
    page.on('console', (msg) => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      testResults.console.push(logEntry);
      
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        console.log(`⚠️  Console Warning: ${msg.text()}`);
      }
    });

    // Set up error monitoring
    page.on('pageerror', (error) => {
      console.log(`💥 Page Error: ${error.message}`);
      testResults.summary.errors.push({
        type: 'PageError',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // Set up failed request monitoring
    page.on('requestfailed', (request) => {
      console.log(`🚫 Failed Request: ${request.url()} - ${request.failure().errorText}`);
      testResults.summary.errors.push({
        type: 'RequestFailed',
        url: request.url(),
        error: request.failure().errorText,
        timestamp: new Date().toISOString()
      });
    });

    // Initial page load and platform verification
    console.log('📄 Loading AgentWorks platform...');
    const startTime = Date.now();
    
    await page.goto(config.baseUrl, { 
      waitUntil: 'networkidle2',
      timeout: config.timeout 
    });
    
    const loadTime = Date.now() - startTime;
    testResults.performance.initialLoad = loadTime;
    console.log(`✅ Page loaded in ${loadTime}ms`);

    // Take initial screenshot
    await takeScreenshot(page, 'initial-load', 'Initial platform load');

    // Verify basic page structure
    await verifyBasicStructure(page);

    // Test API connectivity
    await testApiConnectivity(page);

    // Test each navigation tab
    for (const tab of config.navigationTabs) {
      await testNavigationTab(page, tab);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between tests
    }

    // Test WebSocket connectivity (if applicable)
    await testWebSocketConnectivity(page);

    // Final summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed tabs: ${testResults.summary.passedTabs}`);
    console.log(`❌ Failed tabs: ${testResults.summary.failedTabs}`);
    console.log(`⚠️  Total errors: ${testResults.summary.errors.length}`);
    console.log(`🕐 Initial load time: ${testResults.performance.initialLoad}ms`);

    // Save detailed results
    const resultsFile = path.join(config.screenshotsDir, 'test-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    console.log(`📄 Detailed results saved to: ${resultsFile}`);

    console.log('\n🎉 Browser testing completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    testResults.summary.errors.push({
      type: 'TestFailure',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (page) {
      await takeScreenshot(page, 'error-state', 'Error state when test failed');
    }
    
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function verifyBasicStructure(page) {
  console.log('🔍 Verifying basic page structure...');
  
  try {
    // Check if the main navigation is present
    const nav = await page.$('nav, [role="navigation"], .nav, .navigation');
    if (!nav) {
      throw new Error('No navigation element found');
    }
    
    // Check for title
    const title = await page.title();
    testResults.pageTitle = title;
    console.log(`📖 Page title: ${title}`);
    
    // Look for AgentWorks branding/title
    const hasAgentWorksBranding = await page.evaluate(() => {
      return document.body.innerText.toLowerCase().includes('agentworks') ||
             document.title.toLowerCase().includes('agentworks');
    });
    
    if (hasAgentWorksBranding) {
      console.log('✅ AgentWorks branding detected');
    } else {
      console.log('⚠️  No AgentWorks branding detected');
    }
    
    console.log('✅ Basic structure verification completed');
    
  } catch (error) {
    console.log(`❌ Basic structure verification failed: ${error.message}`);
    testResults.summary.errors.push({
      type: 'StructureVerification',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function testApiConnectivity(page) {
  console.log('🔌 Testing API connectivity...');
  
  try {
    // Test the health endpoint
    const response = await page.evaluate(async (apiUrl) => {
      try {
        const res = await fetch(`${apiUrl}/health`);
        return {
          status: res.status,
          ok: res.ok,
          data: await res.json()
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    }, config.apiUrl);
    
    if (response.ok && response.status === 200) {
      console.log('✅ API health check passed');
      testResults.apiConnectivity = 'healthy';
    } else {
      console.log(`❌ API health check failed: ${response.error || response.status}`);
      testResults.apiConnectivity = 'failed';
      testResults.summary.errors.push({
        type: 'APIConnectivity',
        message: response.error || `HTTP ${response.status}`,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.log(`❌ API connectivity test failed: ${error.message}`);
    testResults.apiConnectivity = 'error';
    testResults.summary.errors.push({
      type: 'APIConnectivity',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function testNavigationTab(page, tabName) {
  console.log(`\n🧪 Testing ${tabName} tab...`);
  
  const tabResult = {
    name: tabName,
    accessible: false,
    loadTime: 0,
    hasContent: false,
    interactiveElements: 0,
    errors: [],
    screenshot: null
  };
  
  try {
    const startTime = Date.now();
    
    // Try different selector strategies to find the tab
    const tabSelectors = [
      `[data-testid="${tabName.toLowerCase()}-tab"]`,
      `[data-testid="${tabName.toLowerCase()}"]`,
      `a[href*="${tabName.toLowerCase()}"]`,
      `button:contains("${tabName}")`,
      `a:contains("${tabName}")`,
      `[role="tab"]:contains("${tabName}")`,
      `nav a:contains("${tabName}")`,
      `.nav-link:contains("${tabName}")`,
      `.tab:contains("${tabName}")`
    ];
    
    let tabElement = null;
    let foundSelector = null;
    
    // Try to find the tab element using different selectors
    for (const selector of tabSelectors) {
      try {
        if (selector.includes(':contains')) {
          // Handle pseudo-selectors manually
          const selectorBase = selector.split(':contains')[0];
          const text = selector.match(/\("([^"]+)"\)/)[1];
          
          tabElement = await page.evaluateHandle((sel, txt) => {
            const elements = Array.from(document.querySelectorAll(sel));
            return elements.find(el => el.textContent.trim().toLowerCase().includes(txt.toLowerCase()));
          }, selectorBase, text);
          
          if (await tabElement.evaluate(el => el !== null)) {
            foundSelector = selector;
            break;
          }
        } else {
          tabElement = await page.$(selector);
          if (tabElement) {
            foundSelector = selector;
            break;
          }
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    if (!tabElement || !(await tabElement.evaluate(el => el !== null))) {
      // If we can't find the tab by selector, try by visible text
      tabElement = await page.evaluateHandle((tabName) => {
        const allElements = Array.from(document.querySelectorAll('*'));
        return allElements.find(el => {
          const text = el.textContent?.trim().toLowerCase();
          const tagName = el.tagName.toLowerCase();
          return text === tabName.toLowerCase() && 
                 (tagName === 'a' || tagName === 'button' || el.role === 'tab' || el.onclick || el.href);
        });
      }, tabName);
      
      if (!(await tabElement.evaluate(el => el !== null))) {
        throw new Error(`Tab "${tabName}" not found with any selector strategy`);
      }
      foundSelector = 'text-based-search';
    }
    
    console.log(`✅ Found ${tabName} tab using: ${foundSelector}`);
    
    // Click the tab
    await tabElement.click();
    tabResult.accessible = true;
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if URL changed or content updated
    const currentUrl = page.url();
    console.log(`🔗 Current URL: ${currentUrl}`);
    
    const loadTime = Date.now() - startTime;
    tabResult.loadTime = loadTime;
    console.log(`⏱️  Tab loaded in ${loadTime}ms`);
    
    // Check for content presence
    const hasContent = await page.evaluate(() => {
      const body = document.body.innerText.trim();
      return body.length > 100; // Arbitrary threshold for "has content"
    });
    
    tabResult.hasContent = hasContent;
    if (hasContent) {
      console.log('✅ Tab has content');
    } else {
      console.log('⚠️  Tab appears to have minimal content');
    }
    
    // Count interactive elements
    const interactiveCount = await page.evaluate(() => {
      const interactiveSelectors = 'button, a, input, select, textarea, [role="button"], [onclick], [tabindex]';
      return document.querySelectorAll(interactiveSelectors).length;
    });
    
    tabResult.interactiveElements = interactiveCount;
    console.log(`🎯 Interactive elements found: ${interactiveCount}`);
    
    // Take screenshot of the tab
    const screenshotName = `tab-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    await takeScreenshot(page, screenshotName, `${tabName} tab view`);
    tabResult.screenshot = `${screenshotName}.png`;
    
    // Check for specific content based on tab type
    await checkTabSpecificContent(page, tabName, tabResult);
    
    testResults.summary.passedTabs++;
    console.log(`✅ ${tabName} tab test completed successfully`);
    
  } catch (error) {
    console.log(`❌ ${tabName} tab test failed: ${error.message}`);
    tabResult.errors.push(error.message);
    testResults.summary.failedTabs++;
    testResults.summary.errors.push({
      type: 'TabNavigation',
      tab: tabName,
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Still try to take a screenshot for debugging
    try {
      const screenshotName = `tab-${tabName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-error`;
      await takeScreenshot(page, screenshotName, `${tabName} tab error state`);
      tabResult.screenshot = `${screenshotName}.png`;
    } catch (screenshotError) {
      console.log(`Failed to take error screenshot: ${screenshotError.message}`);
    }
  }
  
  testResults.tabs[tabName] = tabResult;
}

async function checkTabSpecificContent(page, tabName, tabResult) {
  try {
    switch (tabName.toLowerCase()) {
      case 'planning':
        const hasPlanningElements = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('plan') || text.includes('project') || text.includes('task') || text.includes('milestone');
        });
        tabResult.specificContent = { hasPlanningElements };
        break;
        
      case 'kanban':
        const hasKanbanElements = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('board') || text.includes('column') || text.includes('card') || text.includes('lane') || 
                 document.querySelectorAll('[draggable], .kanban, .board').length > 0;
        });
        tabResult.specificContent = { hasKanbanElements };
        break;
        
      case 'ui builder':
        const hasUIBuilderElements = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('component') || text.includes('design') || text.includes('ui') || text.includes('builder') ||
                 document.querySelectorAll('canvas, .designer, .builder').length > 0;
        });
        tabResult.specificContent = { hasUIBuilderElements };
        break;
        
      case 'db builder':
        const hasDBElements = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('database') || text.includes('table') || text.includes('schema') || text.includes('query') ||
                 text.includes('db') || text.includes('sql');
        });
        tabResult.specificContent = { hasDBElements };
        break;
        
      case 'workflows':
        const hasWorkflowElements = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('workflow') || text.includes('automation') || text.includes('trigger') || 
                 text.includes('action') || text.includes('flow');
        });
        tabResult.specificContent = { hasWorkflowElements };
        break;
        
      case 'agents':
        const hasAgentElements = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('agent') || text.includes('ai') || text.includes('model') || text.includes('llm') ||
                 text.includes('assistant');
        });
        tabResult.specificContent = { hasAgentElements };
        break;
        
      case 'usage & billing':
        const hasBillingElements = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('billing') || text.includes('usage') || text.includes('cost') || text.includes('subscription') ||
                 text.includes('invoice') || text.includes('payment');
        });
        tabResult.specificContent = { hasBillingElements };
        break;
        
      default:
        console.log(`No specific content checks defined for ${tabName}`);
    }
  } catch (error) {
    console.log(`Failed to check specific content for ${tabName}: ${error.message}`);
  }
}

async function testWebSocketConnectivity(page) {
  console.log('\n🔌 Testing WebSocket connectivity...');
  
  try {
    const wsResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const wsUrl = 'ws://localhost:3010'; // Adjust as needed
        const ws = new WebSocket(wsUrl);
        let connected = false;
        
        const timeout = setTimeout(() => {
          if (!connected) {
            ws.close();
            resolve({ status: 'timeout', message: 'Connection timeout' });
          }
        }, 5000);
        
        ws.onopen = () => {
          connected = true;
          clearTimeout(timeout);
          ws.close();
          resolve({ status: 'success', message: 'WebSocket connected successfully' });
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeout);
          resolve({ status: 'error', message: 'WebSocket connection failed' });
        };
        
        ws.onclose = (event) => {
          if (!connected) {
            clearTimeout(timeout);
            resolve({ status: 'closed', message: `WebSocket closed: ${event.code}` });
          }
        };
      });
    });
    
    testResults.websocketConnectivity = wsResult;
    
    if (wsResult.status === 'success') {
      console.log('✅ WebSocket connectivity test passed');
    } else {
      console.log(`⚠️  WebSocket connectivity test failed: ${wsResult.message}`);
    }
    
  } catch (error) {
    console.log(`❌ WebSocket connectivity test error: ${error.message}`);
    testResults.websocketConnectivity = { status: 'error', message: error.message };
  }
}

async function takeScreenshot(page, name, description) {
  try {
    const filename = `${name}.png`;
    const filepath = path.join(config.screenshotsDir, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage: true,
      clip: null
    });
    
    testResults.screenshots.push({
      name: filename,
      description: description,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    
  } catch (error) {
    console.log(`❌ Failed to take screenshot ${name}: ${error.message}`);
  }
}

// Run the test
main().catch(console.error);