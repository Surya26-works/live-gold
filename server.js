import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.static('public'));

// Fetch configuration from Environment Variables as defined in Spring application.properties
const PORT = process.env.PORT || 8080;
const API_URL = process.env.METALPRICE_API_URL || 'https://api.metalpriceapi.com/v1/latest';
const API_KEY = process.env.METALPRICE_API_KEY;

// In-memory cache to prevent burning API quota
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 60000; // 60 seconds

app.get('/api/gold/price/details', async (req, res) => {
    try {
        const now = Date.now();

        // Serve from cache if valid
        if (cachedData && (now - lastFetchTime < CACHE_DURATION_MS)) {
            console.log("Serving from cache...");
            return res.json(cachedData);
        }

        console.log("Fetching fresh data from MetalPrice API...");
        let fetchUrl = API_URL;

        // Append API Key if it isn't already part of the URL
        if (API_KEY && !fetchUrl.includes('api_key=')) {
            fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + `api_key=${API_KEY}`;
        }

        // Append base and requested currencies as specified by user
        // Note: I also appended INR because your calculations rely on USD to INR conversion.
        fetchUrl += `&base=USD&currencies=EUR,XAU,XAG,INR`;

        // Fetch prices from external API
        const response = await fetch(fetchUrl);
        const data = await response.json();

        if (!data.success || !data.rates) {
            console.error("MetalPrice API Error response:", data);

            // If API fails but we have stale cache, return it as fallback rather than failing
            if (cachedData) {
                console.log("Fallback to stale cache due to API error.");
                return res.json(cachedData);
            }

            return res.status(500).json({ error: "Failed to fetch rates from MetalPrice API", details: data });
        }

        const rates = data.rates;

        // Exchange Rates
        // API returns: 1 USD = X XAU/XAG. We need 1 XAU/XAG = ? USD -> invert
        const xauUsd = 1 / rates.XAU;
        const xagUsd = 1 / rates.XAG;
        const usdInr = rates.INR;

        // ================= GOLD =================
        const goldInrPerOunce = xauUsd * usdInr;
        const goldAfterCustoms = goldInrPerOunce * 1.06; // Add 6% customs
        const goldAfterGst = goldAfterCustoms * 1.03;   // Add 3% GST
        const goldPricePerGramInr = goldAfterGst / 31.103;

        // ================= SILVER =================
        const silverInrPerOunce = xagUsd * usdInr;
        const silverAfterCustoms = silverInrPerOunce * 1.06;
        const silverAfterGst = silverAfterCustoms * 1.03;
        const silverPricePerGramInr = silverAfterGst / 31.103;

        // Return final JSON response with calculation breakdown
        const responseData = {
            goldPricePerGramInr,
            silverPricePerGramInr,
            xauUsd,
            xagUsd,
            usdInr,
            // Calculation breakdown
            goldInrPerOunce,
            goldAfterCustoms,
            goldAfterGst,
            silverInrPerOunce,
            silverAfterCustoms,
            silverAfterGst
        };

        // Update cache
        cachedData = responseData;
        lastFetchTime = Date.now();

        res.json(responseData);

    } catch (error) {
        console.error("Error calculating metal prices:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
