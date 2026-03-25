import React from 'react';
import { Link } from 'react-router-dom';
import { 
    Upload, 
    Layers, 
    Calculator, 
    Lightbulb, 
    BarChart3, 
    FileText,
    Check 
} from 'lucide-react';
import './ProgressStepper.css';

const STAGE_CONFIG = {
    upload: { 
        number: 1, 
        label: 'Upload', 
        icon: Upload, 
        route: '/upload' 
    },
    categorization: { 
        number: 2, 
        label: 'Categorization', 
        icon: Layers, 
        route: '/categorization' 
    },
    calculation: { 
        number: 3, 
        label: 'Calculation', 
        icon: Calculator, 
        route: '/calculation' 
    },
    suggestion: { 
        number: 4, 
        label: 'Suggestion', 
        icon: Lightbulb, 
        route: '/suggestions' 
    },
    report: { 
        number: 5, 
        label: 'Report', 
        icon: FileText, 
        route: '/report' 
    }
};

const STAGES_ORDER = ['upload', 'categorization', 'calculation', 'suggestion', 'report'];

/**
 * ProgressStepper - Reusable workflow progress indicator
 * 
 * @param {Object} props
 * @param {string} props.currentStage - Current active stage (e.g., 'upload', 'calculation')
 * @param {string[]} props.completedStages - Array of completed stage IDs (e.g., ['upload', 'categorization'])
 * @param {Function} props.onStageClick - Callback when a clickable stage is clicked (receives stageId)
 * @param {string} props.className - Additional CSS classes
 */
function ProgressStepper({ 
    currentStage, 
    completedStages = [], 
    onStageClick,
    className = ''
}) {
    const handleStageClick = (stageId, isClickable) => {
        if (isClickable && onStageClick) {
            onStageClick(stageId);
        }
    };

    return (
        <div className={`progress-stepper ${className}`}>
            <div className="progress-stepper-container">
                {STAGES_ORDER.map((stageId, index) => {
                    const stage = STAGE_CONFIG[stageId];
                    const isCompleted = completedStages.includes(stageId);
                    const isCurrent = currentStage === stageId;
                    const isClickable = isCompleted && !isCurrent;
                    const isDisabled = !isCompleted && !isCurrent;
                    
                    const IconComponent = stage.icon;

                    return (
                        <React.Fragment key={stageId}>
                            <div 
                                className={`
                                    progress-step
                                    ${isCurrent ? 'progress-step--current' : ''}
                                    ${isCompleted ? 'progress-step--completed' : ''}
                                    ${isDisabled ? 'progress-step--disabled' : ''}
                                    ${isClickable ? 'progress-step--clickable' : ''}
                                `}
                            >
                                {isClickable ? (
                                    <Link
                                        to={stage.route}
                                        className="progress-step-circle"
                                        onClick={() => handleStageClick(stageId, true)}
                                        aria-label={`Go to ${stage.label}`}
                                    >
                                        {isCompleted && !isCurrent ? (
                                            <Check size={20} strokeWidth={3} />
                                        ) : (
                                            <IconComponent size={20} />
                                        )}
                                    </Link>
                                ) : (
                                    <div 
                                        className="progress-step-circle"
                                        onClick={() => handleStageClick(stageId, false)}
                                    >
                                        {isCompleted && !isCurrent ? (
                                            <Check size={20} strokeWidth={3} />
                                        ) : (
                                            <IconComponent size={20} />
                                        )}
                                    </div>
                                )}
                                <span className="progress-step-label">{stage.label}</span>
                            </div>

                            {index < STAGES_ORDER.length - 1 && (
                                <div 
                                    className={`
                                        progress-connector
                                        ${isCompleted ? 'progress-connector--completed' : ''}
                                    `}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

export default ProgressStepper;
