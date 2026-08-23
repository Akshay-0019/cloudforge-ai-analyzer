const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const loading = document.getElementById('loading');
const resultDiv = document.getElementById('result');
let myChart = null;

// Handle click to upload
dropZone.addEventListener('click', () => fileInput.click());

// Handle drag and drop
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#000'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = '#ccc'; });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#ccc';
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) uploadFile(e.target.files[0]);
});

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    loading.style.display = 'block';
    resultDiv.classList.add('hidden');

    try {
        const response = await fetch('http://127.0.0.1:8000/analyze', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.detail || 'Upload failed');
        
        document.getElementById('ai-explanation').textContent = data.explanation;
        drawChart(data.results.forecast);
        resultDiv.classList.remove('hidden');
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        loading.style.display = 'none';
    }
}

function drawChart(forecastData) {
    if (!forecastData) return;
    const ctx = document.getElementById('myChart').getContext('2d');
    
    if (myChart) myChart.destroy(); // Clear old chart
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: forecastData.map(d => d.date),
            datasets: [{
                label: 'Projected Revenue Forecast',
                data: forecastData.map(d => d.value),
                borderColor: '#0066cc',
                backgroundColor: 'rgba(0, 102, 204, 0.1)',
                fill: true,
                tension: 0.1
            }]
        }
    });
}
