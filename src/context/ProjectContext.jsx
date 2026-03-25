import React, { createContext, useReducer, useEffect, useCallback, useMemo } from 'react';

/**
 * Project structure:
 * @typedef {Object} Project
 * @property {string} id - Unique identifier (UUID)
 * @property {string} fileName - Project file name
 * @property {Date} uploadedAt - Upload timestamp
 * @property {Date} lastModified - Last modified timestamp
 * @property {'upload'|'categorization'|'calculation'|'suggestion'|'analysis'|'report'} currentStage - Workflow stage
 * @property {'draft'|'in_progress'|'completed'} status - Project status
 * @property {Object} data - Project data
 * @property {Array} data.extractedMaterials - Extracted materials list
 * @property {Object} data.calculations - Calculation results
 * @property {Array} data.suggestions - Suggestions list
 * @property {Object} data.analysis - Analysis data
 */

// Create context
const ProjectContext = createContext();
const ProjectDispatchContext = createContext();

// Action types
const ACTIONS = {
  ADD_PROJECT: 'ADD_PROJECT',
  UPDATE_PROJECT: 'UPDATE_PROJECT',
  DELETE_PROJECT: 'DELETE_PROJECT',
  UPDATE_PROJECT_STAGE: 'UPDATE_PROJECT_STAGE',
  UPDATE_PROJECT_DATA: 'UPDATE_PROJECT_DATA',
  LOAD_FROM_STORAGE: 'LOAD_FROM_STORAGE',
};

// Utility function to generate UUID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Utility function to serialize/deserialize dates
const serializeProject = (project) => {
  return {
    ...project,
    uploadedAt: project.uploadedAt instanceof Date ? project.uploadedAt.toISOString() : project.uploadedAt,
    lastModified: project.lastModified instanceof Date ? project.lastModified.toISOString() : project.lastModified,
  };
};

const deserializeProject = (project) => {
  return {
    ...project,
    uploadedAt: typeof project.uploadedAt === 'string' ? new Date(project.uploadedAt) : project.uploadedAt,
    lastModified: typeof project.lastModified === 'string' ? new Date(project.lastModified) : project.lastModified,
  };
};

// Initial state
const initialState = {
  projects: [],
};

// Reducer function
const projectReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.ADD_PROJECT: {
      const newProject = {
        id: generateId(),
        fileName: action.payload.fileName || 'Untitled Project',
        uploadedAt: action.payload.uploadedAt || new Date(),
        lastModified: action.payload.lastModified || new Date(),
        currentStage: action.payload.currentStage || 'upload',
        status: action.payload.status || 'draft',
        data: action.payload.data || {
          extractedMaterials: [],
          calculations: {},
          suggestions: [],
          analysis: {},
        },
      };
      return {
        ...state,
        projects: [...state.projects, newProject],
      };
    }

    case ACTIONS.UPDATE_PROJECT: {
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.payload.id
            ? {
                ...project,
                ...action.payload.updates,
                lastModified: action.payload.updates.lastModified || new Date(),
              }
            : project
        ),
      };
    }

    case ACTIONS.DELETE_PROJECT: {
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.payload.id),
      };
    }

    case ACTIONS.UPDATE_PROJECT_STAGE: {
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.payload.id
            ? {
                ...project,
                currentStage: action.payload.stage,
                lastModified: new Date(),
              }
            : project
        ),
      };
    }

    case ACTIONS.UPDATE_PROJECT_DATA: {
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.payload.id
            ? {
                ...project,
                data: {
                  ...project.data,
                  ...action.payload.data,
                },
                lastModified: new Date(),
              }
            : project
        ),
      };
    }

    case ACTIONS.LOAD_FROM_STORAGE: {
      return {
        ...state,
        projects: action.payload.projects || [],
      };
    }

    default:
      return state;
  }
};

// Provider component
/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const ProjectProvider = ({ children }) => {
  const [state, dispatch] = useReducer(projectReducer, initialState);
  const STORAGE_KEY = 'envirosync_projects';
  const saveTimeoutRef = React.useRef(null);

  // Load from localStorage on mount
  useEffect(() => {
    // Use requestAnimationFrame to ensure this doesn't block initial render
    requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const deserializedProjects = parsed.projects.map((project) => deserializeProject(project));
          dispatch({
            type: ACTIONS.LOAD_FROM_STORAGE,
            payload: { projects: deserializedProjects },
          });
        }
      } catch (error) {
        console.error('Failed to load projects from localStorage:', error);
      }
    });
  }, []);

  // Save to localStorage whenever state changes - debounced and non-blocking
  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce saves to prevent blocking navigation
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const serialized = {
          projects: state.projects.map((project) => serializeProject(project)),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
      } catch (error) {
        console.error('Failed to save projects to localStorage:', error);
      }
    }, 100);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.projects]);

  return (
    <ProjectContext.Provider value={state}>
      <ProjectDispatchContext.Provider value={dispatch}>{children}</ProjectDispatchContext.Provider>
    </ProjectContext.Provider>
  );
};

// ============================================
// Custom Hooks
// ============================================

/**
 * Hook to get dispatch function
 * @returns {Function} dispatch function
 */
const useProjectDispatch = () => {
  const dispatch = React.useContext(ProjectDispatchContext);
  if (!dispatch) {
    throw new Error('useProjectDispatch must be used within ProjectProvider');
  }
  return dispatch;
};

/**
 * Hook to get project state
 * @returns {Object} project state
 */
const useProjectState = () => {
  const state = React.useContext(ProjectContext);
  if (!state) {
    throw new Error('useProjectState must be used within ProjectProvider');
  }
  return state;
};

/**
 * Hook to get all projects
 * @returns {Object} { projects, addProject, updateProject, deleteProject, updateProjectStage, updateProjectData }
 */
export const useProjects = () => {
  const state = useProjectState();
  const dispatch = useProjectDispatch();

  const addProject = useCallback(
    (fileName, data = {}) => {
      dispatch({
        type: ACTIONS.ADD_PROJECT,
        payload: {
          fileName,
          uploadedAt: new Date(),
          lastModified: new Date(),
          currentStage: 'upload',
          status: 'draft',
          data: {
            extractedMaterials: [],
            calculations: {},
            suggestions: [],
            analysis: {},
            ...data,
          },
        },
      });
    },
    [dispatch]
  );

  const updateProject = useCallback(
    (id, updates) => {
      dispatch({
        type: ACTIONS.UPDATE_PROJECT,
        payload: { id, updates },
      });
    },
    [dispatch]
  );

  const deleteProject = useCallback(
    (id) => {
      dispatch({
        type: ACTIONS.DELETE_PROJECT,
        payload: { id },
      });
    },
    [dispatch]
  );

  const updateProjectStage = useCallback(
    (id, stage) => {
      dispatch({
        type: ACTIONS.UPDATE_PROJECT_STAGE,
        payload: { id, stage },
      });
    },
    [dispatch]
  );

  const updateProjectData = useCallback(
    (id, data) => {
      dispatch({
        type: ACTIONS.UPDATE_PROJECT_DATA,
        payload: { id, data },
      });
    },
    [dispatch]
  );

  const getProjectById = useCallback(
    (id) => {
      return state.projects.find((project) => project.id === id);
    },
    [state.projects]
  );

  const getAllDrafts = useCallback(() => {
    return state.projects.filter(
      (project) => project.status === 'draft' || project.status === 'in_progress'
    );
  }, [state.projects]);

  const getCompletedProjects = useCallback(() => {
    return state.projects.filter((project) => project.status === 'completed');
  }, [state.projects]);

  return {
    projects: state.projects,
    addProject,
    updateProject,
    deleteProject,
    updateProjectStage,
    updateProjectData,
    getProjectById,
    getAllDrafts,
    getCompletedProjects,
  };
};

/**
 * Hook to get a single project by ID
 * @param {string} id - Project ID
 * @returns {Object} project object with { project, updateProject, updateStage, updateData, deleteProject }
 */
export const useProject = (id) => {
  const state = useProjectState();
  const dispatch = useProjectDispatch();

  const project = useMemo(() => {
    return state.projects.find((p) => p.id === id);
  }, [state.projects, id]);

  const updateProject = useCallback(
    (updates) => {
      dispatch({
        type: ACTIONS.UPDATE_PROJECT,
        payload: { id, updates },
      });
    },
    [dispatch, id]
  );

  const updateStage = useCallback(
    (stage) => {
      dispatch({
        type: ACTIONS.UPDATE_PROJECT_STAGE,
        payload: { id, stage },
      });
    },
    [dispatch, id]
  );

  const updateData = useCallback(
    (data) => {
      dispatch({
        type: ACTIONS.UPDATE_PROJECT_DATA,
        payload: { id, data },
      });
    },
    [dispatch, id]
  );

  const deleteProject = useCallback(() => {
    dispatch({
      type: ACTIONS.DELETE_PROJECT,
      payload: { id },
    });
  }, [dispatch, id]);

  return {
    project,
    updateProject,
    updateStage,
    updateData,
    deleteProject,
  };
};

/**
 * Hook to get only draft projects
 * @returns {Array} array of draft projects
 */
export const useDrafts = () => {
  const state = useProjectState();

  const drafts = useMemo(() => {
    return state.projects.filter(
      (project) => project.status === 'draft' || project.status === 'in_progress'
    );
  }, [state.projects]);

  return drafts;
};

export default ProjectContext;
