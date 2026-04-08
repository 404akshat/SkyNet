// 1. Supabase Configuration
const supabaseUrl = 'https://krcbtbzrtbotejoyxmzr.supabase.co'; // Replace with your URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyY2J0YnpydGJvdGVqb3l4bXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjU3NjEsImV4cCI6MjA4OTk0MTc2MX0.JN9NbKqfTKnou4UErFyTvZM8lzTzKfqpYRj_l3IxTIY'; // Replace with your Anon Key
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. Initialize Map (Centered near Ashta/Indore region)
var map = L.map('map').setView([23.0, 76.7], 9); 

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
    // Fetch last 10 records for the chart and the latest one for the cards
    const { data, error } = await supabase
      .from('city_stats') // Replace with your actual table name
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

      // Update Chart Data (reversed to show chronological order)
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

// Helper to define status based on your Arduino logic
function getStatusText(aqi) {
  if (aqi <= 50) return "SAFE";
  if (aqi <= 100) return "WARNING";
  return "HAZARDOUS";
}

// 5. Real-time Subscription (Optional but recommended)
// This will update the website instantly whenever the ESP32 inserts data
const channel = supabase
  .channel('schema-db-changes')
  .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'city_stats' }, 
      (payload) => {
        console.log('New data received!', payload.new);
        fetchSkynetData(); 
      }
  )
  .subscribe();

// Initial load and periodic refresh every 1 minute as a backup
fetchSkynetData();
setInterval(fetchSkynetData, 60000);
