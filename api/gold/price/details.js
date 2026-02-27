export default async function handler(req, res) {
    try {
        const API_URL = process.env.METALPRICE_API_URL || 'https://api.metalpriceapi.com/v1/latest';
        const API_KEY = process.env.METALPRICE_API_KEY;

        let fetchUrl = API_URL;

        // Append API Key
        if (API_KEY && !fetchUrl.includes('api_key=')) {
            fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + `api_key=${API_KEY}`;
        }

        fetchUrl += `&base=USD&currencies=EUR,XAU,XAG,INR`;

        const response = await fetch(fetchUrl);
        const data = await response.json();

        if (!data.success || !data.rates) {
            console.error("MetalPrice API Error response:", data);
            return res.status(500).json({ error: "Failed to fetch rates from MetalPrice API", details: data });
        }

        const rates = data.rates;

        const xauUsd = 1 / rates.XAU;
        const xagUsd = 1 / rates.XAG;
        const usdInr = rates.INR;

        // Gold
        const goldInrPerOunce = xauUsd * usdInr;
        const goldAfterCustoms = goldInrPerOunce * 1.06;
        const goldAfterGst = goldAfterCustoms * 1.03;
        const goldPricePerGramInr = goldAfterGst / 31.103;

        // Silver
        const silverInrPerOunce = xagUsd * usdInr;
        const silverAfterCustoms = silverInrPerOunce * 1.06;
        const silverAfterGst = silverAfterCustoms * 1.03;
        const silverPricePerGramInr = silverAfterGst / 31.103;

        // Set cache headers (cache for 60s on Vercel CDN)
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

        res.status(200).json({
            goldPricePerGramInr,
            silverPricePerGramInr,
            xauUsd,
            xagUsd,
            usdInr,
            goldInrPerOunce,
            goldAfterCustoms,
            goldAfterGst,
            silverInrPerOunce,
            silverAfterCustoms,
            silverAfterGst
        });

    } catch (error) {
        console.error("Error calculating metal prices:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
