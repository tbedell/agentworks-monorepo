/**
 * AgentWorks Agent Coordination System
 * 
 * Comprehensive agent deployment and coordination system for the AgentWorks platform.
 * Manages agent lifecycle, cross-module communication, task orchestration, and monitoring.
 * 
 * @version 1.0.0
 * @author AgentWorks Team
 */

// Core Agent Coordination System
window.AgentCoordinator = {
    // Core system state
    state: {
        registry: new Map(),
        activeAgents: new Map(),
        taskQueue: [],
        workflows: new Map(),
        monitoring: {
            performance: new Map(),
            errors: [],
            status: 'healthy'
        },
        config: {
            maxConcurrentAgents: 50,
            heartbeatInterval: 5000,
            maxRetries: 3,
            timeoutMs: 30000
        }
    },

    // Initialize the coordination system
    async initialize() {
        console.log('🤖 Initializing AgentWorks Agent Coordination System...');
        
        try {
            // Register core agent types
            await this.registerCoreAgents();
            
            // Initialize monitoring
            this.initializeMonitoring();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start background processes
            this.startBackgroundProcesses();
            
            console.log('✅ Agent Coordination System initialized successfully');
            
            // Emit initialization complete event
            AgentWorksEvents.emit('agents:systemReady', {
                timestamp: new Date().toISOString(),
                registeredAgents: this.getRegisteredAgentTypes()
            });
            
            return { success: true, message: 'System initialized' };
        } catch (error) {
            console.error('❌ Failed to initialize Agent Coordination System:', error);
            return { success: false, error: error.message };
        }
    },

    // Agent Registry Management
    async registerAgent(agentDefinition) {
        try {
            const {
                type,
                name,
                description,
                capabilities,
                module,
                implementation,
                config = {}
            } = agentDefinition;

            // Validate agent definition
            if (!type || !name || !implementation) {
                throw new Error('Invalid agent definition: type, name, and implementation are required');
            }

            const agentId = `${module}_${type}_${Date.now()}`;
            
            const agent = {
                id: agentId,
                type,
                name,
                description,
                module,
                capabilities: capabilities || [],
                implementation,
                config: {
                    ...this.state.config,
                    ...config
                },
                status: 'registered',
                createdAt: new Date().toISOString(),
                metadata: {
                    version: '1.0.0',
                    author: 'AgentWorks',
                    lastUpdated: new Date().toISOString()
                }
            };

            this.state.registry.set(agentId, agent);
            
            console.log(`📝 Agent registered: ${name} (${type})`);
            
            // Emit registration event
            AgentWorksEvents.emit('agents:registered', agent);
            
            return { success: true, agentId, agent };
        } catch (error) {
            console.error('Failed to register agent:', error);
            return { success: false, error: error.message };
        }
    },

    // Agent Deployment
    async deployAgent(agentId, taskContext = {}) {
        try {
            const agentDefinition = this.state.registry.get(agentId);
            if (!agentDefinition) {
                throw new Error(`Agent not found: ${agentId}`);
            }

            // Check deployment limits
            if (this.state.activeAgents.size >= this.state.config.maxConcurrentAgents) {
                throw new Error('Maximum concurrent agents limit reached');
            }

            // Create agent instance
            const agentInstance = {
                id: `${agentId}_${Date.now()}`,
                definition: agentDefinition,
                status: 'initializing',
                deployedAt: new Date().toISOString(),
                taskContext,
                performance: {
                    startTime: Date.now(),
                    tasksCompleted: 0,
                    errors: 0,
                    avgResponseTime: 0
                },
                capabilities: new Set(agentDefinition.capabilities),
                communicationChannels: [],
                healthCheck: {
                    lastHeartbeat: Date.now(),
                    isHealthy: true,
                    consecutiveFailures: 0
                }
            };

            // Initialize the agent
            const implementation = agentDefinition.implementation;
            if (typeof implementation.initialize === 'function') {
                await implementation.initialize(agentInstance, taskContext);
            }

            agentInstance.status = 'active';
            this.state.activeAgents.set(agentInstance.id, agentInstance);

            console.log(`🚀 Agent deployed: ${agentDefinition.name} (${agentInstance.id})`);
            
            // Emit deployment event
            AgentWorksEvents.emit('agents:deployed', agentInstance);
            
            // Start monitoring for this agent
            this.startAgentMonitoring(agentInstance.id);
            
            return { success: true, instanceId: agentInstance.id, agent: agentInstance };
        } catch (error) {
            console.error('Failed to deploy agent:', error);
            return { success: false, error: error.message };
        }
    },

    // Task Execution
    async executeTask(agentId, task) {
        try {
            const agent = this.state.activeAgents.get(agentId);
            if (!agent) {
                throw new Error(`Active agent not found: ${agentId}`);
            }

            if (agent.status !== 'active') {
                throw new Error(`Agent is not in active state: ${agent.status}`);
            }

            const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const taskExecution = {
                id: taskId,
                agentId,
                task,
                status: 'executing',
                startTime: Date.now(),
                retries: 0
            };

            // Add to task queue for monitoring
            this.state.taskQueue.push(taskExecution);

            console.log(`📋 Executing task ${taskId} on agent ${agent.definition.name}`);
            
            // Update agent status
            agent.status = 'busy';
            agent.currentTask = taskExecution;

            // Execute the task
            const implementation = agent.definition.implementation;
            let result;

            if (typeof implementation.execute === 'function') {
                result = await this.executeWithTimeout(
                    implementation.execute(task, agent),
                    agent.definition.config.timeoutMs
                );
            } else {
                throw new Error('Agent implementation missing execute method');
            }

            // Update task execution
            taskExecution.status = 'completed';
            taskExecution.endTime = Date.now();
            taskExecution.duration = taskExecution.endTime - taskExecution.startTime;
            taskExecution.result = result;

            // Update agent performance metrics
            agent.performance.tasksCompleted++;
            agent.performance.avgResponseTime = 
                (agent.performance.avgResponseTime + taskExecution.duration) / 2;
            agent.status = 'active';
            delete agent.currentTask;

            console.log(`✅ Task completed: ${taskId} (${taskExecution.duration}ms)`);
            
            // Emit task completion event
            AgentWorksEvents.emit('agents:taskCompleted', {
                taskId,
                agentId,
                result,
                duration: taskExecution.duration
            });

            return { success: true, taskId, result, duration: taskExecution.duration };
        } catch (error) {
            console.error('Task execution failed:', error);
            
            // Update error metrics
            const agent = this.state.activeAgents.get(agentId);
            if (agent) {
                agent.performance.errors++;
                agent.status = 'error';
                agent.lastError = error.message;
            }

            // Emit error event
            AgentWorksEvents.emit('agents:taskError', {
                agentId,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            return { success: false, error: error.message };
        }
    },

    // Cross-Module Communication
    async sendMessage(fromAgentId, toAgentId, message, options = {}) {
        try {
            const fromAgent = this.state.activeAgents.get(fromAgentId);
            const toAgent = this.state.activeAgents.get(toAgentId);

            if (!fromAgent || !toAgent) {
                throw new Error('One or both agents not found');
            }

            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const messagePayload = {
                id: messageId,
                from: fromAgentId,
                to: toAgentId,
                message,
                timestamp: new Date().toISOString(),
                options
            };

            // Handle different message types
            if (options.broadcast) {
                // Broadcast to all agents in the same module
                return await this.broadcastToModule(toAgent.definition.module, messagePayload);
            } else if (options.type === 'request') {
                // Request-response pattern
                return await this.sendRequest(messagePayload);
            } else {
                // Direct message
                return await this.deliverMessage(messagePayload);
            }
        } catch (error) {
            console.error('Message sending failed:', error);
            return { success: false, error: error.message };
        }
    },

    // Workflow Orchestration
    async createWorkflow(workflowDefinition) {
        try {
            const {
                name,
                description,
                steps,
                parallelExecution = false,
                retryPolicy = { maxRetries: 3, backoff: 'exponential' }
            } = workflowDefinition;

            const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const workflow = {
                id: workflowId,
                name,
                description,
                steps,
                parallelExecution,
                retryPolicy,
                status: 'created',
                createdAt: new Date().toISOString(),
                progress: {
                    totalSteps: steps.length,
                    completedSteps: 0,
                    currentStep: 0,
                    errors: []
                },
                results: []
            };

            this.state.workflows.set(workflowId, workflow);
            
            console.log(`📊 Workflow created: ${name} (${workflowId})`);
            
            AgentWorksEvents.emit('workflows:created', workflow);
            
            return { success: true, workflowId, workflow };
        } catch (error) {
            console.error('Failed to create workflow:', error);
            return { success: false, error: error.message };
        }
    },

    async executeWorkflow(workflowId) {
        try {
            const workflow = this.state.workflows.get(workflowId);
            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            workflow.status = 'executing';
            workflow.startTime = Date.now();
            
            console.log(`🔄 Executing workflow: ${workflow.name}`);

            if (workflow.parallelExecution) {
                await this.executeWorkflowParallel(workflow);
            } else {
                await this.executeWorkflowSequential(workflow);
            }

            workflow.status = 'completed';
            workflow.endTime = Date.now();
            workflow.duration = workflow.endTime - workflow.startTime;

            console.log(`✅ Workflow completed: ${workflow.name} (${workflow.duration}ms)`);
            
            AgentWorksEvents.emit('workflows:completed', workflow);
            
            return { success: true, workflow };
        } catch (error) {
            console.error('Workflow execution failed:', error);
            
            const workflow = this.state.workflows.get(workflowId);
            if (workflow) {
                workflow.status = 'failed';
                workflow.error = error.message;
            }
            
            AgentWorksEvents.emit('workflows:failed', { workflowId, error: error.message });
            
            return { success: false, error: error.message };
        }
    },

    // Agent Health Monitoring
    startAgentMonitoring(agentId) {
        const agent = this.state.activeAgents.get(agentId);
        if (!agent) return;

        const monitoringInterval = setInterval(async () => {
            try {
                // Perform health check
                const isHealthy = await this.performHealthCheck(agent);
                
                agent.healthCheck.lastHeartbeat = Date.now();
                agent.healthCheck.isHealthy = isHealthy;

                if (!isHealthy) {
                    agent.healthCheck.consecutiveFailures++;
                    
                    // Auto-recovery attempt
                    if (agent.healthCheck.consecutiveFailures >= 3) {
                        console.warn(`🚨 Agent ${agentId} failing health checks, attempting recovery`);
                        await this.attemptAgentRecovery(agentId);
                    }
                } else {
                    agent.healthCheck.consecutiveFailures = 0;
                }

                // Update performance metrics
                this.state.monitoring.performance.set(agentId, {
                    cpu: Math.random() * 100, // Simulated metrics
                    memory: Math.random() * 100,
                    responseTime: agent.performance.avgResponseTime,
                    tasksCompleted: agent.performance.tasksCompleted,
                    errorRate: agent.performance.errors / Math.max(agent.performance.tasksCompleted, 1),
                    isHealthy,
                    lastUpdate: Date.now()
                });

            } catch (error) {
                console.error(`Monitoring error for agent ${agentId}:`, error);
                this.state.monitoring.errors.push({
                    agentId,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }, this.state.config.heartbeatInterval);

        // Store the interval ID for cleanup
        agent.monitoringInterval = monitoringInterval;
    },

    // Agent Lifecycle Management
    async terminateAgent(agentId, reason = 'manual') {
        try {
            const agent = this.state.activeAgents.get(agentId);
            if (!agent) {
                throw new Error(`Agent not found: ${agentId}`);
            }

            console.log(`🛑 Terminating agent: ${agent.definition.name} (${reason})`);

            // Stop monitoring
            if (agent.monitoringInterval) {
                clearInterval(agent.monitoringInterval);
            }

            // Call cleanup if available
            const implementation = agent.definition.implementation;
            if (typeof implementation.cleanup === 'function') {
                await implementation.cleanup(agent);
            }

            // Update status
            agent.status = 'terminated';
            agent.terminatedAt = new Date().toISOString();
            agent.terminationReason = reason;

            // Remove from active agents
            this.state.activeAgents.delete(agentId);
            
            // Clean up monitoring data
            this.state.monitoring.performance.delete(agentId);

            AgentWorksEvents.emit('agents:terminated', {
                agentId,
                reason,
                timestamp: agent.terminatedAt
            });

            return { success: true, message: 'Agent terminated successfully' };
        } catch (error) {
            console.error('Failed to terminate agent:', error);
            return { success: false, error: error.message };
        }
    },

    // System Status and Monitoring
    getSystemStatus() {
        const activeAgents = Array.from(this.state.activeAgents.values());
        const registeredAgents = Array.from(this.state.registry.values());
        
        return {
            system: {
                status: this.state.monitoring.status,
                uptime: Date.now() - (this.state.startTime || Date.now()),
                version: '1.0.0'
            },
            agents: {
                total: registeredAgents.length,
                active: activeAgents.length,
                byModule: this.getAgentsByModule(),
                byStatus: this.getAgentsByStatus()
            },
            performance: {
                totalTasksCompleted: activeAgents.reduce((sum, a) => sum + a.performance.tasksCompleted, 0),
                avgResponseTime: activeAgents.reduce((sum, a) => sum + a.performance.avgResponseTime, 0) / Math.max(activeAgents.length, 1),
                errorRate: activeAgents.reduce((sum, a) => sum + a.performance.errors, 0) / Math.max(activeAgents.reduce((sum, a) => sum + a.performance.tasksCompleted, 0), 1)
            },
            workflows: {
                total: this.state.workflows.size,
                active: Array.from(this.state.workflows.values()).filter(w => w.status === 'executing').length,
                completed: Array.from(this.state.workflows.values()).filter(w => w.status === 'completed').length
            }
        };
    },

    // Helper Methods
    async executeWithTimeout(promise, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            promise
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    },

    getAgentsByModule() {
        const byModule = {};
        this.state.activeAgents.forEach(agent => {
            const module = agent.definition.module;
            byModule[module] = (byModule[module] || 0) + 1;
        });
        return byModule;
    },

    getAgentsByStatus() {
        const byStatus = {};
        this.state.activeAgents.forEach(agent => {
            const status = agent.status;
            byStatus[status] = (byStatus[status] || 0) + 1;
        });
        return byStatus;
    },

    getRegisteredAgentTypes() {
        return Array.from(this.state.registry.values()).map(agent => ({
            type: agent.type,
            name: agent.name,
            module: agent.module
        }));
    },

    async performHealthCheck(agent) {
        try {
            // Basic health checks
            const now = Date.now();
            const timeSinceLastTask = now - (agent.performance.startTime || now);
            
            // Check if agent is responsive
            if (agent.status === 'error') return false;
            if (timeSinceLastTask > 300000) return false; // 5 minutes
            
            // Custom health check if available
            const implementation = agent.definition.implementation;
            if (typeof implementation.healthCheck === 'function') {
                return await implementation.healthCheck(agent);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    },

    async attemptAgentRecovery(agentId) {
        try {
            const agent = this.state.activeAgents.get(agentId);
            if (!agent) return false;

            console.log(`🔧 Attempting recovery for agent ${agentId}`);

            // Try custom recovery method first
            const implementation = agent.definition.implementation;
            if (typeof implementation.recover === 'function') {
                const recovered = await implementation.recover(agent);
                if (recovered) {
                    agent.status = 'active';
                    agent.healthCheck.consecutiveFailures = 0;
                    return true;
                }
            }

            // Default recovery: restart agent
            await this.terminateAgent(agentId, 'recovery');
            const deployment = await this.deployAgent(agent.definition.id, agent.taskContext);
            
            return deployment.success;
        } catch (error) {
            console.error('Agent recovery failed:', error);
            return false;
        }
    },

    // Workflow execution helpers
    async executeWorkflowSequential(workflow) {
        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];
            workflow.progress.currentStep = i;
            
            try {
                const result = await this.executeWorkflowStep(step);
                workflow.results.push(result);
                workflow.progress.completedSteps++;
                
                AgentWorksEvents.emit('workflows:stepCompleted', {
                    workflowId: workflow.id,
                    stepIndex: i,
                    result
                });
            } catch (error) {
                workflow.progress.errors.push({
                    step: i,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
        }
    },

    async executeWorkflowParallel(workflow) {
        const promises = workflow.steps.map(async (step, index) => {
            try {
                const result = await this.executeWorkflowStep(step);
                workflow.progress.completedSteps++;
                return { index, result, success: true };
            } catch (error) {
                workflow.progress.errors.push({
                    step: index,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                return { index, error: error.message, success: false };
            }
        });

        const results = await Promise.all(promises);
        workflow.results = results.sort((a, b) => a.index - b.index);
    },

    async executeWorkflowStep(step) {
        const { agentType, task, config = {} } = step;
        
        // Find or deploy suitable agent
        let agentId = this.findAvailableAgent(agentType);
        if (!agentId) {
            const deployment = await this.deployAgentForType(agentType);
            if (!deployment.success) {
                throw new Error(`Failed to deploy agent for type: ${agentType}`);
            }
            agentId = deployment.instanceId;
        }

        // Execute task
        return await this.executeTask(agentId, { ...task, config });
    },

    findAvailableAgent(agentType) {
        for (const [id, agent] of this.state.activeAgents) {
            if (agent.definition.type === agentType && agent.status === 'active') {
                return id;
            }
        }
        return null;
    },

    async deployAgentForType(agentType) {
        // Find agent definition by type
        for (const [id, agent] of this.state.registry) {
            if (agent.type === agentType) {
                return await this.deployAgent(id);
            }
        }
        throw new Error(`No registered agent found for type: ${agentType}`);
    },

    // Communication helpers
    async deliverMessage(messagePayload) {
        const toAgent = this.state.activeAgents.get(messagePayload.to);
        if (!toAgent) {
            throw new Error(`Target agent not found: ${messagePayload.to}`);
        }

        const implementation = toAgent.definition.implementation;
        if (typeof implementation.handleMessage === 'function') {
            await implementation.handleMessage(messagePayload, toAgent);
        }

        AgentWorksEvents.emit('agents:messageDelivered', messagePayload);
        return { success: true, messageId: messagePayload.id };
    },

    async broadcastToModule(module, messagePayload) {
        const targetAgents = Array.from(this.state.activeAgents.values())
            .filter(agent => agent.definition.module === module);

        const results = await Promise.all(
            targetAgents.map(agent => 
                this.deliverMessage({ ...messagePayload, to: agent.id })
            )
        );

        return { success: true, deliveredTo: targetAgents.length, results };
    },

    async sendRequest(messagePayload) {
        // Implement request-response pattern
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, 10000);

            const responseHandler = (response) => {
                if (response.requestId === messagePayload.id) {
                    clearTimeout(timeout);
                    AgentWorksEvents.off('agents:messageResponse', responseHandler);
                    resolve(response);
                }
            };

            AgentWorksEvents.on('agents:messageResponse', responseHandler);
            this.deliverMessage(messagePayload);
        });
    },

    // Background processes
    startBackgroundProcesses() {
        this.state.startTime = Date.now();

        // System health monitoring
        setInterval(() => {
            this.performSystemHealthCheck();
        }, 30000); // Every 30 seconds

        // Cleanup terminated agents
        setInterval(() => {
            this.cleanupTerminatedAgents();
        }, 60000); // Every minute

        // Performance optimization
        setInterval(() => {
            this.optimizeSystem();
        }, 300000); // Every 5 minutes
    },

    performSystemHealthCheck() {
        const activeAgents = this.state.activeAgents.size;
        const errors = this.state.monitoring.errors.length;
        
        // Determine system health
        if (errors > 10) {
            this.state.monitoring.status = 'degraded';
        } else if (activeAgents === 0) {
            this.state.monitoring.status = 'idle';
        } else {
            this.state.monitoring.status = 'healthy';
        }

        // Clear old errors (keep last 100)
        if (this.state.monitoring.errors.length > 100) {
            this.state.monitoring.errors = this.state.monitoring.errors.slice(-100);
        }
    },

    cleanupTerminatedAgents() {
        // Clean up monitoring data for agents terminated more than 1 hour ago
        const cutoff = Date.now() - (60 * 60 * 1000);
        
        for (const [agentId, performance] of this.state.monitoring.performance) {
            if (performance.lastUpdate < cutoff) {
                this.state.monitoring.performance.delete(agentId);
            }
        }
    },

    optimizeSystem() {
        // Auto-terminate idle agents
        const idleCutoff = Date.now() - (15 * 60 * 1000); // 15 minutes
        
        for (const [agentId, agent] of this.state.activeAgents) {
            if (agent.healthCheck.lastHeartbeat < idleCutoff && agent.status === 'active') {
                this.terminateAgent(agentId, 'idle_timeout');
            }
        }
    },

    // Event system integration
    setupEventListeners() {
        // Listen for cross-module events
        AgentWorksEvents.on('agents:deployRequired', async (data) => {
            const { agents, workflow } = data;
            
            for (const agentReq of agents) {
                try {
                    await this.deployAgentForType(agentReq.type);
                } catch (error) {
                    console.error(`Failed to deploy required agent ${agentReq.type}:`, error);
                }
            }
        });

        // Listen for module-specific agent requests
        AgentWorksEvents.on('planning:needsAgent', async (data) => {
            await this.deployAgentForType('planning-agent');
        });

        AgentWorksEvents.on('ui:needsAgent', async (data) => {
            await this.deployAgentForType('ui-design-agent');
        });

        AgentWorksEvents.on('database:needsAgent', async (data) => {
            await this.deployAgentForType('database-agent');
        });

        AgentWorksEvents.on('workflow:needsAgent', async (data) => {
            await this.deployAgentForType('workflow-agent');
        });

        AgentWorksEvents.on('test:needsAgent', async (data) => {
            await this.deployAgentForType('test-agent');
        });
    },

    // Core agent registration
    async registerCoreAgents() {
        const coreAgents = [
            await this.createPlanningAgent(),
            await this.createUIDesignAgent(),
            await this.createDatabaseAgent(),
            await this.createWorkflowAgent(),
            await this.createTestAgent(),
            await this.createMonitoringAgent(),
            await this.createIntegrationAgent()
        ];

        for (const agent of coreAgents) {
            await this.registerAgent(agent);
        }

        console.log(`📝 Registered ${coreAgents.length} core agents`);
    },

    initializeMonitoring() {
        // Initialize monitoring dashboard
        this.state.monitoring.dashboard = {
            startTime: Date.now(),
            metrics: {
                requestsPerSecond: 0,
                avgResponseTime: 0,
                errorRate: 0,
                activeConnections: 0
            },
            alerts: []
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentCoordinator;
}