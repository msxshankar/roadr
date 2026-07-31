export const dynamic = 'force-dynamic';

export async function GET() {
  let unleadedPence = 159.4;
  let source = 'fuelmap.co.uk (Live Feed)';
  let isLive = false;

  try {
    const res = await fetch('https://www.fuelmap.co.uk/api/averages.php', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const unleaded = data.find((item: any) => item.code === 'E10');
        if (unleaded && typeof unleaded.avg_price === 'number') {
          unleadedPence = parseFloat(unleaded.avg_price.toFixed(1));
          isLive = true;
        }
      }
    }
  } catch (err) {
    console.warn('FuelMap live fetch error:', err);
    source = 'fuelmap.co.uk (Fallback)';
  }

  return Response.json({
    success: isLive,
    unleadedPence,
    source,
    updatedAt: new Date().toISOString(),
  });
}
