import requests
from supabase import create_client
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CITIES = [
    {"name": "Bhopal", "lat": 23.2599, "lon": 77.4126},
    {"name": "Indore", "lat": 22.7196, "lon": 75.8577},
    {"name": "Ashta", "lat": 22.6800, "lon": 76.9000},
    {"name": "Sehore", "lat": 23.2030, "lon": 77.0800},
    {"name": "Dewas", "lat": 22.9650, "lon": 76.0600},
]

def fetch_and_push():
    for city in CITIES:
        try:
            weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={city['lat']}&lon={city['lon']}&appid={OPENWEATHER_API_KEY}&units=metric"
            w_res = requests.get(weather_url).json()
        
            temp = w_res['main']['temp']
            humidity = w_res['main']['humidity']
            desc = w_res['weather'][0]['description']
        
            aqi_url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={city['lat']}&lon={city['lon']}&appid={OPENWEATHER_API_KEY}"
            a_res = requests.get(aqi_url).json()
        
            components = a_res['list'][0]['components']
            aqi_score = a_res['list'][0]['main']['aqi']
            pm25 = components['pm2_5']
            pm10 = components['pm10']
            
            def calculate_aqi_500(pm25):
                if pm25 <= 12.0:
                    return round(((50 - 0) / (12.0 - 0)) * (pm25 - 0) + 0)
                elif pm25 <= 35.4:
                    return round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51)
                elif pm25 <= 55.4:
                    return round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101)
                elif pm25 <= 150.4:
                    return round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151)
                elif pm25 <= 250.4:
                    return round(((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201)
                elif pm25 <= 350.4:
                    return round(((400 - 301) / (350.4 - 250.5)) * (pm25 - 250.5) + 301)
                else:
                    return round(((500 - 401) / (500.4 - 350.5)) * (pm25 - 350.5) + 401)
                
            aqi_500_score = calculate_aqi_500(pm25)
        
            data_to_insert = {
                "city_name": city['name'],
                "temp": temp,
                "humidity": humidity,
                "aqi": aqi_500_score,
                "pm25": pm25,
                "pm10": pm10,
                "description": desc            
            }
        
            response = supabase.table("city_stats").upsert(data_to_insert, on_conflict='city_name').execute()
            print(f"Successfully updated {city['name']}: {temp}°C, AQI: {aqi_score}")
        except Exception as e:
            print(f"Error updating {city['name']}: {e}")
            
            
if __name__ == "__main__":
    fetch_and_push()