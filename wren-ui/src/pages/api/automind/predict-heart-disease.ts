import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const DEFAULT_AUTOMIND_HEART_DISEASE_URL =
  'http://127.0.0.1:8000/predict/heart-disease';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const automindUrl =
    process.env.AUTOMIND_HEART_DISEASE_API_URL ||
    DEFAULT_AUTOMIND_HEART_DISEASE_URL;

  try {
    const response = await axios.post(automindUrl, req.body || {}, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000,
    });

    res.status(response.status).json({
      ...response.data,
      source: 'heart-disease',
      domain: 'Heart Disease Classification',
    });
  } catch (error) {
    const status = axios.isAxiosError(error)
      ? error.response?.status || 502
      : 500;
    const detail = axios.isAxiosError(error)
      ? error.response?.data || error.message
      : error instanceof Error
        ? error.message
        : 'Unknown error';

    res.status(status).json({
      error: 'Failed to call AutoMind-service Heart Disease endpoint',
      automindUrl,
      detail,
    });
  }
}
