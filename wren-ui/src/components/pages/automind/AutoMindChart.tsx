import dynamic from 'next/dynamic';
import { Alert, Card, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TopLevelSpec } from 'vega-lite';
import { AutoMindChartSpec } from './types';

const { Text } = Typography;

const WrenChart = dynamic(() => import('@/components/chart'), {
  ssr: false,
  loading: () => <div style={{ padding: 16 }}>Loading chart...</div>,
});

interface Props {
  chart: AutoMindChartSpec;
}

export function buildVegaSpec(chart: AutoMindChartSpec): TopLevelSpec {
  const xField = chart.x || 'label';
  const yField = chart.y || 'value';
  const type = chart.type || 'bar';

  if (type === 'pie' || type === 'donut') {
    return {
      title: chart.title,
      mark: type === 'donut' ? { type: 'arc', innerRadius: 60 } : 'arc',
      encoding: {
        theta: { field: yField, type: 'quantitative' },
        color: { field: xField, type: 'nominal' },
        tooltip: [{ field: xField }, { field: yField }],
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
        tooltip: Object.keys(chart.data?.[0] || {}).map((field) => ({ field })),
      },
    } as TopLevelSpec;
  }

  return {
    title: chart.title,
    mark: 'bar',
    encoding: {
      x: { field: xField, type: 'nominal', sort: '-y' },
      y: { field: yField, type: 'quantitative' },
      tooltip: Object.keys(chart.data?.[0] || {}).map((field) => ({ field })),
    },
  } as TopLevelSpec;
}

export default function AutoMindChart({ chart }: Props) {
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
    <Card size="small" title={chart.title || chart.id}>
      {chart.description && (
        <Text type="secondary" className="d-block mb-2">
          {chart.description}
        </Text>
      )}
      {values.length > 0 ? (
        <WrenChart
          spec={buildVegaSpec(chart) as any}
          values={values}
          width={560}
          height={320}
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
      {values.length > 0 && (
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
