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
import AutoMindChart from '@/components/pages/automind/AutoMindChart';
import {
  AutoMindChartSpec,
  AutoMindReport,
  AutoMindResponse,
} from '@/components/pages/automind/types';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

export default function AutoMindPredictionPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>(null);
  const [response, setResponse] = useState<AutoMindResponse>(null);

  const report = useMemo(() => normalizeReport(response), [response]);
  const metrics = report?.model_audit?.metrics || response?.metrics || {};
  const warnings = report?.warnings || response?.warnings || [];
  const limitations = report?.limitations || [];

  const runPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await axios.post<AutoMindResponse>(
        '/api/automind/predict',
        {},
      );
      setResponse(result.data);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.detail ||
          err.response?.data?.error ||
          err.message
        : err instanceof Error
          ? err.message
          : 'Unknown request error';
      setError(String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header
        style={{
          height: 56,
          padding: '0 24px',
          background: '#111827',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
          WrenAI / AutoMind Prediction
        </Text>
      </Header>
      <Content>
        <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
          <Card>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col>
              <Space direction="vertical" size={4}>
                <Title level={2} className="mb-0">
                  AutoMind Prediction
                </Title>
                <Paragraph className="mb-0" type="secondary">
                  E-commerce Good Review Prediction Report
                </Paragraph>
                <Tag color="blue">AutoMind-service: localhost:8000</Tag>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                loading={loading}
                disabled={loading}
                onClick={runPrediction}
              >
                Run Prediction
              </Button>
            </Col>
          </Row>
          </Card>

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
                {report.model_audit?.note ||
                  'Metrics are validation metrics and are not production guarantees.'}
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
