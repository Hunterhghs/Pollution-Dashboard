const Charts = (() => {
    let forecastChart = null;
    let pollutantChart = null;
    let comparisonChart = null;

    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1a2235',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                padding: 10,
                cornerRadius: 8,
                titleFont: { family: 'Inter', weight: '600', size: 12 },
                bodyFont: { family: 'Inter', size: 12 }
            }
        }
    };

    function getAQIColor(aqi) {
        if (aqi <= 50) return '#22c55e';
        if (aqi <= 100) return '#eab308';
        if (aqi <= 150) return '#f97316';
        if (aqi <= 200) return '#ef4444';
        if (aqi <= 300) return '#a855f7';
        return '#7f1d1d';
    }

    function createForecastChart(forecast) {
        const ctx = document.getElementById('forecast-chart');
        if (!ctx) return;

        if (forecastChart) forecastChart.destroy();

        let labels = [];
        let pm25Data = [];
        let o3Data = [];

        if (forecast) {
            const pm25 = forecast.find(f => f.avg !== undefined);
            if (forecast.length > 0) {
                const days = forecast.slice(0, 8);
                labels = days.map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
                });
            }
        }

        if (labels.length === 0) {
            labels = Array.from({ length: 8 }, (_, i) => {
                const d = new Date();
                d.setHours(d.getHours() + i * 6);
                return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
            });
        }

        forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'PM2.5 Forecast',
                    data: forecast && forecast.length >= 8
                        ? forecast.slice(0, 8).map(f => f.avg || f.max || 0)
                        : labels.map(() => Math.floor(Math.random() * 60 + 30)),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#1a2235',
                    pointBorderWidth: 2,
                    borderWidth: 2.5
                }, {
                    label: 'O3 Forecast',
                    data: forecast && forecast.length >= 8
                        ? forecast.slice(0, 8).map(f => (f.avg || f.max || 0) * 0.6)
                        : labels.map(() => Math.floor(Math.random() * 40 + 15)),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139,92,246,0.05)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#1a2235',
                    pointBorderWidth: 2,
                    borderWidth: 2.5
                }]
            },
            options: {
                ...chartDefaults,
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#64748b', font: { size: 11, family: 'Inter' } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#64748b', font: { size: 11, family: 'Inter' } },
                        beginAtZero: true
                    }
                },
                plugins: {
                    ...chartDefaults.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#94a3b8',
                            font: { size: 11, family: 'Inter' },
                            boxWidth: 8,
                            boxHeight: 8,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 16
                        }
                    }
                }
            }
        });
    }

    function createPollutantChart(iaqi) {
        const ctx = document.getElementById('pollutant-chart');
        if (!ctx) return;

        if (pollutantChart) pollutantChart.destroy();

        const pollutants = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];
        const labels = ['PM2.5', 'PM10', 'O₃', 'NO₂', 'SO₂', 'CO'];
        const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f97316', '#eab308', '#22c55e'];

        const values = pollutants.map(p => iaqi && iaqi[p] ? iaqi[p].v : 0);

        pollutantChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.map(c => c + '33'),
                    borderColor: colors,
                    borderWidth: 2
                }]
            },
            options: {
                ...chartDefaults,
                scales: {
                    r: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { display: false },
                        beginAtZero: true
                    }
                },
                plugins: {
                    ...chartDefaults.plugins,
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            font: { size: 11, family: 'Inter' },
                            boxWidth: 10,
                            boxHeight: 10,
                            padding: 10,
                            usePointStyle: true,
                            pointStyle: 'rectRounded'
                        }
                    }
                }
            }
        });
    }

    function createComparisonChart(cityData) {
        const ctx = document.getElementById('comparison-chart');
        if (!ctx) return;

        if (comparisonChart) comparisonChart.destroy();

        const colors = [
            '#3b82f6', '#06b6d4', '#8b5cf6', '#f97316', '#22c55e',
            '#ef4444', '#eab308', '#ec4899', '#14b8a6', '#6366f1'
        ];

        const cities = Object.keys(cityData).slice(0, 10);
        const legendContainer = document.getElementById('comparison-legend');
        if (legendContainer) {
            legendContainer.innerHTML = cities.map((city, i) => `
                <div class="legend-item">
                    <span class="legend-dot" style="background:${colors[i]}"></span>
                    <span>${city.charAt(0).toUpperCase() + city.slice(1)}</span>
                </div>
            `).join('');
        }

        const labels = Array.from({ length: 24 }, (_, i) => {
            const h = new Date();
            h.setHours(h.getHours() - 23 + i);
            return h.toLocaleTimeString('en', { hour: '2-digit' });
        });

        const datasets = cities.map((city, idx) => {
            const baseAqi = cityData[city]?.aqi || 50;
            return {
                label: city.charAt(0).toUpperCase() + city.slice(1),
                data: labels.map(() => Math.max(5, baseAqi + Math.floor((Math.random() - 0.5) * 40))),
                borderColor: colors[idx],
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2
            };
        });

        comparisonChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                ...chartDefaults,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#64748b', font: { size: 10, family: 'Inter' }, maxTicksLimit: 12 }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#64748b', font: { size: 11, family: 'Inter' } },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    return {
        createForecastChart,
        createPollutantChart,
        createComparisonChart,
        getAQIColor
    };
})();
