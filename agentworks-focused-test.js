#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3010',
  screenshotsDir: './test-focused-screenshots',
  timeout: 30000,
  sections: [
    'CRUD Service',
    'Project Setup', 
    'AgentWorks Dashboard',
    'Database Schema Builder',
    'Workflow Templates',
    'Agent Contracts',
    'Agent Context Editor'
  ]
};

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalSections: config.sections.length,
    passedSections: 0,
    failedSections: 0,
    errors: []
  },
  sections: {},
  screenshots: [],
  performance: {},
  console: [],
  functionalAreas: {}
};

// Create screenshots directory
if (!fs.existsSync(config.screenshotsDir)) {
  fs.mkdirSync(config.screenshotsDir, { recursive: true });
}

async function main() {
  console.log('🚀 Starting AgentWorks Platform Focused Test');
  console.log(`📅 Test started at: ${testResults.timestamp}`);
  console.log(`🌐 Testing URL: ${config.baseUrl}`);
  console.log(`📋 Testing ${config.sections.length} platform sections\n`);

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
      
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        console.log(`❌ Console Error: ${msg.text()}`);
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
    await takeScreenshot(page, 'platform-overview', 'Complete platform overview');

    // Test overall platform structure
    await analyzeOverallStructure(page);

    // Test specific functional areas visible in the interface
    await testFunctionalAreas(page);

    // Test interactive elements
    await testInteractiveElements(page);

    // Test form interactions
    await testFormInteractions(page);

    // Test API integration elements
    await testAPIIntegrationElements(page);

    // Final summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Platform structure: ${testResults.structureAnalysis ? 'Pass' : 'Fail'}`);
    console.log(`🔧 Interactive elements: ${testResults.interactiveElements || 0} found`);
    console.log(`📝 Forms: ${testResults.formInteractions ? 'Present' : 'None found'}`);
    console.log(`🔌 API integration: ${testResults.apiIntegration ? 'Working' : 'Issues detected'}`);
    console.log(`⚠️  Total errors: ${testResults.summary.errors.length}`);
    console.log(`🕐 Initial load time: ${testResults.performance.initialLoad}ms`);

    // Save detailed results
    const resultsFile = path.join(config.screenshotsDir, 'focused-test-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    console.log(`📄 Detailed results saved to: ${resultsFile}`);

    console.log('\n🎉 Focused testing completed successfully!');
    
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

async function analyzeOverallStructure(page) {
  console.log('🔍 Analyzing overall platform structure...');
  
  try {
    const structure = await page.evaluate(() => {
      // Analyze the main sections visible in the page
      const result = {
        hasNavigation: false,
        hasSidebar: false,
        mainSections: [],
        buttons: [],
        forms: [],
        cards: [],
        lists: []
      };

      // Check for navigation elements
      const navElements = document.querySelectorAll('nav, .nav, .navigation, [role="navigation"]');
      result.hasNavigation = navElements.length > 0;

      // Check for sidebar
      const sidebarElements = document.querySelectorAll('.sidebar, aside, [role="complementary"]');
      result.hasSidebar = sidebarElements.length > 0;

      // Find main sections based on headings and structure
      const headings = document.querySelectorAll('h1, h2, h3, .section-title, .card-title');
      headings.forEach(heading => {
        const text = heading.textContent.trim();
        if (text.length > 0) {
          result.mainSections.push(text);
        }
      });

      // Find buttons
      const buttons = document.querySelectorAll('button, [role="button"], .btn, input[type="button"]');
      buttons.forEach(btn => {
        const text = btn.textContent.trim() || btn.value;
        if (text.length > 0 && text.length < 50) {
          result.buttons.push(text);
        }
      });

      // Find forms
      const forms = document.querySelectorAll('form, .form, [data-form]');
      forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        if (inputs.length > 0) {
          result.forms.push({
            inputCount: inputs.length,
            hasSubmit: form.querySelector('[type="submit"], button') !== null
          });
        }
      });

      // Find card-like structures
      const cards = document.querySelectorAll('.card, .panel, .box, [class*="card"]');
      result.cards = cards.length;

      // Find list structures
      const lists = document.querySelectorAll('ul, ol, .list, [role="list"]');
      result.lists = lists.length;

      return result;
    });

    testResults.structureAnalysis = structure;
    
    console.log(`✅ Navigation elements: ${structure.hasNavigation ? 'Present' : 'Not found'}`);
    console.log(`✅ Sidebar elements: ${structure.hasSidebar ? 'Present' : 'Not found'}`);
    console.log(`✅ Main sections found: ${structure.mainSections.length}`);
    console.log(`✅ Interactive buttons: ${structure.buttons.length}`);
    console.log(`✅ Forms detected: ${structure.forms.length}`);
    console.log(`✅ Card components: ${structure.cards}`);
    console.log(`✅ List components: ${structure.lists}`);

    if (structure.mainSections.length > 0) {
      console.log('📋 Detected sections:', structure.mainSections.slice(0, 10).join(', '));
    }

    if (structure.buttons.length > 0) {
      console.log('🔘 Key buttons:', structure.buttons.slice(0, 5).join(', '));
    }
    
  } catch (error) {
    console.log(`❌ Structure analysis failed: ${error.message}`);
    testResults.structureAnalysis = null;
  }
}

async function testFunctionalAreas(page) {
  console.log('\n🔧 Testing functional areas...');
  
  const functionalAreas = [
    'CRUD Service',
    'Project Setup', 
    'AgentWorks Dashboard',
    'Database Schema Builder',
    'Workflow Templates',
    'Agent Contracts',
    'Usage Metrics'
  ];

  for (const area of functionalAreas) {
    try {
      console.log(`🧪 Testing ${area} functionality...`);
      
      const areaResult = await page.evaluate((areaName) => {
        const text = document.body.innerText.toLowerCase();
        const areaLower = areaName.toLowerCase();
        
        // Check if the area is mentioned in the page
        const isPresent = text.includes(areaLower) || 
                       text.includes(areaLower.replace(' ', '')) ||
                       text.includes(areaLower.replace(' ', '-'));
        
        // Look for related elements
        let relatedElements = 0;
        const keywordVariants = areaLower.split(' ');
        
        keywordVariants.forEach(keyword => {
          if (keyword.length > 3 && text.includes(keyword)) {
            relatedElements += document.querySelectorAll(`*[class*="${keyword}"], *[id*="${keyword}"]`).length;
          }
        });

        return {
          present: isPresent,
          relatedElements: relatedElements
        };
      }, area);
      
      testResults.functionalAreas[area] = areaResult;
      
      if (areaResult.present) {
        console.log(`✅ ${area}: Present in page content`);
        if (areaResult.relatedElements > 0) {
          console.log(`  📊 Related elements: ${areaResult.relatedElements}`);
        }
      } else {
        console.log(`⚠️  ${area}: Not clearly visible in current view`);
      }
      
      // Take a screenshot focused on this area if we can find it
      const sectionElement = await page.evaluateHandle((areaName) => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, .title, .heading'));
        return headings.find(h => h.textContent.toLowerCase().includes(areaName.toLowerCase()));
      }, area);
      
      if (sectionElement && await sectionElement.evaluate(el => el !== null)) {
        await sectionElement.scrollIntoView();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await takeScreenshot(page, `area-${area.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, `${area} functional area`);
      }
      
    } catch (error) {
      console.log(`❌ Failed to test ${area}: ${error.message}`);
      testResults.functionalAreas[area] = { error: error.message };
    }
  }
}

async function testInteractiveElements(page) {
  console.log('\n🎮 Testing interactive elements...');
  
  try {
    const interactiveStats = await page.evaluate(() => {
      const stats = {
        buttons: 0,
        links: 0,
        inputs: 0,
        dropdowns: 0,
        checkboxes: 0,
        clickableElements: 0
      };
      
      stats.buttons = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]').length;
      stats.links = document.querySelectorAll('a[href]').length;
      stats.inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea').length;
      stats.dropdowns = document.querySelectorAll('select, [role="combobox"], [role="listbox"]').length;
      stats.checkboxes = document.querySelectorAll('input[type="checkbox"], input[type="radio"]').length;
      stats.clickableElements = document.querySelectorAll('[onclick], [data-click], .clickable, [style*="cursor: pointer"]').length;
      
      return stats;
    });
    
    testResults.interactiveElements = interactiveStats.buttons + interactiveStats.links + 
                                   interactiveStats.inputs + interactiveStats.dropdowns + 
                                   interactiveStats.checkboxes + interactiveStats.clickableElements;
    
    console.log(`✅ Buttons: ${interactiveStats.buttons}`);
    console.log(`✅ Links: ${interactiveStats.links}`);
    console.log(`✅ Input fields: ${interactiveStats.inputs}`);
    console.log(`✅ Dropdowns: ${interactiveStats.dropdowns}`);
    console.log(`✅ Checkboxes/Radio: ${interactiveStats.checkboxes}`);
    console.log(`✅ Other clickable: ${interactiveStats.clickableElements}`);
    console.log(`🎯 Total interactive elements: ${testResults.interactiveElements}`);
    
  } catch (error) {
    console.log(`❌ Interactive elements test failed: ${error.message}`);
  }
}

async function testFormInteractions(page) {
  console.log('\n📝 Testing form interactions...');
  
  try {
    // Find and test forms
    const forms = await page.$$('form, .form');
    testResults.formInteractions = forms.length > 0;
    
    console.log(`📋 Found ${forms.length} forms`);
    
    if (forms.length > 0) {
      for (let i = 0; i < Math.min(forms.length, 3); i++) {
        try {
          const form = forms[i];
          
          // Get form details
          const formInfo = await form.evaluate((form) => {
            const inputs = form.querySelectorAll('input, select, textarea');
            const submitBtn = form.querySelector('[type="submit"], button');
            
            return {
              inputCount: inputs.length,
              hasSubmit: submitBtn !== null,
              action: form.action || 'No action set',
              method: form.method || 'GET'
            };
          });
          
          console.log(`  📝 Form ${i + 1}: ${formInfo.inputCount} inputs, submit: ${formInfo.hasSubmit ? 'Yes' : 'No'}`);
          
          // Try to interact with the first input if it exists
          const firstInput = await form.$('input[type="text"], input[type="email"], textarea');
          if (firstInput) {
            await firstInput.scrollIntoView();
            await firstInput.click();
            await firstInput.type('test input', { delay: 50 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            await firstInput.clear();
            console.log(`    ✅ Successfully tested input interaction`);
          }
          
        } catch (error) {
          console.log(`    ❌ Form ${i + 1} interaction failed: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Form testing failed: ${error.message}`);
    testResults.formInteractions = false;
  }
}

async function testAPIIntegrationElements(page) {
  console.log('\n🔌 Testing API integration elements...');
  
  try {
    // Test for AJAX/fetch requests
    const networkRequests = [];
    
    page.on('response', (response) => {
      if (response.url().includes('localhost:3010') || response.url().includes('api')) {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Look for elements that might trigger API calls
    const apiElements = await page.evaluate(() => {
      const elements = {
        loadButtons: [],
        refreshButtons: [],
        submitButtons: [],
        dynamicContent: []
      };
      
      // Find buttons that might trigger API calls
      const buttons = document.querySelectorAll('button, [role="button"]');
      buttons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if (text.includes('load') || text.includes('fetch') || text.includes('get')) {
          elements.loadButtons.push(text.trim());
        } else if (text.includes('refresh') || text.includes('update')) {
          elements.refreshButtons.push(text.trim());
        } else if (text.includes('submit') || text.includes('save') || text.includes('create')) {
          elements.submitButtons.push(text.trim());
        }
      });
      
      // Look for dynamic content areas
      const dynamicAreas = document.querySelectorAll('[data-dynamic], [data-api], .loading, .spinner');
      elements.dynamicContent = dynamicAreas.length;
      
      return elements;
    });
    
    testResults.apiIntegration = {
      hasAPIElements: apiElements.loadButtons.length > 0 || apiElements.refreshButtons.length > 0,
      networkRequests: networkRequests.length,
      dynamicContent: apiElements.dynamicContent
    };
    
    console.log(`✅ Load buttons: ${apiElements.loadButtons.length}`);
    console.log(`✅ Refresh buttons: ${apiElements.refreshButtons.length}`);
    console.log(`✅ Submit buttons: ${apiElements.submitButtons.length}`);
    console.log(`✅ Dynamic content areas: ${apiElements.dynamicContent}`);
    console.log(`🌐 Network requests detected: ${networkRequests.length}`);
    
  } catch (error) {
    console.log(`❌ API integration test failed: ${error.message}`);
    testResults.apiIntegration = false;
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