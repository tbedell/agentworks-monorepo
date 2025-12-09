import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Lightbulb,
  FileText,
  Target,
  Users,
  Settings,
  CheckCircle,
  Circle,
  Play,
  Clock,
  Bot,
  Sparkles,
  Loader2,
  CheckCheck
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useCoPilot } from '../../contexts/CoPilotContext';

interface PlanningStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  icon: React.ComponentType<any>;
}

const PLANNING_STEPS: PlanningStep[] = [
  {
    id: 'vision',
    title: 'Project Vision',
    description: 'Define the problem and solution overview',
    status: 'current',
    icon: Lightbulb,
  },
  {
    id: 'requirements',
    title: 'Requirements Gathering',
    description: 'Collect and document functional requirements',
    status: 'pending',
    icon: FileText,
  },
  {
    id: 'goals',
    title: 'Goals & Success Metrics',
    description: 'Define measurable objectives and KPIs',
    status: 'pending',
    icon: Target,
  },
  {
    id: 'stakeholders',
    title: 'Stakeholder Analysis',
    description: 'Identify users, roles, and responsibilities',
    status: 'pending',
    icon: Users,
  },
  {
    id: 'architecture',
    title: 'High-Level Architecture',
    description: 'Design system architecture and components',
    status: 'pending',
    icon: Settings,
  },
];

const DOCUMENT_TABS = [
  { id: 'blueprint', label: 'Blueprint', content: 'blueprint' },
  { id: 'prd', label: 'PRD', content: 'prd' },
  { id: 'mvp', label: 'MVP', content: 'mvp' },
  { id: 'playbook', label: 'Agent Playbook', content: 'playbook' },
];

const EMPTY_PLACEHOLDER = '';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function PlanningWorkspace() {
  const { currentProjectId } = useWorkspaceStore();
  const { openDrawer } = useCoPilot();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeStep, setActiveStep] = useState('vision');
  const [activeDocument, setActiveDocument] = useState('blueprint');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const [documentContent, setDocumentContent] = useState(EMPTY_PLACEHOLDER);
  const [stepContent, setStepContent] = useState<Record<string, string>>({});
  const [stepSaveStatus, setStepSaveStatus] = useState<SaveStatus>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stepSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastSavedStepContentRef = useRef<Record<string, string>>({});

  // Handle URL query params for document selection
  useEffect(() => {
    const docParam = searchParams.get('doc');
    if (docParam && DOCUMENT_TABS.some(tab => tab.id === docParam)) {
      setActiveDocument(docParam);
      // Clear the query param after setting
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: components = [] } = useQuery({
    queryKey: ['project-components', currentProjectId],
    queryFn: () => currentProjectId ? api.projects.listComponents(currentProjectId) : [],
    enabled: !!currentProjectId,
  });

  const { data: projectData } = useQuery({
    queryKey: ['project', currentProjectId],
    queryFn: () => currentProjectId ? api.projects.get(currentProjectId) : null,
    enabled: !!currentProjectId,
  });

  // Auto-save mutation for documents
  const saveMutation = useMutation({
    mutationFn: async ({ type, content }: { type: string; content: string }) => {
      if (!currentProjectId) throw new Error('No project selected');
      return api.projects.saveComponent(currentProjectId, {
        type,
        name: type,
        data: { content },
      });
    },
    onSuccess: () => {
      setSaveStatus('saved');
      lastSavedContentRef.current = documentContent;
      queryClient.invalidateQueries({ queryKey: ['project-components', currentProjectId] });
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  // Auto-save mutation for step content
  const saveStepMutation = useMutation({
    mutationFn: async ({ stepId, content }: { stepId: string; content: string }) => {
      if (!currentProjectId) throw new Error('No project selected');
      return api.projects.saveComponent(currentProjectId, {
        type: `step_${stepId}`,
        name: `step_${stepId}`,
        data: { content },
      });
    },
    onSuccess: (_, variables) => {
      setStepSaveStatus('saved');
      lastSavedStepContentRef.current = {
        ...lastSavedStepContentRef.current,
        [variables.stepId]: variables.content
      };
      queryClient.invalidateQueries({ queryKey: ['project-components', currentProjectId] });
      setTimeout(() => setStepSaveStatus('idle'), 2000);
    },
    onError: () => {
      setStepSaveStatus('error');
      setTimeout(() => setStepSaveStatus('idle'), 3000);
    },
  });

  // Debounced auto-save for documents
  const debouncedSave = useCallback((content: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only save if content has actually changed
    if (content === lastSavedContentRef.current) return;

    saveTimeoutRef.current = setTimeout(() => {
      if (content.trim() && currentProjectId) {
        setSaveStatus('saving');
        saveMutation.mutate({ type: activeDocument, content });
      }
    }, 1500); // 1.5 second debounce
  }, [activeDocument, currentProjectId, saveMutation]);

  // Debounced auto-save for step content
  const debouncedStepSave = useCallback((stepId: string, content: string) => {
    if (stepSaveTimeoutRef.current) {
      clearTimeout(stepSaveTimeoutRef.current);
    }

    // Only save if content has actually changed
    if (content === lastSavedStepContentRef.current[stepId]) return;

    stepSaveTimeoutRef.current = setTimeout(() => {
      if (currentProjectId) {
        setStepSaveStatus('saving');
        saveStepMutation.mutate({ stepId, content });
      }
    }, 1500);
  }, [currentProjectId, saveStepMutation]);

  // Load step content from components
  useEffect(() => {
    const stepContentMap: Record<string, string> = {};
    PLANNING_STEPS.forEach(step => {
      const component = components.find((c: any) =>
        c.type === `step_${step.id}` || c.name === `step_${step.id}`
      );
      if (component?.data?.content) {
        stepContentMap[step.id] = component.data.content;
      } else {
        // Default content for each step
        const defaults: Record<string, string> = {
          vision: '# Project Vision\n\nDescribe the problem you\'re solving and your solution overview.\n\n## Problem Statement\n\n\n## Proposed Solution\n\n',
          requirements: '# Requirements\n\nList the functional and non-functional requirements.\n\n## Functional Requirements\n\n\n## Non-Functional Requirements\n\n',
          goals: '# Goals & Success Metrics\n\nDefine measurable objectives and KPIs.\n\n## Primary Goals\n\n\n## Success Metrics\n\n',
          stakeholders: '# Stakeholder Analysis\n\nIdentify users, roles, and responsibilities.\n\n## Primary Users\n\n\n## Key Stakeholders\n\n',
          architecture: '# High-Level Architecture\n\nDesign system architecture and components.\n\n## System Overview\n\n\n## Key Components\n\n',
        };
        stepContentMap[step.id] = defaults[step.id] || '';
      }
    });
    setStepContent(stepContentMap);
    lastSavedStepContentRef.current = stepContentMap;
  }, [components]);

  // Handle step content change
  const handleStepContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setStepContent(prev => ({
      ...prev,
      [activeStep]: newContent
    }));
    debouncedStepSave(activeStep, newContent);
  }, [activeStep, debouncedStepSave]);

  useEffect(() => {
    const doc = components.find((c: any) => c.type === activeDocument || c.name === activeDocument);
    if (doc?.data?.content) {
      setDocumentContent(doc.data.content);
      lastSavedContentRef.current = doc.data.content;
    } else {
      setDocumentContent(EMPTY_PLACEHOLDER);
      lastSavedContentRef.current = '';
    }
    setSaveStatus('idle');
  }, [activeDocument, components]);

  // Handle content change with auto-save
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setDocumentContent(newContent);
    debouncedSave(newContent);
  }, [debouncedSave]);

  // Calculate progress based on document content and step completion
  const progress = useMemo(() => {
    const docTypes = ['blueprint', 'prd', 'mvp', 'playbook'];
    let completedDocs = 0;
    let completedSteps = 0;

    docTypes.forEach(docType => {
      const doc = components.find((c: any) => c.type === docType || c.name === docType);
      if (doc?.data?.content && doc.data.content.trim().length > 100) {
        completedDocs++;
      }
    });

    // Check project phase for step completion
    const phaseOrder = ['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture'];
    const currentPhaseIndex = phaseOrder.indexOf(projectData?.phase || 'welcome');
    completedSteps = Math.max(0, currentPhaseIndex);

    // Progress formula: 50% from docs + 50% from steps
    const docProgress = (completedDocs / docTypes.length) * 50;
    const stepProgress = (completedSteps / (phaseOrder.length - 1)) * 50;

    return Math.round(docProgress + stepProgress);
  }, [components, projectData?.phase]);

  // Dynamic step status
  const getStepStatus = useCallback((stepId: string): 'completed' | 'current' | 'pending' => {
    const phaseOrder = ['vision', 'requirements', 'goals', 'stakeholders', 'architecture'];
    const currentPhase = projectData?.phase || 'vision';
    const stepIndex = phaseOrder.indexOf(stepId);
    const currentIndex = phaseOrder.indexOf(currentPhase);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  }, [projectData?.phase]);

  const currentPhase = projectData?.phase || 'welcome';
  const isInDiscovery = ['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture'].includes(currentPhase);
  const hasContent = documentContent.trim().length > 0;

  const handleStepClick = (stepId: string) => {
    setActiveStep(stepId);
  };

  const handleDocumentTabClick = (docId: string) => {
    setActiveDocument(docId);
  };

  const getStepIcon = (step: PlanningStep) => {
    const status = getStepStatus(step.id);
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'current':
        return <Play className="h-5 w-5 text-blue-600" />;
      default:
        return <Circle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getSaveStatusIndicator = (status: SaveStatus = saveStatus) => {
    switch (status) {
      case 'saving':
        return (
          <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs font-medium">Saving...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full">
            <CheckCheck className="h-3 w-3" />
            <span className="text-xs font-medium">Saved</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full">
            <span className="text-xs font-medium">Save failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
            <Clock className="h-3 w-3" />
            <span className="text-xs font-medium">Draft</span>
          </div>
        );
    }
  };

  // Get current step info
  const currentStepInfo = PLANNING_STEPS.find(s => s.id === activeStep);
  const currentStepContent = stepContent[activeStep] || '';

  return (
    <div className="h-full flex bg-white">
      {/* Left Sidebar - Planning Steps */}
      <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col">
        {/* Planning Header */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Planning Workspace</h2>
          <p className="text-sm text-slate-600 mb-3">Define your project vision and requirements</p>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Planning Steps */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {PLANNING_STEPS.map((step, index) => {
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl transition-all duration-200 ${
                    activeStep === step.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : step.status === 'completed'
                      ? 'bg-green-50 border border-green-200 hover:bg-green-100'
                      : 'bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getStepIcon(step)}
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          activeStep === step.id ? 'bg-white/20' : 'bg-slate-100'
                        }`}>
                          {index + 1}
                        </span>
                        <h3 className={`font-semibold text-sm leading-tight ${
                          activeStep === step.id ? 'text-white' : 'text-slate-900'
                        }`}>
                          {step.title}
                        </h3>
                      </div>
                      <p className={`text-xs leading-tight ${
                        activeStep === step.id ? 'text-blue-100' : 'text-slate-600'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Planning Actions */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <button className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Bot className="h-4 w-4" />
            <span className="font-medium">Ask CoPilot</span>
          </button>
        </div>
      </div>

      {/* Main Content - Step Content & Document Editor */}
      <div className="flex-1 flex flex-col">
        {/* Step Content Section */}
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {currentStepInfo && <currentStepInfo.icon className="h-5 w-5 text-blue-600" />}
                <h2 className="text-lg font-semibold text-slate-900">{currentStepInfo?.title || 'Step Content'}</h2>
              </div>
              {getSaveStatusIndicator(stepSaveStatus)}
            </div>
            <p className="text-sm text-slate-600">{currentStepInfo?.description}</p>
          </div>
          <div className="h-48 p-4 overflow-auto">
            <textarea
              value={currentStepContent}
              onChange={handleStepContentChange}
              className="w-full h-full font-mono text-sm leading-relaxed border border-slate-200 rounded-lg p-3 outline-none resize-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder={`Add notes for ${currentStepInfo?.title || 'this step'}...`}
            />
          </div>
        </div>

        {/* Document Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-900">Project Documentation</h1>
            {getSaveStatusIndicator()}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setEditorMode('edit')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  editorMode === 'edit'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  editorMode === 'preview'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Document Tabs */}
        <div className="border-b border-slate-200 bg-white">
          <div className="flex items-center gap-1 px-4">
            {DOCUMENT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleDocumentTabClick(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeDocument === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 flex overflow-hidden">
          {!hasContent ? (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No {activeDocument.charAt(0).toUpperCase() + activeDocument.slice(1)} Yet</h3>
                <p className="text-sm text-slate-600 mb-6">
                  {isInDiscovery 
                    ? "Complete the CoPilot discovery flow to generate your project documents."
                    : "This document hasn't been created yet. Use CoPilot to generate it."}
                </p>
                <button
                  onClick={openDrawer}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Bot className="h-4 w-4" />
                  Open CoPilot
                </button>
              </div>
            </div>
          ) : editorMode === 'edit' ? (
            <div className="flex-1 flex">
              <div className="flex-1 p-6">
                <textarea
                  value={documentContent}
                  onChange={handleContentChange}
                  className="w-full h-full font-mono text-sm leading-relaxed border-none outline-none resize-none bg-transparent"
                  placeholder="Start writing your project documentation..."
                />
              </div>
              
              <div className="flex-1 p-6 bg-slate-50 border-l border-slate-200 overflow-auto">
                <div className="prose prose-sm max-w-none">
                  {documentContent.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={index} className="text-2xl font-bold text-slate-900 mb-4">{line.substring(2)}</h1>;
                    } else if (line.startsWith('## ')) {
                      return <h2 key={index} className="text-lg font-semibold text-slate-900 mb-3 mt-6">{line.substring(3)}</h2>;
                    } else if (line.startsWith('### ')) {
                      return <h3 key={index} className="text-base font-semibold text-slate-900 mb-2 mt-4">{line.substring(4)}</h3>;
                    } else if (line.startsWith('- ')) {
                      return <li key={index} className="text-slate-700 mb-1">{line.substring(2)}</li>;
                    } else if (line.startsWith('*') && line.endsWith('*')) {
                      return <p key={index} className="text-xs text-slate-500 italic mt-4 border-t border-slate-200 pt-4">{line.substring(1, line.length - 1)}</p>;
                    } else if (line.trim() === '') {
                      return <br key={index} />;
                    } else {
                      return <p key={index} className="text-slate-700 mb-3 leading-relaxed">{line}</p>;
                    }
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-6 overflow-auto">
              <div className="prose prose-slate max-w-none">
                <div className="space-y-6">
                  {documentContent.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={index} className="text-3xl font-bold text-slate-900">{line.substring(2)}</h1>;
                    } else if (line.startsWith('## ')) {
                      return <h2 key={index} className="text-xl font-semibold text-slate-900 mt-8">{line.substring(3)}</h2>;
                    } else if (line.startsWith('### ')) {
                      return <h3 key={index} className="text-lg font-semibold text-slate-900 mt-6">{line.substring(4)}</h3>;
                    } else if (line.startsWith('- ')) {
                      return <li key={index} className="text-slate-700">{line.substring(2)}</li>;
                    } else if (line.startsWith('*') && line.endsWith('*')) {
                      return <p key={index} className="text-sm text-slate-500 italic mt-8 border-t border-slate-200 pt-6">{line.substring(1, line.length - 1)}</p>;
                    } else if (line.trim() === '') {
                      return <div key={index} className="h-4" />;
                    } else {
                      return <p key={index} className="text-slate-700 leading-relaxed">{line}</p>;
                    }
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}