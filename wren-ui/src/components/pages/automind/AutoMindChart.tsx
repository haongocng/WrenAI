import dynamic from 'next/dynamic';
import { Alert, Card, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TopLevelSpec } from 'vega-lite';
import { AutoMindChartSpec } from './types';

const { Paragraph, Text } = Typography;

const WrenChart = dynamic(() => import('@/components/chart'), {
  ssr: false,
  loading: () => <div style={{ padding: 16 }}>Loading chart...</div>,
});

interface Props {
  chart: AutoMindChartSpec;
  showDataTable?: boolean;
}

export function buildVegaSpec(chart: AutoMindChartSpec): TopLevelSpec {
  const xField = chart.x || 'label';
  const yField = chart.y || 'value';
  const colorField = chart.color || 'value';
  const type = chart.type || 'bar';
  const tooltip = tooltipFields(chart);

  if (isHeatmapChart(chart)) {
    return {
      title: chart.title,
      mark: 'rect',
      encoding: {
        x: { field: xField, type: 'nominal', sort: null, axis: { labelAngle: -35 } },
        y: { field: yField, type: 'nominal', sort: null },
        color: heatmapColorEncoding(chart, colorField),
        tooltip,
      },
    } as TopLevelSpec;
  }

  if (type === 'grouped_bar') {
    return {
      title: chart.title,
      mark: 'bar',
      encoding: {
        x: { field: xField, type: 'nominal', sort: null, axis: { labelAngle: -25 } },
        y: { field: yField, type: 'quantitative' },
        color: chart.color ? { field: chart.color, type: 'nominal' } : undefined,
        xOffset: chart.color ? { field: chart.color } : undefined,
        tooltip,
      },
    } as any;
  }

  if (type === 'pie' || type === 'donut') {
    return {
      title: chart.title,
      mark: type === 'donut' ? { type: 'arc', innerRadius: 60 } : 'arc',
      encoding: {
        theta: { field: yField, type: 'quantitative' },
        color: { field: xField, type: 'nominal' },
        tooltip,
      },
    } as TopLevelSpec;
  }

  if (type === 'line') {
    return {
      title: chart.title,
      mark: 'line',
      encoding: {
        x: { field: xField, type: 'nominal', sort: null },
        y: { field: yField, type: 'quantitative' },
        tooltip,
      },
    } as TopLevelSpec;
  }

  return {
    title: chart.title,
    mark: 'bar',
    encoding: {
      x: { field: xField, type: 'nominal', sort: '-y', axis: { labelAngle: -25 } },
      y: { field: yField, type: 'quantitative' },
      color: chart.color ? { field: chart.color, type: 'nominal' } : undefined,
      tooltip,
    },
  } as TopLevelSpec;
}

function heatmapColorEncoding(chart: AutoMindChartSpec, colorField: string) {
  if (chart.kind === 'correlation_heatmap') {
    return {
      field: colorField,
      type: 'quantitative',
      scale: { domain: [-1, 1], scheme: 'redblue' },
    };
  }

  return {
    field: colorField,
    type: 'quantitative',
    scale: { scheme: 'blues' },
  };
}

function isHeatmapChart(chart: AutoMindChartSpec) {
  const kind = chart.kind || '';
  return (
    chart.type === 'heatmap' ||
    kind.includes('heatmap') ||
    kind === 'confusion_matrix'
  );
}

function tooltipFields(chart: AutoMindChartSpec) {
  return Object.keys(chart.data?.[0] || {}).map((field) => ({ field }));
}

function chartWidth(chart: AutoMindChartSpec) {
  return isHeatmapChart(chart) ? 620 : 560;
}

function chartHeight(chart: AutoMindChartSpec) {
  if (isHeatmapChart(chart)) return 380;
  if (chart.type === 'grouped_bar') return 340;
  return 320;
}

export default function AutoMindChart({ chart, showDataTable = true }: Props) {
  const values = chart.data || [];
  const columns: ColumnsType<Record<string, any>> = Object.keys(
    values[0] || {},
  ).map((key) => ({
    title: key,
    dataIndex: key,
    key,
    render: (value) => String(value),
  }));

  return (
    <Card size="small" title={chart.title || chart.id} style={{ overflowX: 'auto' }}>
      {chart.description && (
        <Text type="secondary" className="d-block mb-2">
          {chart.description}
        </Text>
      )}
      {values.length > 0 ? (
        <WrenChart
          spec={buildVegaSpec(chart) as any}
          values={values}
          width={chartWidth(chart)}
          height={chartHeight(chart)}
          hideActions
          hideTitle={false}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          message="No chart data available"
          className="mb-3"
        />
      )}
      {chart.analysis && <ChartInsight analysis={chart.analysis} />}
      {showDataTable && values.length > 0 && (
        <Table
          className="mt-3"
          size="small"
          rowKey={(_, index) => `${chart.id}-${index}`}
          columns={columns}
          dataSource={values}
          pagination={false}
        />
      )}
    </Card>
  );
}

function ChartInsight({
  analysis,
}: {
  analysis: NonNullable<AutoMindChartSpec['analysis']>;
}) {
  return (
    <div
      className="mt-3"
      style={{
        borderTop: '1px solid #f0f0f0',
        paddingTop: 12,
      }}
    >
      <Text strong>Chart Insight</Text>
      {analysis.headline && (
        <div className="mt-2">
          <Text strong>{analysis.headline}</Text>
        </div>
      )}
      {analysis.what_it_shows && (
        <Paragraph className="mb-2" type="secondary">
          {analysis.what_it_shows}
        </Paragraph>
      )}
      {analysis.key_observations?.length > 0 && (
        <ul style={{ marginBottom: 8, paddingLeft: 20 }}>
          {analysis.key_observations.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      {analysis.interpretation && (
        <Paragraph className="mb-2">{analysis.interpretation}</Paragraph>
      )}
      {analysis.caveat && (
        <Text type="secondary">Caveat: {analysis.caveat}</Text>
      )}
    </div>
  );
}
