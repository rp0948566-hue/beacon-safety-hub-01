const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store current location and analysis status
let currentLocation = null;
let analysisStatus = 'idle';
let safeZoneStatus = 'unknown';

// Mock crime data database (in production, this would be a real database or API)
const CRIME_DATABASE = {
  // Delhi, India coordinates and crime data
  'delhi': {
    center: { lat: 28.6139, lng: 77.2090 },
    radius: 50, // km
    crimeStats: {
      totalCrimes: 1250,
      violentCrimes: 180,
      thefts: 420,
      assaults: 95,
      burglaries: 280,
      riskLevel: 0.7, // 0-1 scale
      recentIncidents: 45,
      safetyScore: 65
    }
  },
  // Mumbai, India
  'mumbai': {
    center: { lat: 19.0760, lng: 72.8777 },
    radius: 40,
    crimeStats: {
      totalCrimes: 980,
      violentCrimes: 120,
      thefts: 350,
      assaults: 75,
      burglaries: 220,
      riskLevel: 0.6,
      recentIncidents: 32,
      safetyScore: 72
    }
  },
  // Bangalore, India
  'bangalore': {
    center: { lat: 12.9716, lng: 77.5946 },
    radius: 35,
    crimeStats: {
      totalCrimes: 750,
      violentCrimes: 85,
      thefts: 280,
      assaults: 60,
      burglaries: 180,
      riskLevel: 0.4,
      recentIncidents: 28,
      safetyScore: 78
    }
  },
  // Chennai, India
  'chennai': {
    center: { lat: 13.0827, lng: 80.2707 },
    radius: 30,
    crimeStats: {
      totalCrimes: 620,
      violentCrimes: 70,
      thefts: 220,
      assaults: 45,
      burglaries: 150,
      riskLevel: 0.3,
      recentIncidents: 22,
      safetyScore: 82
    }
  },
  // Default for other locations
  'default': {
    crimeStats: {
      totalCrimes: 500,
      violentCrimes: 60,
      thefts: 180,
      assaults: 40,
      burglaries: 120,
      riskLevel: 0.5,
      recentIncidents: 25,
      safetyScore: 75
    }
  }
};

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get city name based on coordinates (simplified)
function getCityFromCoordinates(lat, lng) {
  // Delhi
  if (calculateDistance(lat, lng, 28.6139, 77.2090) <= 50) return 'delhi';
  // Mumbai
  if (calculateDistance(lat, lng, 19.0760, 72.8777) <= 40) return 'mumbai';
  // Bangalore
  if (calculateDistance(lat, lng, 12.9716, 77.5946) <= 35) return 'bangalore';
  // Chennai
  if (calculateDistance(lat, lng, 13.0827, 80.2707) <= 30) return 'chennai';

  return 'default';
}

// Rach-AI Crime Data Analysis Function
async function analyzeCrimeData(location) {
  try {
    analysisStatus = 'analyzing';
    console.log(`Rach-AI: Analyzing crime data for location: ${location.lat}, ${location.lng}`);

    // Simulate API delay for realistic analysis time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get city based on coordinates
    const city = getCityFromCoordinates(location.lat, location.lng);
    const cityData = CRIME_DATABASE[city];

    console.log(`Rach-AI: Detected location in ${city.toUpperCase()}`);

    // Add some randomization for dynamic feel (in production, use real-time data)
    const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
    const currentRiskLevel = Math.max(0, Math.min(1, cityData.crimeStats.riskLevel + variation));

    // Determine safe zone status based on analysis
    let status;
    if (currentRiskLevel < 0.3) {
      status = 'safe';
    } else if (currentRiskLevel < 0.7) {
      status = 'moderate';
    } else {
      status = 'risk';
    }

    safeZoneStatus = status;
    analysisStatus = 'completed';

    console.log(`Rach-AI: Analysis completed. Status: ${status}, Risk Level: ${(currentRiskLevel * 100).toFixed(1)}%`);

    return {
      status: status,
      riskLevel: currentRiskLevel,
      city: city,
      crimeStats: cityData.crimeStats,
      timestamp: new Date().toISOString(),
      recommendations: getSafetyRecommendations(status, cityData.crimeStats)
    };

  } catch (error) {
    console.error('Rach-AI: Error analyzing crime data:', error);
    analysisStatus = 'error';
    safeZoneStatus = 'unknown';
    return { status: 'unknown', error: error.message };
  }
}

// Generate safety recommendations based on crime data
function getSafetyRecommendations(status, crimeStats) {
  const recommendations = [];

  if (status === 'risk') {
    recommendations.push("🚨 High-risk area detected. Stay alert and avoid isolated areas.");
    recommendations.push("📞 Keep emergency contacts readily accessible.");
    recommendations.push("👥 Consider traveling with companions when possible.");
  } else if (status === 'moderate') {
    recommendations.push("⚠️ Moderate risk area. Stay aware of your surroundings.");
    recommendations.push("📍 Stick to well-lit and populated areas.");
  } else {
    recommendations.push("✅ Safe zone confirmed. Continue normal precautions.");
  }

  if (crimeStats.violentCrimes > 100) {
    recommendations.push("🔴 High violent crime rate in this area. Exercise extra caution.");
  }

  if (crimeStats.thefts > 200) {
    recommendations.push("🛡️ High theft incidents reported. Secure your belongings.");
  }

  return recommendations;
}

// API Endpoints
app.post('/api/location/update', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    currentLocation = { lat, lng, timestamp: new Date().toISOString() };

    console.log(`Location updated: ${lat}, ${lng}`);

    // Trigger automatic analysis
    const analysis = await analyzeCrimeData({ lat, lng });

    res.json({
      success: true,
      location: currentLocation,
      analysis: analysis,
      message: 'Location updated and analysis completed'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    location: currentLocation,
    analysisStatus: analysisStatus,
    safeZoneStatus: safeZoneStatus,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/analysis/trigger', async (req, res) => {
  if (!currentLocation) {
    return res.status(400).json({ success: false, message: 'No location available for analysis' });
  }

  try {
    const analysis = await analyzeCrimeData(currentLocation);
    res.json({
      success: true,
      analysis: analysis,
      message: 'Analysis completed'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Rach-AI Backend Server running on port ${PORT}`);
  console.log('Rach-AI: Ready to analyze safety zones...');
});
