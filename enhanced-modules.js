// AgentWorks Enhanced Modules Integration
// This file contains all the enhanced module functions and cross-module integration

// Global state management for cross-module integration
window.AgentWorksState = {
    planning: {
        currentSession: null,
        projects: [],
        blueprints: []
    },
    ui: {
        components: [],
        mockups: [],
        designSystem: {}
    },
    database: {
        schema: null,
        entities: [],
        relationships: []
    },
    workflows: {
        current: null,
        templates: [],
        executions: []
    },
    agents: {
        available: [],
        active: [],
        contracts: []
    }
};

// Cross-module event system
window.AgentWorksEvents = {
    listeners: {},
    emit: function(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    },
    on: function(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },
    off: function(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
};

// Data Flow Integration Functions
window.DataFlowIntegration = {
    // Flow data from Planning to Kanban
    planningToKanban: function(planningData) {
        const kanbanCards = [];
        
        if (planningData.features) {
            planningData.features.forEach((feature, index) => {
                kanbanCards.push({
                    id: `feature_${Date.now()}_${index}`,
                    title: feature.name,
                    description: feature.description,
                    priority: feature.priority,
                    lane: 'copilot-session', // Starting lane
                    tags: ['feature', planningData.category],
                    metadata: {
                        source: 'planning',
                        blueprintId: planningData.id,
                        estimatedEffort: feature.estimatedEffort || 'medium'
                    }
                });
            });
        }
        
        // Emit event for Kanban to pick up
        AgentWorksEvents.emit('kanban:addCards', kanbanCards);
        showNotification(`${kanbanCards.length} cards created from planning session`);
    },

    // Flow data from UI Builder to Database Builder
    uiToDatabase: function(uiComponents) {
        const requiredEntities = [];
        const requiredFields = [];
        
        uiComponents.forEach(component => {
            if (component.properties.mockData && component.properties.mockData !== 'none') {
                const entity = this.inferEntityFromMockData(component.properties.mockData);
                if (entity) {
                    requiredEntities.push(entity);
                }
            }
            
            // Extract field requirements from forms
            if (component.type === 'form' && component.properties.fields) {
                component.properties.fields.forEach(field => {
                    requiredFields.push({
                        name: field,
                        type: this.inferFieldType(field),
                        source: component.name
                    });
                });
            }
        });
        
        AgentWorksEvents.emit('database:suggestEntities', {
            entities: requiredEntities,
            fields: requiredFields,
            source: 'ui-builder'
        });
    },

    // Flow data from Database to Workflows
    databaseToWorkflows: function(schema) {
        const suggestedWorkflows = [];
        
        schema.entities.forEach(entity => {
            // Suggest CRUD workflows
            suggestedWorkflows.push({
                name: `${entity.name} CRUD Operations`,
                type: 'crud-workflow',
                entity: entity.name,
                operations: ['create', 'read', 'update', 'delete'],
                endpoints: [
                    { method: 'GET', path: `/${entity.name.toLowerCase()}s` },
                    { method: 'GET', path: `/${entity.name.toLowerCase()}s/:id` },
                    { method: 'POST', path: `/${entity.name.toLowerCase()}s` },
                    { method: 'PUT', path: `/${entity.name.toLowerCase()}s/:id` },
                    { method: 'DELETE', path: `/${entity.name.toLowerCase()}s/:id` }
                ]
            });
        });
        
        AgentWorksEvents.emit('workflows:suggestTemplates', suggestedWorkflows);
    },

    // Flow data from Workflows to Agents
    workflowsToAgents: function(workflow) {
        const requiredAgents = [];
        
        workflow.nodes.forEach(node => {
            if (node.type === 'agent') {
                requiredAgents.push({
                    type: node.config.agentType,
                    parameters: node.config.parameters,
                    workflowNode: node.id
                });
            }
        });
        
        AgentWorksEvents.emit('agents:deployRequired', {
            agents: requiredAgents,
            workflow: workflow.id
        });
    },

    // Helper functions
    inferEntityFromMockData: function(mockDataType) {
        const entityMap = {
            'users': { name: 'User', fields: ['id', 'name', 'email', 'status'] },
            'stats': { name: 'Statistic', fields: ['id', 'label', 'value', 'change', 'trend'] },
            'activity': { name: 'Activity', fields: ['id', 'user', 'action', 'timestamp', 'status'] },
            'analytics': { name: 'Analytics', fields: ['id', 'metric', 'value', 'date'] }
        };
        return entityMap[mockDataType] || null;
    },

    inferFieldType: function(fieldName) {
        const typeMap = {
            'id': 'uuid',
            'email': 'email',
            'name': 'string',
            'description': 'text',
            'date': 'datetime',
            'created': 'datetime',
            'updated': 'datetime',
            'status': 'enum',
            'count': 'integer',
            'price': 'decimal',
            'amount': 'decimal'
        };
        
        const lowercaseName = fieldName.toLowerCase();
        for (const [keyword, type] of Object.entries(typeMap)) {
            if (lowercaseName.includes(keyword)) {
                return type;
            }
        }
        return 'string'; // default
    }
};

// Enhanced Planning Module
function loadPlanningView() {
    const mainContent = document.querySelector('main .flex-1');
    mainContent.className = 'flex-1 overflow-hidden';
    
    // Initialize planning session state
    if (!window.AgentWorksState.planning.currentSession) {
        window.AgentWorksState.planning.currentSession = {
            id: null,
            vision: null,
            features: [],
            research: null,
            documents: {
                blueprint: null,
                prd: null,
                mvp: null
            },
            step: 'vision'
        };
    }

    mainContent.innerHTML = `
        <div class="h-full flex bg-gray-50">
            <!-- Planning Progress Sidebar -->
            <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <i class="fas fa-lightbulb text-white"></i>
                        </div>
                        <div>
                            <h2 class="font-semibold text-gray-900">Planning Studio</h2>
                            <p class="text-sm text-gray-600">AI-Powered Project Planning</p>
                        </div>
                    </div>
                    
                    <!-- Progress Steps -->
                    <div class="space-y-3">
                        <div class="planning-step ${getCurrentStep() === 'vision' ? 'active' : (isStepCompleted('vision') ? 'completed' : 'pending')}" data-step="vision">
                            <div class="flex items-center gap-3">
                                <div class="step-indicator">
                                    <i class="fas fa-eye"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-sm">Vision & Concept</div>
                                    <div class="text-xs text-gray-500">Define your application idea</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="planning-step ${getCurrentStep() === 'features' ? 'active' : (isStepCompleted('features') ? 'completed' : 'pending')}" data-step="features">
                            <div class="flex items-center gap-3">
                                <div class="step-indicator">
                                    <i class="fas fa-list"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-sm">Features & Priority</div>
                                    <div class="text-xs text-gray-500">Define and prioritize features</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="planning-step ${getCurrentStep() === 'research' ? 'active' : (isStepCompleted('research') ? 'completed' : 'pending')}" data-step="research">
                            <div class="flex items-center gap-3">
                                <div class="step-indicator">
                                    <i class="fas fa-search"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-sm">Market Research</div>
                                    <div class="text-xs text-gray-500">Analyze market & competitors</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="planning-step ${getCurrentStep() === 'documents' ? 'active' : (isStepCompleted('documents') ? 'completed' : 'pending')}" data-step="documents">
                            <div class="flex items-center gap-3">
                                <div class="step-indicator">
                                    <i class="fas fa-file-alt"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-sm">Blueprint & PRD</div>
                                    <div class="text-xs text-gray-500">Generate project documents</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Current Session Summary -->
                <div class="p-6 flex-1 overflow-auto">
                    <h3 class="font-semibold text-gray-900 mb-4">Session Summary</h3>
                    <div id="sessionSummary" class="space-y-4">
                        <div class="text-sm text-gray-500">Start planning to see summary</div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="p-6 border-t border-gray-200 space-y-3">
                    <button onclick="exportPlanningSession()" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-download"></i>
                        Export Session
                    </button>
                    <button onclick="createProjectFromPlanning()" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <i class="fas fa-rocket"></i>
                        Create Project
                    </button>
                    <button onclick="resetPlanningSession()" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        <i class="fas fa-redo"></i>
                        Reset Session
                    </button>
                </div>
            </div>

            <!-- Main Planning Content -->
            <div class="flex-1 flex flex-col">
                <!-- Planning Header -->
                <div class="bg-white border-b border-gray-200 p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-xl font-semibold text-gray-900 mb-2">Project Planning Session</h1>
                            <p class="text-gray-600">Work with AI CoPilot to plan your application from idea to implementation</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="text-sm text-gray-500">
                                Step ${getStepNumber(getCurrentStep())} of 4
                            </div>
                            <div class="w-32 bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${getProgressPercentage()}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dynamic Planning Content -->
                <div class="flex-1 overflow-auto p-6" id="planningContent">
                    ${renderPlanningStep(getCurrentStep())}
                </div>
            </div>

            <!-- CoPilot Assistant Panel -->
            <div class="w-96 bg-white border-l border-gray-200 flex flex-col">
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900">Planning CoPilot</h3>
                            <p class="text-xs text-gray-500">AI Assistant</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex-1 overflow-auto p-4" id="copilotChat">
                    <div class="space-y-4">
                        <div class="copilot-message">
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p class="text-sm text-gray-800">👋 Hi! I'm your Planning CoPilot. I'll help you transform your application idea into a comprehensive project plan. Let's start by understanding your vision!</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="p-4 border-t border-gray-200">
                    <div class="flex gap-2">
                        <input type="text" id="copilotInput" placeholder="Ask me anything about your project..." 
                               class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                               onkeypress="handleCopilotInput(event)">
                        <button onclick="sendCopilotMessage()" class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <style>
        .planning-step {
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .planning-step.pending {
            opacity: 0.5;
        }
        .planning-step.active {
            background-color: #eff6ff;
            border: 1px solid #3b82f6;
        }
        .planning-step.completed {
            background-color: #f0fdf4;
            border: 1px solid #10b981;
        }
        .step-indicator {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }
        .planning-step.pending .step-indicator {
            background-color: #e5e7eb;
            color: #6b7280;
        }
        .planning-step.active .step-indicator {
            background-color: #3b82f6;
            color: white;
        }
        .planning-step.completed .step-indicator {
            background-color: #10b981;
            color: white;
        }
        .copilot-message {
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        </style>
    `;

    initializePlanningModule();
}

// Planning Module Helper Functions
function getCurrentStep() {
    return window.AgentWorksState.planning.currentSession?.step || 'vision';
}

function isStepCompleted(step) {
    const session = window.AgentWorksState.planning.currentSession;
    if (!session) return false;
    
    switch (step) {
        case 'vision': return !!session.vision;
        case 'features': return session.features && session.features.length > 0;
        case 'research': return !!session.research;
        case 'documents': return !!(session.documents.blueprint || session.documents.prd || session.documents.mvp);
        default: return false;
    }
}

function getStepNumber(step) {
    const steps = ['vision', 'features', 'research', 'documents'];
    return steps.indexOf(step) + 1;
}

function getProgressPercentage() {
    const steps = ['vision', 'features', 'research', 'documents'];
    const currentIndex = steps.indexOf(getCurrentStep());
    return ((currentIndex + 1) / steps.length) * 100;
}

function renderPlanningStep(step) {
    switch (step) {
        case 'vision':
            return renderVisionStep();
        case 'features':
            return renderFeaturesStep();
        case 'research':
            return renderResearchStep();
        case 'documents':
            return renderDocumentsStep();
        default:
            return '<div>Unknown step</div>';
    }
}

function renderVisionStep() {
    return `
        <div class="max-w-3xl mx-auto">
            <div class="text-center mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">What's Your Application Vision?</h2>
                <p class="text-gray-600">Describe your application idea and I'll help you develop it into a comprehensive plan.</p>
            </div>

            <form onsubmit="processVision(event)" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Application Description</label>
                    <textarea id="visionDescription" 
                              class="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                              placeholder="Describe your application idea, target users, main problem it solves, and key value proposition..."></textarea>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                        <select id="targetAudience" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">Select primary audience</option>
                            <option value="consumers">Consumers/End Users</option>
                            <option value="business">Business Users</option>
                            <option value="developers">Developers/Technical Users</option>
                            <option value="enterprises">Enterprise Customers</option>
                            <option value="internal">Internal Teams</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Industry/Category</label>
                        <select id="industryCategory" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">Select category</option>
                            <option value="saas">SaaS/Software</option>
                            <option value="ecommerce">E-commerce</option>
                            <option value="fintech">FinTech</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="education">Education</option>
                            <option value="entertainment">Entertainment</option>
                            <option value="productivity">Productivity</option>
                            <option value="social">Social/Community</option>
                        </select>
                    </div>
                </div>

                <div class="flex justify-between">
                    <button type="button" onclick="addCopilotMessage('Let me help you brainstorm your vision. What problem does your application solve?')" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        <i class="fas fa-lightbulb mr-2"></i>
                        Get Ideas
                    </button>
                    <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Analyze Vision
                        <i class="fas fa-arrow-right ml-2"></i>
                    </button>
                </div>
            </form>
        </div>
    `;
}

function renderFeaturesStep() {
    const session = window.AgentWorksState.planning.currentSession;
    return `
        <div class="max-w-4xl mx-auto">
            <div class="text-center mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Features & Prioritization</h2>
                <p class="text-gray-600">Define your application features and prioritize them for development.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- AI Suggestions -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 class="font-semibold text-gray-900 mb-4">
                        <i class="fas fa-robot text-blue-600 mr-2"></i>
                        AI Feature Suggestions
                    </h3>
                    <div id="aiSuggestions" class="space-y-3">
                        <div class="text-sm text-gray-600">Analyzing your vision...</div>
                    </div>
                    <button onclick="generateFeatureSuggestions()" class="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Generate Suggestions
                    </button>
                </div>

                <!-- Manual Feature Addition -->
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 class="font-semibold text-gray-900 mb-4">
                        <i class="fas fa-plus text-green-600 mr-2"></i>
                        Add Custom Feature
                    </h3>
                    <form onsubmit="addCustomFeature(event)" class="space-y-4">
                        <input type="text" id="featureName" placeholder="Feature name" 
                               class="w-full p-3 border border-gray-300 rounded-lg" required>
                        <textarea id="featureDescription" placeholder="Feature description and requirements" 
                                  class="w-full h-20 p-3 border border-gray-300 rounded-lg"></textarea>
                        <select id="featurePriority" class="w-full p-3 border border-gray-300 rounded-lg">
                            <option value="high">High Priority</option>
                            <option value="medium" selected>Medium Priority</option>
                            <option value="low">Low Priority</option>
                        </select>
                        <button type="submit" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Add Feature
                        </button>
                    </form>
                </div>
            </div>

            <!-- Feature List -->
            <div class="mt-8">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-semibold text-gray-900">Feature List</h3>
                    <div class="text-sm text-gray-500">
                        Drag to reorder by priority
                    </div>
                </div>
                <div id="featureList" class="space-y-2">
                    ${session.features.length === 0 ? 
                        '<div class="text-center text-gray-500 py-8">No features added yet. Use AI suggestions or add custom features.</div>' :
                        session.features.map(renderFeatureCard).join('')
                    }
                </div>
            </div>

            <div class="flex justify-between mt-8">
                <button onclick="goToStep('vision')" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    <i class="fas fa-arrow-left mr-2"></i>
                    Back to Vision
                </button>
                <button onclick="goToStep('research')" ${session.features.length === 0 ? 'disabled' : ''} 
                        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    Continue to Research
                    <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    `;
}

function renderResearchStep() {
    return `
        <div class="max-w-4xl mx-auto">
            <div class="text-center mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Market Research & Analysis</h2>
                <p class="text-gray-600">Understand your market, competitors, and opportunities.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Market Research -->
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 class="font-semibold text-gray-900 mb-4">
                        <i class="fas fa-chart-line text-blue-600 mr-2"></i>
                        Market Analysis
                    </h3>
                    <div id="marketResearch">
                        <button onclick="performMarketResearch()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <i class="fas fa-search mr-2"></i>
                            Analyze Market
                        </button>
                    </div>
                </div>

                <!-- Competitor Analysis -->
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 class="font-semibold text-gray-900 mb-4">
                        <i class="fas fa-users text-green-600 mr-2"></i>
                        Competitor Analysis
                    </h3>
                    <div id="competitorAnalysis">
                        <button onclick="analyzeCompetitors()" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <i class="fas fa-search mr-2"></i>
                            Find Competitors
                        </button>
                    </div>
                </div>
            </div>

            <div id="researchResults" class="mt-8"></div>

            <div class="flex justify-between mt-8">
                <button onclick="goToStep('features')" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    <i class="fas fa-arrow-left mr-2"></i>
                    Back to Features
                </button>
                <button onclick="goToStep('documents')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Generate Documents
                    <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    `;
}

function renderDocumentsStep() {
    return `
        <div class="max-w-6xl mx-auto">
            <div class="text-center mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Project Documentation</h2>
                <p class="text-gray-600">Generate comprehensive project documents from your planning session.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Technical Blueprint -->
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold text-gray-900">
                            <i class="fas fa-drafting-compass text-blue-600 mr-2"></i>
                            Technical Blueprint
                        </h3>
                        <button onclick="generateBlueprint()" class="text-blue-600 hover:text-blue-700">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                    <div id="blueprintContent" class="text-sm text-gray-600">
                        Click generate to create technical blueprint
                    </div>
                </div>

                <!-- Product Requirements -->
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold text-gray-900">
                            <i class="fas fa-file-alt text-green-600 mr-2"></i>
                            Product Requirements
                        </h3>
                        <button onclick="generatePRD()" class="text-green-600 hover:text-green-700">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                    <div id="prdContent" class="text-sm text-gray-600">
                        Click generate to create PRD document
                    </div>
                </div>

                <!-- MVP Plan -->
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold text-gray-900">
                            <i class="fas fa-rocket text-purple-600 mr-2"></i>
                            MVP Plan
                        </h3>
                        <button onclick="generateMVP()" class="text-purple-600 hover:text-purple-700">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                    <div id="mvpContent" class="text-sm text-gray-600">
                        Click generate to create MVP roadmap
                    </div>
                </div>
            </div>

            <div class="mt-8">
                <div class="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                    <h3 class="font-semibold text-gray-900 mb-4">Next Steps</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onclick="createProjectFromPlanning()" class="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <i class="fas fa-project-diagram"></i>
                            Create Kanban Project
                        </button>
                        <button onclick="startUIDesign()" class="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                            <i class="fas fa-paint-brush"></i>
                            Start UI Design
                        </button>
                    </div>
                </div>
            </div>

            <div class="flex justify-between mt-8">
                <button onclick="goToStep('research')" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    <i class="fas fa-arrow-left mr-2"></i>
                    Back to Research
                </button>
                <button onclick="completePlanningSession()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Complete Session
                    <i class="fas fa-check ml-2"></i>
                </button>
            </div>
        </div>
    `;
}

function renderFeatureCard(feature, index) {
    return `
        <div class="feature-card bg-white border border-gray-200 rounded-lg p-4 cursor-move" data-index="${index}">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-grip-vertical text-gray-400"></i>
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">${feature.name}</h4>
                            <p class="text-sm text-gray-600">${feature.description}</p>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="priority-badge priority-${feature.priority}">${feature.priority}</span>
                    <button onclick="removeFeature(${index})" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Planning Module Implementation Functions
function initializePlanningModule() {
    // Initialize event listeners for cross-module integration
    AgentWorksEvents.on('planning:sessionCompleted', (session) => {
        // Auto-create project in Kanban when planning completes
        DataFlowIntegration.planningToKanban(session);
    });

    // Load any existing session
    loadExistingSession();
    updateSessionSummary();
}

async function processVision(event) {
    event.preventDefault();
    
    const description = document.getElementById('visionDescription').value;
    const audience = document.getElementById('targetAudience').value;
    const category = document.getElementById('industryCategory').value;
    
    if (!description.trim()) {
        showNotification('Please enter an application description', 'warning');
        return;
    }
    
    // Store vision data
    window.AgentWorksState.planning.currentSession.vision = {
        description,
        audience,
        category,
        timestamp: new Date().toISOString()
    };
    
    // Add CoPilot message
    addCopilotMessage(`Great! I understand your vision for ${category ? `a ${category}` : 'an'} application targeting ${audience || 'users'}. Let me analyze this and suggest some features.`);
    
    // Move to next step
    goToStep('features');
    
    showNotification('Vision captured successfully!', 'success');
}

async function generateFeatureSuggestions() {
    const suggestionsContainer = document.getElementById('aiSuggestions');
    suggestionsContainer.innerHTML = '<div class="animate-pulse text-sm text-gray-600">Generating suggestions...</div>';
    
    try {
        const vision = window.AgentWorksState.planning.currentSession.vision;
        const response = await apiCall('/planning/suggest-features', {
            method: 'POST',
            body: JSON.stringify(vision)
        });
        
        if (response.success) {
            renderFeatureSuggestions(response.features);
        } else {
            throw new Error('API failed');
        }
    } catch (error) {
        // Fallback to generated suggestions
        const fallbackFeatures = generateFallbackFeatures();
        renderFeatureSuggestions(fallbackFeatures);
    }
}

function generateFallbackFeatures() {
    const vision = window.AgentWorksState.planning.currentSession.vision;
    const category = vision?.category || 'general';
    
    const featuresByCategory = {
        'saas': [
            { name: 'User Authentication', description: 'Secure login and user management' },
            { name: 'Dashboard Analytics', description: 'Real-time metrics and reporting' },
            { name: 'API Integration', description: 'Connect with external services' },
            { name: 'Team Collaboration', description: 'Multi-user workspace features' }
        ],
        'ecommerce': [
            { name: 'Product Catalog', description: 'Comprehensive product management' },
            { name: 'Shopping Cart', description: 'Advanced cart and checkout flow' },
            { name: 'Payment Processing', description: 'Multiple payment methods support' },
            { name: 'Order Management', description: 'Order tracking and fulfillment' }
        ],
        'general': [
            { name: 'User Management', description: 'User accounts and profiles' },
            { name: 'Data Management', description: 'CRUD operations and data handling' },
            { name: 'Notifications', description: 'Email and push notifications' },
            { name: 'Search & Filtering', description: 'Advanced search capabilities' }
        ]
    };
    
    return featuresByCategory[category] || featuresByCategory.general;
}

function renderFeatureSuggestions(features) {
    const container = document.getElementById('aiSuggestions');
    container.innerHTML = features.map(feature => `
        <div class="suggestion-card bg-white border border-gray-200 rounded p-3 cursor-pointer hover:border-blue-300" 
             onclick="addSuggestedFeature('${feature.name}', '${feature.description}')">
            <div class="font-medium text-sm text-gray-900">${feature.name}</div>
            <div class="text-xs text-gray-600 mt-1">${feature.description}</div>
        </div>
    `).join('');
}

function addSuggestedFeature(name, description) {
    const session = window.AgentWorksState.planning.currentSession;
    
    // Check if already added
    if (session.features.find(f => f.name === name)) {
        showNotification('Feature already added', 'info');
        return;
    }
    
    session.features.push({
        name,
        description,
        priority: 'medium',
        source: 'ai-suggestion',
        timestamp: new Date().toISOString()
    });
    
    updateFeatureList();
    updateSessionSummary();
    showNotification(`Added feature: ${name}`, 'success');
}

function addCustomFeature(event) {
    event.preventDefault();
    
    const name = document.getElementById('featureName').value;
    const description = document.getElementById('featureDescription').value;
    const priority = document.getElementById('featurePriority').value;
    
    const session = window.AgentWorksState.planning.currentSession;
    
    session.features.push({
        name,
        description,
        priority,
        source: 'manual',
        timestamp: new Date().toISOString()
    });
    
    // Clear form
    event.target.reset();
    
    updateFeatureList();
    updateSessionSummary();
    showNotification(`Added feature: ${name}`, 'success');
}

function updateFeatureList() {
    const container = document.getElementById('featureList');
    const session = window.AgentWorksState.planning.currentSession;
    
    if (session.features.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-8">No features added yet.</div>';
        return;
    }
    
    container.innerHTML = session.features.map(renderFeatureCard).join('');
}

function removeFeature(index) {
    const session = window.AgentWorksState.planning.currentSession;
    session.features.splice(index, 1);
    updateFeatureList();
    updateSessionSummary();
}

async function performMarketResearch() {
    const container = document.getElementById('marketResearch');
    container.innerHTML = '<div class="animate-pulse text-sm">Researching market...</div>';
    
    try {
        const vision = window.AgentWorksState.planning.currentSession.vision;
        const response = await apiCall('/planning/market-research', {
            method: 'POST',
            body: JSON.stringify(vision)
        });
        
        if (response.success) {
            displayMarketResearch(response.research);
        } else {
            throw new Error('API failed');
        }
    } catch (error) {
        displayMarketResearch(generateFallbackResearch());
    }
}

function displayMarketResearch(research) {
    const container = document.getElementById('marketResearch');
    container.innerHTML = `
        <div class="space-y-3 text-sm">
            <div><strong>Market Size:</strong> ${research.marketSize}</div>
            <div><strong>Growth Rate:</strong> ${research.growthRate}</div>
            <div><strong>Key Trends:</strong></div>
            <ul class="list-disc list-inside text-gray-600 space-y-1">
                ${research.trends.map(trend => `<li>${trend}</li>`).join('')}
            </ul>
        </div>
    `;
}

function generateFallbackResearch() {
    return {
        marketSize: '$2.5B+ globally',
        growthRate: '15-20% annually',
        trends: [
            'Increasing demand for mobile-first solutions',
            'Focus on user experience and accessibility',
            'Integration with AI/ML capabilities',
            'Emphasis on data privacy and security'
        ]
    };
}

function goToStep(step) {
    window.AgentWorksState.planning.currentSession.step = step;
    document.getElementById('planningContent').innerHTML = renderPlanningStep(step);
    
    // Update progress indicators
    document.querySelectorAll('.planning-step').forEach(el => {
        el.className = 'planning-step ' + (
            el.dataset.step === step ? 'active' :
            isStepCompleted(el.dataset.step) ? 'completed' : 'pending'
        );
    });
    
    updateSessionSummary();
}

function updateSessionSummary() {
    const container = document.getElementById('sessionSummary');
    const session = window.AgentWorksState.planning.currentSession;
    
    if (!session.vision) {
        container.innerHTML = '<div class="text-sm text-gray-500">Start planning to see summary</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-3 text-sm">
            <div>
                <div class="font-medium text-gray-900">Vision</div>
                <div class="text-gray-600">${session.vision.description.substring(0, 100)}...</div>
            </div>
            <div>
                <div class="font-medium text-gray-900">Features</div>
                <div class="text-gray-600">${session.features.length} features defined</div>
            </div>
            <div>
                <div class="font-medium text-gray-900">Category</div>
                <div class="text-gray-600">${session.vision.category || 'Not specified'}</div>
            </div>
        </div>
    `;
}

function createProjectFromPlanning() {
    const session = window.AgentWorksState.planning.currentSession;
    
    if (!session.vision || session.features.length === 0) {
        showNotification('Please complete vision and features steps first', 'warning');
        return;
    }
    
    // Trigger cross-module integration
    DataFlowIntegration.planningToKanban(session);
    
    // Switch to Kanban view
    switchTab('kanban');
    
    showNotification('Project created successfully in Kanban!', 'success');
}

function startUIDesign() {
    const session = window.AgentWorksState.planning.currentSession;
    
    // Pass planning data to UI Builder
    AgentWorksEvents.emit('ui-builder:loadFromPlanning', session);
    
    // Switch to UI Builder
    switchTab('ui-builder');
    
    showNotification('Switched to UI Builder with planning data', 'success');
}

// CoPilot Functions
function addCopilotMessage(message, isUser = false) {
    const chatContainer = document.getElementById('copilotChat').querySelector('.space-y-4');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'copilot-message';
    messageDiv.innerHTML = `
        <div class="${isUser ? 'bg-gray-100 border border-gray-200' : 'bg-blue-50 border border-blue-200'} rounded-lg p-3">
            <p class="text-sm text-gray-800">${message}</p>
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleCopilotInput(event) {
    if (event.key === 'Enter') {
        sendCopilotMessage();
    }
}

function sendCopilotMessage() {
    const input = document.getElementById('copilotInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    addCopilotMessage(message, true);
    input.value = '';
    
    // Simulate AI response (in real implementation, this would call an API)
    setTimeout(() => {
        const response = generateCopilotResponse(message);
        addCopilotMessage(response);
    }, 1000);
}

function generateCopilotResponse(userMessage) {
    const responses = [
        "That's a great idea! Have you considered how users would interact with this feature?",
        "I can help you break that down into smaller, actionable features. What's the core functionality?",
        "Based on your vision, this feature would fit well in your MVP. Let me suggest some implementation approaches.",
        "That aligns perfectly with your target audience. Would you like me to research similar solutions in your industry?",
        "Excellent! This feature will add significant value. Have you thought about the technical requirements?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

// Export and utility functions
function exportPlanningSession() {
    const session = window.AgentWorksState.planning.currentSession;
    const dataStr = JSON.stringify(session, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `planning-session-${Date.now()}.json`;
    link.click();
    
    showNotification('Planning session exported successfully', 'success');
}

function resetPlanningSession() {
    if (!confirm('Are you sure you want to reset the planning session? All progress will be lost.')) {
        return;
    }
    
    window.AgentWorksState.planning.currentSession = {
        id: null,
        vision: null,
        features: [],
        research: null,
        documents: {
            blueprint: null,
            prd: null,
            mvp: null
        },
        step: 'vision'
    };
    
    // Reload planning view
    loadPlanningView();
    showNotification('Planning session reset', 'info');
}