import React, { useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Layout,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import MarkdownBlock from '@/components/editor/MarkdownBlock';
import HeaderBar from '@/components/HeaderBar';
import AutoMindChart from '@/components/pages/automind/AutoMindChart';
import {
  AutoMindChartSpec,
  AutoMindReport,
  AutoMindResponse,
} from '@/components/pages/automind/types';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

type PredictionDomain = 'ecommerce' | 'heart';
type PredictionSource = 'demo' | 'wren' | 'heart';

interface SourceInfo {
  source: PredictionSource;
  recordCount?: number;
}

export default function AutoMindPredictionPage() {
  const [selectedDomain, setSelectedDomain] =
    useState<PredictionDomain>('ecommerce');
  const [loadingAction, setLoadingAction] =
    useState<PredictionSource | null>(null);
  const [error, setError] = useState<string>(null);
  const [response, setResponse] = useState<AutoMindResponse>(null);
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);

  const report = useMemo(() => normalizeReport(response), [response]);
  const metrics = report?.model_audit?.metrics || response?.metrics || {};
  const warnings = report?.warnings || response?.warnings || [];
  const limitations = report?.limitations || [];
  const agentTrace = response?.agent_trace || report?.agent_workflow || [];

  const selectDomain = (domain: PredictionDomain) => {
    setSelectedDomain(domain);
    setError(null);
    setResponse(null);
    setSourceInfo(null);
  };

  const runPrediction = async (source: PredictionSource) => {
    setLoadingAction(source);
    setError(null);
    try {
      const endpoint =
        source === 'wren'
          ? '/api/automind/predict-from-wren'
          : source === 'heart'
            ? '/api/automind/predict-heart-disease'
            : '/api/automind/predict';
      const result = await axios.post<AutoMindResponse>(endpoint, {});
      const metadata = result.data as AutoMindResponse & {
        heart_disease_dataset?: { train_rows?: number };
        record_count?: number;
      };
      const recordCount =
        source === 'wren'
          ? metadata.record_count
          : source === 'heart'
            ? metadata.heart_disease_dataset?.train_rows ||
              metadata.summary?.rows
            : undefined;
      setResponse(result.data);
      setSourceInfo({ source, recordCount });
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? err.response?.data?.detail ||
          err.response?.data?.error ||
          err.message
        : err instanceof Error
          ? err.message
          : 'Unknown request error';
      const message =
        typeof detail === 'string' ? detail : JSON.stringify(detail);
      const label =
        source === 'wren'
          ? 'WrenAI data prediction'
          : source === 'heart'
            ? 'Heart Disease prediction'
            : 'Demo prediction';
      setError(`${label} failed: ${message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <HeaderBar />
      <Content>
        <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
          <Space direction="vertical" size={16} className="w-100">
            <Card>
              <Row justify="space-between" align="middle" gutter={[24, 16]}>
                <Col xs={24} lg={14}>
                  <Space direction="vertical" size={8}>
                    <Title level={2} className="mb-0">
                      AutoMind Prediction
                    </Title>
                    <Paragraph className="mb-0" type="secondary">
                      {selectedDomain === 'heart'
                        ? 'Prepared Heart Disease classification report from AutoMind-service.'
                        : 'Real-data prediction report generated from WrenAI E-commerce sample data.'}
                    </Paragraph>
                    <Space wrap>
                      <Tag color="blue">AutoMind-service: localhost:8000</Tag>
                      <Tag color="geekblue">
                        {selectedDomain === 'heart'
                          ? 'Prepared Heart Disease CSV dataset'
                          : 'WrenAI E-commerce sample'}
                      </Tag>
                    </Space>
                    <DomainSelector
                      selectedDomain={selectedDomain}
                      onSelect={selectDomain}
                      disabled={Boolean(loadingAction)}
                    />
                  </Space>
                </Col>
                <Col xs={24} lg={10}>
                  <Space direction="vertical" size={12} className="w-100">
                    {selectedDomain === 'ecommerce' ? (
                      <>
                        <ActionBlock
                          title="Run Prediction from WrenAI Data"
                          helper="Use real row-level records queried from WrenAI."
                        >
                          <Button
                            type="primary"
                            block
                            loading={loadingAction === 'wren'}
                            disabled={Boolean(loadingAction)}
                            onClick={() => runPrediction('wren')}
                          >
                            Run Prediction from WrenAI Data
                          </Button>
                        </ActionBlock>
                        <ActionBlock
                          title="Run Demo Prediction"
                          helper="Use built-in demo records as a fallback."
                        >
                          <Button
                            block
                            loading={loadingAction === 'demo'}
                            disabled={Boolean(loadingAction)}
                            onClick={() => runPrediction('demo')}
                          >
                            Run Demo Prediction
                          </Button>
                        </ActionBlock>
                      </>
                    ) : (
                      <ActionBlock
                        title="Run Heart Disease Demo"
                        helper="Use the prepared labeled Heart Disease CSV dataset."
                      >
                        <Button
                          type="primary"
                          block
                          loading={loadingAction === 'heart'}
                          disabled={Boolean(loadingAction)}
                          onClick={() => runPrediction('heart')}
                        >
                          Run Heart Disease Demo
                        </Button>
                      </ActionBlock>
                    )}
                  </Space>
                </Col>
              </Row>
            </Card>

            {selectedDomain === 'heart' && (
              <Alert
                type="warning"
                showIcon
                message="This workflow is for demonstration and research only. It is not medical advice, diagnosis, or treatment guidance."
              />
            )}

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={sourceInfo ? 16 : 24}>
                <Card title="Data Flow" size="small">
                  <Space wrap size={8}>
                    <Tag color="processing">
                      {selectedDomain === 'heart'
                        ? 'Prepared CSV Dataset'
                        : 'WrenAI SQL Query'}
                    </Tag>
                    <Text type="secondary">→</Text>
                    <Tag color="blue">AutoMind-service</Tag>
                    <Text type="secondary">→</Text>
                    <Tag color="green">Prediction Report</Tag>
                  </Space>
                </Card>
              </Col>
              {sourceInfo && (
                <Col xs={24} lg={8}>
                  <SourceIndicator
                    sourceInfo={sourceInfo}
                    agentInsights={report?.agent_insights}
                    hasAgentWorkflow={agentTrace.length > 0}
                  />
                </Col>
              )}
            </Row>
          </Space>

          {error && (
          <Alert
            className="mt-4"
            type="error"
            showIcon
            message="AutoMind request failed"
            description={error}
          />
        )}

          {report && (
          <Space direction="vertical" size={16} className="w-100 mt-4">
            <Section title="Executive Summary">
              <BulletList items={report.executive_summary} />
            </Section>

            <Section title="Dataset Overview">
              <DatasetOverview report={report} />
            </Section>

            <Section title="EDA Charts">
              <ChartGrid charts={report.eda?.charts || []} />
            </Section>

            <Section title="Key Data Insights">
              <BulletList items={report.key_insights} />
            </Section>

            <Section title="Agent Insights">
              <AgentInsights insights={report.agent_insights} />
            </Section>

            <Section title="Agent Workflow">
              <AgentWorkflow trace={agentTrace} />
            </Section>

            <Section title="Prediction Task">
              <PredictionTask report={report} />
            </Section>

            <Section title="Prediction Results">
              <ChartGrid charts={report.prediction_results?.charts || []} />
              <Divider />
              <SamplePredictionsTable
                rows={report.prediction_results?.sample_predictions || []}
              />
            </Section>

            <Section title="Model Audit">
              <Paragraph type="secondary">
                Metrics are computed on a validation split for demo auditing
                and are not production guarantees.
              </Paragraph>
              <MetricCards metrics={metrics} />
              <Divider />
              <ChartGrid charts={report.model_audit?.charts || []} />
              <Divider />
              <ConfusionMatrix matrix={report.model_audit?.confusion_matrix} />
            </Section>

            <Section title="Recommendations">
              <BulletList items={report.recommendations} />
            </Section>

            <Section title="Warnings and Limitations">
              {warnings.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message="Warnings"
                  description={<BulletList items={warnings} />}
                  className="mb-3"
                />
              )}
              <BulletList items={limitations} />
            </Section>

            {report.report_markdown && (
              <Collapse>
                <Panel header="Full Markdown Report" key="markdown-report">
                  <MarkdownBlock content={report.report_markdown} />
                </Panel>
              </Collapse>
            )}
          </Space>
        )}
        </div>
      </Content>
    </Layout>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <Card title={props.title} size="small">
      {props.children}
    </Card>
  );
}

function DomainSelector({
  selectedDomain,
  onSelect,
  disabled,
}: {
  selectedDomain: PredictionDomain;
  onSelect: (domain: PredictionDomain) => void;
  disabled: boolean;
}) {
  return (
    <Space direction="vertical" size={6} className="w-100">
      <Text strong>Domain</Text>
      <Space wrap>
        <Button
          type={selectedDomain === 'ecommerce' ? 'primary' : 'default'}
          disabled={disabled}
          onClick={() => onSelect('ecommerce')}
        >
          E-commerce Good Review
        </Button>
        <Button
          type={selectedDomain === 'heart' ? 'primary' : 'default'}
          disabled={disabled}
          onClick={() => onSelect('heart')}
        >
          Heart Disease Classification
        </Button>
      </Space>
    </Space>
  );
}

function ActionBlock({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: 12,
        background: '#fafafa',
      }}
    >
      <Space direction="vertical" size={8} className="w-100">
        <div>
          <Text strong>{title}</Text>
          <div>
            <Text type="secondary">{helper}</Text>
          </div>
        </div>
        {children}
      </Space>
    </div>
  );
}

function SourceIndicator({
  sourceInfo,
  agentInsights,
  hasAgentWorkflow,
}: {
  sourceInfo: SourceInfo;
  agentInsights?: AutoMindReport['agent_insights'];
  hasAgentWorkflow: boolean;
}) {
  const isWren = sourceInfo.source === 'wren';
  const isHeart = sourceInfo.source === 'heart';
  const hasAgentInsights = Boolean(agentInsights);
  const sourceLabel = isHeart
    ? 'Prepared Heart Disease CSV dataset'
    : isWren
      ? 'WrenAI E-commerce sample'
      : 'Built-in AutoMind demo data';

  return (
    <Card title="Current Mode / Source" size="small">
      <Space direction="vertical" size={8}>
        <Tag color={isHeart ? 'volcano' : isWren ? 'geekblue' : 'default'}>
          Source: {sourceLabel}
        </Tag>
        <Tag color={hasAgentInsights ? 'green' : 'default'}>
          InsightAgent: {hasAgentInsights ? 'LLM enriched' : 'Rule-based'}
        </Tag>
        <Tag color={hasAgentWorkflow ? 'green' : 'default'}>
          Agent Workflow: {hasAgentWorkflow ? 'Available' : 'Not available'}
        </Tag>
        {(isWren || isHeart) && (
          <Text>
            Records:{' '}
            {typeof sourceInfo.recordCount === 'number'
              ? sourceInfo.recordCount
              : '-'}
          </Text>
        )}
      </Space>
    </Card>
  );
}

function AgentWorkflow({
  trace,
}: {
  trace?: AutoMindReport['agent_workflow'];
}) {
  if (!trace || trace.length === 0) {
    return (
      <Alert
        type="info"
        showIcon
        message="Agent workflow trace is not available for this response."
      />
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {trace.map((item, index) => (
        <Col xs={24} md={12} xl={8} key={`${item.agent || 'agent'}-${index}`}>
          <Card size="small">
            <Space direction="vertical" size={8} className="w-100">
              <Space wrap>
                <Text strong>{item.agent || `Agent ${index + 1}`}</Text>
                <Tag color={agentStatusColor(item.status)}>
                  {item.status || 'unknown'}
                </Tag>
              </Space>
              {item.message && (
                <Text type="secondary">{item.message}</Text>
              )}
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function agentStatusColor(status?: string) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'success') return 'green';
  if (normalized === 'fallback') return 'orange';
  if (normalized === 'failed' || normalized === 'error') return 'red';
  if (normalized === 'disabled' || normalized === 'skipped') return 'default';
  return 'blue';
}

function AgentInsights({
  insights,
}: {
  insights?: AutoMindReport['agent_insights'];
}) {
  if (!insights) {
    return (
      <Alert
        type="info"
        showIcon
        message="InsightAgent: Rule-based report only"
      />
    );
  }

  return (
    <Space direction="vertical" size={16} className="w-100">
      <Space wrap>
        <Tag color="green">LLM enriched</Tag>
        {insights.provider && <Tag>Provider: {insights.provider}</Tag>}
        {insights.model && <Tag>Model: {insights.model}</Tag>}
      </Space>

      {insights.summary && (
        <div>
          <Text strong>Summary</Text>
          <Paragraph className="mb-0">{insights.summary}</Paragraph>
        </div>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <InsightList
            title="Business Insights"
            items={insights.business_insights}
          />
        </Col>
        <Col xs={24} lg={8}>
          <InsightList
            title="Agent Recommendations"
            items={insights.recommendations}
          />
        </Col>
        <Col xs={24} lg={8}>
          <InsightList title="Risk Notes" items={insights.risk_notes} />
        </Col>
      </Row>
    </Space>
  );
}

function InsightList({ title, items }: { title: string; items?: string[] }) {
  return (
    <div>
      <Text strong>{title}</Text>
      <BulletList items={items} />
    </div>
  );
}

function MetricCards({ metrics }: { metrics?: Record<string, number> }) {
  if (!metrics) return null;

  const metricItems = [
    { label: 'Accuracy', value: metrics.accuracy },
    { label: 'Precision', value: metrics.precision },
    { label: 'Recall', value: metrics.recall },
    { label: 'F1-score', value: metrics.f1 },
  ];

  return (
    <Row gutter={[16, 16]}>
      {metricItems.map((item) => (
        <Col xs={24} sm={12} md={6} key={item.label}>
          <Card size="small">
            <div style={{ color: '#666', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {typeof item.value === 'number' ? item.value.toFixed(3) : '-'}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function DatasetOverview({ report }: { report: AutoMindReport }) {
  const overview = report?.dataset_overview || {};
  const classDistribution = overview.class_distribution || {};

  return (
    <Space direction="vertical" size={16} className="w-100">
      <KeyValueGrid
        items={[
          { label: 'Rows', value: overview.rows },
          { label: 'Columns', value: overview.columns },
          { label: 'Target', value: overview.target },
          { label: 'Numeric columns', value: overview.numeric_columns?.length || 0 },
          {
            label: 'Categorical columns',
            value: overview.categorical_columns?.length || 0,
          },
        ]}
      />
      {Object.keys(classDistribution).length > 0 && (
        <Space wrap>
          {Object.entries(classDistribution).map(([label, value]) => (
            <Tag key={label}>
              {label}: {value}
            </Tag>
          ))}
        </Space>
      )}
    </Space>
  );
}

function PredictionTask({ report }: { report: AutoMindReport }) {
  const task = report?.prediction_task || {};
  return (
    <Space direction="vertical" size={12} className="w-100">
      <KeyValueGrid
        items={[
          { label: 'Task', value: task.task_name },
          { label: 'Target definition', value: task.target_definition },
          { label: 'Selected model', value: task.selected_model },
        ]}
      />
      <div>
        <Text strong>Features used</Text>
        <TagList items={task.features_used || []} />
      </div>
      <div>
        <Text strong>Excluded columns</Text>
        <TagList items={task.excluded_columns || []} />
      </div>
    </Space>
  );
}

function ChartGrid({ charts }: { charts: AutoMindChartSpec[] }) {
  if (!charts.length) {
    return <Alert type="info" showIcon message="No charts available" />;
  }

  return (
    <Row gutter={[16, 16]}>
      {charts.map((chart) => (
        <Col xs={24} xl={12} key={chart.id}>
          <AutoMindChart chart={chart} />
        </Col>
      ))}
    </Row>
  );
}

function SamplePredictionsTable({ rows }: { rows: Array<Record<string, any>> }) {
  const columns: ColumnsType<Record<string, any>> = Object.keys(
    rows[0] || {},
  ).map((key) => ({
    title: key,
    dataIndex: key,
    key,
    render: (value) => String(value),
  }));

  return (
    <Table
      size="small"
      rowKey={(record, index) => `${record.row_index || 'row'}-${index}`}
      columns={columns}
      dataSource={rows}
      pagination={false}
      locale={{ emptyText: 'No sample predictions available' }}
    />
  );
}

function ConfusionMatrix({ matrix }: { matrix?: number[][] }) {
  if (!matrix?.length) {
    return <Alert type="info" showIcon message="No confusion matrix available" />;
  }

  const rows = matrix.map((values, index) => ({
    key: index,
    actual: `Actual ${index}`,
    ...values.reduce(
      (acc, value, predictionIndex) => ({
        ...acc,
        [`predicted_${predictionIndex}`]: value,
      }),
      {},
    ),
  }));

  const columns: ColumnsType<Record<string, any>> = [
    { title: '', dataIndex: 'actual', key: 'actual' },
    ...matrix[0].map((_, index) => ({
      title: `Predicted ${index}`,
      dataIndex: `predicted_${index}`,
      key: `predicted_${index}`,
    })),
  ];

  return <Table size="small" columns={columns} dataSource={rows} pagination={false} />;
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <div>-</div>;

  return (
    <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function KeyValueGrid({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: 8,
      }}
    >
      {items.map((item) => (
        <React.Fragment key={item.label}>
          <div style={{ color: '#666' }}>{item.label}</div>
          <div style={{ fontWeight: 500 }}>{item.value ?? '-'}</div>
        </React.Fragment>
      ))}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) {
    return <Text type="secondary"> None</Text>;
  }

  return (
    <div className="mt-2">
      {items.map((item) => (
        <Tag key={item} className="mb-2">
          {item}
        </Tag>
      ))}
    </div>
  );
}

function normalizeReport(response: AutoMindResponse): AutoMindReport {
  if (!response) return null;
  if (response.report) return response.report;

  return {
    title: 'AutoMind Prediction Report',
    executive_summary: response.insight ? [response.insight] : [],
    dataset_overview: {
      rows: response.summary?.rows,
      target: response.summary?.target,
    },
    eda: {
      summary: [],
      charts: legacyCharts(response.charts, ['class_distribution']),
    },
    key_insights: response.insight ? [response.insight] : [],
    prediction_task: {
      task_name: response.summary?.task,
      selected_model: response.summary?.selected_model,
    },
    prediction_results: {
      sample_predictions: [],
      charts: legacyCharts(response.charts, ['prediction_distribution']),
    },
    model_audit: {
      metrics: response.metrics,
      confusion_matrix: response.metrics?.confusion_matrix as any,
      charts: legacyCharts(response.charts, ['feature_importance']),
    },
    recommendations: [],
    warnings: response.warnings || [],
    limitations: ['Legacy response format detected.'],
  };
}

function legacyCharts(
  charts: AutoMindResponse['charts'],
  keys: string[],
): AutoMindChartSpec[] {
  if (!charts) return [];
  return keys
    .filter((key) => charts[key])
    .map((key) => ({
      id: key,
      title: key.replace(/_/g, ' '),
      type: 'bar',
      data: charts[key],
      x: key === 'feature_importance' ? 'feature' : 'label',
      y: 'value',
    }));
}
