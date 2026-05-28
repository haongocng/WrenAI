export interface AutoMindChartSpec {
  id: string;
  title: string;
  type?: 'bar' | 'line' | 'donut' | 'pie' | string;
  description?: string;
  data?: Record<string, any>[];
  x?: string;
  y?: string;
}

export interface AutoMindAgentInsights {
  enabled?: boolean;
  provider?: string;
  model?: string;
  summary?: string;
  business_insights?: string[];
  recommendations?: string[];
  risk_notes?: string[];
}

export interface AutoMindAgentTraceItem {
  agent?: string;
  status?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface AutoMindReport {
  title?: string;
  executive_summary?: string[];
  dataset_overview?: {
    rows?: number;
    columns?: number;
    target?: string;
    numeric_columns?: string[];
    categorical_columns?: string[];
    missing_values?: Record<string, number>;
    class_distribution?: Record<string, number>;
  };
  eda?: {
    summary?: string[];
    charts?: AutoMindChartSpec[];
  };
  key_insights?: string[];
  prediction_task?: {
    task_name?: string;
    target_definition?: string;
    features_used?: string[];
    excluded_columns?: string[];
    selected_model?: string;
    candidate_models?: Array<Record<string, any>>;
  };
  prediction_results?: {
    sample_predictions?: Array<Record<string, any>>;
    charts?: AutoMindChartSpec[];
  };
  model_audit?: {
    note?: string;
    metrics?: Record<string, number>;
    confusion_matrix?: number[][];
    charts?: AutoMindChartSpec[];
  };
  recommendations?: string[];
  warnings?: string[];
  limitations?: string[];
  agent_insights?: AutoMindAgentInsights;
  agent_workflow?: AutoMindAgentTraceItem[];
  report_markdown?: string;
}

export interface AutoMindResponse {
  status?: string;
  report?: AutoMindReport;
  legacy?: Record<string, any>;
  summary?: Record<string, any>;
  metrics?: Record<string, number>;
  charts?: Record<string, Record<string, any>[]>;
  insight?: string;
  warnings?: string[];
  agent_trace?: AutoMindAgentTraceItem[];
}
