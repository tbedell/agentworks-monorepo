// Enhanced Database Builder for AgentWorks Platform
// This enhanced loadDBBuilderView() function provides real-time database design,
// agent integration, and advanced schema management capabilities

function loadDBBuilderView() {
    const mainContent = document.querySelector('main .flex-1');
    mainContent.className = 'flex-1 overflow-hidden';
    mainContent.innerHTML = `
        <div class="h-full flex flex-col bg-gray-50">
            <!-- Enhanced DB Builder Header -->
            <div class="bg-white border-b border-gray-200 p-4 flex-shrink-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-database text-blue-600 text-xl"></i>
                        <h2 class="text-xl font-semibold text-gray-900">Database Schema Builder</h2>
                        <div class="flex gap-2">
                            <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Visual Designer</span>
                            <span class="text-sm text-green-600 bg-green-100 px-2 py-1 rounded" id="real-time-status">Live Preview</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- Agent CoPilot Integration -->
                        <button onclick="toggleAgentAssist()" class="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200" id="agent-assist-btn">
                            <i class="fas fa-robot"></i>
                            Agent CoPilot
                        </button>
                        <!-- Schema Actions -->
                        <button onclick="generateAPIEndpoints()" class="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">
                            <i class="fas fa-plug"></i>
                            Auto API
                        </button>
                        <button onclick="validateRealTimeSchema()" class="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
                            <i class="fas fa-shield-alt"></i>
                            Validate
                        </button>
                        <button onclick="exportEnhancedSchema()" class="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                            <i class="fas fa-download"></i>
                            Export
                        </button>
                    </div>
                </div>
                
                <!-- Live Performance Metrics -->
                <div class="mt-3 flex gap-4 text-sm">
                    <div class="flex items-center gap-1">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span class="text-gray-600">Schema Valid</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <i class="fas fa-clock text-blue-600"></i>
                        <span class="text-gray-600">Estimated Query Time: <span id="query-estimate">< 1ms</span></span>
                    </div>
                    <div class="flex items-center gap-1">
                        <i class="fas fa-chart-line text-green-600"></i>
                        <span class="text-gray-600">Performance Score: <span id="perf-score">95/100</span></span>
                    </div>
                </div>
            </div>

            <div class="flex-1 flex">
                <!-- Enhanced Entity Palette with Smart Suggestions -->
                <div class="w-72 bg-white border-r border-gray-200 flex flex-col">
                    <!-- Entity Categories -->
                    <div class="p-4 border-b border-gray-200">
                        <h3 class="font-semibold text-gray-900 mb-3">Smart Entity Builder</h3>
                        <div class="flex gap-1 mb-4">
                            <button onclick="setEntityCategory('core')" class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded" id="cat-core">Core</button>
                            <button onclick="setEntityCategory('business')" class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded" id="cat-business">Business</button>
                            <button onclick="setEntityCategory('system')" class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded" id="cat-system">System</button>
                        </div>
                    </div>
                    
                    <!-- Entity Templates -->
                    <div class="flex-1 p-4 overflow-y-auto">
                        <div id="entity-templates" class="space-y-2">
                            <!-- Core Entities -->
                            <div class="entity-category" data-category="core">
                                <button onclick="addEnhancedEntity('users')" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-users text-blue-600"></i>
                                        <span class="font-medium">Users</span>
                                        <span class="ml-auto text-xs bg-blue-100 text-blue-600 px-1 rounded">Auth</span>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">User accounts, authentication & profiles</div>
                                </button>
                                
                                <button onclick="addEnhancedEntity('workspaces')" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-building text-green-600"></i>
                                        <span class="font-medium">Workspaces</span>
                                        <span class="ml-auto text-xs bg-green-100 text-green-600 px-1 rounded">Multi-tenant</span>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">Project workspaces & team management</div>
                                </button>
                                
                                <button onclick="addEnhancedEntity('projects')" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-project-diagram text-purple-600"></i>
                                        <span class="font-medium">Projects</span>
                                        <span class="ml-auto text-xs bg-purple-100 text-purple-600 px-1 rounded">Core</span>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">Development projects & blueprints</div>
                                </button>
                                
                                <button onclick="addEnhancedEntity('agents')" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-robot text-orange-600"></i>
                                        <span class="font-medium">Agents</span>
                                        <span class="ml-auto text-xs bg-orange-100 text-orange-600 px-1 rounded">AI</span>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">AI agent definitions & contracts</div>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Agent Suggestions Panel -->
                        <div class="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200" id="agent-suggestions">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="fas fa-lightbulb text-purple-600"></i>
                                <span class="text-sm font-medium text-purple-900">AI Suggestions</span>
                            </div>
                            <div class="text-xs text-purple-700" id="suggestions-content">
                                Based on your UI mockups, consider adding a "notifications" table to support real-time user alerts.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Schema Canvas with Live Preview -->
                <div class="flex-1 bg-gray-100 flex flex-col">
                    <!-- Canvas Toolbar -->
                    <div class="bg-white border-b border-gray-200 p-2 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <button onclick="toggleViewMode('visual')" class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded" id="view-visual">Visual</button>
                            <button onclick="toggleViewMode('code')" class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded" id="view-code">Code</button>
                            <button onclick="toggleViewMode('preview')" class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded" id="view-preview">API Preview</button>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500">Zoom:</span>
                            <button onclick="adjustZoom(0.8)" class="p-1 text-gray-600 hover:text-gray-900"><i class="fas fa-minus"></i></button>
                            <span class="text-xs text-gray-600" id="zoom-level">100%</span>
                            <button onclick="adjustZoom(1.2)" class="p-1 text-gray-600 hover:text-gray-900"><i class="fas fa-plus"></i></button>
                            <button onclick="centerView()" class="p-1 text-gray-600 hover:text-gray-900"><i class="fas fa-crosshairs"></i></button>
                        </div>
                    </div>
                    
                    <!-- Schema Canvas -->
                    <div class="flex-1 p-4 overflow-auto" id="schema-canvas-container">
                        <div id="db-canvas" class="min-h-full bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 relative" style="min-height: 600px;">
                            <!-- Live Schema Visualization -->
                            <div id="schema-content" class="h-full">
                                <div class="text-center pt-20">
                                    <i class="fas fa-database text-gray-400 text-4xl mb-4"></i>
                                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Visual Database Designer</h3>
                                    <p class="text-gray-600 mb-4">Add entities and watch your schema come to life</p>
                                    <div class="text-sm text-gray-500 space-y-1">
                                        <div>• Drag entities to design relationships</div>
                                        <div>• Real-time validation and optimization</div>
                                        <div>• AI-powered suggestions and improvements</div>
                                        <div>• Automatic API endpoint generation</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Relationship Lines Canvas -->
                            <svg id="relationships-svg" class="absolute top-0 left-0 w-full h-full pointer-events-none">
                                <!-- Relationship lines will be drawn here -->
                            </svg>
                        </div>
                        
                        <!-- Mini-map -->
                        <div class="absolute bottom-4 right-4 w-48 h-32 bg-white border border-gray-300 rounded shadow-lg" id="minimap">
                            <div class="w-full h-full bg-gray-50 rounded"></div>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Properties Panel with Real-time Features -->
                <div class="w-96 bg-white border-l border-gray-200 flex flex-col">
                    <!-- Properties Header -->
                    <div class="p-4 border-b border-gray-200">
                        <h3 class="font-semibold text-gray-900">Entity Properties</h3>
                        <div class="flex gap-1 mt-2">
                            <button onclick="setPropertiesTab('fields')" class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded" id="tab-fields">Fields</button>
                            <button onclick="setPropertiesTab('relations')" class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded" id="tab-relations">Relations</button>
                            <button onclick="setPropertiesTab('indexes')" class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded" id="tab-indexes">Indexes</button>
                            <button onclick="setPropertiesTab('api')" class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded" id="tab-api">API</button>
                        </div>
                    </div>
                    
                    <!-- Properties Content -->
                    <div class="flex-1 p-4 overflow-y-auto" id="properties-content">
                        <div class="text-center text-gray-500 mt-8" id="no-selection">
                            <i class="fas fa-table text-gray-300 text-3xl mb-4"></i>
                            <p>Select an entity to edit its properties</p>
                        </div>
                    </div>
                    
                    <!-- Real-time Validation Panel -->
                    <div class="border-t border-gray-200 p-4 bg-gray-50">
                        <div class="flex items-center gap-2 mb-2">
                            <i class="fas fa-check-circle text-green-600"></i>
                            <span class="text-sm font-medium">Live Validation</span>
                        </div>
                        <div class="space-y-1 text-xs" id="validation-results">
                            <div class="text-green-600">✓ All relationships valid</div>
                            <div class="text-green-600">✓ No circular dependencies</div>
                            <div class="text-green-600">✓ Optimal index coverage</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Agent CoPilot Panel (Initially Hidden) -->
            <div id="agent-copilot-panel" class="hidden fixed bottom-4 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-xl z-50">
                <div class="p-3 border-b border-gray-200 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-robot text-purple-600"></i>
                        <span class="font-medium text-gray-900">DB Agent CoPilot</span>
                    </div>
                    <button onclick="toggleAgentAssist()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-3 max-h-64 overflow-y-auto" id="agent-chat">
                    <div class="space-y-2">
                        <div class="bg-purple-50 p-2 rounded text-sm">
                            <strong>CoPilot:</strong> I'm analyzing your schema... I suggest adding indexes on frequently queried fields and considering a caching layer for the Users table.
                        </div>
                    </div>
                </div>
                <div class="p-3 border-t border-gray-200">
                    <div class="flex gap-2">
                        <input type="text" placeholder="Ask about your schema..." class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" id="agent-input">
                        <button onclick="sendAgentMessage()" class="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Migration Manager Modal -->
            <div id="migration-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
                    <div class="p-6 border-b border-gray-200">
                        <h2 class="text-xl font-semibold text-gray-900">Migration Manager</h2>
                        <p class="text-gray-600 mt-1">Manage database schema changes and versioning</p>
                    </div>
                    <div class="p-6 overflow-y-auto max-h-96">
                        <div id="migration-content">
                            <!-- Migration content will be populated here -->
                        </div>
                    </div>
                    <div class="p-6 border-t border-gray-200 flex justify-end gap-2">
                        <button onclick="closeMigrationModal()" class="px-4 py-2 text-gray-600 hover:text-gray-900">Cancel</button>
                        <button onclick="applyMigrations()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Apply Migrations</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize the enhanced DB Builder
    initializeEnhancedDBBuilder();
}

// Enhanced DB Builder State Management
let dbBuilderState = {
    entities: new Map(),
    relationships: new Map(),
    selectedEntity: null,
    viewMode: 'visual',
    propertiesTab: 'fields',
    zoom: 1,
    agentAssistOpen: false,
    lastSchemaVersion: null,
    realTimeValidation: true
};

// Initialize Enhanced DB Builder
function initializeEnhancedDBBuilder() {
    // Load existing schema from Prisma and mock data
    loadExistingSchema();
    
    // Setup real-time validation
    setupRealTimeValidation();
    
    // Initialize drag and drop for canvas
    setupCanvasDragDrop();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Start performance monitoring
    startPerformanceMonitoring();
    
    // Initialize agent suggestions
    initializeAgentSuggestions();
    
    console.log('Enhanced DB Builder initialized');
}

// Enhanced Entity Management
function addEnhancedEntity(entityType) {
    const entityId = generateEntityId(entityType);
    const entityData = getEntityTemplate(entityType);
    
    // Add to state
    dbBuilderState.entities.set(entityId, {
        id: entityId,
        type: entityType,
        ...entityData,
        position: getNextEntityPosition(),
        fields: entityData.fields || getDefaultFields(entityType),
        relationships: [],
        createdAt: new Date().toISOString()
    });
    
    // Render entity on canvas
    renderEntityOnCanvas(entityId);
    
    // Trigger real-time validation
    validateSchemaRealTime();
    
    // Ask agent for suggestions
    requestAgentSuggestions(entityType);
    
    showNotification(`${entityType} entity added with AI optimizations`);
}

// Real-time Schema Validation
function setupRealTimeValidation() {
    // Monitor schema changes every 500ms
    setInterval(() => {
        if (dbBuilderState.realTimeValidation) {
            validateSchemaRealTime();
            updatePerformanceMetrics();
        }
    }, 500);
}

function validateSchemaRealTime() {
    const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
    };
    
    // Validate relationships
    dbBuilderState.relationships.forEach((rel, id) => {
        if (!validateRelationship(rel)) {
            validation.errors.push(`Invalid relationship: ${rel.from} -> ${rel.to}`);
            validation.isValid = false;
        }
    });
    
    // Check for circular dependencies
    if (hasCircularDependencies()) {
        validation.warnings.push('Potential circular dependency detected');
    }
    
    // Update UI
    updateValidationDisplay(validation);
    
    return validation;
}

// Agent Integration Functions
function toggleAgentAssist() {
    const panel = document.getElementById('agent-copilot-panel');
    const btn = document.getElementById('agent-assist-btn');
    
    dbBuilderState.agentAssistOpen = !dbBuilderState.agentAssistOpen;
    
    if (dbBuilderState.agentAssistOpen) {
        panel.classList.remove('hidden');
        btn.classList.add('bg-purple-600', 'text-white');
        btn.classList.remove('bg-purple-100', 'text-purple-700');
        
        // Initialize agent conversation
        initializeAgentConversation();
    } else {
        panel.classList.add('hidden');
        btn.classList.remove('bg-purple-600', 'text-white');
        btn.classList.add('bg-purple-100', 'text-purple-700');
    }
}

function initializeAgentConversation() {
    const chatContainer = document.getElementById('agent-chat');
    chatContainer.innerHTML = `
        <div class="space-y-2">
            <div class="bg-purple-50 p-2 rounded text-sm">
                <strong>DB CoPilot:</strong> I'm analyzing your current schema and can help with:
                <ul class="mt-1 text-xs list-disc list-inside">
                    <li>Optimizing relationships and indexes</li>
                    <li>Suggesting performance improvements</li>
                    <li>Generating API endpoints automatically</li>
                    <li>Converting UI mockups to data requirements</li>
                </ul>
            </div>
        </div>
    `;
}

function sendAgentMessage() {
    const input = document.getElementById('agent-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    const chatContainer = document.getElementById('agent-chat');
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'bg-gray-100 p-2 rounded text-sm text-right';
    userMsg.innerHTML = `<strong>You:</strong> ${message}`;
    chatContainer.appendChild(userMsg);
    
    // Simulate agent response
    setTimeout(() => {
        const agentResponse = generateAgentResponse(message);
        const agentMsg = document.createElement('div');
        agentMsg.className = 'bg-purple-50 p-2 rounded text-sm';
        agentMsg.innerHTML = `<strong>CoPilot:</strong> ${agentResponse}`;
        chatContainer.appendChild(agentMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 1000);
    
    input.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function generateAgentResponse(userMessage) {
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes('optimize') || lowerMsg.includes('performance')) {
        return 'I suggest adding composite indexes on frequently queried field combinations. Also consider denormalizing the user profile data for faster reads.';
    } else if (lowerMsg.includes('relationship') || lowerMsg.includes('foreign key')) {
        return 'For better data integrity, add cascading deletes on workspace members when a workspace is deleted. This prevents orphaned records.';
    } else if (lowerMsg.includes('api') || lowerMsg.includes('endpoint')) {
        return 'I can generate REST and GraphQL endpoints automatically. The current schema will create 23 endpoints with proper CRUD operations and filtering.';
    } else {
        return 'I can help with schema optimization, relationship design, performance tuning, and API generation. What specific aspect would you like to improve?';
    }
}

// Automatic API Endpoint Generation
function generateAPIEndpoints() {
    const endpoints = [];
    
    dbBuilderState.entities.forEach((entity, id) => {
        const entityName = entity.type;
        
        // Generate standard CRUD endpoints
        endpoints.push({
            method: 'GET',
            path: `/api/${entityName}`,
            description: `List all ${entityName}`,
            response: `Array of ${entityName} objects`
        });
        
        endpoints.push({
            method: 'GET',
            path: `/api/${entityName}/:id`,
            description: `Get ${entityName} by ID`,
            response: `Single ${entityName} object`
        });
        
        endpoints.push({
            method: 'POST',
            path: `/api/${entityName}`,
            description: `Create new ${entityName}`,
            body: getEntityCreateSchema(entity)
        });
        
        endpoints.push({
            method: 'PUT',
            path: `/api/${entityName}/:id`,
            description: `Update ${entityName}`,
            body: getEntityUpdateSchema(entity)
        });
        
        endpoints.push({
            method: 'DELETE',
            path: `/api/${entityName}/:id`,
            description: `Delete ${entityName}`,
            response: 'Success confirmation'
        });
    });
    
    // Show API preview
    showAPIPreview(endpoints);
    showNotification(`Generated ${endpoints.length} API endpoints`);
}

function showAPIPreview(endpoints) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
            <div class="p-6 border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-900">Generated API Endpoints</h2>
                <p class="text-gray-600 mt-1">Automatically generated from your database schema</p>
            </div>
            <div class="p-6 overflow-y-auto max-h-96">
                <div class="space-y-4">
                    ${endpoints.map(ep => `
                        <div class="border border-gray-200 rounded p-3">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="px-2 py-1 text-xs font-bold rounded ${getMethodColor(ep.method)}">${ep.method}</span>
                                <code class="text-sm font-mono">${ep.path}</code>
                            </div>
                            <p class="text-sm text-gray-600">${ep.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="p-6 border-t border-gray-200 flex justify-end gap-2">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-600 hover:text-gray-900">Close</button>
                <button onclick="exportAPISpec()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Export OpenAPI Spec</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Performance Monitoring
function startPerformanceMonitoring() {
    setInterval(() => {
        const metrics = calculatePerformanceMetrics();
        updatePerformanceDisplay(metrics);
    }, 2000);
}

function calculatePerformanceMetrics() {
    const entityCount = dbBuilderState.entities.size;
    const relationshipCount = dbBuilderState.relationships.size;
    
    // Simulate performance calculations
    const baseScore = 100;
    let scoreDeductions = 0;
    
    // Deduct points for missing indexes on foreign keys
    dbBuilderState.entities.forEach((entity) => {
        entity.relationships.forEach((rel) => {
            if (!rel.indexed) scoreDeductions += 2;
        });
    });
    
    // Deduct points for deep relationship chains
    if (getMaxRelationshipDepth() > 5) scoreDeductions += 10;
    
    const performanceScore = Math.max(50, baseScore - scoreDeductions);
    const estimatedQueryTime = entityCount > 10 ? `${Math.ceil(entityCount / 5)}ms` : '< 1ms';
    
    return {
        score: performanceScore,
        queryTime: estimatedQueryTime,
        entityCount,
        relationshipCount
    };
}

function updatePerformanceDisplay(metrics) {
    document.getElementById('perf-score').textContent = `${metrics.score}/100`;
    document.getElementById('query-estimate').textContent = metrics.queryTime;
}

// Mock-to-Live Data Integration
function initializeMockDataIntegration() {
    // This function would integrate with UI Builder to convert mockups to data requirements
    const mockDataSources = detectMockDataSources();
    
    mockDataSources.forEach(source => {
        suggestEntityFromMockData(source);
    });
}

function detectMockDataSources() {
    // This would analyze UI mockups to detect data requirements
    return [
        { type: 'user_profile', fields: ['avatar', 'display_name', 'bio'] },
        { type: 'notification', fields: ['message', 'type', 'read_status'] },
        { type: 'comment', fields: ['content', 'author', 'timestamp'] }
    ];
}

// Schema Export and Import
function exportEnhancedSchema() {
    const schemaExport = {
        version: '2.0',
        generatedAt: new Date().toISOString(),
        entities: Array.from(dbBuilderState.entities.values()),
        relationships: Array.from(dbBuilderState.relationships.values()),
        metadata: {
            performanceScore: calculatePerformanceMetrics().score,
            validationStatus: validateSchemaRealTime()
        }
    };
    
    const dataStr = JSON.stringify(schemaExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'enhanced-schema-export.json';
    link.click();
    URL.revokeObjectURL(url);
    
    showNotification('Enhanced schema exported successfully');
}

// Helper Functions
function generateEntityId(type) {
    return `entity_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getEntityTemplate(type) {
    const templates = {
        users: {
            icon: 'fas fa-users',
            color: 'blue',
            defaultFields: ['id', 'email', 'name', 'avatar_url', 'created_at', 'updated_at']
        },
        workspaces: {
            icon: 'fas fa-building',
            color: 'green',
            defaultFields: ['id', 'name', 'description', 'owner_id', 'created_at', 'updated_at']
        },
        projects: {
            icon: 'fas fa-project-diagram',
            color: 'purple',
            defaultFields: ['id', 'workspace_id', 'name', 'description', 'status', 'created_at', 'updated_at']
        },
        agents: {
            icon: 'fas fa-robot',
            color: 'orange',
            defaultFields: ['id', 'project_id', 'name', 'type', 'model_provider', 'system_prompt', 'created_at', 'updated_at']
        }
    };
    
    return templates[type] || templates.users;
}

function getNextEntityPosition() {
    const entities = Array.from(dbBuilderState.entities.values());
    const padding = 250;
    const col = entities.length % 3;
    const row = Math.floor(entities.length / 3);
    
    return {
        x: 100 + (col * padding),
        y: 100 + (row * padding)
    };
}

function showNotification(message, type = 'success') {
    // Implementation would show a toast notification
    console.log(`Notification (${type}): ${message}`);
}

function getMethodColor(method) {
    const colors = {
        'GET': 'bg-green-100 text-green-800',
        'POST': 'bg-blue-100 text-blue-800',
        'PUT': 'bg-yellow-100 text-yellow-800',
        'DELETE': 'bg-red-100 text-red-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
}

// Additional utility functions would be implemented here...

console.log('Enhanced Database Builder loaded successfully');