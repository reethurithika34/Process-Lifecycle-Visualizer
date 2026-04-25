
document.addEventListener('DOMContentLoaded', () => {
    const rawData = sessionStorage.getItem('os_sim_results');
    if (!rawData) {
        document.getElementById('noDataMessage').style.display = 'block';
        return;
    }
    const processes = JSON.parse(rawData);
    if (!processes || processes.length === 0) {
        document.getElementById('noDataMessage').style.display = 'block';
        return;
    }
    document.getElementById('dashboard').style.display = 'grid';
    Chart.defaults.color = '#7a8ba8'; 
    Chart.defaults.font.family = "'Share Tech Mono', monospace";
    Chart.defaults.plugins.tooltip.backgroundColor = '#141820'; 
    Chart.defaults.plugins.tooltip.titleColor = '#e8edf5';      
    Chart.defaults.plugins.tooltip.borderColor = '#2a3650';     
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 4;
    const labels = processes.map(p => `P${p.pid}`);
    const gridColor = 'rgba(255, 255, 255, 0.03)';
    const ctxBar = document.getElementById('barChart').getContext('2d');
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Turnaround Time (TAT)',
                    data: processes.map(p => p.tat),
                    backgroundColor: 'rgba(0, 229, 192, 0.6)', 
                    borderColor: '#00e5c0', 
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Waiting Time (WT)',
                    data: processes.map(p => p.wt),
                    backgroundColor: 'rgba(249, 115, 22, 0.6)',
                    borderColor: '#f97316', 
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Response Time (RT)',
                    data: processes.map(p => p.rt),
                    backgroundColor: 'rgba(56, 189, 248, 0.6)', 
                    borderColor: '#38bdf8', 
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: gridColor },
                    title: { display: true, text: 'Time Units', color: '#3d4f6a' }
                },
                x: { grid: { color: gridColor } }
            }
        }
    });
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    const bgColors = [
        'rgba(34, 197, 94, 0.7)',
        'rgba(56, 189, 248, 0.7)',
        'rgba(168, 85, 247, 0.7)',
        'rgba(249, 115, 22, 0.7)',
        'rgba(236, 72, 153, 0.7)',
        'rgba(234, 179, 8, 0.7)',
        'rgba(20, 184, 166, 0.7)',
        'rgba(139, 92, 246, 0.7)'
    ];
    const borderColors = bgColors.map(c => c.replace('0.7)', '1)'));
    new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: processes.map(p => p.bt),
                backgroundColor: bgColors.slice(0, labels.length) || bgColors[0],
                borderColor: '#0f1218', 
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            },
            cutout: '60%'
        }
    });
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    const sortedProcs = [...processes].sort((a, b) => a.ct - b.ct);
    const lineGradient = ctxLine.createLinearGradient(0, 0, 0, 400);
    lineGradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    lineGradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
    new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: sortedProcs.map(p => `P${p.pid}`),
            datasets: [{
                label: 'Completion Time (CT)',
                data: sortedProcs.map(p => p.ct),
                borderColor: '#22c55e', 
                backgroundColor: lineGradient,
                borderWidth: 2,
                pointBackgroundColor: '#22c55e',
                pointBorderColor: '#0f1218',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: false,
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: gridColor },
                    title: { display: true, text: 'Time Reached', color: '#3d4f6a' }
                },
                x: { grid: { color: gridColor } }
            }
        }
    });
});
