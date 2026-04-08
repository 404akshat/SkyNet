// 1. Supabase Configuration
const supabaseUrl = 'https://krcbtbzrtbotejoyxmzr.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyY2J0YnpydGJvdGVqb3l4bXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjU3NjEsImV4cCI6MjA4OTk0MTc2MX0.JN9NbKqfTKnou4UErFyTvZM8lzTzKfqpYRj_l3IxTIY'; 

// CHANGE: Renamed variable to 'skynetClient' to avoid the SyntaxError
const skynetClient = supabase.createClient(supabaseUrl, supabaseKey);

// VIT Bhopal Coordinates: [23.2089, 76.8488]
var map = L.map('map').setView([23.2089, 76.8488], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 3. Initialize Chart with empty data
const ctx = document.getElementById('aqiChart').getContext('2d');
let aqiChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Real-time AQI Trend',
      data: [],
      borderColor: '#3498db',
      backgroundColor: 'rgba(52, 152, 219, 0.2)',
      fill: true,
      borderWidth: 2
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: false }
    }
  }
});

// 4. Function to Fetch and Update Dashboard
async function fetchSkynetData() {
  try {
    // CHANGE: Use 'skynetClient' here
    const { data, error } = await skynetClient
      .from('city_stats') 
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (data && data.length > 0) {
      const latest = data[0];

      // Update Cards
      document.getElementById('aqi-val').innerText = Math.round(latest.aqi);
      document.getElementById('temp-val').innerText = latest.temp + "°C";
      document.getElementById('hum-val').innerText = latest.humidity + "%";
      document.getElementById('status-val').innerText = getStatusText(latest.aqi);

      // Update Chart Data
      const chartData = [...data].reverse();
      aqiChart.data.labels = chartData.map(row => new Date(row.created_at).toLocaleTimeString());
      aqiChart.data.datasets[0].data = chartData.map(row => row.aqi);
      aqiChart.update();
      
      console.log("Dashboard Updated:", latest.city_name);
    }
  } catch (err) {
    console.error("Error fetching data:", err.message);
  }
}

function getStatusText(aqi) {
  if (aqi <= 50) return "GOOD";           // Green Level: Air is fresh
  if (aqi <= 100) return "MODERATE";      // Yellow Level: Acceptable
  if (aqi <= 150) return "UNHEALTHY (SENSITIVE)"; // Orange Level: Affects kids/elderly
  if (aqi <= 200) return "UNHEALTHY";     // Red Level: Everyone may feel effects
  if (aqi <= 300) return "VERY UNHEALTHY"; // Purple Level: Health alert
  return "HAZARDOUS";                     // Maroon Level: Emergency conditions
}

// 5. Real-time Subscription
// CHANGE: Use 'skynetClient' here
const channel = skynetClient
  .channel('schema-db-changes')
  .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'city_stats' }, 
      (payload) => {
        console.log('New data received!', payload.new);
        fetchSkynetData(); 
      }
  )
  .subscribe();

// Initial load and periodic refresh
fetchSkynetData();
setInterval(fetchSkynetData, 60000);
