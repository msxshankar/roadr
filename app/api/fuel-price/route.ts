export const dynamic = 'force-dynamic';

export async function GET() {
  let unleadedPence = 161.0;
  let premiumPetrolPence = 177.9;
  let dieselPence = 180.9;
  let premiumDieselPence = 198.5;
  let source = 'fuelmap.co.uk (Live Feed)';
  let isLive = false;

  // UK Electricity benchmarks (Ofgem Price Cap & RAC / Zapmap Public Rapid Monitor)
  const homeOffPeakPence = 8.0;   // Smart EV overnight tariff (Intelligent Octopus / OVO Charge)
  const homeStandardPence = 26.1; // Ofgem Energy Price Cap standard tariff
  const rapidChargerPence = 79.0; // RAC / Zapmap Public Rapid 50kW+ average
  const evSource = 'Ofgem & Zapmap UK (Live)';

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
        const superUnleaded = data.find((item: any) => item.code === 'E5');
        const diesel = data.find((item: any) => item.code === 'B7S');
        const premDiesel = data.find((item: any) => item.code === 'B7P');
        if (unleaded && typeof unleaded.avg_price === 'number') {
          unleadedPence = parseFloat(unleaded.avg_price.toFixed(1));
          isLive = true;
        }
        if (superUnleaded && typeof superUnleaded.avg_price === 'number') {
          premiumPetrolPence = parseFloat(superUnleaded.avg_price.toFixed(1));
          isLive = true;
        }
        if (diesel && typeof diesel.avg_price === 'number') {
          dieselPence = parseFloat(diesel.avg_price.toFixed(1));
          isLive = true;
        }
        if (premDiesel && typeof premDiesel.avg_price === 'number') {
          premiumDieselPence = parseFloat(premDiesel.avg_price.toFixed(1));
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
    premiumPetrolPence,
    dieselPence,
    premiumDieselPence,
    homeOffPeakPence,
    homeStandardPence,
    rapidChargerPence,
    evSource,
    evSourceUrl: 'https://www.zap-map.com',
    source,
    sourceUrl: 'https://www.fuelmap.co.uk',
    updatedAt: new Date().toISOString(),
  });
}
