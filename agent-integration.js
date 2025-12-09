/**
 * AgentWorks Agent Integration Layer
 * 
 * Integration layer that connects the Agent Coordination System with the existing
 * AgentWorks enhanced modules system. Provides seamless agent deployment and
 * cross-module communication.
 * 
 * @version 1.0.0
 * @requires agent-coordination-system.js
 * @requires specialized-agents.js
 * @requires enhanced-modules.js
 */

// Agent Integration Manager
window.AgentIntegration = {
    // Integration state
    state: {
        initialized: false,
        moduleAgents: new Map(),
        activeWorkflows: new Map(),
        communicationBridge: null,
        eventSubscriptions: new Set()
    },

    // Initialize the integration layer
    async initialize() {
        console.log('🔗 Initializing Agent Integration Layer...');
        
        try {
            // Ensure required systems are available
            if (!window.AgentCoordinator) {
                throw new Error('AgentCoordinator not found. Please include agent-coordination-system.js');
            }

            if (!window.AgentWorksEvents) {
                throw new Error('AgentWorksEvents not found. Please include enhanced-modules.js');
            }

            if (!window.AgentWorksState) {
                throw new Error('AgentWorksState not found. Please include enhanced-modules.js');
            }

            // Initialize the coordination system
            const coordinatorResult = await AgentCoordinator.initialize();
            if (!coordinatorResult.success) {
                throw new Error(`Failed to initialize coordinator: ${coordinatorResult.error}`);
            }

            // Setup communication bridge
            this.setupCommunicationBridge();

            // Setup module integration
            await this.setupModuleIntegration();

            // Subscribe to cross-module events
            this.subscribeToEvents();

            // Initialize dashboard integration
            this.initializeDashboardIntegration();

            this.state.initialized = true;
            console.log('✅ Agent Integration Layer initialized successfully');

            // Emit integration ready event
            AgentWorksEvents.emit('agents:integrationReady', {
                timestamp: new Date().toISOString(),
                availableAgents: AgentCoordinator.getRegisteredAgentTypes(),
                activeIntegrations: this.getActiveIntegrations()
            });

            return { success: true, message: 'Integration layer initialized' };
        } catch (error) {
            console.error('❌ Failed to initialize Agent Integration Layer:', error);
            return { success: false, error: error.message };
        }
    },

    // Setup communication bridge between agents and modules
    setupCommunicationBridge() {
        console.log('🌉 Setting up communication bridge');
        
        this.state.communicationBridge = {
            // Route messages from modules to agents
            moduleToAgent: async (moduleId, agentType, message) => {
                try {
                    const agent = this.findAgentByType(agentType);
                    if (!agent) {
                        // Auto-deploy agent if not available
                        const deployment = await this.autoDeployAgent(agentType, { source: moduleId });
                        if (!deployment.success) {
                            throw new Error(`Failed to deploy agent: ${agentType}`);
                        }
                        agent = deployment.agent;
                    }

                    return await AgentCoordinator.sendMessage('system', agent.id, message);
                } catch (error) {
                    console.error('Failed to route message to agent:', error);
                    return { success: false, error: error.message };
                }
            },

            // Route messages from agents to modules
            agentToModule: async (agentId, moduleId, message) => {
                try {
                    // Emit event for module to handle
                    AgentWorksEvents.emit(`${moduleId}:agentMessage`, {
                        agentId,
                        message,
                        timestamp: new Date().toISOString()
                    });

                    return { success: true };
                } catch (error) {
                    console.error('Failed to route message to module:', error);
                    return { success: false, error: error.message };
                }
            },

            // Broadcast messages across all modules
            broadcast: async (message, options = {}) => {
                try {
                    const modules = ['planning', 'ui-builder', 'database', 'workflow', 'testing'];
                    const results = [];

                    for (const module of modules) {
                        if (!options.exclude || !options.exclude.includes(module)) {
                            AgentWorksEvents.emit(`${module}:broadcast`, {
                                message,
                                source: options.source || 'agent-system',
                                timestamp: new Date().toISOString()
                            });
                            results.push({ module, success: true });
                        }
                    }

                    return { success: true, results };
                } catch (error) {
                    console.error('Failed to broadcast message:', error);
                    return { success: false, error: error.message };
                }
            }
        };
    },

    // Setup integration with existing modules
    async setupModuleIntegration() {
        console.log('🔧 Setting up module integration');
        
        // Planning Module Integration
        await this.integratePlanningModule();
        
        // UI Builder Integration
        await this.integrateUIBuilderModule();
        
        // Database Builder Integration
        await this.integrateDatabaseModule();
        
        // Workflow Integration
        await this.integrateWorkflowModule();
        
        // Cross-module data flow integration
        await this.enhanceDataFlowIntegration();
    },

    // Planning Module Integration
    async integratePlanningModule() {
        console.log('🧠 Integrating Planning Module with agents');
        
        // Deploy planning agent
        const planningAgent = await this.deployModuleAgent('planning-agent', {
            module: 'planning',
            capabilities: ['vision-analysis', 'feature-suggestion', 'market-research']
        });

        if (planningAgent.success) {
            this.state.moduleAgents.set('planning', planningAgent.agent);

            // Enhance existing planning functions with agent capabilities
            this.enhancePlanningFunctions();
        }
    },

    // UI Builder Integration
    async integrateUIBuilderModule() {
        console.log('🎨 Integrating UI Builder Module with agents');
        
        // Deploy UI design agent
        const uiAgent = await this.deployModuleAgent('ui-design-agent', {
            module: 'ui-builder',
            capabilities: ['component-design', 'layout-generation', 'accessibility-analysis']
        });

        if (uiAgent.success) {
            this.state.moduleAgents.set('ui-builder', uiAgent.agent);
            this.enhanceUIBuilderFunctions();
        }
    },

    // Database Module Integration
    async integrateDatabaseModule() {
        console.log('🗄️ Integrating Database Module with agents');
        
        // Deploy database agent
        const dbAgent = await this.deployModuleAgent('database-agent', {
            module: 'database',
            capabilities: ['schema-design', 'relationship-modeling', 'query-optimization']
        });

        if (dbAgent.success) {
            this.state.moduleAgents.set('database', dbAgent.agent);
            this.enhanceDatabaseFunctions();
        }
    },

    // Workflow Integration
    async integrateWorkflowModule() {
        console.log('⚙️ Integrating Workflow Module with agents');
        
        // Deploy workflow agent
        const workflowAgent = await this.deployModuleAgent('workflow-agent', {
            module: 'workflow',
            capabilities: ['workflow-design', 'api-orchestration', 'process-automation']
        });

        if (workflowAgent.success) {
            this.state.moduleAgents.set('workflow', workflowAgent.agent);
            this.enhanceWorkflowFunctions();
        }
    },

    // Subscribe to cross-module events
    subscribeToEvents() {
        console.log('📡 Subscribing to cross-module events');
        
        // Planning to Agent events
        AgentWorksEvents.on('planning:visionSubmitted', async (data) => {
            await this.handlePlanningVision(data);
        });

        AgentWorksEvents.on('planning:featuresGenerated', async (data) => {
            await this.handlePlanningFeatures(data);
        });

        // UI to Agent events
        AgentWorksEvents.on('ui:componentCreated', async (data) => {
            await this.handleUIComponent(data);
        });

        AgentWorksEvents.on('ui:layoutGenerated', async (data) => {
            await this.handleUILayout(data);
        });

        // Database to Agent events
        AgentWorksEvents.on('database:schemaCreated', async (data) => {
            await this.handleDatabaseSchema(data);
        });

        AgentWorksEvents.on('database:entityAdded', async (data) => {
            await this.handleDatabaseEntity(data);
        });

        // Workflow to Agent events
        AgentWorksEvents.on('workflow:workflowCreated', async (data) => {
            await this.handleWorkflowCreation(data);
        });

        // Agent status events
        AgentWorksEvents.on('agents:taskCompleted', (data) => {
            this.handleAgentTaskCompletion(data);
        });

        AgentWorksEvents.on('agents:error', (data) => {
            this.handleAgentError(data);
        });

        this.state.eventSubscriptions.add('planning:visionSubmitted');
        this.state.eventSubscriptions.add('ui:componentCreated');
        this.state.eventSubscriptions.add('database:schemaCreated');
        this.state.eventSubscriptions.add('workflow:workflowCreated');
    },

    // Event Handlers
    async handlePlanningVision(visionData) {
        console.log('🧠 Processing planning vision with AI agent');
        
        try {
            const planningAgent = this.state.moduleAgents.get('planning');
            if (planningAgent) {
                const result = await AgentCoordinator.executeTask(planningAgent.id, {
                    type: 'analyze-vision',
                    data: visionData
                });

                if (result.success) {
                    // Update planning state with agent analysis
                    AgentWorksState.planning.currentSession.aiAnalysis = result.result.analysis;
                    
                    // Trigger feature suggestions
                    AgentWorksEvents.emit('planning:visionAnalyzed', result.result.analysis);
                    
                    // Auto-generate initial features
                    setTimeout(async () => {
                        await this.autoGenerateFeatures(visionData);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Failed to process planning vision:', error);
            this.showAgentError('Planning analysis failed', error.message);
        }
    },

    async handleUIComponent(componentData) {
        console.log('🎨 Processing UI component with design agent');
        
        try {
            const uiAgent = this.state.moduleAgents.get('ui-builder');
            if (uiAgent) {
                // Analyze component for data requirements
                const result = await AgentCoordinator.executeTask(uiAgent.id, {
                    type: 'analyze-component',
                    data: componentData
                });

                if (result.success && result.result.dataRequirements) {
                    // Send data requirements to database module
                    AgentWorksEvents.emit('database:componentDataNeeds', {
                        component: componentData,
                        requirements: result.result.dataRequirements
                    });
                }
            }
        } catch (error) {
            console.error('Failed to process UI component:', error);
        }
    },

    async handleDatabaseSchema(schemaData) {
        console.log('🗄️ Processing database schema with database agent');
        
        try {
            const dbAgent = this.state.moduleAgents.get('database');
            if (dbAgent) {
                // Optimize schema and generate workflows
                const result = await AgentCoordinator.executeTask(dbAgent.id, {
                    type: 'optimize-schema',
                    data: schemaData
                });

                if (result.success) {
                    // Send optimized schema to workflow module
                    AgentWorksEvents.emit('workflow:schemaOptimized', {
                        originalSchema: schemaData,
                        optimizedSchema: result.result.schema,
                        suggestedWorkflows: result.result.workflows
                    });
                }
            }
        } catch (error) {
            console.error('Failed to process database schema:', error);
        }
    },

    // Enhanced Planning Functions
    enhancePlanningFunctions() {
        // Override the original processVision function
        const originalProcessVision = window.processVision;
        window.processVision = async (event) => {
            // Call original function
            if (originalProcessVision) {
                await originalProcessVision(event);
            }

            // Add AI enhancement
            const visionData = {
                description: document.getElementById('visionDescription')?.value,
                audience: document.getElementById('targetAudience')?.value,
                category: document.getElementById('industryCategory')?.value
            };

            AgentWorksEvents.emit('planning:visionSubmitted', visionData);
        };

        // Override feature generation
        const originalGenerateFeatureSuggestions = window.generateFeatureSuggestions;
        window.generateFeatureSuggestions = async () => {
            // Show agent is working
            this.showAgentActivity('Planning Agent is analyzing your vision and generating intelligent feature suggestions...');
            
            try {
                const planningAgent = this.state.moduleAgents.get('planning');
                if (planningAgent) {
                    const visionData = AgentWorksState.planning.currentSession.vision;
                    const result = await AgentCoordinator.executeTask(planningAgent.id, {
                        type: 'suggest-features',
                        data: visionData
                    });

                    if (result.success) {
                        this.renderAgentFeatureSuggestions(result.result.features);
                        this.hideAgentActivity();
                        return;
                    }
                }
            } catch (error) {
                console.error('Agent feature generation failed:', error);
            }

            // Fallback to original function
            if (originalGenerateFeatureSuggestions) {
                await originalGenerateFeatureSuggestions();
            }
            this.hideAgentActivity();
        };
    },

    // Enhanced UI Builder Functions
    enhanceUIBuilderFunctions() {
        // Add agent-powered component generation
        window.generateComponentWithAgent = async (componentType, requirements) => {
            this.showAgentActivity('UI Design Agent is creating optimized component...');
            
            try {
                const uiAgent = this.state.moduleAgents.get('ui-builder');
                if (uiAgent) {
                    const result = await AgentCoordinator.executeTask(uiAgent.id, {
                        type: 'generate-component',
                        data: { type: componentType, requirements }
                    });

                    if (result.success) {
                        this.hideAgentActivity();
                        return result.result.component;
                    }
                }
            } catch (error) {
                console.error('Agent component generation failed:', error);
            }
            
            this.hideAgentActivity();
            return null;
        };

        // Add accessibility analysis
        window.analyzeAccessibilityWithAgent = async (designData) => {
            const uiAgent = this.state.moduleAgents.get('ui-builder');
            if (uiAgent) {
                const result = await AgentCoordinator.executeTask(uiAgent.id, {
                    type: 'analyze-accessibility',
                    data: designData
                });

                if (result.success) {
                    this.displayAccessibilityReport(result.result.analysis);
                }
            }
        };
    },

    // Enhanced Database Functions
    enhanceDatabaseFunctions() {
        // Add agent-powered schema generation
        window.generateSchemaWithAgent = async (requirements) => {
            this.showAgentActivity('Database Agent is designing optimal schema...');
            
            try {
                const dbAgent = this.state.moduleAgents.get('database');
                if (dbAgent) {
                    const result = await AgentCoordinator.executeTask(dbAgent.id, {
                        type: 'design-schema',
                        data: requirements
                    });

                    if (result.success) {
                        this.hideAgentActivity();
                        AgentWorksEvents.emit('database:schemaGenerated', result.result.schema);
                        return result.result.schema;
                    }
                }
            } catch (error) {
                console.error('Agent schema generation failed:', error);
            }
            
            this.hideAgentActivity();
            return null;
        };
    },

    // Enhanced Workflow Functions
    enhanceWorkflowFunctions() {
        // Add agent-powered workflow generation
        window.generateWorkflowWithAgent = async (requirements) => {
            this.showAgentActivity('Workflow Agent is designing automation...');
            
            try {
                const workflowAgent = this.state.moduleAgents.get('workflow');
                if (workflowAgent) {
                    const result = await AgentCoordinator.executeTask(workflowAgent.id, {
                        type: 'design-workflow',
                        data: requirements
                    });

                    if (result.success) {
                        this.hideAgentActivity();
                        return result.result.workflow;
                    }
                }
            } catch (error) {
                console.error('Agent workflow generation failed:', error);
            }
            
            this.hideAgentActivity();
            return null;
        };
    },

    // Enhanced Data Flow Integration
    async enhanceDataFlowIntegration() {
        // Enhance existing DataFlowIntegration with agent capabilities
        const originalPlanningToKanban = window.DataFlowIntegration?.planningToKanban;
        if (originalPlanningToKanban) {
            window.DataFlowIntegration.planningToKanban = async (planningData) => {
                // Use agent to optimize the data flow
                const planningAgent = this.state.moduleAgents.get('planning');
                if (planningAgent) {
                    try {
                        const result = await AgentCoordinator.executeTask(planningAgent.id, {
                            type: 'optimize-kanban-flow',
                            data: planningData
                        });

                        if (result.success) {
                            planningData = result.result.optimizedData;
                        }
                    } catch (error) {
                        console.warn('Agent optimization failed, using original data:', error);
                    }
                }

                // Call original function with potentially optimized data
                return originalPlanningToKanban(planningData);
            };
        }
    },

    // Dashboard Integration
    initializeDashboardIntegration() {
        // Add agent status to the main dashboard
        this.createAgentStatusWidget();
        
        // Add agent control panel
        this.createAgentControlPanel();
        
        // Add cross-module workflow display
        this.createWorkflowStatusWidget();
    },

    // Helper Methods
    async deployModuleAgent(agentType, config) {
        try {
            // Find agent definition
            const agentDefinition = this.findAgentDefinition(agentType);
            if (!agentDefinition) {
                throw new Error(`Agent definition not found: ${agentType}`);
            }

            // Deploy agent
            const deployment = await AgentCoordinator.deployAgent(agentDefinition.id, config);
            if (!deployment.success) {
                throw new Error(`Failed to deploy agent: ${deployment.error}`);
            }

            console.log(`✅ Successfully deployed ${agentType} for module integration`);
            return { success: true, agent: deployment.agent };
        } catch (error) {
            console.error(`Failed to deploy module agent ${agentType}:`, error);
            return { success: false, error: error.message };
        }
    },

    findAgentByType(agentType) {
        for (const [_, agent] of AgentCoordinator.state.activeAgents) {
            if (agent.definition.type === agentType) {
                return agent;
            }
        }
        return null;
    },

    findAgentDefinition(agentType) {
        for (const [id, definition] of AgentCoordinator.state.registry) {
            if (definition.type === agentType) {
                return { id, ...definition };
            }
        }
        return null;
    },

    async autoDeployAgent(agentType, context = {}) {
        console.log(`🚀 Auto-deploying agent: ${agentType}`);
        
        const definition = this.findAgentDefinition(agentType);
        if (!definition) {
            return { success: false, error: `Agent type not found: ${agentType}` };
        }

        return await AgentCoordinator.deployAgent(definition.id, context);
    },

    async autoGenerateFeatures(visionData) {
        try {
            const planningAgent = this.state.moduleAgents.get('planning');
            if (planningAgent) {
                const result = await AgentCoordinator.executeTask(planningAgent.id, {
                    type: 'suggest-features',
                    data: visionData
                });

                if (result.success) {
                    // Auto-add suggested features
                    result.result.features.forEach(feature => {
                        if (feature.priority === 'high') {
                            AgentWorksEvents.emit('planning:autoAddFeature', feature);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Auto feature generation failed:', error);
        }
    },

    // UI Helper Methods
    showAgentActivity(message) {
        // Create or update agent activity indicator
        let indicator = document.getElementById('agentActivityIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'agentActivityIndicator';
            indicator.className = 'fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg';
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>${message}</span>
            </div>
        `;
        indicator.style.display = 'block';
    },

    hideAgentActivity() {
        const indicator = document.getElementById('agentActivityIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    },

    showAgentError(title, message) {
        // Show error notification
        if (window.showNotification) {
            window.showNotification(`${title}: ${message}`, 'error');
        } else {
            console.error(`${title}: ${message}`);
        }
    },

    renderAgentFeatureSuggestions(features) {
        const container = document.getElementById('aiSuggestions');
        if (container) {
            container.innerHTML = features.map(feature => `
                <div class="suggestion-card bg-white border border-gray-200 rounded p-3 cursor-pointer hover:border-blue-300" 
                     onclick="addSuggestedFeature('${feature.name}', '${feature.description}')">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="font-medium text-sm text-gray-900">${feature.name}</div>
                            <div class="text-xs text-gray-600 mt-1">${feature.description}</div>
                            <div class="flex items-center gap-2 mt-2">
                                <span class="text-xs px-2 py-1 bg-${feature.priority === 'high' ? 'red' : feature.priority === 'medium' ? 'yellow' : 'green'}-100 text-${feature.priority === 'high' ? 'red' : feature.priority === 'medium' ? 'yellow' : 'green'}-700 rounded">
                                    ${feature.priority} priority
                                </span>
                                <span class="text-xs text-gray-500">${feature.estimatedEffort || 'Medium'} effort</span>
                            </div>
                        </div>
                        <i class="fas fa-plus text-blue-600"></i>
                    </div>
                </div>
            `).join('');
        }
    },

    displayAccessibilityReport(analysis) {
        // Create accessibility report modal or panel
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                <h3 class="text-lg font-semibold mb-4">Accessibility Analysis Report</h3>
                <div class="space-y-4">
                    <div>
                        <h4 class="font-medium text-gray-900">Color Contrast</h4>
                        <p class="text-sm text-gray-600">${analysis.colorContrast.status || 'Analyzing...'}</p>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">Keyboard Navigation</h4>
                        <p class="text-sm text-gray-600">${analysis.keyboardNavigation.status || 'Analyzing...'}</p>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">Screen Reader Support</h4>
                        <p class="text-sm text-gray-600">${analysis.screenReaderSupport.status || 'Analyzing...'}</p>
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900">WCAG Compliance</h4>
                        <p class="text-sm text-gray-600">${analysis.wcagCompliance.level || 'Analyzing...'}</p>
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Close
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    createAgentStatusWidget() {
        // Add agent status widget to dashboard (implementation depends on UI structure)
        console.log('📊 Agent status widget created');
    },

    createAgentControlPanel() {
        // Add agent control panel (implementation depends on UI structure)
        console.log('🎛️ Agent control panel created');
    },

    createWorkflowStatusWidget() {
        // Add workflow status widget (implementation depends on UI structure)
        console.log('🔄 Workflow status widget created');
    },

    getActiveIntegrations() {
        return Array.from(this.state.moduleAgents.entries()).map(([module, agent]) => ({
            module,
            agentId: agent.id,
            agentType: agent.definition.type,
            status: agent.status
        }));
    },

    // Cleanup
    async cleanup() {
        console.log('🧹 Cleaning up Agent Integration Layer');
        
        // Unsubscribe from events
        this.state.eventSubscriptions.forEach(event => {
            AgentWorksEvents.off(event);
        });

        // Terminate module agents
        for (const [module, agent] of this.state.moduleAgents) {
            await AgentCoordinator.terminateAgent(agent.id, 'cleanup');
        }

        this.state.initialized = false;
    }
};

// Auto-initialize when all dependencies are loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit for other scripts to load
    setTimeout(async () => {
        if (window.AgentCoordinator && window.AgentWorksEvents && window.AgentWorksState) {
            await AgentIntegration.initialize();
        } else {
            console.warn('⚠️ Agent integration dependencies not fully loaded. Please ensure all required scripts are included.');
        }
    }, 1000);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentIntegration;
}