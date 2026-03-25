/**
 * Batch Processing Utility for Projects
 * Handles automated processing of multiple projects with progress tracking
 */

/**
 * Simulate auto-categorization of materials
 * In production, this would call your API or ML model
 * 
 * @param {Array} extractedMaterials - Materials to categorize
 * @returns {Promise<Array>} Categorized materials
 */
const autoCategorize = async (extractedMaterials = []) => {
  // Simulate API call (2-3 seconds)
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));

  return (extractedMaterials || []).map((material) => ({
    ...material,
    category: material.category || 'Concrete', // Use existing or default
    isAccurate: true, // Mark as auto-categorized
  }));
};

/**
 * Calculate emissions based on materials
 * In production, this would call your emissions calculation API
 * 
 * @param {Array} materials - Materials with quantities
 * @returns {Promise<Object>} Calculation results { totalEmissions, breakdown, ... }
 */
const calculateEmissions = async (materials = []) => {
  // Simulate calculation (1-2 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

  // Simple calculation: estimate emissions per material
  const densityMap = {
    Concrete: 0.35, // kg CO2e per kg
    Steel: 2.5,
    Glass: 0.8,
    Tiles: 0.5,
    Bricks: 0.2,
    Wood: 0.05,
    Additives: 0.1,
    Other: 0.1,
  };

  let totalEmissions = 0;
  const breakdown = {};

  (materials || []).forEach((material) => {
    const qty = parseFloat(material.qty) || 0;
    const unitWeight = material.unit === 'kg' ? qty : qty * 1000; // Convert to kg
    const emissionsFactor = densityMap[material.category] || 0.1;
    const emissions = unitWeight * emissionsFactor;

    totalEmissions += emissions;
    breakdown[material.category] = (breakdown[material.category] || 0) + emissions;
  });

  return {
    totalEmissions: Math.round(totalEmissions),
    breakdown,
    recommendations: getRecommendations(breakdown),
    calculatedAt: new Date().toISOString(),
  };
};

/**
 * Generate sustainability suggestions
 * In production, this would call your AI/suggestion API
 * 
 * @param {Object} calculations - Calculation results
 * @returns {Promise<Array>} Array of suggestions
 */
const generateSuggestions = async (calculations = {}) => {
  // Simulate API call (2-3 seconds)
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));

  const suggestions = [];
  const breakdown = calculations.breakdown || {};

  // Generate category-specific suggestions
  if ((breakdown.Concrete || 0) > 2000) {
    suggestions.push({
      id: 'concrete-alternative',
      title: 'Use Low-Emission Concrete',
      description: 'Consider using recycled aggregate concrete or fly-ash based mixes',
      impact: '20-30% reduction in CO2e',
      category: 'Concrete',
    });
  }

  if ((breakdown.Steel || 0) > 1000) {
    suggestions.push({
      id: 'steel-recycled',
      title: 'Increase Recycled Steel Content',
      description: 'Use high recycled content steel to reduce embodied carbon',
      impact: '50-60% reduction in CO2e',
      category: 'Steel',
    });
  }

  if ((breakdown.Glass || 0) > 500) {
    suggestions.push({
      id: 'glass-alternative',
      title: 'Optimize Glass Design',
      description: 'Use thinner glass or reduced-pane designs where structurally possible',
      impact: '15-25% reduction in CO2e',
      category: 'Glass',
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      id: 'general-reduction',
      title: 'Material Optimization',
      description: 'Review material specifications for potential waste reduction',
      impact: '5-10% reduction in CO2e',
      category: 'General',
    });
  }

  return suggestions;
};

/**
 * Get recommendations based on breakdown
 * @param {Object} breakdown - Emissions breakdown by category
 * @returns {Array} Recommendations
 */
const getRecommendations = (breakdown = {}) => {
  const recommendations = [];
  const highest = Object.entries(breakdown).sort(([, a], [, b]) => b - a)[0];

  if (highest) {
    recommendations.push(`Highest emissions from ${highest[0]}: ${Math.round(highest[1])} kg CO2e`);
  }

  return recommendations;
};

/**
 * Process a single project through the entire workflow
 * 
 * @param {Object} project - Project to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
const processSingleProject = async (project, options = {}) => {
  if (!project) {
    return {
      success: false,
      projectId: null,
      error: 'Project not found',
    };
  }

  try {
    const materials = project.data?.extractedMaterials || [];

    // Step 1: Auto-categorize
    const categorized = await autoCategorize(materials);

    // Step 2: Calculate emissions
    const calculations = await calculateEmissions(categorized);

    // Step 3: Generate suggestions
    const suggestions = await generateSuggestions(calculations);

    return {
      success: true,
      projectId: project.id,
      fileName: project.fileName,
      results: {
        categorized,
        calculations,
        suggestions,
      },
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      projectId: project.id,
      fileName: project.fileName,
      error: error.message || 'Processing failed',
    };
  }
};

/**
 * Main batch processing function
 * Processes multiple projects with optional parallel execution
 * 
 * @param {Array<Object>} projects - Array of project objects to process
 * @param {Object} options - Processing options
 * @param {boolean} options.parallel - Process in parallel (default: false)
 * @param {boolean} options.autoGenerateReports - Auto-generate reports (default: false)
 * @param {Function} options.onProgress - Callback: (projectId, status) => void
 * @returns {Promise<Object>} { success: [], failed: [], errors: {}, summary: {} }
 */
export const processBatchProjects = async (projects = [], options = {}) => {
  const {
    parallel = false,
    autoGenerateReports = false,
    onProgress = null,
  } = options;

  if (!Array.isArray(projects) || projects.length === 0) {
    return {
      success: [],
      failed: [],
      errors: {},
      summary: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        startTime: new Date(),
        endTime: new Date(),
      },
    };
  }

  const results = {
    success: [],
    failed: [],
    errors: {},
    summary: {
      total: projects.length,
      processed: 0,
      successful: 0,
      failed: 0,
      startTime: new Date(),
      endTime: null,
    },
  };

  try {
    if (parallel) {
      // Process all projects in parallel
      const promises = projects.map((project) =>
        processSingleProject(project, options).then((result) => {
          // Call progress callback
          if (onProgress) {
            onProgress(project.id, result.success ? 'completed' : 'failed');
          }

          return result;
        })
      );

      const allResults = await Promise.all(promises);

      allResults.forEach((result) => {
        if (result.success) {
          results.success.push(result);
          results.summary.successful++;
        } else {
          results.failed.push(result);
          results.summary.failed++;
          results.errors[result.projectId] = result.error;
        }
        results.summary.processed++;
      });
    } else {
      // Process projects sequentially
      for (const project of projects) {
        // Call progress callback - processing
        if (onProgress) {
          onProgress(project.id, 'processing');
        }

        const result = await processSingleProject(project, options);

        if (result.success) {
          results.success.push(result);
          results.summary.successful++;
        } else {
          results.failed.push(result);
          results.summary.failed++;
          results.errors[result.projectId] = result.error;
        }

        results.summary.processed++;

        // Call progress callback - completed
        if (onProgress) {
          onProgress(project.id, result.success ? 'completed' : 'failed');
        }
      }
    }
  } catch (error) {
    console.error('Batch processing error:', error);
    results.errors._batch = error.message;
  }

  results.summary.endTime = new Date();
  results.summary.duration = results.summary.endTime - results.summary.startTime;

  return results;
};

/**
 * Format batch results for display
 * 
 * @param {Object} results - Results from processBatchProjects
 * @returns {Object} Formatted results with messages
 */
export const formatBatchResults = (results = {}) => {
  const { summary = {}, success = [], failed = [], errors = {} } = results;

  return {
    title: summary.successful === summary.total ? 'All Projects Processed! ✨' : 'Batch Processing Complete',
    message: `${summary.successful} of ${summary.total} projects processed successfully`,
    duration: summary.duration ? `${Math.round(summary.duration / 1000)}s` : '0s',
    successCount: success.length,
    failureCount: failed.length,
    failedProjects: failed.map((f) => ({
      id: f.projectId,
      name: f.fileName,
      error: errors[f.projectId],
    })),
  };
};

export default processBatchProjects;
