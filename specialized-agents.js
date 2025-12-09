/**
 * AgentWorks Specialized Agents
 * 
 * Implementations of specialized agents for each module in the AgentWorks platform.
 * These agents handle specific tasks within their domains and can communicate across modules.
 * 
 * @version 1.0.0
 * @requires agent-coordination-system.js
 */

// Planning Agent - Handles project planning and vision analysis
const createPlanningAgent = () => ({
    type: 'planning-agent',
    name: 'Planning CoPilot Agent',
    description: 'AI agent specialized in project planning, feature analysis, and requirements gathering',
    module: 'planning',
    capabilities: [
        'vision-analysis',
        'feature-suggestion',
        'market-research',
        'document-generation',
        'requirement-extraction',
        'project-scoping'
    ],
    implementation: {
        async initialize(agentInstance, taskContext) {
            console.log('🧠 Initializing Planning Agent');
            agentInstance.knowledgeBase = {
                projectTemplates: [],
                industryPatterns: new Map(),
                featureLibrary: new Map(),
                marketData: new Map()
            };
            agentInstance.context = {
                currentProject: taskContext.project || null,
                analysisHistory: [],
                preferences: taskContext.preferences || {}
            };
        },

        async execute(task, agentInstance) {
            const { type, data, options = {} } = task;
            
            switch (type) {
                case 'analyze-vision':
                    return await this.analyzeVision(data, agentInstance);
                case 'suggest-features':
                    return await this.suggestFeatures(data, agentInstance);
                case 'research-market':
                    return await this.researchMarket(data, agentInstance);
                case 'generate-blueprint':
                    return await this.generateBlueprint(data, agentInstance);
                case 'extract-requirements':
                    return await this.extractRequirements(data, agentInstance);
                default:
                    throw new Error(`Unknown task type: ${type}`);
            }
        },

        async analyzeVision(visionData, agent) {
            console.log('🔍 Analyzing project vision');
            
            // Simulate vision analysis
            const analysis = {
                category: visionData.category || 'general',
                complexity: this.assessComplexity(visionData.description),
                targetMarket: visionData.audience || 'general',
                keyFeatures: this.extractKeyFeatures(visionData.description),
                technicalRequirements: this.inferTechnicalRequirements(visionData),
                estimatedEffort: this.estimateEffort(visionData),
                risks: this.identifyRisks(visionData),
                opportunities: this.identifyOpportunities(visionData)
            };

            // Store analysis in context
            agent.context.analysisHistory.push(analysis);
            
            // Emit event for other modules
            AgentWorksEvents.emit('planning:visionAnalyzed', {
                analysis,
                agentId: agent.id,
                timestamp: new Date().toISOString()
            });

            return { success: true, analysis };
        },

        async suggestFeatures(visionData, agent) {
            console.log('💡 Generating feature suggestions');
            
            const category = visionData.category || 'general';
            const baseFeatures = this.getBaseFeatures(category);
            const smartFeatures = this.generateSmartFeatures(visionData);
            
            const suggestions = [
                ...baseFeatures,
                ...smartFeatures
            ].map(feature => ({
                ...feature,
                priority: this.calculatePriority(feature, visionData),
                estimatedEffort: this.estimateFeatureEffort(feature),
                dependencies: this.identifyDependencies(feature, visionData)
            }));

            // Communicate with UI module for design implications
            AgentWorksEvents.emit('ui:featureSuggestions', {
                features: suggestions,
                context: visionData
            });

            return { success: true, features: suggestions };
        },

        async researchMarket(visionData, agent) {
            console.log('📊 Conducting market research');
            
            // Simulate market research
            const research = {
                marketSize: this.estimateMarketSize(visionData),
                competitors: this.findCompetitors(visionData),
                trends: this.analyzeTrends(visionData),
                opportunities: this.findMarketOpportunities(visionData),
                threats: this.identifyThreats(visionData),
                recommendations: this.generateRecommendations(visionData)
            };

            return { success: true, research };
        },

        async generateBlueprint(planningData, agent) {
            console.log('📋 Generating technical blueprint');
            
            const blueprint = {
                architecture: this.designArchitecture(planningData),
                components: this.identifyComponents(planningData),
                dataModel: this.designDataModel(planningData),
                apiSpecification: this.designAPI(planningData),
                deployment: this.planDeployment(planningData),
                timeline: this.createTimeline(planningData)
            };

            // Send blueprint to database and workflow modules
            AgentWorksEvents.emit('database:blueprintGenerated', blueprint);
            AgentWorksEvents.emit('workflow:blueprintGenerated', blueprint);

            return { success: true, blueprint };
        },

        // Helper methods
        assessComplexity(description) {
            const keywords = description.toLowerCase();
            const complexityIndicators = [
                { pattern: /ai|machine learning|ml/g, weight: 3 },
                { pattern: /integration|api|third.party/g, weight: 2 },
                { pattern: /real.time|websocket|streaming/g, weight: 2 },
                { pattern: /payment|financial|billing/g, weight: 2 },
                { pattern: /multi.tenant|enterprise/g, weight: 3 }
            ];

            let score = 1;
            complexityIndicators.forEach(indicator => {
                const matches = (keywords.match(indicator.pattern) || []).length;
                score += matches * indicator.weight;
            });

            if (score <= 3) return 'low';
            if (score <= 6) return 'medium';
            return 'high';
        },

        extractKeyFeatures(description) {
            const featurePatterns = [
                { pattern: /dashboard|analytics/gi, feature: 'Analytics Dashboard' },
                { pattern: /user.*management|authentication/gi, feature: 'User Management' },
                { pattern: /payment|billing|subscription/gi, feature: 'Payment Processing' },
                { pattern: /chat|messaging|communication/gi, feature: 'Communication System' },
                { pattern: /search|filter/gi, feature: 'Search & Filtering' },
                { pattern: /notification|alert/gi, feature: 'Notification System' }
            ];

            return featurePatterns
                .filter(p => p.pattern.test(description))
                .map(p => p.feature);
        },

        getBaseFeatures(category) {
            const featuresByCategory = {
                'saas': [
                    { name: 'User Authentication', description: 'Secure login and registration system' },
                    { name: 'Dashboard', description: 'Main user interface and navigation' },
                    { name: 'Settings Management', description: 'User preferences and configuration' },
                    { name: 'API Access', description: 'RESTful API for integrations' }
                ],
                'ecommerce': [
                    { name: 'Product Catalog', description: 'Product listing and management' },
                    { name: 'Shopping Cart', description: 'Add to cart and checkout flow' },
                    { name: 'Payment Gateway', description: 'Secure payment processing' },
                    { name: 'Order Management', description: 'Order tracking and fulfillment' }
                ],
                'social': [
                    { name: 'User Profiles', description: 'Personal profiles and information' },
                    { name: 'Social Feed', description: 'Content sharing and interaction' },
                    { name: 'Messaging System', description: 'Direct messaging between users' },
                    { name: 'Content Moderation', description: 'Automated content filtering' }
                ],
                'general': [
                    { name: 'User Management', description: 'Basic user account functionality' },
                    { name: 'Data Management', description: 'CRUD operations for main entities' },
                    { name: 'Search Functionality', description: 'Find and filter content' },
                    { name: 'Responsive Design', description: 'Mobile and desktop compatibility' }
                ]
            };

            return featuresByCategory[category] || featuresByCategory.general;
        },

        async handleMessage(messagePayload, agentInstance) {
            console.log(`📨 Planning agent received message: ${messagePayload.message.type}`);
            
            const { type, data } = messagePayload.message;
            
            switch (type) {
                case 'ui-feedback':
                    // Handle feedback from UI design agent
                    await this.incorporateUIFeedback(data, agentInstance);
                    break;
                case 'database-constraints':
                    // Handle constraints from database agent
                    await this.handleDatabaseConstraints(data, agentInstance);
                    break;
                case 'test-requirements':
                    // Handle testing requirements
                    await this.incorporateTestRequirements(data, agentInstance);
                    break;
            }
        },

        async healthCheck(agentInstance) {
            return agentInstance.context && 
                   agentInstance.knowledgeBase &&
                   agentInstance.status === 'active';
        },

        async cleanup(agentInstance) {
            // Save any pending analysis
            if (agentInstance.context.analysisHistory.length > 0) {
                console.log('💾 Saving planning analysis history');
                // In a real implementation, save to persistent storage
            }
        }
    }
});

// UI Design Agent - Handles UI/UX design and component generation
const createUIDesignAgent = () => ({
    type: 'ui-design-agent',
    name: 'UI Design Agent',
    description: 'Specialized agent for UI/UX design, component generation, and design system management',
    module: 'ui-builder',
    capabilities: [
        'component-design',
        'layout-generation',
        'design-system-creation',
        'mockup-generation',
        'accessibility-analysis',
        'responsive-design'
    ],
    implementation: {
        async initialize(agentInstance, taskContext) {
            console.log('🎨 Initializing UI Design Agent');
            agentInstance.designSystem = {
                colors: new Map(),
                typography: new Map(),
                components: new Map(),
                patterns: new Map()
            };
            agentInstance.context = {
                currentDesign: taskContext.design || null,
                designHistory: [],
                constraints: taskContext.constraints || {}
            };
        },

        async execute(task, agentInstance) {
            const { type, data, options = {} } = task;
            
            switch (type) {
                case 'generate-component':
                    return await this.generateComponent(data, agentInstance);
                case 'create-layout':
                    return await this.createLayout(data, agentInstance);
                case 'analyze-accessibility':
                    return await this.analyzeAccessibility(data, agentInstance);
                case 'generate-mockup':
                    return await this.generateMockup(data, agentInstance);
                case 'optimize-design':
                    return await this.optimizeDesign(data, agentInstance);
                default:
                    throw new Error(`Unknown task type: ${type}`);
            }
        },

        async generateComponent(componentSpec, agent) {
            console.log(`🧩 Generating component: ${componentSpec.type}`);
            
            const component = {
                id: `comp_${Date.now()}`,
                type: componentSpec.type,
                name: componentSpec.name || `New ${componentSpec.type}`,
                properties: this.generateComponentProperties(componentSpec),
                styles: this.generateComponentStyles(componentSpec),
                accessibility: this.generateAccessibilityProps(componentSpec),
                responsiveBreakpoints: this.generateResponsiveRules(componentSpec),
                interactions: this.generateInteractions(componentSpec)
            };

            // Store component in design system
            agent.designSystem.components.set(component.id, component);

            // Notify database agent about data requirements
            if (this.hasDataRequirements(component)) {
                AgentWorksEvents.emit('database:componentDataNeeds', {
                    component,
                    dataRequirements: this.extractDataRequirements(component)
                });
            }

            return { success: true, component };
        },

        async createLayout(layoutSpec, agent) {
            console.log('🏗️ Creating layout structure');
            
            const layout = {
                id: `layout_${Date.now()}`,
                type: layoutSpec.type || 'dashboard',
                structure: this.generateLayoutStructure(layoutSpec),
                responsive: this.generateResponsiveLayout(layoutSpec),
                navigation: this.generateNavigation(layoutSpec),
                components: this.mapComponentsToLayout(layoutSpec),
                accessibility: this.generateLayoutAccessibility(layoutSpec)
            };

            // Send layout to workflow agent for implementation planning
            AgentWorksEvents.emit('workflow:layoutGenerated', {
                layout,
                implementationNeeds: this.extractImplementationNeeds(layout)
            });

            return { success: true, layout };
        },

        async analyzeAccessibility(designData, agent) {
            console.log('♿ Analyzing accessibility compliance');
            
            const analysis = {
                colorContrast: this.checkColorContrast(designData),
                keyboardNavigation: this.checkKeyboardAccess(designData),
                screenReaderSupport: this.checkScreenReaderSupport(designData),
                wcagCompliance: this.checkWCAGCompliance(designData),
                recommendations: this.generateAccessibilityRecommendations(designData)
            };

            return { success: true, analysis };
        },

        async generateMockup(requirements, agent) {
            console.log('🖼️ Generating design mockup');
            
            const mockup = {
                id: `mockup_${Date.now()}`,
                type: requirements.type,
                screens: this.generateScreens(requirements),
                userFlows: this.generateUserFlows(requirements),
                interactions: this.generateInteractionSpecs(requirements),
                annotations: this.generateDesignAnnotations(requirements)
            };

            // Send mockup to test agent for test scenario generation
            AgentWorksEvents.emit('test:mockupGenerated', {
                mockup,
                testableElements: this.extractTestableElements(mockup)
            });

            return { success: true, mockup };
        },

        // Helper methods
        generateComponentProperties(spec) {
            const baseProps = {
                className: `component-${spec.type}`,
                testId: `test-${spec.type}-${Date.now()}`,
                ariaLabel: spec.name || spec.type
            };

            // Add type-specific properties
            switch (spec.type) {
                case 'button':
                    return { ...baseProps, variant: 'primary', size: 'medium', disabled: false };
                case 'input':
                    return { ...baseProps, type: 'text', placeholder: '', required: false };
                case 'card':
                    return { ...baseProps, elevation: 1, padding: 'medium' };
                default:
                    return baseProps;
            }
        },

        generateComponentStyles(spec) {
            return {
                base: this.getBaseStyles(spec.type),
                variants: this.getVariantStyles(spec.type),
                responsive: this.getResponsiveStyles(spec.type),
                states: this.getStateStyles(spec.type)
            };
        },

        hasDataRequirements(component) {
            const dataComponents = ['table', 'list', 'form', 'chart', 'card-grid'];
            return dataComponents.includes(component.type);
        },

        extractDataRequirements(component) {
            const requirements = [];
            
            if (component.type === 'table') {
                requirements.push({
                    type: 'entity',
                    name: component.properties.dataSource || 'TableData',
                    fields: component.properties.columns || []
                });
            } else if (component.type === 'form') {
                requirements.push({
                    type: 'entity',
                    name: component.properties.entity || 'FormData',
                    fields: component.properties.fields || []
                });
            }

            return requirements;
        },

        async handleMessage(messagePayload, agentInstance) {
            console.log(`📨 UI agent received message: ${messagePayload.message.type}`);
            
            const { type, data } = messagePayload.message;
            
            switch (type) {
                case 'planning-requirements':
                    await this.incorporatePlanningRequirements(data, agentInstance);
                    break;
                case 'database-schema':
                    await this.adaptToSchema(data, agentInstance);
                    break;
                case 'workflow-constraints':
                    await this.handleWorkflowConstraints(data, agentInstance);
                    break;
            }
        },

        async healthCheck(agentInstance) {
            return agentInstance.designSystem && 
                   agentInstance.context &&
                   agentInstance.status === 'active';
        }
    }
});

// Database Agent - Handles schema design and data modeling
const createDatabaseAgent = () => ({
    type: 'database-agent',
    name: 'Database Design Agent',
    description: 'Specialized agent for database schema design, optimization, and data modeling',
    module: 'database',
    capabilities: [
        'schema-design',
        'relationship-modeling',
        'query-optimization',
        'migration-planning',
        'performance-analysis',
        'data-validation'
    ],
    implementation: {
        async initialize(agentInstance, taskContext) {
            console.log('🗄️ Initializing Database Agent');
            agentInstance.schema = {
                entities: new Map(),
                relationships: new Map(),
                indexes: new Map(),
                constraints: new Map()
            };
            agentInstance.context = {
                currentSchema: taskContext.schema || null,
                optimizationHistory: [],
                performanceMetrics: new Map()
            };
        },

        async execute(task, agentInstance) {
            const { type, data, options = {} } = task;
            
            switch (type) {
                case 'design-schema':
                    return await this.designSchema(data, agentInstance);
                case 'optimize-queries':
                    return await this.optimizeQueries(data, agentInstance);
                case 'generate-migrations':
                    return await this.generateMigrations(data, agentInstance);
                case 'analyze-performance':
                    return await this.analyzePerformance(data, agentInstance);
                case 'validate-data':
                    return await this.validateData(data, agentInstance);
                default:
                    throw new Error(`Unknown task type: ${type}`);
            }
        },

        async designSchema(requirements, agent) {
            console.log('🏗️ Designing database schema');
            
            const schema = {
                entities: this.generateEntities(requirements),
                relationships: this.defineRelationships(requirements),
                indexes: this.planIndexes(requirements),
                constraints: this.defineConstraints(requirements),
                migrations: this.planMigrations(requirements)
            };

            // Store schema in context
            agent.context.currentSchema = schema;
            agent.schema = this.buildSchemaMap(schema);

            // Notify other modules
            AgentWorksEvents.emit('workflow:schemaGenerated', {
                schema,
                apiRequirements: this.extractAPIRequirements(schema)
            });

            AgentWorksEvents.emit('test:schemaGenerated', {
                schema,
                testData: this.generateTestData(schema)
            });

            return { success: true, schema };
        },

        async optimizeQueries(queryData, agent) {
            console.log('⚡ Optimizing database queries');
            
            const optimization = {
                analyzedQueries: this.analyzeQueries(queryData),
                suggestedIndexes: this.suggestIndexes(queryData),
                queryRewrites: this.suggestQueryRewrites(queryData),
                performanceImpact: this.estimatePerformanceImpact(queryData)
            };

            return { success: true, optimization };
        },

        // Helper methods
        generateEntities(requirements) {
            const entities = [];
            
            // Extract entities from UI components
            if (requirements.components) {
                requirements.components.forEach(comp => {
                    if (comp.type === 'form' || comp.type === 'table') {
                        entities.push(this.createEntityFromComponent(comp));
                    }
                });
            }

            // Extract entities from planning data
            if (requirements.features) {
                requirements.features.forEach(feature => {
                    entities.push(...this.extractEntitiesFromFeature(feature));
                });
            }

            // Add standard entities
            entities.push(...this.getStandardEntities(requirements.type || 'general'));

            return entities;
        },

        createEntityFromComponent(component) {
            return {
                name: component.properties.entity || 'DataEntity',
                fields: this.generateFields(component),
                primaryKey: 'id',
                timestamps: true,
                softDelete: false,
                validation: this.generateValidation(component)
            };
        },

        generateFields(component) {
            const fields = [{ name: 'id', type: 'uuid', required: true }];
            
            if (component.properties.fields) {
                component.properties.fields.forEach(field => {
                    fields.push({
                        name: field,
                        type: this.inferFieldType(field),
                        required: this.inferRequired(field),
                        validation: this.inferValidation(field)
                    });
                });
            }

            fields.push(
                { name: 'created_at', type: 'timestamp', required: true },
                { name: 'updated_at', type: 'timestamp', required: true }
            );

            return fields;
        },

        inferFieldType(fieldName) {
            const typeMap = {
                'id': 'uuid',
                'email': 'string',
                'password': 'string',
                'name': 'string',
                'title': 'string',
                'description': 'text',
                'content': 'text',
                'count': 'integer',
                'amount': 'decimal',
                'price': 'decimal',
                'date': 'date',
                'time': 'timestamp',
                'active': 'boolean',
                'enabled': 'boolean',
                'status': 'enum'
            };

            const lowerField = fieldName.toLowerCase();
            for (const [key, type] of Object.entries(typeMap)) {
                if (lowerField.includes(key)) {
                    return type;
                }
            }

            return 'string';
        },

        async handleMessage(messagePayload, agentInstance) {
            console.log(`📨 Database agent received message: ${messagePayload.message.type}`);
            
            const { type, data } = messagePayload.message;
            
            switch (type) {
                case 'ui-data-requirements':
                    await this.handleUIDataRequirements(data, agentInstance);
                    break;
                case 'planning-entities':
                    await this.incorporatePlanningEntities(data, agentInstance);
                    break;
                case 'workflow-data-flows':
                    await this.optimizeForWorkflows(data, agentInstance);
                    break;
            }
        }
    }
});

// Workflow Agent - Handles automation and process management
const createWorkflowAgent = () => ({
    type: 'workflow-agent',
    name: 'Workflow Automation Agent',
    description: 'Specialized agent for workflow automation, process management, and API orchestration',
    module: 'workflow',
    capabilities: [
        'workflow-design',
        'api-orchestration',
        'process-automation',
        'integration-management',
        'error-handling',
        'performance-monitoring'
    ],
    implementation: {
        async initialize(agentInstance, taskContext) {
            console.log('⚙️ Initializing Workflow Agent');
            agentInstance.workflows = new Map();
            agentInstance.context = {
                activeWorkflows: new Set(),
                templates: new Map(),
                integrations: new Map(),
                errorHistory: []
            };
        },

        async execute(task, agentInstance) {
            const { type, data, options = {} } = task;
            
            switch (type) {
                case 'design-workflow':
                    return await this.designWorkflow(data, agentInstance);
                case 'execute-workflow':
                    return await this.executeWorkflow(data, agentInstance);
                case 'create-integration':
                    return await this.createIntegration(data, agentInstance);
                case 'monitor-performance':
                    return await this.monitorPerformance(data, agentInstance);
                default:
                    throw new Error(`Unknown task type: ${type}`);
            }
        },

        async designWorkflow(requirements, agent) {
            console.log('🔄 Designing workflow');
            
            const workflow = {
                id: `workflow_${Date.now()}`,
                name: requirements.name,
                description: requirements.description,
                triggers: this.generateTriggers(requirements),
                steps: this.generateWorkflowSteps(requirements),
                errorHandling: this.generateErrorHandling(requirements),
                monitoring: this.generateMonitoring(requirements)
            };

            agent.workflows.set(workflow.id, workflow);

            // Notify test agent for workflow testing
            AgentWorksEvents.emit('test:workflowGenerated', {
                workflow,
                testScenarios: this.generateTestScenarios(workflow)
            });

            return { success: true, workflow };
        },

        generateWorkflowSteps(requirements) {
            const steps = [];
            
            // Add authentication step if needed
            if (requirements.requiresAuth) {
                steps.push({
                    type: 'authentication',
                    name: 'Verify User Authentication',
                    config: { method: 'jwt', required: true }
                });
            }

            // Add data validation step
            if (requirements.dataValidation) {
                steps.push({
                    type: 'validation',
                    name: 'Validate Input Data',
                    config: { schema: requirements.validationSchema }
                });
            }

            // Add business logic steps
            if (requirements.businessLogic) {
                requirements.businessLogic.forEach((logic, index) => {
                    steps.push({
                        type: 'business-logic',
                        name: `Business Rule ${index + 1}`,
                        config: logic
                    });
                });
            }

            // Add database operations
            if (requirements.databaseOperations) {
                requirements.databaseOperations.forEach(op => {
                    steps.push({
                        type: 'database',
                        name: `${op.type.toUpperCase()} Operation`,
                        config: op
                    });
                });
            }

            return steps;
        }
    }
});

// Test Agent - Handles automated testing and quality assurance
const createTestAgent = () => ({
    type: 'test-agent',
    name: 'Quality Assurance Agent',
    description: 'Specialized agent for automated testing, quality assurance, and test case generation',
    module: 'testing',
    capabilities: [
        'test-generation',
        'automated-testing',
        'performance-testing',
        'security-testing',
        'accessibility-testing',
        'regression-testing'
    ],
    implementation: {
        async initialize(agentInstance, taskContext) {
            console.log('🧪 Initializing Test Agent');
            agentInstance.testSuites = new Map();
            agentInstance.context = {
                testResults: new Map(),
                coverage: new Map(),
                performance: new Map()
            };
        },

        async execute(task, agentInstance) {
            const { type, data, options = {} } = task;
            
            switch (type) {
                case 'generate-tests':
                    return await this.generateTests(data, agentInstance);
                case 'run-tests':
                    return await this.runTests(data, agentInstance);
                case 'performance-test':
                    return await this.performanceTest(data, agentInstance);
                case 'security-scan':
                    return await this.securityScan(data, agentInstance);
                default:
                    throw new Error(`Unknown task type: ${type}`);
            }
        },

        async generateTests(testSpec, agent) {
            console.log('🧪 Generating test cases');
            
            const testSuite = {
                id: `tests_${Date.now()}`,
                type: testSpec.type,
                tests: this.createTestCases(testSpec),
                setup: this.generateSetup(testSpec),
                teardown: this.generateTeardown(testSpec)
            };

            agent.testSuites.set(testSuite.id, testSuite);

            return { success: true, testSuite };
        },

        createTestCases(spec) {
            const tests = [];
            
            // Unit tests
            if (spec.components) {
                spec.components.forEach(component => {
                    tests.push(...this.generateComponentTests(component));
                });
            }

            // Integration tests
            if (spec.workflows) {
                spec.workflows.forEach(workflow => {
                    tests.push(...this.generateWorkflowTests(workflow));
                });
            }

            // API tests
            if (spec.apis) {
                spec.apis.forEach(api => {
                    tests.push(...this.generateAPITests(api));
                });
            }

            return tests;
        }
    }
});

// Monitoring Agent - Handles system monitoring and performance tracking
const createMonitoringAgent = () => ({
    type: 'monitoring-agent',
    name: 'System Monitoring Agent',
    description: 'Specialized agent for system monitoring, performance tracking, and alerting',
    module: 'monitoring',
    capabilities: [
        'performance-monitoring',
        'error-tracking',
        'alerting',
        'log-analysis',
        'capacity-planning',
        'health-checks'
    ],
    implementation: {
        async initialize(agentInstance, taskContext) {
            console.log('📊 Initializing Monitoring Agent');
            agentInstance.metrics = new Map();
            agentInstance.alerts = [];
            agentInstance.context = {
                thresholds: taskContext.thresholds || {},
                dashboards: new Map(),
                reports: []
            };
        },

        async execute(task, agentInstance) {
            const { type, data, options = {} } = task;
            
            switch (type) {
                case 'collect-metrics':
                    return await this.collectMetrics(data, agentInstance);
                case 'analyze-performance':
                    return await this.analyzePerformance(data, agentInstance);
                case 'generate-alerts':
                    return await this.generateAlerts(data, agentInstance);
                case 'create-report':
                    return await this.createReport(data, agentInstance);
                default:
                    throw new Error(`Unknown task type: ${type}`);
            }
        },

        async collectMetrics(systemData, agent) {
            console.log('📈 Collecting system metrics');
            
            const metrics = {
                timestamp: Date.now(),
                performance: this.gatherPerformanceMetrics(systemData),
                resources: this.gatherResourceMetrics(systemData),
                errors: this.gatherErrorMetrics(systemData),
                users: this.gatherUserMetrics(systemData)
            };

            agent.metrics.set(metrics.timestamp, metrics);

            // Check for alerts
            const alerts = this.checkAlertConditions(metrics, agent.context.thresholds);
            if (alerts.length > 0) {
                agent.alerts.push(...alerts);
                AgentWorksEvents.emit('monitoring:alertsGenerated', alerts);
            }

            return { success: true, metrics };
        }
    }
});

// Integration Agent - Handles external service integration
const createIntegrationAgent = () => ({
    type: 'integration-agent',
    name: 'External Integration Agent',
    description: 'Specialized agent for managing external service integrations and API connections',
    module: 'integration',
    capabilities: [
        'api-integration',
        'webhook-management',
        'data-synchronization',
        'authentication-handling',
        'rate-limit-management',
        'error-recovery'
    ],
    implementation: {
        async initialize(agentInstance, taskContext) {
            console.log('🔗 Initializing Integration Agent');
            agentInstance.integrations = new Map();
            agentInstance.context = {
                connections: new Map(),
                webhooks: new Map(),
                syncJobs: new Map()
            };
        },

        async execute(task, agentInstance) {
            const { type, data, options = {} } = task;
            
            switch (type) {
                case 'setup-integration':
                    return await this.setupIntegration(data, agentInstance);
                case 'sync-data':
                    return await this.syncData(data, agentInstance);
                case 'handle-webhook':
                    return await this.handleWebhook(data, agentInstance);
                case 'test-connection':
                    return await this.testConnection(data, agentInstance);
                default:
                    throw new Error(`Unknown task type: ${type}`);
            }
        }
    }
});

// Add agent creation methods to the global AgentCoordinator
if (typeof window !== 'undefined' && window.AgentCoordinator) {
    window.AgentCoordinator.createPlanningAgent = createPlanningAgent;
    window.AgentCoordinator.createUIDesignAgent = createUIDesignAgent;
    window.AgentCoordinator.createDatabaseAgent = createDatabaseAgent;
    window.AgentCoordinator.createWorkflowAgent = createWorkflowAgent;
    window.AgentCoordinator.createTestAgent = createTestAgent;
    window.AgentCoordinator.createMonitoringAgent = createMonitoringAgent;
    window.AgentCoordinator.createIntegrationAgent = createIntegrationAgent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createPlanningAgent,
        createUIDesignAgent,
        createDatabaseAgent,
        createWorkflowAgent,
        createTestAgent,
        createMonitoringAgent,
        createIntegrationAgent
    };
}