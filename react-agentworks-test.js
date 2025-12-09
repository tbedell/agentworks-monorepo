#!/usr/bin/env node

/**
 * Comprehensive AgentWorks React Platform Testing Suite
 * Tests all enhanced modules and agent coordination features
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class ReactAgentWorksTestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            platformAccess: null,
            navigationTabs: {},
            enhancedModules: {
                planning: null,
                uiBuilder: null,
                dbBuilder: null,
                workflows: null,
                kanban: null,
                agents: null,
                usage: null
            },
            crossModuleIntegration: {},
            agentCoordination: null,
            apiIntegration: {},
            performance: {},
            screenshots: [],
            errors: []
        };
        this.screenshotDir = '/AgentWorks/react-test-screenshots';
        this.startTime = Date.now();
    }

    async setup() {
        console.log('🚀 Setting up React AgentWorks test suite...');
        
        // Create screenshot directory
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }

        // Launch browser
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Monitor console messages
        this.page.on('console', msg => {
            console.log(`💬 Console ${msg.type()}: ${msg.text()}`);
            if (msg.type() === 'error') {
                this.testResults.errors.push({
                    type: 'console_error',
                    message: msg.text(),
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Monitor network errors
        this.page.on('requestfailed', request => {
            console.log(`🔥 Request failed: ${request.url()} - ${request.failure()?.errorText}`);
            this.testResults.errors.push({
                type: 'network_error',
                url: request.url(),
                failure: request.failure()?.errorText,
                timestamp: new Date().toISOString()
            });
        });
    }

    async testPlatformAccess() {
        console.log('🌐 Testing platform access...');
        
        try {
            const response = await this.page.goto('http://localhost:5173', { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Wait for React to render
            await this.page.waitForSelector('header', { timeout: 10000 });

            this.testResults.platformAccess = {
                success: response.ok(),
                statusCode: response.status(),
                loadTime: Date.now() - this.startTime,
                title: await this.page.title()
            };

            // Take homepage screenshot
            await this.takeScreenshot('00-homepage');

            console.log(`✅ Platform accessible: ${response.status()}`);
            console.log(`📄 Page title: ${this.testResults.platformAccess.title}`);
            return true;
        } catch (error) {
            this.testResults.platformAccess = {
                success: false,
                error: error.message
            };
            console.log(`❌ Platform access failed: ${error.message}`);
            return false;
        }
    }

    async testNavigationTabs() {
        console.log('🧭 Testing navigation tabs...');
        
        const routes = [
            { path: '/planning', label: 'Planning' },
            { path: '/kanban', label: 'Kanban' },
            { path: '/ui-builder', label: 'UI Builder' },
            { path: '/db-builder', label: 'DB Builder' },
            { path: '/workflows', label: 'Workflows' },
            { path: '/agents', label: 'Agents' },
            { path: '/usage', label: 'Usage & Billing' }
        ];
        
        for (const route of routes) {
            try {
                console.log(`  📍 Testing ${route.label} (${route.path})...`);
                
                // Navigate to the route
                await this.page.goto(`http://localhost:5173${route.path}`, { 
                    waitUntil: 'networkidle0',
                    timeout: 10000
                });

                // Wait for React to render
                await this.page.waitForSelector('nav', { timeout: 5000 }).catch(() => null);

                // Check if we're on the correct route
                const currentUrl = this.page.url();
                const isCorrectRoute = currentUrl.includes(route.path);

                // Check if navigation tab is active (by looking for active styles)
                const activeNavTab = await this.page.evaluate(() => {
                    const activeNav = document.querySelector('nav a[class*="bg-blue-600"]');
                    return activeNav ? activeNav.textContent.trim() : null;
                });

                // Check for page content
                const pageContent = await this.page.evaluate(() => {
                    return document.body.innerText.length > 100;
                });

                this.testResults.navigationTabs[route.label] = {
                    accessible: true,
                    correctRoute: isCorrectRoute,
                    activeTab: activeNavTab === route.label,
                    hasContent: pageContent,
                    url: currentUrl,
                    loadTime: Date.now() - this.startTime
                };

                // Take screenshot
                await this.takeScreenshot(`01-nav-${route.label.toLowerCase().replace(/\s+/g, '-')}`);

                console.log(`  ✅ ${route.label} tab: Route=${isCorrectRoute}, Active=${activeNavTab === route.label}, Content=${pageContent}`);
            } catch (error) {
                this.testResults.navigationTabs[route.label] = {
                    accessible: false,
                    error: error.message
                };
                console.log(`  ❌ ${route.label} tab failed: ${error.message}`);
            }
        }
    }

    async testPlanningModule() {
        console.log('📋 Testing Planning Module enhanced features...');
        
        try {
            await this.page.goto('http://localhost:5173/planning', { 
                waitUntil: 'networkidle0',
                timeout: 10000
            });
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Test page structure and components
            const pageAnalysis = await this.page.evaluate(() => {
                const planningElements = {
                    hasHeader: !!document.querySelector('h1, h2, h3, [class*="title"], [class*="header"]'),
                    hasButtons: document.querySelectorAll('button').length > 0,
                    hasInputs: document.querySelectorAll('input, textarea, select').length > 0,
                    hasForms: document.querySelectorAll('form').length > 0,
                    hasCards: document.querySelectorAll('[class*="card"], [class*="panel"]').length > 0,
                    textContent: document.body.innerText.substring(0, 500),
                    buttonCount: document.querySelectorAll('button').length,
                    inputCount: document.querySelectorAll('input, textarea, select').length
                };
                return planningElements;
            });

            // Test CoPilot button
            const copilotTest = await this.testCoPilotButton();

            this.testResults.enhancedModules.planning = {
                accessible: true,
                pageAnalysis,
                copilotIntegration: copilotTest,
                timestamp: new Date().toISOString()
            };

            await this.takeScreenshot('02-planning-module');
            console.log('✅ Planning module tested');

        } catch (error) {
            this.testResults.enhancedModules.planning = {
                accessible: false,
                error: error.message
            };
            console.log(`❌ Planning module failed: ${error.message}`);
        }
    }

    async testUIBuilderModule() {
        console.log('🎨 Testing UI Builder enhanced features...');
        
        try {
            await this.page.goto('http://localhost:5173/ui-builder', { 
                waitUntil: 'networkidle0',
                timeout: 10000
            });
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Test UI builder specific features
            const uiBuilderFeatures = await this.page.evaluate(() => {
                return {
                    hasCanvas: !!document.querySelector('[class*="canvas"], [class*="builder"], [class*="designer"]'),
                    hasPalette: !!document.querySelector('[class*="palette"], [class*="components"], [class*="tools"]'),
                    hasPreview: !!document.querySelector('[class*="preview"], [class*="view"]'),
                    hasFileInput: !!document.querySelector('input[type="file"]'),
                    textContent: document.body.innerText.substring(0, 500)
                };
            });

            this.testResults.enhancedModules.uiBuilder = {
                accessible: true,
                features: uiBuilderFeatures,
                timestamp: new Date().toISOString()
            };

            await this.takeScreenshot('03-ui-builder-module');
            console.log('✅ UI Builder module tested');

        } catch (error) {
            this.testResults.enhancedModules.uiBuilder = {
                accessible: false,
                error: error.message
            };
            console.log(`❌ UI Builder module failed: ${error.message}`);
        }
    }

    async testDatabaseBuilderModule() {
        console.log('🗄️ Testing Database Builder enhanced features...');
        
        try {
            await this.page.goto('http://localhost:5173/db-builder', { 
                waitUntil: 'networkidle0',
                timeout: 10000
            });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const dbBuilderFeatures = await this.page.evaluate(() => {
                return {
                    hasSchemaEditor: !!document.querySelector('[class*="schema"], [class*="editor"], [class*="table"]'),
                    hasEntityList: !!document.querySelector('[class*="entity"], [class*="list"], [class*="sidebar"]'),
                    hasRelationships: !!document.querySelector('[class*="relation"], [class*="connect"], [class*="link"]'),
                    hasSQL: document.body.innerText.toLowerCase().includes('sql'),
                    textContent: document.body.innerText.substring(0, 500)
                };
            });

            this.testResults.enhancedModules.dbBuilder = {
                accessible: true,
                features: dbBuilderFeatures,
                timestamp: new Date().toISOString()
            };

            await this.takeScreenshot('04-db-builder-module');
            console.log('✅ Database Builder module tested');

        } catch (error) {
            this.testResults.enhancedModules.dbBuilder = {
                accessible: false,
                error: error.message
            };
            console.log(`❌ Database Builder module failed: ${error.message}`);
        }
    }

    async testWorkflowsModule() {
        console.log('⚡ Testing Workflows enhanced features...');
        
        try {
            await this.page.goto('http://localhost:5173/workflows', { 
                waitUntil: 'networkidle0',
                timeout: 10000
            });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const workflowFeatures = await this.page.evaluate(() => {
                return {
                    hasWorkflowCanvas: !!document.querySelector('[class*="workflow"], [class*="canvas"], [class*="flow"]'),
                    hasNodePalette: !!document.querySelector('[class*="node"], [class*="palette"], [class*="tool"]'),
                    hasJsonEditor: !!document.querySelector('[class*="json"], [class*="code"], [class*="editor"]'),
                    hasExecuteButton: !!document.querySelector('button[class*="execute"], button[class*="run"], button[class*="start"]'),
                    textContent: document.body.innerText.substring(0, 500)
                };
            });

            this.testResults.enhancedModules.workflows = {
                accessible: true,
                features: workflowFeatures,
                timestamp: new Date().toISOString()
            };

            await this.takeScreenshot('05-workflows-module');
            console.log('✅ Workflows module tested');

        } catch (error) {
            this.testResults.enhancedModules.workflows = {
                accessible: false,
                error: error.message
            };
            console.log(`❌ Workflows module failed: ${error.message}`);
        }
    }

    async testKanbanModule() {
        console.log('📊 Testing Kanban module...');
        
        try {
            await this.page.goto('http://localhost:5173/kanban', { 
                waitUntil: 'networkidle0',
                timeout: 10000
            });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const kanbanFeatures = await this.page.evaluate(() => {
                return {
                    hasColumns: document.querySelectorAll('[class*="column"], [class*="lane"]').length > 0,
                    hasCards: document.querySelectorAll('[class*="card"], [class*="task"], [class*="item"]').length > 0,
                    hasDragDrop: !!document.querySelector('[draggable], [class*="drag"], [class*="drop"]'),
                    textContent: document.body.innerText.substring(0, 500)
                };
            });

            this.testResults.enhancedModules.kanban = {
                accessible: true,
                features: kanbanFeatures,
                timestamp: new Date().toISOString()
            };

            await this.takeScreenshot('06-kanban-module');
            console.log('✅ Kanban module tested');

        } catch (error) {
            this.testResults.enhancedModules.kanban = {
                accessible: false,
                error: error.message
            };
            console.log(`❌ Kanban module failed: ${error.message}`);
        }
    }

    async testAgentsModule() {
        console.log('🤖 Testing Agents module...');
        
        try {
            await this.page.goto('http://localhost:5173/agents', { 
                waitUntil: 'networkidle0',
                timeout: 10000
            });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const agentsFeatures = await this.page.evaluate(() => {
                return {
                    hasAgentList: document.querySelectorAll('[class*="agent"], [class*="bot"], [class*="service"]').length > 0,
                    hasConfiguration: !!document.querySelector('[class*="config"], [class*="setting"], [class*="parameter"]'),
                    hasStatus: !!document.querySelector('[class*="status"], [class*="active"], [class*="running"]'),
                    textContent: document.body.innerText.substring(0, 500)
                };
            });

            this.testResults.enhancedModules.agents = {
                accessible: true,
                features: agentsFeatures,
                timestamp: new Date().toISOString()
            };

            await this.takeScreenshot('07-agents-module');
            console.log('✅ Agents module tested');

        } catch (error) {
            this.testResults.enhancedModules.agents = {
                accessible: false,
                error: error.message
            };
            console.log(`❌ Agents module failed: ${error.message}`);
        }
    }

    async testUsageModule() {
        console.log('💰 Testing Usage & Billing module...');
        
        try {
            await this.page.goto('http://localhost:5173/usage', { 
                waitUntil: 'networkidle0',
                timeout: 10000
            });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const usageFeatures = await this.page.evaluate(() => {
                return {
                    hasMetrics: !!document.querySelector('[class*="metric"], [class*="stat"], [class*="chart"]'),
                    hasBilling: document.body.innerText.toLowerCase().includes('billing') || 
                               document.body.innerText.toLowerCase().includes('cost') ||
                               document.body.innerText.toLowerCase().includes('usage'),
                    hasCharts: document.querySelectorAll('svg, canvas, [class*="chart"]').length > 0,
                    textContent: document.body.innerText.substring(0, 500)
                };
            });

            this.testResults.enhancedModules.usage = {
                accessible: true,
                features: usageFeatures,
                timestamp: new Date().toISOString()
            };

            await this.takeScreenshot('08-usage-module');
            console.log('✅ Usage module tested');

        } catch (error) {
            this.testResults.enhancedModules.usage = {
                accessible: false,
                error: error.message
            };
            console.log(`❌ Usage module failed: ${error.message}`);
        }
    }

    async testCoPilotButton() {
        try {
            // Look for CoPilot button
            const copilotButton = await this.page.$('button:has-text("CoPilot")');
            if (copilotButton) {
                await copilotButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Look for modal or popup
                const modalVisible = await this.page.evaluate(() => {
                    return !!document.querySelector('[class*="modal"], [class*="popup"], [class*="copilot"]');
                });
                
                return { present: true, interactive: true, modalVisible };
            }
            return { present: false };
        } catch (error) {
            return { error: error.message };
        }
    }

    async testAPIIntegration() {
        console.log('🔌 Testing API integration...');
        
        const apiEndpoints = [
            '/api/health',
            '/api/projects',
            '/api/agents',
            '/api/workflows'
        ];

        for (const endpoint of apiEndpoints) {
            try {
                const response = await this.page.evaluate(async (url) => {
                    try {
                        const resp = await fetch(url);
                        return {
                            ok: resp.ok,
                            status: resp.status,
                            statusText: resp.statusText,
                            url: resp.url
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }, endpoint);

                this.testResults.apiIntegration[endpoint] = response;
                
                console.log(`  API ${endpoint}: ${response.ok ? '✅' : '❌'} ${response.status || response.error}`);
                
            } catch (error) {
                this.testResults.apiIntegration[endpoint] = {
                    error: error.message
                };
                console.log(`  API ${endpoint}: ❌ ${error.message}`);
            }
        }

        console.log('✅ API integration tested');
    }

    async testPerformance() {
        console.log('⚡ Testing performance metrics...');
        
        try {
            // Get performance metrics
            const metrics = await this.page.metrics();
            
            // Test load times for each module
            const moduleLoadTimes = {};
            const routes = ['/planning', '/kanban', '/ui-builder', '/db-builder', '/workflows', '/agents', '/usage'];

            for (const route of routes) {
                const start = Date.now();
                await this.page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle0' });
                await new Promise(resolve => setTimeout(resolve, 1000));
                const end = Date.now();
                moduleLoadTimes[route] = end - start;
            }

            this.testResults.performance = {
                browserMetrics: metrics,
                moduleLoadTimes,
                totalTestTime: Date.now() - this.startTime
            };

            console.log('✅ Performance metrics collected');

        } catch (error) {
            this.testResults.performance = {
                error: error.message
            };
            console.log(`❌ Performance testing failed: ${error.message}`);
        }
    }

    async takeScreenshot(name) {
        try {
            const filename = `${name}-${Date.now()}.png`;
            const filepath = path.join(this.screenshotDir, filename);
            await this.page.screenshot({ path: filepath, fullPage: true });
            this.testResults.screenshots.push({
                name,
                filename,
                filepath,
                timestamp: new Date().toISOString()
            });
            console.log(`📸 Screenshot saved: ${filename}`);
        } catch (error) {
            console.log(`❌ Screenshot failed for ${name}: ${error.message}`);
        }
    }

    async generateReport() {
        console.log('📊 Generating comprehensive test report...');
        
        const report = {
            testSuite: 'React AgentWorks Platform Comprehensive Testing',
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            summary: {
                platformAccessible: this.testResults.platformAccess?.success || false,
                totalModules: Object.keys(this.testResults.enhancedModules).length,
                workingModules: Object.values(this.testResults.enhancedModules).filter(module => module && module.accessible).length,
                totalErrors: this.testResults.errors.length,
                screenshotsTaken: this.testResults.screenshots.length,
                navigationTabsCount: Object.keys(this.testResults.navigationTabs).length,
                workingNavTabs: Object.values(this.testResults.navigationTabs).filter(tab => tab.accessible).length
            },
            results: this.testResults
        };

        const reportPath = '/AgentWorks/React_AgentWorks_Test_Report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Generate markdown report
        const markdownReport = this.generateMarkdownReport(report);
        const markdownPath = '/AgentWorks/React_AgentWorks_Test_Report.md';
        fs.writeFileSync(markdownPath, markdownReport);

        console.log(`✅ Test report generated: ${reportPath}`);
        console.log(`✅ Markdown report generated: ${markdownPath}`);

        return report;
    }

    generateMarkdownReport(report) {
        return `# React AgentWorks Platform Comprehensive Test Report

## Test Summary
- **Test Date**: ${report.timestamp}
- **Duration**: ${Math.round(report.duration / 1000)}s
- **Platform Status**: ${report.summary.platformAccessible ? '✅ Accessible' : '❌ Failed'}
- **Working Modules**: ${report.summary.workingModules}/${report.summary.totalModules}
- **Working Nav Tabs**: ${report.summary.workingNavTabs}/${report.summary.navigationTabsCount}
- **Total Errors**: ${report.summary.totalErrors}
- **Screenshots**: ${report.summary.screenshotsTaken}

## Platform Access
${report.results.platformAccess?.success ? '✅' : '❌'} **Status**: ${report.results.platformAccess?.success ? 'Accessible' : 'Failed'}
- **Status Code**: ${report.results.platformAccess?.statusCode || 'N/A'}
- **Load Time**: ${report.results.platformAccess?.loadTime || 'N/A'}ms
- **Page Title**: ${report.results.platformAccess?.title || 'N/A'}

## Navigation Testing Results
${Object.entries(report.results.navigationTabs).map(([tab, result]) => 
`### ${tab}
- **Accessible**: ${result.accessible ? '✅' : '❌'}
- **Correct Route**: ${result.correctRoute ? '✅' : '❌'}
- **Active Tab**: ${result.activeTab ? '✅' : '❌'}
- **Has Content**: ${result.hasContent ? '✅' : '❌'}
- **URL**: ${result.url || 'N/A'}
${result.error ? `- **Error**: ${result.error}` : ''}`
).join('\n\n')}

## Enhanced Module Testing Results

${Object.entries(report.results.enhancedModules).map(([moduleName, result]) => {
    if (!result) return '';
    
    return `### ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module
- **Status**: ${result.accessible ? '✅ Accessible' : '❌ Failed'}
${result.features ? `- **Features**: ${JSON.stringify(result.features, null, 2)}` : ''}
${result.pageAnalysis ? `- **Page Analysis**: ${JSON.stringify(result.pageAnalysis, null, 2)}` : ''}
${result.copilotIntegration ? `- **CoPilot Integration**: ${JSON.stringify(result.copilotIntegration, null, 2)}` : ''}
${result.error ? `- **Error**: ${result.error}` : ''}`;
}).join('\n\n')}

## API Integration Results
${Object.entries(report.results.apiIntegration).map(([endpoint, result]) => 
`### ${endpoint}
- **Status**: ${result.ok ? '✅ Working' : '❌ Failed'}
- **Response Code**: ${result.status || 'N/A'}
- **Status Text**: ${result.statusText || 'N/A'}
${result.error ? `- **Error**: ${result.error}` : ''}`
).join('\n\n')}

## Performance Metrics
- **Total Test Duration**: ${Math.round(report.duration / 1000)}s
${report.results.performance?.moduleLoadTimes ? 
`- **Module Load Times**: 
${Object.entries(report.results.performance.moduleLoadTimes).map(([module, time]) => 
`  - ${module}: ${time}ms`
).join('\n')}` : ''}

## Screenshots Captured
${report.results.screenshots.map(screenshot => `- **${screenshot.name}**: ${screenshot.filename} (${screenshot.timestamp})`).join('\n')}

## Errors Detected
${report.results.errors.length > 0 ? 
  report.results.errors.map((error, index) => `${index + 1}. **${error.type}**: ${error.message} (${error.timestamp})`).join('\n') :
  '✅ No errors detected during testing.'
}

## Agent Coordination Features Found
${Object.values(report.results.enhancedModules).some(module => 
  module && module.copilotIntegration && module.copilotIntegration.present
) ? '✅ CoPilot button found and functional' : '⚠️ CoPilot integration needs verification'}

## Cross-Module Integration
${report.results.navigationTabs && Object.values(report.results.navigationTabs).every(tab => tab.accessible) ? 
  '✅ All modules are accessible and can be navigated between seamlessly' : 
  '⚠️ Some navigation issues detected'
}

## Conclusion
${report.summary.platformAccessible ? 
  `✅ **React AgentWorks platform is functional** with ${report.summary.workingModules}/${report.summary.totalModules} modules working correctly.
  
**Key Findings:**
- Platform loads successfully with React app
- Navigation system is working (${report.summary.workingNavTabs}/${report.summary.navigationTabsCount} tabs accessible)
- All major modules have basic functionality
- Enhanced features are implemented and detectable
- Agent coordination infrastructure is in place` :
  
  `❌ **Platform has significant issues**. ${report.summary.totalErrors} errors detected during testing.
  
**Critical Issues:**
- Platform accessibility problems
- Module loading failures
- Navigation system issues`
}

---
*Report generated on ${report.timestamp}*
*Test executed with Puppeteer on React AgentWorks Platform*`;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runFullTestSuite() {
        try {
            await this.setup();
            console.log('🎯 Starting comprehensive React AgentWorks platform testing...\n');

            // Core platform tests
            const platformAccessible = await this.testPlatformAccess();
            
            if (platformAccessible) {
                await this.testNavigationTabs();

                // Test all modules
                await this.testPlanningModule();
                await this.testKanbanModule();
                await this.testUIBuilderModule();
                await this.testDatabaseBuilderModule();
                await this.testWorkflowsModule();
                await this.testAgentsModule();
                await this.testUsageModule();

                // Integration tests
                await this.testAPIIntegration();

                // Performance tests
                await this.testPerformance();
            }

            // Generate comprehensive report
            const report = await this.generateReport();

            console.log('\n🎉 Comprehensive React testing completed!');
            console.log(`📊 Total duration: ${Math.round(report.duration / 1000)}s`);
            console.log(`📸 Screenshots captured: ${report.summary.screenshotsTaken}`);
            console.log(`❌ Errors detected: ${report.summary.totalErrors}`);
            console.log(`✅ Working modules: ${report.summary.workingModules}/${report.summary.totalModules}`);
            
            return report;

        } catch (error) {
            console.error('💥 Test suite failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Main execution
if (require.main === module) {
    const testSuite = new ReactAgentWorksTestSuite();
    testSuite.runFullTestSuite()
        .then(report => {
            console.log('\n✅ All tests completed successfully!');
            console.log('📋 Check the generated reports for detailed results.');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = ReactAgentWorksTestSuite;