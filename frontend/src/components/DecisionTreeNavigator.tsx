import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen } from 'lucide-react';

interface TreeNode {
  id: number;
  question: string;
  question_type: string;
  help_text?: string;
  examples?: string[];
  is_terminal: boolean;
  paths: TreePath[];
}

interface TreePath {
  id: number;
  answer_option: string;
  next_node_id: number | null;
  answer_text?: string;
  legislation_refs?: number[];
  is_terminal: boolean;
}

interface TreeInfo {
  id: number;
  name: string;
  description: string;
  category: string;
}

interface FinalAnswer {
  answer_template?: string;
  legislation_articles?: any[];
  strategic_advice?: string;
  related_obligations?: any[];
  examples?: any[];
  warnings?: string;
  next_steps?: any[];
  answer?: any;
}

interface DecisionTreeNavigatorProps {
  treeId?: number;
  sessionId?: string;
  onComplete?: (answer: FinalAnswer) => void;
  onSwitchToAI?: () => void;
}

const DecisionTreeNavigator: React.FC<DecisionTreeNavigatorProps> = ({
  treeId,
  sessionId: initialSessionId,
  onComplete,
  onSwitchToAI
}) => {
  const [tree, setTree] = useState<TreeInfo | null>(null);
  const [currentNode, setCurrentNode] = useState<TreeNode | null>(null);
  const [pathHistory, setPathHistory] = useState<Array<{ nodeId: number; pathId: number; question: string; answer: string }>>([]);
  const [finalAnswer, setFinalAnswer] = useState<FinalAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(initialSessionId || `session_${Date.now()}`);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);

  useEffect(() => {
    if (treeId) {
      loadTreeRoot(treeId);
    }
  }, [treeId]);

  const loadTreeRoot = async (id: number) => {
    try {
      setLoading(true);

      // Get tree info
      const treeResponse = await fetch(`/api/v1/fiscal/hybrid-consultant.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Start tree',
          tree_id: id,
          user_id: localStorage.getItem('user_id')
        })
      });

      const data = await treeResponse.json();

      if (data.success && data.method === 'decision_tree') {
        setTree(data.tree);
        setCurrentNode(data.current_node);
        setSessionId(data.session_id);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load tree:', error);
      setLoading(false);
    }
  };

  const selectPath = async (path: TreePath) => {
    if (!currentNode) return;

    // Add to history
    setPathHistory([
      ...pathHistory,
      {
        nodeId: currentNode.id,
        pathId: path.id,
        question: currentNode.question,
        answer: path.answer_option
      }
    ]);

    // If terminal, show final answer
    if (path.is_terminal || path.next_node_id === null) {
      setLoading(true);

      try {
        const response = await fetch('/api/v1/fiscal/hybrid-consultant.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: currentNode.id,
            path_id: path.id,
            session_id: sessionId,
            user_id: localStorage.getItem('user_id')
          })
        });

        const data = await response.json();

        if (data.success && data.is_terminal) {
          setFinalAnswer(data.answer);
          setCurrentNode(null);

          if (onComplete) {
            onComplete(data.answer);
          }
        }
      } catch (error) {
        console.error('Failed to get final answer:', error);
      }

      setLoading(false);
    } else {
      // Navigate to next node
      navigateToNode(path.next_node_id!);
    }
  };

  const navigateToNode = async (nodeId: number) => {
    try {
      setLoading(true);

      const response = await fetch('/api/v1/fiscal/hybrid-consultant.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          session_id: sessionId,
          user_id: localStorage.getItem('user_id')
        })
      });

      const data = await response.json();

      if (data.success && data.node) {
        setCurrentNode(data.node);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to navigate:', error);
      setLoading(false);
    }
  };

  const goBack = () => {
    if (pathHistory.length === 0) return;

    const newHistory = [...pathHistory];
    newHistory.pop();
    setPathHistory(newHistory);

    if (newHistory.length === 0 && tree) {
      // Go back to root
      loadTreeRoot(tree.id);
    } else {
      // Go to previous node
      const previous = newHistory[newHistory.length - 1];
      navigateToNode(previous.nodeId);
    }
  };

  const switchToAI = () => {
    if (onSwitchToAI) {
      onSwitchToAI();
    }
  };

  const handleRating = async (helpful: boolean) => {
    setIsHelpful(helpful);
    // TODO: Send rating to backend API
    try {
      await fetch('/api/v1/fiscal/decision-tree-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree_id: tree?.id,
          session_id: sessionId,
          helpful,
          user_id: localStorage.getItem('user_id')
        })
      });
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };

  const calculateProgress = () => {
    // Estimate: most trees have 2-3 questions
    const totalSteps = 3;
    const currentStep = Math.min(pathHistory.length + 1, totalSteps);
    const percentage = Math.round((currentStep / totalSteps) * 100);
    return { currentStep, totalSteps, percentage };
  };

  if (loading && !currentNode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tree Header */}
      {tree && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{tree.name}</h2>
          </div>
          <p className="text-gray-600">{tree.description}</p>
        </div>
      )}

      {/* Breadcrumb Trail */}
      {pathHistory.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 overflow-x-auto pb-2">
            {pathHistory.map((item, idx) => (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-medium">{item.answer}</span>
                  {idx < pathHistory.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi
          </button>
        </div>
      )}

      {/* Progress Indicator */}
      {currentNode && !finalAnswer && (() => {
        const progress = calculateProgress();
        return (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Pas {progress.currentStep} din {progress.totalSteps}</span>
              <span>{progress.percentage}% complet</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{width: `${progress.percentage}%`}}
              />
            </div>
          </div>
        );
      })()}

      {/* Current Question */}
      {currentNode && !finalAnswer && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {currentNode.question}
            </h3>
            {currentNode.help_text && (
              <div className="p-3 bg-blue-50 rounded-lg mb-4">
                <p className="text-sm text-blue-900">{currentNode.help_text}</p>
              </div>
            )}
            {currentNode.examples && currentNode.examples.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-600 mb-2">Exemple:</p>
                <ul className="space-y-1">
                  {currentNode.examples.map((example, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentNode.paths.map((path) => (
              <button
                key={path.id}
                onClick={() => selectPath(path)}
                className="w-full p-4 text-left bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900 group-hover:text-blue-700">
                    {path.answer_option}
                  </span>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                </div>
              </button>
            ))}
          </div>

          {/* Alternative: Switch to AI */}
          {onSwitchToAI && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={switchToAI}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
              >
                ✨ Preferă răspuns direct de la AI?
              </button>
            </div>
          )}
        </div>
      )}

      {/* Final Answer */}
      {finalAnswer && (
        <div className="space-y-6">
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h3 className="text-2xl font-bold text-gray-900">Răspunsul Tău</h3>
            </div>

            {/* Main Answer */}
            {finalAnswer.answer_template && (
              <div
                className="prose max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: finalAnswer.answer_template }}
              />
            )}

            {finalAnswer.answer && typeof finalAnswer.answer === 'object' && finalAnswer.answer.answer_template && (
              <div
                className="prose max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: finalAnswer.answer.answer_template }}
              />
            )}
          </div>

          {/* Legislation References */}
          {finalAnswer.legislation_articles && finalAnswer.legislation_articles.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Referințe Legislative
              </h4>
              <div className="space-y-3">
                {finalAnswer.legislation_articles.map((article: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <h5 className="font-semibold text-gray-900 mb-1">{article.code} - {article.title}</h5>
                    <p className="text-sm text-gray-600">{article.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategic Advice */}
          {finalAnswer.strategic_advice && (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: finalAnswer.strategic_advice }}
            />
          )}

          {/* Warnings */}
          {finalAnswer.warnings && (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: finalAnswer.warnings }}
            />
          )}

          {/* Next Steps */}
          {finalAnswer.next_steps && finalAnswer.next_steps.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="font-bold text-gray-900 mb-4 text-xl">📋 Pașii Următori</h4>
              <p className="text-gray-600 mb-6">Plan de acțiune complet pentru implementare:</p>
              <div className="space-y-4">
                {finalAnswer.next_steps.map((step: any, idx: number) => {
                  // Handle both string and object formats
                  const isObject = typeof step === 'object' && step !== null;
                  const stepTitle = isObject ? step.step : step;
                  const stepDescription = isObject ? step.description : null;
                  const stepDeadline = isObject ? step.deadline : null;
                  const stepResponsible = isObject ? step.responsible : null;
                  const stepLink = isObject ? step.link : null;

                  return (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-900 mb-1">{stepTitle}</h5>
                          {stepDescription && (
                            <p className="text-sm text-gray-700 mb-2">{stepDescription}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs">
                            {stepDeadline && (
                              <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded">
                                <span>⏰</span>
                                <strong>Termen:</strong> {stepDeadline}
                              </span>
                            )}
                            {stepResponsible && (
                              <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-1 rounded">
                                <span>👤</span>
                                <strong>Responsabil:</strong> {stepResponsible}
                              </span>
                            )}
                          </div>
                          {stepLink && (
                            <a
                              href={stepLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              📄 Descarcă formular
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rating Section */}
          {isHelpful === null && (
            <div className="mt-6 p-6 border-t border-gray-200 text-center">
              <p className="text-lg font-semibold text-gray-900 mb-4">
                A fost util acest răspuns?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleRating(true)}
                  className="px-8 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium transition-colors flex items-center gap-2"
                >
                  <span className="text-2xl">👍</span>
                  Da, foarte util
                </button>
                <button
                  onClick={() => handleRating(false)}
                  className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors flex items-center gap-2"
                >
                  <span className="text-2xl">👎</span>
                  Nu prea
                </button>
              </div>
            </div>
          )}

          {isHelpful !== null && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-800 font-medium">
                ✅ Mulțumim pentru feedback! Ne ajută să îmbunătățim platforma.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => {
                setFinalAnswer(null);
                setPathHistory([]);
                setIsHelpful(null);
                if (tree) loadTreeRoot(tree.id);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              🔄 Începe din nou
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              🖨️ Printează
            </button>
            <button
              onClick={() => {
                const subject = encodeURIComponent(`Ghid: ${tree?.name || 'Decision Tree'}`);
                const body = encodeURIComponent(`Am generat un ghid folosind DocumentiUlia:\n\n${window.location.href}`);
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              📧 Trimite email
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionTreeNavigator;
