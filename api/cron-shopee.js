import { sincronizarShopee } from '../scripts/sincronizar-shopee.mjs';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // Suporte a Web Fetch API (Edge/Fetch handler)
  if (req && typeof req.headers?.get === 'function') {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    try {
      const result = await sincronizarShopee();
      return new Response(
        JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          marketplace: 'shopee',
          result,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }
      );
    }
  }

  // Suporte a Node.js Serverless Handler (req, res)
  if (req && req.method && req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers?.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await sincronizarShopee();
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      marketplace: 'shopee',
      result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
