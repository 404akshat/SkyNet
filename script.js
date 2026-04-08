// 1. Supabase Configuration
const supabaseUrl = 'https://krcbtbzrtbotejoyxmzr.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyY2J0YnpydGJvdGVqb3l4bXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjU3NjEsImV4cCI6MjA4OTk0MTc2MX0.JN9NbKqfTKnou4UErFyTvZM8lzTzKfqpYRj_l3IxTIY'; 

// Using 'skynetClient' to avoid naming conflicts with the global 'supabase' library
const skynetClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. Initialize Map (District view: Indore/Ashta/Bhopal region)
var map = L.map('map').setView([23.0, 76.7], 9); 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 3. Initialize Chart with cleaned-up axes
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
      borderWidth: 2,
      tension: 0.3 // Makes the line slightly curved/smooth
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: {
        title: { display: true, text: 'Time of Reading' }
      },
      y: { 
        beginAtZero: false,
        title: { display: true, text: 'AQI Value' }
      }
    }
  }
});

// 4. Function to Fetch and Update Dashboard
async function fetchSkynetData() {
  try {
    const { data, error } = await skynetClient
      .from('city_stats') 
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (data && data.length > 0) {
      const latest = data[0];
      const aqiValue = Math.round(latest.aqi);

      // Update Cards
      document.getElementById('aqi-val').innerText = aqiValue;
      document.getElementById('temp-val').innerText = latest.temp + "°C";
      document.getElementById('hum-val').innerText = latest.humidity + "%";
      
      // Update Status Text and Color
      const statusElement = document.getElementById('status-val');
      statusElement.innerText = getStatusText(aqiValue);
      statusElement.style.color = getStatusColor(aqiValue);

      const chartData = [...data].reverse();

      aqiChart.data.labels = chartData.map(row => {
        return new Date(row.created_at).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      });

      aqiChart.data.datasets[0].data = chartData.map(row => row.aqi);

// This ensures that even if you have 2 points in 1 minute, 
// the chart stays clean.
      aqiChart.options.scales.x.ticks.autoSkip = true;

      aqiChart.update();
      
      console.log("Dashboard Updated:", latest.city_name || "Unknown Location");
    }
  } catch (err) {
    console.error("Error fetching data:", err.message);
  }
}

// Granular AQI Levels
function getStatusText(aqi) {
  if (aqi <= 50) return "GOOD";
  if (aqi <= 100) return "MODERATE";
  if (aqi <= 150) return "UNHEALTHY (SENSITIVE)";
  if (aqi <= 200) return "UNHEALTHY";
  if (aqi <= 300) return "VERY UNHEALTHY";
  return "HAZARDOUS";
}

// Helper for UI colors based on air quality
function getStatusColor(aqi) {
  if (aqi <= 50) return "#2ecc71";      // Green
  if (aqi <= 100) return "#f1c40f";     // Yellow
  if (aqi <= 150) return "#e67e22";     // Orange
  if (aqi <= 200) return "#e74c3c";     // Red
  if (aqi <= 300) return "#9b59b6";     // Purple
  return "#8e44ad";                     // Dark Maroon/Purple
}

// 5. Real-time Subscription
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

// Initial load and periodic refresh (every 60s)
fetchSkynetData();
setInterval(fetchSkynetData, 60000);
