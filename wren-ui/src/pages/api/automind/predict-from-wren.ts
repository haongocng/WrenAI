import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { components } from '@/common';
import type { PreviewDataResponse } from '@server/services/queryService';
import { transformToObjects } from '@server/utils/dataUtils';
import { ECOMMERCE_GOOD_REVIEW_SQL } from '@/utils/automind/ecommerceGoodReviewSql';

const DEFAULT_AUTOMIND_URL =
  'http://127.0.0.1:8000/predict/ecommerce-good-review';
const QUERY_LIMIT = 1000;

const { projectService, deployService, queryService } = components;

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail || error.response?.data?.error;
    if (typeof detail === 'string') return detail;
    if (detail) return JSON.stringify(detail);
    return error.message;
  }

  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const automindUrl = process.env.AUTOMIND_API_URL || DEFAULT_AUTOMIND_URL;

  try {
    const project = await projectService.getCurrentProject();
    if (!project) {
      res.status(400).json({
        error: 'No current WrenAI project found',
        detail: 'Please connect or select the WrenAI E-commerce sample project first.',
      });
      return;
    }

    const deployment = await deployService.getLastDeployment(project.id);
    if (!deployment) {
      res.status(400).json({
        error: 'No WrenAI deployment found',
        detail: 'Please deploy the current WrenAI project before running AutoMind with WrenAI data.',
      });
      return;
    }

    let queryResult: PreviewDataResponse;
    try {
      const result = await queryService.preview(ECOMMERCE_GOOD_REVIEW_SQL, {
        project,
        limit: QUERY_LIMIT,
        manifest: deployment.manifest,
        modelingOnly: false,
      });

      if (typeof result === 'boolean') {
        res.status(500).json({
          error: 'Unexpected SQL execution result',
          detail: 'WrenAI query preview returned a boolean result instead of row-level records.',
        });
        return;
      }

      queryResult = result as PreviewDataResponse;
    } catch (error) {
      res.status(400).json({
        error: 'Failed to execute WrenAI E-commerce SQL',
        detail: getErrorMessage(error),
      });
      return;
    }

    const records = transformToObjects(queryResult.columns, queryResult.data);

    if (!records.length) {
      res.status(400).json({
        error: 'WrenAI SQL returned no records',
        detail: 'The predefined E-commerce query ran successfully but returned no row-level records.',
      });
      return;
    }

    const payload = {
      data: records,
      target_column: 'review_score',
      task_type: 'classification',
      target_transform: {
        type: 'binary_threshold',
        operator: '>=',
        threshold: 4,
        positive_name: 'good_review',
      },
      exclude_columns: ['order_id'],
      metadata: {
        source: 'wrenai-ecommerce-sample',
        query_type: 'predefined_order_level_flattening',
        record_count: records.length,
      },
    };

    try {
      const automindResponse = await axios.post(automindUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000,
      });

      res.status(automindResponse.status).json({
        ...automindResponse.data,
        source: 'wrenai',
        record_count: records.length,
      });
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status || 502
        : 502;

      res.status(status).json({
        error: 'Failed to call AutoMind-service with WrenAI records',
        automindUrl,
        record_count: records.length,
        detail: getErrorMessage(error),
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to run AutoMind prediction from WrenAI data',
      detail: getErrorMessage(error),
    });
  }
}
