// Optimized Weather App JavaScript - Performance Version
class WeatherApp {
    constructor() {
        this.apiKey = '0a81b029a2b34e40a4d113140252606';  
        this.baseUrl = 'https://api.weatherapi.com/v1'; // Use HTTPS
        this.currentUnit = 'celsius';
        this.currentWeatherData = null;
        this.searchTimeout = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadDefaultLocation();
    }

    initializeElements() {
        // Cache DOM elements for better performance
        const elements = [
            'locationInput', 'searchBtn', 'currentLocationBtn', 'suggestions',
            'weatherInfo', 'errorMessage', 'loading', 'locationName', 'lastUpdated',
            'temperature', 'weatherIcon', 'conditionText', 'feelsLike',
            'visibility', 'humidity', 'windSpeed', 'windDirection', 'pressure', 'uvIndex',
            'airQuality', 'aqiValue', 'aqiStatus', 'co', 'no2', 'o3', 'so2', 'pm25', 'pm10',
            'celsiusBtn', 'fahrenheitBtn', 'errorText', 'retryBtn'
        ];
        
        elements.forEach(id => {
            this[id] = document.getElementById(id);
        });
    }

    bindEvents() {
        // Use passive listeners where possible for better performance
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        this.locationInput.addEventListener('input', (e) => this.handleInputChange(e), { passive: true });
        this.currentLocationBtn.addEventListener('click', () => this.getCurrentLocation());
        
        this.celsiusBtn.addEventListener('click', () => this.switchUnit('celsius'));
        this.fahrenheitBtn.addEventListener('click', () => this.switchUnit('fahrenheit'));
        this.retryBtn.addEventListener('click', () => this.handleSearch());
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSuggestions();
            }
        }, { passive: true });
    }

    async loadDefaultLocation() {
        try {
            this.showLoading();
            await this.fetchWeatherData('London');
        } catch (error) {
            console.error('Error loading default location:', error);
            this.showError('Failed to load default weather data. Please search for a location.');
        }
    }

    async handleSearch() {
        const location = this.locationInput.value.trim();
        if (!location) {
            this.showError('Please enter a location name.');
            return;
        }

        try {
            this.showLoading();
            await this.fetchWeatherData(location);
        } catch (error) {
            console.error('Search error:', error);
            this.showError(error.message || 'Failed to fetch weather data. Please try again.');
        }
    }

    handleInputChange(e) {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        if (query.length < 3) {
            this.hideSuggestions();
            return;
        }

        // Debounce API calls
        this.searchTimeout = setTimeout(async () => {
            try {
                const suggestions = await this.fetchLocationSuggestions(query);
                this.showSuggestions(suggestions);
            } catch (error) {
                console.error('Suggestions error:', error);
                this.hideSuggestions();
            }
        }, 300);
    }

    async fetchLocationSuggestions(query) {
        const response = await fetch(`${this.baseUrl}/search.json?key=${this.apiKey}&q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const data = await response.json();
        return data.slice(0, 5);
    }

    showSuggestions(suggestions) {
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        suggestions.forEach(location => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = `${location.name}, ${location.region}, ${location.country}`;
            item.addEventListener('click', () => {
                this.locationInput.value = location.name;
                this.hideSuggestions();
                this.handleSearch();
            });
            fragment.appendChild(item);
        });

        this.suggestions.innerHTML = '';
        this.suggestions.appendChild(fragment);
        this.suggestions.style.display = 'block';
        this.locationInput.setAttribute('aria-expanded', 'true');
    }

    hideSuggestions() {
        this.suggestions.style.display = 'none';
        this.suggestions.innerHTML = '';
        this.locationInput.setAttribute('aria-expanded', 'false');
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser.');
            return;
        }

        this.showLoading();

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const location = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
                
                try {
                    await this.fetchWeatherData(location);
                } catch (error) {
                    console.error('Current location error:', error);
                    this.showError('Failed to fetch weather for current location.');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Unable to get your location. ';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please allow location access and try again.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'An unknown error occurred.';
                }
                
                this.showError(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    async fetchWeatherData(location) {
        const forecastUrl = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(location)}&days=3&aqi=yes&alerts=no`;
        
        try {
            const response = await fetch(forecastUrl);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Failed to fetch weather data`);
            }

            const data = await response.json();
            this.currentWeatherData = data;
            this.displayWeatherData(data);
            this.hideSuggestions();
        } catch (error) {
            console.error('Weather fetch error:', error);
            throw error;
        }
    }

    displayWeatherData(data) {
        const { location, current, forecast } = data;

        // Update location and time
        this.locationName.textContent = `${location.name}, ${location.region}, ${location.country}`;
        this.lastUpdated.textContent = `Updated: ${new Date(current.last_updated).toLocaleString()}`;

        // Update main weather display
        this.updateTemperature(current);
        this.weatherIcon.src = `https:${current.condition.icon}`;
        this.weatherIcon.alt = current.condition.text;
        this.conditionText.textContent = current.condition.text;
        this.updateFeelsLike(current);

        // Update weather details
        this.visibility.textContent = `${current.vis_km} km`;
        this.humidity.textContent = `${current.humidity}%`;
        this.windSpeed.textContent = `${current.wind_kph} km/h`;
        this.windDirection.textContent = `${current.wind_dir} (${current.wind_degree}°)`;
        this.pressure.textContent = `${current.pressure_mb} mb`;
        this.uvIndex.textContent = this.getUVIndexDescription(current.uv);

        // Update air quality
        if (current.air_quality) {
            this.updateAirQuality(current.air_quality);
            this.airQuality.style.display = 'block';
        } else {
            this.airQuality.style.display = 'none';
        }

        // Update forecast
        if (forecast?.forecastday) {
            this.updateForecast(forecast.forecastday);
            document.getElementById('weatherForecast').style.display = 'block';
        } else {
            document.getElementById('weatherForecast').style.display = 'none';
        }

        // Update page title for better SEO
        const temp = Math.round(this.currentUnit === 'celsius' ? current.temp_c : current.temp_f);
        document.title = `${temp}° ${location.name} - Weather App`;

        this.showWeatherInfo();
    }

    updateTemperature(current) {
        const temp = this.currentUnit === 'celsius' ? current.temp_c : current.temp_f;
        this.temperature.textContent = `${Math.round(temp)}°`;
    }

    updateFeelsLike(current) {
        const feelsLike = this.currentUnit === 'celsius' ? current.feelslike_c : current.feelslike_f;
        const unit = this.currentUnit === 'celsius' ? '°C' : '°F';
        this.feelsLike.textContent = `${Math.round(feelsLike)}${unit}`;
    }

    updateAirQuality(airQuality) {
        const aqi = Math.round(airQuality['us-epa-index']);
        this.aqiValue.textContent = aqi;

        const { status, className } = this.getAQIStatus(aqi);
        this.aqiStatus.textContent = status;
        this.aqiStatus.className = `aqi-status ${className}`;
        this.aqiValue.className = `aqi-value ${className}`;

        // Update pollutants
        this.co.textContent = `${Math.round(airQuality.co)} μg/m³`;
        this.no2.textContent = `${Math.round(airQuality.no2)} μg/m³`;
        this.o3.textContent = `${Math.round(airQuality.o3)} μg/m³`;
        this.so2.textContent = `${Math.round(airQuality.so2)} μg/m³`;
        this.pm25.textContent = `${Math.round(airQuality.pm2_5)} μg/m³`;
        this.pm10.textContent = `${Math.round(airQuality.pm10)} μg/m³`;
    }

    updateForecast(forecastDays) {
        forecastDays.slice(0, 3).forEach((day, index) => {
            const forecastElement = document.getElementById(`forecast-day-${index}`);
            if (!forecastElement) return;

            const date = new Date(day.date);
            const dayName = index === 0 ? 'Today' : 
                           index === 1 ? 'Tomorrow' : 
                           date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const dateString = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });

            // Update forecast elements efficiently
            const elements = {
                '.forecast-date': `${dayName}, ${dateString}`,
                '.forecast-condition': day.day.condition.text
            };

            Object.entries(elements).forEach(([selector, content]) => {
                const element = forecastElement.querySelector(selector);
                if (element) element.textContent = content;
            });

            // Update forecast icon
            const iconImg = forecastElement.querySelector('.forecast-icon img');
            if (iconImg) {
                iconImg.src = `https:${day.day.condition.icon}`;
                iconImg.alt = day.day.condition.text;
            }
            
            // Update temperatures
            const maxTemp = this.currentUnit === 'celsius' ? day.day.maxtemp_c : day.day.maxtemp_f;
            const minTemp = this.currentUnit === 'celsius' ? day.day.mintemp_c : day.day.mintemp_f;
            const unit = this.currentUnit === 'celsius' ? '°C' : '°F';
            
            const highElement = forecastElement.querySelector('.forecast-high');
            const lowElement = forecastElement.querySelector('.forecast-low');
            if (highElement) highElement.textContent = `${Math.round(maxTemp)}${unit}`;
            if (lowElement) lowElement.textContent = `${Math.round(minTemp)}${unit}`;
            
            // Update additional details
            const rainElement = forecastElement.querySelector('.forecast-rain');
            const windElement = forecastElement.querySelector('.forecast-wind');
            if (rainElement) rainElement.textContent = `${day.day.daily_chance_of_rain || 0}%`;
            if (windElement) windElement.textContent = `${Math.round(day.day.maxwind_kph)} km/h`;
        });
    }

    getAQIStatus(aqi) {
        if (aqi <= 50) return { status: 'Good', className: 'aqi-good' };
        if (aqi <= 100) return { status: 'Moderate', className: 'aqi-moderate' };
        if (aqi <= 150) return { status: 'Unhealthy for Sensitive Groups', className: 'aqi-unhealthy-sensitive' };
        if (aqi <= 200) return { status: 'Unhealthy', className: 'aqi-unhealthy' };
        if (aqi <= 300) return { status: 'Very Unhealthy', className: 'aqi-very-unhealthy' };
        return { status: 'Hazardous', className: 'aqi-hazardous' };
    }

    getUVIndexDescription(uv) {
        const uvValue = Math.round(uv);
        const descriptions = {
            0: 'Low', 1: 'Low', 2: 'Low',
            3: 'Moderate', 4: 'Moderate', 5: 'Moderate',
            6: 'High', 7: 'High',
            8: 'Very High', 9: 'Very High', 10: 'Very High'
        };
        const description = descriptions[uvValue] || 'Extreme';
        return `${uvValue} (${description})`;
    }

    switchUnit(unit) {
        if (this.currentUnit === unit || !this.currentWeatherData) return;

        this.currentUnit = unit;

        // Update unit buttons
        this.celsiusBtn.classList.toggle('active', unit === 'celsius');
        this.fahrenheitBtn.classList.toggle('active', unit === 'fahrenheit');
        this.celsiusBtn.setAttribute('aria-checked', unit === 'celsius');
        this.fahrenheitBtn.setAttribute('aria-checked', unit === 'fahrenheit');

        // Update temperature displays
        this.updateTemperature(this.currentWeatherData.current);
        this.updateFeelsLike(this.currentWeatherData.current);

        // Update forecast temperatures
        if (this.currentWeatherData.forecast?.forecastday) {
            this.updateForecast(this.currentWeatherData.forecast.forecastday);
        }

        // Update page title
        const temp = Math.round(unit === 'celsius' ? 
            this.currentWeatherData.current.temp_c : 
            this.currentWeatherData.current.temp_f);
        document.title = `${temp}° ${this.currentWeatherData.location.name} - Weather App`;
    }

    showLoading() {
        this.hideAllSections();
        this.loading.style.display = 'block';
    }

    showWeatherInfo() {
        this.hideAllSections();
        this.weatherInfo.style.display = 'block';
    }

    showError(message) {
        this.hideAllSections();
        this.errorText.textContent = message;
        this.errorMessage.style.display = 'block';
    }

    hideAllSections() {
        this.weatherInfo.style.display = 'none';
        this.errorMessage.style.display = 'none';
        this.loading.style.display = 'none';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('locationInput').focus();
    }
    if (e.key === 'Escape') {
        document.getElementById('suggestions').style.display = 'none';
    }
});
