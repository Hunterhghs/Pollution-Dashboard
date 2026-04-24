const App = (() => {
    let allCityData = {};
    let currentCity = 'beijing';
    let searchTimeout = null;

    const AQI_LEVELS = [
        { max: 50, label: 'Good', class: 'good', desc: 'Air quality is satisfactory with little to no risk.', tip: 'Enjoy outdoor activities freely.' },
        { max: 100, label: 'Moderate', class: 'moderate', desc: 'Acceptable air quality. Some pollutants may be a concern for sensitive individuals.', tip: 'Unusually sensitive people should reduce prolonged outdoor exertion.' },
        { max: 150, label: 'Unhealthy for Sensitive', class: 'unhealthy-sg', desc: 'Members of sensitive groups may experience health effects.', tip: 'Children, elderly, and those with respiratory conditions should limit outdoor activity.' },
        { max: 200, label: 'Unhealthy', class: 'unhealthy', desc: 'Everyone may begin to experience health effects.', tip: 'Everyone should reduce prolonged outdoor exertion. Wear masks if going outside.' },
        { max: 300, label: 'Very Unhealthy', class: 'very-unhealthy', desc: 'Health warnings of emergency conditions. The entire population is affected.', tip: 'Avoid outdoor activities. Keep windows closed. Use air purifiers indoors.' },
        { max: 999, label: 'Hazardous', class: 'hazardous', desc: 'Health alert: everyone may experience serious health effects.', tip: 'Stay indoors. Seal windows. Use N95 masks if you must go outside.' }
    ];

    function getAQILevel(aqi) {
        return AQI_LEVELS.find(l => aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
    }

    function getAQIColor(aqi) {
        return Charts.getAQIColor(aqi);
    }

    function updateHeroCard(data) {
        if (!data) return;

        const aqi = data.aqi || 0;
        const level = getAQILevel(aqi);
        const color = getAQIColor(aqi);

        document.getElementById('hero-city').textContent = data.city?.name?.split(',')[0] || currentCity;
        document.getElementById('hero-station').textContent = data.city?.name || '';
        document.getElementById('aqi-value').textContent = aqi;
        document.getElementById('aqi-level').textContent = level.label;
        document.getElementById('aqi-level').style.color = color;
        document.getElementById('aqi-description').textContent = level.desc;
        document.getElementById('aqi-health-tip').textContent = level.tip;
        document.getElementById('aqi-health-tip').style.borderLeftColor = color;

        const progress = document.getElementById('aqi-progress');
        const circumference = 2 * Math.PI * 70;
        const offset = circumference - (Math.min(aqi, 500) / 500) * circumference;
        progress.style.strokeDasharray = circumference;
        progress.style.strokeDashoffset = offset;
        progress.style.stroke = color;

        document.querySelector('.aqi-number').style.color = color;

        const heroCard = document.getElementById('hero-card');
        heroCard.style.background = `linear-gradient(135deg, var(--bg-card) 0%, ${color}10 100%)`;

        if (data.iaqi) {
            document.getElementById('weather-temp').textContent = data.iaqi.t ? `${data.iaqi.t.v}°C` : '--';
            document.getElementById('weather-humidity').textContent = data.iaqi.h ? `${data.iaqi.h.v}%` : '--';
            document.getElementById('weather-wind').textContent = data.iaqi.w ? `${data.iaqi.w.v} m/s` : '--';
            document.getElementById('weather-pressure').textContent = data.iaqi.p ? `${data.iaqi.p.v} hPa` : '--';
        }
    }

    function updatePollutantGrid(iaqi) {
        const grid = document.getElementById('pollutant-grid');
        if (!grid) return;

        const pollutants = [
            { key: 'pm25', name: 'PM2.5', unit: 'μg/m³', max: 500 },
            { key: 'pm10', name: 'PM10', unit: 'μg/m³', max: 500 },
            { key: 'o3', name: 'Ozone (O₃)', unit: 'ppb', max: 300 },
            { key: 'no2', name: 'Nitrogen Dioxide', unit: 'ppb', max: 200 },
            { key: 'so2', name: 'Sulfur Dioxide', unit: 'ppb', max: 200 },
            { key: 'co', name: 'Carbon Monoxide', unit: 'ppm', max: 50 }
        ];

        grid.innerHTML = pollutants.map(p => {
            const value = iaqi && iaqi[p.key] ? iaqi[p.key].v : null;
            const percentage = value !== null ? Math.min((value / p.max) * 100, 100) : 0;
            const color = value !== null ? getAQIColor(value) : '#64748b';

            return `
                <div class="pollutant-card">
                    <div class="pollutant-name">${p.name}</div>
                    <div class="pollutant-value" style="color: ${color}">${value !== null ? value : '--'}</div>
                    <div class="pollutant-unit">${p.unit}</div>
                    <div class="pollutant-bar">
                        <div class="pollutant-bar-fill" style="width: ${percentage}%; background: ${color}"></div>
                    </div>
                    <style>.pollutant-card:nth-child(${pollutants.indexOf(p) + 1})::after { background: ${color}; }</style>
                </div>
            `;
        }).join('');
    }

    function updateCitiesGrid() {
        const grid = document.getElementById('cities-grid');
        if (!grid) return;

        grid.innerHTML = Object.entries(allCityData)
            .filter(([_, data]) => data && data.aqi)
            .sort((a, b) => b[1].aqi - a[1].aqi)
            .map(([city, data]) => {
                const aqi = data.aqi;
                const level = getAQILevel(aqi);
                const color = getAQIColor(aqi);
                const cityName = data.city?.name?.split(',')[0] || city;

                return `
                    <div class="city-card" onclick="App.selectCity('${city}')">
                        <div class="city-info">
                            <h4>${cityName}</h4>
                            <p>${level.label}</p>
                        </div>
                        <div class="city-aqi">
                            <div class="city-aqi-value" style="color: ${color}">${aqi}</div>
                            <div class="city-aqi-label">AQI</div>
                        </div>
                    </div>
                `;
            }).join('');
    }

    function updateMapView() {
        const grid = document.getElementById('map-grid');
        if (!grid) return;

        grid.innerHTML = Object.entries(AirQualityAPI.REGIONS).map(([region, cities]) => {
            const regionData = cities
                .map(c => allCityData[c])
                .filter(Boolean);

            const avgAqi = regionData.length > 0
                ? Math.round(regionData.reduce((s, d) => s + (d.aqi || 0), 0) / regionData.length)
                : '--';

            const color = typeof avgAqi === 'number' ? getAQIColor(avgAqi) : '#64748b';

            return `
                <div class="map-region-card">
                    <div class="region-header">
                        <span class="region-name">${region}</span>
                        <span class="region-avg-aqi" style="color: ${color}">${avgAqi}</span>
                    </div>
                    <div class="region-cities">
                        ${cities.slice(0, 6).map(c => {
                            const d = allCityData[c];
                            const a = d?.aqi || '--';
                            const col = typeof a === 'number' ? getAQIColor(a) : '#64748b';
                            return `
                                <div class="region-city-row">
                                    <span>${c.charAt(0).toUpperCase() + c.slice(1)}</span>
                                    <span class="region-city-aqi" style="background: ${col}">${a}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateTrendsView() {
        Charts.createComparisonChart(allCityData);

        const container = document.getElementById('trends-cards');
        if (!container) return;

        container.innerHTML = Object.entries(allCityData)
            .filter(([_, d]) => d && d.aqi)
            .slice(0, 9)
            .map(([city, data]) => {
                const aqi = data.aqi;
                const level = getAQILevel(aqi);
                const color = getAQIColor(aqi);
                const name = data.city?.name?.split(',')[0] || city;
                const pm25 = data.iaqi?.pm25?.v || '--';
                const o3 = data.iaqi?.o3?.v || '--';

                return `
                    <div class="trend-card">
                        <div class="trend-card-header">
                            <h4>${name}</h4>
                            <span class="trend-badge" style="background: ${color}">${level.label}</span>
                        </div>
                        <div class="trend-stats">
                            <div class="trend-stat">
                                <div class="trend-stat-label">AQI</div>
                                <div class="trend-stat-value" style="color: ${color}">${aqi}</div>
                            </div>
                            <div class="trend-stat">
                                <div class="trend-stat-label">PM2.5</div>
                                <div class="trend-stat-value">${pm25}</div>
                            </div>
                            <div class="trend-stat">
                                <div class="trend-stat-label">O₃</div>
                                <div class="trend-stat-value">${o3}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
    }

    function updateRankings(sort = 'worst') {
        const list = document.getElementById('rankings-list');
        if (!list) return;

        const sorted = Object.entries(allCityData)
            .filter(([_, d]) => d && d.aqi)
            .sort((a, b) => sort === 'worst' ? b[1].aqi - a[1].aqi : a[1].aqi - b[1].aqi);

        list.innerHTML = sorted.map(([city, data], i) => {
            const aqi = data.aqi;
            const level = getAQILevel(aqi);
            const color = getAQIColor(aqi);
            const name = data.city?.name?.split(',')[0] || city;
            const station = data.city?.name || '';
            const barWidth = Math.min((aqi / 500) * 100, 100);

            return `
                <div class="ranking-item">
                    <span class="ranking-position ${i < 3 ? 'top-3' : ''}">${i + 1}</span>
                    <div class="ranking-info">
                        <div class="ranking-city">${name}</div>
                        <div class="ranking-station">${station}</div>
                    </div>
                    <div class="ranking-aqi-bar">
                        <div class="ranking-aqi-bar-fill" style="width: ${barWidth}%; background: ${color}"></div>
                    </div>
                    <span class="ranking-aqi-value" style="color: ${color}">${aqi}</span>
                    <span class="ranking-level" style="background: ${color}">${level.label}</span>
                </div>
            `;
        }).join('');
    }

    function setupNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;

                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById(`view-${view}`).classList.add('active');

                if (view === 'map') updateMapView();
                if (view === 'trends') updateTrendsView();
                if (view === 'rankings') updateRankings('worst');
            });
        });
    }

    function setupSearch() {
        const input = document.getElementById('city-search');
        const results = document.getElementById('search-results');

        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = input.value.trim();

            if (query.length < 2) {
                results.classList.add('hidden');
                return;
            }

            searchTimeout = setTimeout(async () => {
                const data = await AirQualityAPI.searchCity(query);
                if (data.length > 0) {
                    results.innerHTML = data.slice(0, 8).map(item => {
                        const aqi = item.aqi && item.aqi !== '-' ? item.aqi : '--';
                        const color = typeof aqi === 'number' ? getAQIColor(aqi) : '#64748b';
                        return `
                            <div class="search-result-item" data-uid="${item.uid}">
                                <span>${item.station?.name || 'Unknown'}</span>
                                <span class="result-aqi" style="background: ${color}">${aqi}</span>
                            </div>
                        `;
                    }).join('');
                    results.classList.remove('hidden');

                    results.querySelectorAll('.search-result-item').forEach(el => {
                        el.addEventListener('click', async () => {
                            const uid = el.dataset.uid;
                            results.classList.add('hidden');
                            input.value = el.querySelector('span').textContent;
                            const cityData = await AirQualityAPI.fetchCity(`@${uid}`);
                            if (cityData) {
                                updateHeroCard(cityData);
                                updatePollutantGrid(cityData.iaqi);
                                Charts.createPollutantChart(cityData.iaqi);
                                updateForecast(cityData);
                            }
                        });
                    });
                } else {
                    results.classList.add('hidden');
                }
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                results.classList.add('hidden');
            }
        });
    }

    function setupGeoButton() {
        document.getElementById('geo-btn').addEventListener('click', () => {
            if (!navigator.geolocation) return;

            navigator.geolocation.getCurrentPosition(async (pos) => {
                const data = await AirQualityAPI.fetchGeo(pos.coords.latitude, pos.coords.longitude);
                if (data) {
                    updateHeroCard(data);
                    updatePollutantGrid(data.iaqi);
                    Charts.createPollutantChart(data.iaqi);
                    updateForecast(data);
                }
            });
        });
    }

    function setupRefreshButton() {
        const btn = document.getElementById('refresh-btn');
        btn.addEventListener('click', async () => {
            btn.classList.add('spinning');
            await loadAllData();
            btn.classList.remove('spinning');
        });
    }

    function setupRankingControls() {
        document.querySelectorAll('.rank-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.rank-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateRankings(btn.dataset.sort);
            });
        });
    }

    function updateForecast(data) {
        let forecastData = null;
        if (data.forecast?.daily?.pm25) {
            forecastData = data.forecast.daily.pm25;
        }
        Charts.createForecastChart(forecastData);
    }

    function selectCity(city) {
        currentCity = city;
        const data = allCityData[city];
        if (data) {
            updateHeroCard(data);
            updatePollutantGrid(data.iaqi);
            Charts.createPollutantChart(data.iaqi);
            updateForecast(data);

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelector('[data-view="overview"]').classList.add('active');
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-overview').classList.add('active');

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    async function loadAllData() {
        allCityData = await AirQualityAPI.fetchAllCities();

        const firstCity = Object.keys(allCityData)[0];
        if (firstCity) {
            currentCity = firstCity;
            const data = allCityData[firstCity];
            updateHeroCard(data);
            updatePollutantGrid(data.iaqi);
            Charts.createPollutantChart(data.iaqi);
            updateForecast(data);
        }

        updateCitiesGrid();

        const now = new Date();
        document.getElementById('last-update-time').textContent =
            now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    }

    async function init() {
        setupNav();
        setupSearch();
        setupGeoButton();
        setupRefreshButton();
        setupRankingControls();

        await loadAllData();

        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 500);

        setInterval(loadAllData, 10 * 60 * 1000);
    }

    document.addEventListener('DOMContentLoaded', init);

    return { selectCity };
})();
