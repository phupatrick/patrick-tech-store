import { getCatalogProducts } from './_lib/zalo.js';

export default async function handler(request, response) {
  try {
    const data = await getCatalogProducts();

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    response.status(200).send(JSON.stringify(data));
  } catch (error) {
    response.status(500).json({
      error: 'catalog_sync_failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

