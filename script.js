// Initialize map
var map = L.map('map').setView([22.72, 75.85], 13);

// Load tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: ''
}).addTo(map);

// Empty chart (no data)
const ctx = document.getElementById('aqiChart');

new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'AQI Trend',
      data: [],
      borderWidth: 2
    }]
  },
  options: {
    responsive: true
  }
});