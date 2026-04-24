const AirQualityAPI = (() => {
    const WAQI_TOKEN = 'demo';
    const BASE_URL = 'https://api.waqi.info';

    const CITIES = [
        'beijing', 'shanghai', 'delhi', 'mumbai', 'tokyo', 'osaka',
        'seoul', 'london', 'paris', 'berlin', 'moscow', 'dubai',
        'sydney', 'melbourne', 'new york', 'los angeles', 'chicago',
        'mexico city', 'sao paulo', 'cairo', 'lagos', 'bangkok',
        'singapore', 'hong kong', 'taipei', 'jakarta', 'hanoi',
        'istanbul', 'rome', 'madrid', 'toronto', 'vancouver'
    ];

    const REGIONS = {
        'Asia Pacific': ['beijing', 'shanghai', 'tokyo', 'seoul', 'delhi', 'mumbai', 'bangkok', 'singapore', 'hong kong', 'jakarta'],
        'Europe': ['london', 'paris', 'berlin', 'moscow', 'istanbul', 'rome', 'madrid'],
        'Americas': ['new york', 'los angeles', 'chicago', 'mexico city', 'sao paulo', 'toronto', 'vancouver'],
        'Middle East & Africa': ['dubai', 'cairo', 'lagos'],
        'Oceania': ['sydney', 'melbourne']
    };

    async function fetchCity(city) {
        try {
            const res = await fetch(`${BASE_URL}/feed/${city}/?token=${WAQI_TOKEN}`);
            const data = await res.json();
            if (data.status === 'ok') {
                return data.data;
            }
            return null;
        } catch (e) {
            console.warn(`Failed to fetch ${city}:`, e);
            return null;
        }
    }

    async function fetchGeo(lat, lng) {
        try {
            const res = await fetch(`${BASE_URL}/feed/geo:${lat};${lng}/?token=${WAQI_TOKEN}`);
            const data = await res.json();
            if (data.status === 'ok') {
                return data.data;
            }
            return null;
        } catch (e) {
            console.warn('Failed to fetch geo:', e);
            return null;
        }
    }

    async function searchCity(keyword) {
        try {
            const res = await fetch(`${BASE_URL}/search/?token=${WAQI_TOKEN}&keyword=${encodeURIComponent(keyword)}`);
            const data = await res.json();
            if (data.status === 'ok') {
                return data.data;
            }
            return [];
        } catch (e) {
            console.warn('Search failed:', e);
            return [];
        }
    }

    async function fetchAllCities() {
        const results = {};
        const batches = [];

        for (let i = 0; i < CITIES.length; i += 8) {
            batches.push(CITIES.slice(i, i + 8));
        }

        for (const batch of batches) {
            const promises = batch.map(async (city) => {
                const data = await fetchCity(city);
                if (data) {
                    results[city] = data;
                }
            });
            await Promise.all(promises);
        }

        return results;
    }

    return {
        fetchCity,
        fetchGeo,
        searchCity,
        fetchAllCities,
        CITIES,
        REGIONS
    };
})();
