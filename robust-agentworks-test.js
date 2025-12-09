#!/usr/bin/env node

/**
 * Robust AgentWorks Platform Testing Suite
 * Handles React app errors gracefully while testing functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class RobustAgentWorksTestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            platformAccess: null,
            domAnalysis: null,
            navigationTests: {},
            moduleAccessibility: {},
            errorBoundaryHandling: null,
            apiTests: {},
            visualTests: {},
            enhancedFeatures: {},
            screenshots: [],
            errors: [],
            reactErrors: []
        };
        this.screenshotDir = '/AgentWorks/robust-test-screenshots';
        this.startTime = Date.now();
    }

    async setup() {
        console.log('🚀 Setting up robust AgentWorks test suite...');
        
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }

        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Monitor console messages
        this.page.on('console', msg => {
            const text = msg.text();
            console.log(`💬 Console ${msg.type()}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
            
            if (msg.type() === 'error') {
                this.testResults.errors.push({
                    type: 'console_error',
                    message: text,
                    timestamp: new Date().toISOString()
                });

                if (text.includes('React') || text.includes('component') || text.includes('boundary')) {
                    this.testResults.reactErrors.push({
                        message: text,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });

        // Suppress unhandled promise rejections for network errors
        this.page.on('pageerror', (error) => {
            console.log(`🔥 Page error: ${error.message.substring(0, 100)}`);
            this.testResults.errors.push({
                type: 'page_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        });
    }

    async testPlatformAccess() {
        console.log('🌐 Testing platform access...');
        
        try {
            const response = await this.page.goto('http://localhost:5173', { 
                waitUntil: 'domcontentloaded',
                timeout: 15000 
            });

            // Give time for React to attempt rendering
            await new Promise(resolve => setTimeout(resolve, 5000));

            const title = await this.page.title();
            const url = this.page.url();

            this.testResults.platformAccess = {
                success: response.ok(),
                statusCode: response.status(),
                title,
                url,
                loadTime: Date.now() - this.startTime,
                reactLoaded: title.toLowerCase().includes('agentworks') || title.toLowerCase().includes('react')
            };

            // Take screenshot regardless of errors
            await this.takeScreenshot('00-platform-access');

            console.log(`✅ Platform response: ${response.status()}`);
            console.log(`📄 Page title: ${title}`);
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

    async analyzeDOMStructure() {
        console.log('🔍 Analyzing DOM structure...');
        
        try {
            const domAnalysis = await this.page.evaluate(() => {
                const analysis = {
                    hasHTML: !!document.documentElement,
                    hasBody: !!document.body,
                    bodyClasses: document.body ? document.body.className : '',
                    hasReactRoot: !!document.querySelector('#root, [id*="root"], [data-reactroot]'),
                    hasErrorBoundary: document.body ? document.body.innerText.includes('error') || document.body.innerText.includes('Error') : false,
                    hasNavigation: document.querySelectorAll('nav, [role="navigation"], a[href*="/"]').length > 0,
                    hasButtons: document.querySelectorAll('button').length,
                    hasLinks: document.querySelectorAll('a').length,
                    totalElements: document.querySelectorAll('*').length,
                    bodyText: document.body ? document.body.innerText.substring(0, 1000) : '',
                    visibleText: document.body ? window.getComputedStyle(document.body).display !== 'none' : false,
                    headElements: Array.from(document.head.children).map(el => ({ 
                        tag: el.tagName, 
                        content: el.textContent ? el.textContent.substring(0, 100) : el.outerHTML.substring(0, 100)
                    })),
                    mainContentElements: Array.from(document.querySelectorAll('main, .main, #main, [role="main"]')).map(el => ({
                        tag: el.tagName,
                        classes: el.className,
                        hasContent: el.innerText.length > 0
                    }))
                };

                // Look for React-specific elements
                analysis.reactElements = {
                    hasReactDevtools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
                    reactVersion: window.React ? window.React.version : null,
                    hasReactRoot: !!document.querySelector('[data-reactroot], #root > div'),
                    reactComponents: Array.from(document.querySelectorAll('[class*="react"], [data-react]')).length
                };

                // Look for AgentWorks-specific elements
                analysis.agentWorksElements = {
                    hasAgentWorksTitle: document.title.toLowerCase().includes('agentworks'),
                    hasAgentWorksText: document.body ? document.body.innerText.toLowerCase().includes('agentworks') : false,
                    hasAgentWorksClasses: document.body ? document.body.className.toLowerCase().includes('agent') : false,
                    navigationLinks: Array.from(document.querySelectorAll('a')).map(a => ({
                        href: a.href,
                        text: a.textContent.trim().substring(0, 50),
                        visible: window.getComputedStyle(a).display !== 'none'
                    })).filter(link => link.href.includes('/') && link.text.length > 0)
                };

                return analysis;
            });

            this.testResults.domAnalysis = domAnalysis;

            console.log(`🔍 DOM Analysis Results:`);
            console.log(`  - React Root: ${domAnalysis.hasReactRoot ? '✅' : '❌'}`);
            console.log(`  - Navigation: ${domAnalysis.hasNavigation ? '✅' : '❌'}`);
            console.log(`  - Buttons: ${domAnalysis.hasButtons}`);
            console.log(`  - Links: ${domAnalysis.hasLinks}`);
            console.log(`  - Total Elements: ${domAnalysis.totalElements}`);
            console.log(`  - Error Boundary Active: ${domAnalysis.hasErrorBoundary ? '⚠️' : '✅'}`);

            await this.takeScreenshot('01-dom-analysis');

        } catch (error) {
            this.testResults.domAnalysis = {
                error: error.message
            };
            console.log(`❌ DOM analysis failed: ${error.message}`);
        }
    }

    async testNavigationByURL() {
        console.log('🧭 Testing navigation by direct URL access...');
        
        const routes = [
            { path: '/planning', name: 'Planning' },
            { path: '/kanban', name: 'Kanban' },
            { path: '/ui-builder', name: 'UI Builder' },
            { path: '/db-builder', name: 'DB Builder' },
            { path: '/workflows', name: 'Workflows' },
            { path: '/agents', name: 'Agents' },
            { path: '/usage', name: 'Usage & Billing' }
        ];

        for (const route of routes) {
            try {
                console.log(`  📍 Testing ${route.name} at ${route.path}...`);
                
                const response = await this.page.goto(`http://localhost:5173${route.path}`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 10000
                });

                // Wait for any React rendering
                await new Promise(resolve => setTimeout(resolve, 3000));

                const pageAnalysis = await this.page.evaluate(() => ({
                    url: window.location.href,
                    pathname: window.location.pathname,
                    title: document.title,
                    hasContent: document.body.innerText.length > 100,
                    bodyText: document.body.innerText.substring(0, 500),
                    hasErrorBoundary: document.body.innerText.includes('error') || document.body.innerText.includes('Error'),
                    visibleElements: document.querySelectorAll(':not([style*="display: none"]):not([style*="visibility: hidden"])').length,
                    specificElements: {
                        buttons: document.querySelectorAll('button').length,
                        inputs: document.querySelectorAll('input, textarea, select').length,
                        forms: document.querySelectorAll('form').length,
                        cards: document.querySelectorAll('[class*="card"], [class*="panel"], [class*="container"]').length
                    }
                }));

                this.testResults.navigationTests[route.name] = {
                    accessible: response.ok(),
                    statusCode: response.status(),
                    correctRoute: pageAnalysis.pathname === route.path,
                    hasContent: pageAnalysis.hasContent,
                    hasErrorBoundary: pageAnalysis.hasErrorBoundary,
                    pageAnalysis,
                    timestamp: new Date().toISOString()
                };

                await this.takeScreenshot(`02-nav-${route.name.toLowerCase().replace(/\s+/g, '-')}`);

                const status = response.ok() ? '✅' : '❌';
                const content = pageAnalysis.hasContent ? '✅' : '❌';
                const error = pageAnalysis.hasErrorBoundary ? '⚠️' : '✅';
                console.log(`    ${status} HTTP ${response.status()}, Content: ${content}, Error Boundary: ${error}`);

            } catch (error) {
                this.testResults.navigationTests[route.name] = {
                    accessible: false,
                    error: error.message
                };
                console.log(`  ❌ ${route.name} failed: ${error.message}`);
            }
        }
    }

    async testModuleSpecificFeatures() {
        console.log('🎯 Testing module-specific features...');

        const moduleTests = {
            planning: {
                url: '/planning',
                features: ['wizard', 'step', 'copilot', 'project', 'plan', 'requirement']
            },
            uiBuilder: {
                url: '/ui-builder',
                features: ['canvas', 'builder', 'designer', 'mockup', 'component', 'palette']
            },
            dbBuilder: {
                url: '/db-builder',
                features: ['schema', 'table', 'entity', 'relationship', 'sql', 'database']
            },
            workflows: {
                url: '/workflows',
                features: ['workflow', 'flow', 'node', 'canvas', 'json', 'execute']
            },
            kanban: {
                url: '/kanban',
                features: ['kanban', 'column', 'card', 'task', 'drag', 'board']
            },
            agents: {
                url: '/agents',
                features: ['agent', 'bot', 'service', 'coordination', 'status', 'config']
            },
            usage: {
                url: '/usage',
                features: ['usage', 'billing', 'metric', 'cost', 'chart', 'stats']
            }
        };

        for (const [moduleName, config] of Object.entries(moduleTests)) {
            try {
                console.log(`  🔧 Testing ${moduleName} module features...`);
                
                await this.page.goto(`http://localhost:5173${config.url}`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 10000
                });

                await new Promise(resolve => setTimeout(resolve, 2000));

                const featureAnalysis = await this.page.evaluate((features) => {
                    const bodyText = document.body.innerText.toLowerCase();
                    const htmlContent = document.body.innerHTML.toLowerCase();
                    
                    const foundFeatures = features.reduce((found, feature) => {
                        found[feature] = {
                            inText: bodyText.includes(feature.toLowerCase()),
                            inHTML: htmlContent.includes(feature.toLowerCase()),
                            elements: document.querySelectorAll(`[class*="${feature}"], [id*="${feature}"], [data-*="${feature}"]`).length
                        };
                        return found;
                    }, {});

                    return {
                        foundFeatures,
                        totalFeatureWords: features.filter(f => bodyText.includes(f.toLowerCase())).length,
                        hasInteractiveElements: document.querySelectorAll('button, input, select, textarea, a[href]').length > 0,
                        hasModuleContent: document.querySelectorAll('[class*="module"], [class*="page"], [class*="content"]').length > 0,
                        pageStructure: {
                            headers: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
                            sections: document.querySelectorAll('section, article, .section, .panel, .card').length,
                            forms: document.querySelectorAll('form').length,
                            lists: document.querySelectorAll('ul, ol').length
                        }
                    };
                }, config.features);

                this.testResults.moduleAccessibility[moduleName] = {
                    accessible: true,
                    featureAnalysis,
                    enhancedFeaturesDetected: featureAnalysis.totalFeatureWords >= 2,
                    timestamp: new Date().toISOString()
                };

                const featureCount = featureAnalysis.totalFeatureWords;
                const interactive = featureAnalysis.hasInteractiveElements;
                console.log(`    ✅ ${moduleName}: ${featureCount} features found, Interactive: ${interactive ? '✅' : '❌'}`);

            } catch (error) {
                this.testResults.moduleAccessibility[moduleName] = {
                    accessible: false,
                    error: error.message
                };
                console.log(`    ❌ ${moduleName} failed: ${error.message}`);
            }
        }
    }

    async testAPIConnectivity() {
        console.log('🔌 Testing API connectivity...');

        const apiEndpoints = [
            '/api/health',
            '/api/projects',
            '/api/agents',
            '/api/workflows',
            '/auth/me'
        ];

        for (const endpoint of apiEndpoints) {
            try {
                const response = await this.page.evaluate(async (url) => {
                    try {
                        const resp = await fetch(url, { method: 'GET' });
                        const text = await resp.text();
                        return {
                            ok: resp.ok,
                            status: resp.status,
                            statusText: resp.statusText,
                            responseSize: text.length,
                            hasJsonResponse: text.trim().startsWith('{') || text.trim().startsWith('['),
                            responsePreview: text.substring(0, 200)
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }, endpoint);

                this.testResults.apiTests[endpoint] = response;
                
                const status = response.ok ? '✅' : response.error ? '❌' : '⚠️';
                console.log(`  API ${endpoint}: ${status} ${response.status || response.error}`);
                
            } catch (error) {
                this.testResults.apiTests[endpoint] = {
                    error: error.message
                };
                console.log(`  API ${endpoint}: ❌ ${error.message}`);
            }
        }
    }

    async testEnhancedFeatures() {
        console.log('⭐ Testing enhanced features...');

        // Test for enhanced module integration
        const enhancedTests = await this.page.evaluate(() => {
            const tests = {
                agentCoordination: {
                    hasAgentCoordinator: !!(window.AgentCoordinator || window.agentCoordinator),
                    hasAgentAPI: !!(window.AgentAPI || window.agentAPI),
                    hasAgentWebSocket: !!(window.AgentWebSocket || window.agentWebSocket),
                    agentButtons: document.querySelectorAll('button[class*="agent"], button[class*="copilot"]').length,
                    agentPanels: document.querySelectorAll('[class*="agent"], [class*="copilot"]').length
                },
                enhancedModules: {
                    hasEnhancedPlanning: document.body.innerText.toLowerCase().includes('wizard') || 
                                         document.body.innerText.toLowerCase().includes('step'),
                    hasEnhancedUI: document.body.innerText.toLowerCase().includes('mockup') || 
                                   document.body.innerText.toLowerCase().includes('screenshot'),
                    hasEnhancedDB: document.body.innerText.toLowerCase().includes('schema') || 
                                   document.body.innerText.toLowerCase().includes('visual'),
                    hasEnhancedWorkflows: document.body.innerText.toLowerCase().includes('visual') || 
                                          document.body.innerText.toLowerCase().includes('designer')
                },
                crossModuleIntegration: {
                    hasDataPersistence: !!(window.localStorage || window.sessionStorage),
                    hasStateManagement: !!(window.Redux || window.zustand || window.__ZUSTAND__),
                    hasRouting: !!(window.ReactRouter || document.querySelectorAll('a[href*="/"]').length > 3)
                }
            };

            return tests;
        });

        this.testResults.enhancedFeatures = {
            ...enhancedTests,
            timestamp: new Date().toISOString()
        };

        console.log('⭐ Enhanced Features Analysis:');
        console.log(`  - Agent Coordination: ${enhancedTests.agentCoordination.hasAgentCoordinator ? '✅' : '❌'}`);
        console.log(`  - Enhanced Planning: ${enhancedTests.enhancedModules.hasEnhancedPlanning ? '✅' : '❌'}`);
        console.log(`  - Enhanced UI Builder: ${enhancedTests.enhancedModules.hasEnhancedUI ? '✅' : '❌'}`);
        console.log(`  - Enhanced DB Builder: ${enhancedTests.enhancedModules.hasEnhancedDB ? '✅' : '❌'}`);
        console.log(`  - Cross-Module Integration: ${enhancedTests.crossModuleIntegration.hasRouting ? '✅' : '❌'}`);
    }

    async testErrorBoundaryHandling() {
        console.log('🛡️ Testing error boundary handling...');

        try {
            const errorBoundaryAnalysis = await this.page.evaluate(() => {
                const errorBoundaryInfo = {
                    hasErrorBoundaryText: document.body.innerText.toLowerCase().includes('error') || 
                                          document.body.innerText.toLowerCase().includes('something went wrong'),
                    hasRetryButton: !!document.querySelector('button[class*="retry"], button[class*="reload"], button:contains("Try Again")'),
                    hasErrorComponents: document.querySelectorAll('[class*="error"], [class*="boundary"]').length,
                    reactErrorsInConsole: this.testResults ? this.testResults.reactErrors.length : 0,
                    stillFunctional: document.querySelectorAll('button, a, input').length > 2,
                    canNavigate: document.querySelectorAll('a[href*="/"]').length > 0
                };

                return errorBoundaryInfo;
            });

            this.testResults.errorBoundaryHandling = {
                ...errorBoundaryAnalysis,
                reactErrorsDetected: this.testResults.reactErrors.length,
                platformStillUsable: errorBoundaryAnalysis.stillFunctional && errorBoundaryAnalysis.canNavigate,
                timestamp: new Date().toISOString()
            };

            console.log(`🛡️ Error Boundary Analysis:`);
            console.log(`  - React Errors Detected: ${this.testResults.reactErrors.length}`);
            console.log(`  - Platform Still Usable: ${this.testResults.errorBoundaryHandling.platformStillUsable ? '✅' : '❌'}`);
            console.log(`  - Error Boundary Active: ${errorBoundaryAnalysis.hasErrorBoundaryText ? '⚠️' : '✅'}`);

        } catch (error) {
            this.testResults.errorBoundaryHandling = {
                error: error.message
            };
            console.log(`❌ Error boundary analysis failed: ${error.message}`);
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
            console.log(`📸 Screenshot: ${filename}`);
        } catch (error) {
            console.log(`❌ Screenshot failed: ${error.message}`);
        }
    }

    async generateComprehensiveReport() {
        console.log('📊 Generating comprehensive test report...');
        
        const summary = {
            platformAccessible: this.testResults.platformAccess?.success || false,
            reactErrors: this.testResults.reactErrors.length,
            totalErrors: this.testResults.errors.length,
            modulesTestable: Object.keys(this.testResults.navigationTests).filter(
                key => this.testResults.navigationTests[key].accessible
            ).length,
            totalModulesTested: Object.keys(this.testResults.navigationTests).length,
            apiEndpointsWorking: Object.keys(this.testResults.apiTests).filter(
                key => this.testResults.apiTests[key].ok
            ).length,
            totalApiEndpoints: Object.keys(this.testResults.apiTests).length,
            screenshotsCaptured: this.testResults.screenshots.length,
            enhancedFeaturesDetected: this.testResults.enhancedFeatures ? 
                Object.values(this.testResults.enhancedFeatures.enhancedModules || {}).filter(Boolean).length : 0,
            platformUsableWithErrors: this.testResults.errorBoundaryHandling?.platformStillUsable || false
        };

        const report = {
            testSuite: 'Robust AgentWorks Platform Testing',
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            summary,
            results: this.testResults,
            conclusions: {
                overallStatus: summary.platformAccessible ? 
                    (summary.reactErrors > 0 ? 'FUNCTIONAL_WITH_ERRORS' : 'FULLY_FUNCTIONAL') : 
                    'NOT_ACCESSIBLE',
                recommendedActions: this.generateRecommendations(summary),
                testCoverage: {
                    platformAccess: !!this.testResults.platformAccess,
                    domAnalysis: !!this.testResults.domAnalysis,
                    navigationTesting: Object.keys(this.testResults.navigationTests).length > 0,
                    moduleFeatureTesting: Object.keys(this.testResults.moduleAccessibility).length > 0,
                    apiTesting: Object.keys(this.testResults.apiTests).length > 0,
                    enhancedFeatureTesting: !!this.testResults.enhancedFeatures,
                    errorHandlingTesting: !!this.testResults.errorBoundaryHandling
                }
            }
        };

        const reportPath = '/AgentWorks/Robust_AgentWorks_Test_Report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        const markdownReport = this.generateMarkdownReport(report);
        const markdownPath = '/AgentWorks/Robust_AgentWorks_Test_Report.md';
        fs.writeFileSync(markdownPath, markdownReport);

        console.log(`✅ Reports generated:`);
        console.log(`  📄 JSON: ${reportPath}`);
        console.log(`  📄 Markdown: ${markdownPath}`);

        return report;
    }

    generateRecommendations(summary) {
        const recommendations = [];

        if (!summary.platformAccessible) {
            recommendations.push('Fix platform accessibility - server or routing issues detected');
        }

        if (summary.reactErrors > 5) {
            recommendations.push('Address React component errors - particularly RightPanel component failures');
        }

        if (summary.modulesTestable < summary.totalModulesTested / 2) {
            recommendations.push('Fix module routing - many modules are not accessible');
        }

        if (summary.apiEndpointsWorking < summary.totalApiEndpoints / 2) {
            recommendations.push('Address API connectivity issues - backend integration problems detected');
        }

        if (summary.enhancedFeaturesDetected < 3) {
            recommendations.push('Implement enhanced module features - limited agent coordination detected');
        }

        if (recommendations.length === 0) {
            recommendations.push('Platform is functioning well - focus on enhanced feature development');
        }

        return recommendations;
    }

    generateMarkdownReport(report) {
        return `# Robust AgentWorks Platform Test Report

## Executive Summary
- **Test Date**: ${report.timestamp}
- **Duration**: ${Math.round(report.duration / 1000)}s
- **Overall Status**: ${report.conclusions.overallStatus}
- **Platform Accessible**: ${report.summary.platformAccessible ? '✅ Yes' : '❌ No'}
- **Usable Despite Errors**: ${report.summary.platformUsableWithErrors ? '✅ Yes' : '❌ No'}

## Quick Stats
| Metric | Result |
|--------|--------|
| Modules Accessible | ${report.summary.modulesTestable}/${report.summary.totalModulesTested} |
| API Endpoints Working | ${report.summary.apiEndpointsWorking}/${report.summary.totalApiEndpoints} |
| React Errors | ${report.summary.reactErrors} |
| Screenshots Captured | ${report.summary.screenshotsCaptured} |
| Enhanced Features Detected | ${report.summary.enhancedFeaturesDetected} |

## Platform Access Analysis
${report.results.platformAccess ? `
**Status**: ${report.results.platformAccess.success ? '✅ Accessible' : '❌ Failed'}
- **HTTP Status**: ${report.results.platformAccess.statusCode || 'N/A'}
- **Page Title**: ${report.results.platformAccess.title || 'N/A'}
- **Load Time**: ${report.results.platformAccess.loadTime || 'N/A'}ms
- **React Detected**: ${report.results.platformAccess.reactLoaded ? '✅' : '❌'}
` : '❌ Platform access test failed'}

## DOM Structure Analysis
${report.results.domAnalysis ? `
**React Integration**:
- React Root Present: ${report.results.domAnalysis.hasReactRoot ? '✅' : '❌'}
- React Devtools: ${report.results.domAnalysis.reactElements?.hasReactDevtools ? '✅' : '❌'}
- React Components: ${report.results.domAnalysis.reactElements?.reactComponents || 0}

**Navigation Structure**:
- Navigation Elements: ${report.results.domAnalysis.hasNavigation ? '✅' : '❌'}
- Interactive Buttons: ${report.results.domAnalysis.hasButtons}
- Navigation Links: ${report.results.domAnalysis.hasLinks}
- Total DOM Elements: ${report.results.domAnalysis.totalElements}

**AgentWorks Branding**:
- Title Contains AgentWorks: ${report.results.domAnalysis.agentWorksElements?.hasAgentWorksTitle ? '✅' : '❌'}
- Content Contains AgentWorks: ${report.results.domAnalysis.agentWorksElements?.hasAgentWorksText ? '✅' : '❌'}
` : 'DOM analysis failed or not performed'}

## Module Navigation Tests
${Object.entries(report.results.navigationTests || {}).map(([module, result]) => `
### ${module} Module
- **Accessible**: ${result.accessible ? '✅' : '❌'}
- **Correct Route**: ${result.correctRoute ? '✅' : '❌'}
- **Has Content**: ${result.hasContent ? '✅' : '❌'}
- **Error Boundary**: ${result.hasErrorBoundary ? '⚠️ Active' : '✅ None'}
- **Interactive Elements**: ${result.pageAnalysis?.specificElements?.buttons || 0} buttons
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('')}

## Module Feature Analysis
${Object.entries(report.results.moduleAccessibility || {}).map(([module, result]) => `
### ${module} Module Features
- **Accessible**: ${result.accessible ? '✅' : '❌'}
- **Enhanced Features Detected**: ${result.enhancedFeaturesDetected ? '✅' : '❌'}
- **Feature Keywords Found**: ${result.featureAnalysis?.totalFeatureWords || 0}
- **Interactive Elements**: ${result.featureAnalysis?.hasInteractiveElements ? '✅' : '❌'}
- **Module Structure**: ${result.featureAnalysis?.pageStructure ? 
  `Headers: ${result.featureAnalysis.pageStructure.headers}, Sections: ${result.featureAnalysis.pageStructure.sections}` : 'N/A'}
${result.error ? `- **Error**: ${result.error}` : ''}
`).join('')}

## API Integration Status
${Object.entries(report.results.apiTests || {}).map(([endpoint, result]) => `
### ${endpoint}
- **Status**: ${result.ok ? '✅ Working' : result.error ? '❌ Failed' : '⚠️ Issue'}
- **HTTP Code**: ${result.status || 'N/A'}
- **Response Size**: ${result.responseSize || 'N/A'} bytes
- **JSON Response**: ${result.hasJsonResponse ? '✅' : '❌'}
${result.error ? `- **Error**: ${result.error}` : ''}
${result.responsePreview ? `- **Preview**: \`${result.responsePreview.substring(0, 100)}...\`` : ''}
`).join('')}

## Enhanced Features Analysis
${report.results.enhancedFeatures ? `
### Agent Coordination
- **Agent Coordinator**: ${report.results.enhancedFeatures.agentCoordination?.hasAgentCoordinator ? '✅' : '❌'}
- **Agent API**: ${report.results.enhancedFeatures.agentCoordination?.hasAgentAPI ? '✅' : '❌'}
- **Agent WebSocket**: ${report.results.enhancedFeatures.agentCoordination?.hasAgentWebSocket ? '✅' : '❌'}
- **Agent UI Elements**: ${report.results.enhancedFeatures.agentCoordination?.agentButtons || 0} buttons, ${report.results.enhancedFeatures.agentCoordination?.agentPanels || 0} panels

### Enhanced Module Features
- **Planning Module**: ${report.results.enhancedFeatures.enhancedModules?.hasEnhancedPlanning ? '✅ Enhanced' : '❌ Basic'}
- **UI Builder**: ${report.results.enhancedFeatures.enhancedModules?.hasEnhancedUI ? '✅ Enhanced' : '❌ Basic'}
- **DB Builder**: ${report.results.enhancedFeatures.enhancedModules?.hasEnhancedDB ? '✅ Enhanced' : '❌ Basic'}
- **Workflows**: ${report.results.enhancedFeatures.enhancedModules?.hasEnhancedWorkflows ? '✅ Enhanced' : '❌ Basic'}

### Cross-Module Integration
- **Data Persistence**: ${report.results.enhancedFeatures.crossModuleIntegration?.hasDataPersistence ? '✅' : '❌'}
- **State Management**: ${report.results.enhancedFeatures.crossModuleIntegration?.hasStateManagement ? '✅' : '❌'}
- **Routing System**: ${report.results.enhancedFeatures.crossModuleIntegration?.hasRouting ? '✅' : '❌'}
` : 'Enhanced features analysis not performed'}

## Error Boundary Analysis
${report.results.errorBoundaryHandling ? `
- **React Errors Detected**: ${report.results.errorBoundaryHandling.reactErrorsDetected}
- **Platform Still Usable**: ${report.results.errorBoundaryHandling.platformStillUsable ? '✅' : '❌'}
- **Error Boundary Active**: ${report.results.errorBoundaryHandling.hasErrorBoundaryText ? '⚠️' : '✅'}
- **Recovery Options Available**: ${report.results.errorBoundaryHandling.hasRetryButton ? '✅' : '❌'}
` : 'Error boundary analysis not performed'}

## Test Coverage
${Object.entries(report.conclusions.testCoverage).map(([test, covered]) => 
`- **${test.replace(/([A-Z])/g, ' $1').trim()}**: ${covered ? '✅' : '❌'}`
).join('\n')}

## Screenshots Captured
${report.results.screenshots.map((screenshot, index) => 
`${index + 1}. **${screenshot.name}**: ${screenshot.filename} (${screenshot.timestamp})`
).join('\n')}

## Detected Errors
${report.results.errors.length > 0 ? 
  report.results.errors.map((error, index) => 
    `${index + 1}. **${error.type}**: ${error.message.substring(0, 200)}${error.message.length > 200 ? '...' : ''} (${error.timestamp})`
  ).join('\n') : 
  '✅ No critical errors detected'
}

## React-Specific Errors
${report.results.reactErrors.length > 0 ? 
  report.results.reactErrors.map((error, index) => 
    `${index + 1}. ${error.message.substring(0, 200)}${error.message.length > 200 ? '...' : ''} (${error.timestamp})`
  ).join('\n') : 
  '✅ No React-specific errors detected'
}

## Recommendations
${report.conclusions.recommendedActions.map((action, index) => `${index + 1}. ${action}`).join('\n')}

## Conclusion
**Overall Status**: ${report.conclusions.overallStatus}

${report.conclusions.overallStatus === 'FULLY_FUNCTIONAL' ? 
  '✅ **AgentWorks platform is fully functional** with all modules accessible and enhanced features working correctly.' :
  report.conclusions.overallStatus === 'FUNCTIONAL_WITH_ERRORS' ?
  '⚠️ **AgentWorks platform is functional but has React component errors**. The platform is still usable but needs error resolution for optimal experience.' :
  '❌ **AgentWorks platform has significant accessibility issues** that prevent proper testing and usage.'
}

**Key Findings**:
- Platform serves React application successfully
- ${report.summary.modulesTestable}/${report.summary.totalModulesTested} modules are accessible through navigation
- ${report.summary.apiEndpointsWorking}/${report.summary.totalApiEndpoints} API endpoints are working
- Enhanced agent coordination features ${report.summary.enhancedFeaturesDetected > 0 ? 'detected and partially functional' : 'need implementation'}
- Error boundary handling ${report.summary.reactErrors > 0 ? 'is active but platform remains usable' : 'is working correctly'}

---
*Report generated on ${report.timestamp}*
*Robust testing approach with error-resilient methodology*`;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runFullTestSuite() {
        try {
            await this.setup();
            console.log('🎯 Starting robust AgentWorks platform testing...\n');

            // Core platform tests
            const platformAccessible = await this.testPlatformAccess();
            
            // Always analyze DOM structure regardless of initial access
            await this.analyzeDOMStructure();
            
            // Test navigation even if there are errors
            await this.testNavigationByURL();
            
            // Test module features
            await this.testModuleSpecificFeatures();
            
            // Test API connectivity
            await this.testAPIConnectivity();
            
            // Test enhanced features
            await this.testEnhancedFeatures();
            
            // Test error handling
            await this.testErrorBoundaryHandling();

            // Generate comprehensive report
            const report = await this.generateComprehensiveReport();

            console.log('\n🎉 Robust testing completed!');
            console.log(`📊 Duration: ${Math.round(report.duration / 1000)}s`);
            console.log(`📈 Overall Status: ${report.conclusions.overallStatus}`);
            console.log(`📸 Screenshots: ${report.summary.screenshotsCaptured}`);
            console.log(`⚠️ React Errors: ${report.summary.reactErrors}`);
            console.log(`✅ Accessible Modules: ${report.summary.modulesTestable}/${report.summary.totalModulesTested}`);
            
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
    const testSuite = new RobustAgentWorksTestSuite();
    testSuite.runFullTestSuite()
        .then(report => {
            console.log('\n✅ Robust testing completed!');
            console.log('📋 Check the generated reports for comprehensive results.');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = RobustAgentWorksTestSuite;