import { getCatalogProducts } from './_lib/zalo.js';

export default async function handler(request, response) {
  try {
    const data = await getCatalogProducts();

    response.status(200).json({
      ok: true,
      total: data.total,
      syncedAt: data.syncedAt
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
