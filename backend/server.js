require('dotenv').config();
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const textbelt = require('textbelt');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize API clients
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// WhatsApp Web integration using Puppeteer
let whatsappBrowser = null;
let whatsappPage = null;

const initializeWhatsApp = async () => {
  try {
    if (!whatsappBrowser) {
      whatsappBrowser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      whatsappPage = await whatsappBrowser.newPage();
      await whatsappPage.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2' });
      console.log('🤖 WhatsApp Web initialized');
    }
    return true;
  } catch (error) {
    console.error('WhatsApp initialization failed:', error);
    return false;
  }
};

const sendWhatsAppMessage = async (phone, message) => {
  try {
    if (!whatsappPage) {
      const initialized = await initializeWhatsApp();
      if (!initialized) throw new Error('WhatsApp not initialized');
    }

    // Format phone number for WhatsApp
    const formattedPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

    await whatsappPage.goto(whatsappUrl, { waitUntil: 'networkidle2' });

    // Wait for send button and click it
    await whatsappPage.waitForSelector('span[data-icon="send"]', { timeout: 10000 });
    await whatsappPage.click('span[data-icon="send"]');

    // Wait for message to be sent
    await whatsappPage.waitForSelector('span[data-icon="msg-check"]', { timeout: 5000 });

    return { success: true, messageId: `whatsapp_${Date.now()}` };
  } catch (error) {
    console.error('WhatsApp message failed:', error);
    throw error;
  }
};

// Telegram Bot integration
const sendTelegramMessage = async (chatId, message) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return { success: true, messageId: data.result.message_id };
  } catch (error) {
    console.error('Telegram message failed:', error);
    throw error;
  }
};

// Push notification via web push (mock implementation)
const sendPushNotification = async (subscription, message) => {
  try {
    // In production, use a service like Firebase Cloud Messaging
    // For now, we'll simulate push notifications
    console.log(`📱 Push notification sent to subscription: ${subscription.endpoint}`);
    return { success: true, messageId: `push_${Date.now()}` };
  } catch (error) {
    console.error('Push notification failed:', error);
    throw error;
  }
};

// Direct Twilio API functions instead of SDK
const sendTwilioSMS = async (to, from, body) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', from);
  params.append('Body', body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${errorData}`);
  }

  return await response.json();
};

// Phone number validation and formatting
const validateAndFormatPhone = (phone) => {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle different formats
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    // Already in international format
    return `+${cleaned}`;
  } else if (cleaned.length === 10) {
    // Indian mobile number without country code
    return `+91${cleaned}`;
  } else if (cleaned.length === 12 && !cleaned.startsWith('91')) {
    // Other international format
    return `+${cleaned}`;
  }

  return null; // Invalid format
};

app.use(cors());
app.use(express.json());

// Store current location and analysis status
let currentLocation = null;
let analysisStatus = 'idle';
let safeZoneStatus = 'unknown';

// Anomaly detection state
let locationHistory = [];
let anomalyDetected = false;
let continuousSharing = false;
let sharingContacts = [];
let emergencyContacts = [
  { id: "default_1", name: "Emergency Contact", phone: "+919303646441", email: "rp0948566@gmail.com" },
  { id: "default_2", name: "Vansh Pratap singh chauhan", phone: "+919243586912", email: "chauhanvanshpratapsingh@gmail.com" }
];

// Video recording state
let videoRecordingActive = false;
let videoRecordingContacts = [];
let lastAlertTime = 0; // Prevent spam alerts

// ADA AI System State
let adaRiskHistory = [];
let adaSensitivity = 1.0; // Adaptive sensitivity (0.5-1.5)
let adaLastAction = null;
let adaActionCooldown = 0; // Prevent spam actions

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

// Anomaly detection functions
function detectMovementAnomaly(currentLocation, history) {
  if (history.length < 3) return false;

  const recentLocations = history.slice(-5); // Last 5 locations
  const speeds = [];

  for (let i = 1; i < recentLocations.length; i++) {
    const prev = recentLocations[i-1];
    const curr = recentLocations[i];
    const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000 / 3600; // hours
    const speed = distance / timeDiff; // km/h

    if (timeDiff > 0) {
      speeds.push(speed);
    }
  }

  if (speeds.length < 2) return false;

  // Check for sudden speed changes (anomaly)
  const avgSpeed = speeds.reduce((a, b) => a + b) / speeds.length;
  const currentSpeed = speeds[speeds.length - 1];

  // Anomaly if current speed is 3x average or > 100 km/h (unrealistic for walking/running)
  return currentSpeed > Math.max(avgSpeed * 3, 100);
}

function detectRouteDeviation(currentLocation, expectedRoute) {
  if (!expectedRoute || expectedRoute.length < 2) return false;

  // Simple route deviation: check if current location is far from expected path
  let minDistance = Infinity;

  for (const point of expectedRoute) {
    const distance = calculateDistance(currentLocation.lat, currentLocation.lng, point.lat, point.lng);
    minDistance = Math.min(minDistance, distance);
  }

  // Deviation if more than 500m from expected route
  return minDistance > 0.5;
}

function checkTimeBasedTracking(currentTime, settings) {
  if (!settings.enabled) return false;

  const [startHour, startMin] = settings.startTime.split(':').map(Number);
  const [endHour, endMin] = settings.endTime.split(':').map(Number);
  const [currentHour, currentMin] = currentTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const currentMinutes = currentHour * 60 + currentMin;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
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

// Raksha-AI Crime Data Analysis Function
async function analyzeCrimeData(location) {
  try {
    analysisStatus = 'analyzing';
    console.log(`Raksha-AI: Analyzing crime data for location: ${location.lat}, ${location.lng}`);

    // Simulate API delay for realistic analysis time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get city based on coordinates
    const city = getCityFromCoordinates(location.lat, location.lng);
    const cityData = CRIME_DATABASE[city];

    console.log(`Raksha-AI: Detected location in ${city.toUpperCase()}`);

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

    console.log(`Raksha-AI: Analysis completed. Status: ${status}, Risk Level: ${(currentRiskLevel * 100).toFixed(1)}%`);

    return {
      status: status,
      riskLevel: currentRiskLevel,
      city: city,
      crimeStats: cityData.crimeStats,
      timestamp: new Date().toISOString(),
      recommendations: getSafetyRecommendations(status, cityData.crimeStats)
    };

  } catch (error) {
    console.error('Raksha-AI: Error analyzing crime data:', error);
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

// ADA AI Risk Assessment Engine
function adaRiskAssessment(inputData) {
  const {
    speed,
    route_deviation,
    time,
    latitude,
    longitude,
    voice_emotion,
    environment_light,
    location_zone,
    previous_alerts
  } = inputData;

  let riskScore = 0;
  const reasons = [];

  // Speed anomaly detection (+2)
  if (speed > 15) { // Running speed
    riskScore += 2;
    reasons.push("High speed detected (possible running)");
  } else if (speed < 0.5 && locationHistory.length > 1) { // Sudden stop
    const prevSpeed = locationHistory[locationHistory.length - 1]?.speed || 0;
    if (prevSpeed > 5) {
      riskScore += 2;
      reasons.push("Sudden stop after high speed");
    }
  }

  // Route deviation (+3)
  if (route_deviation > 0.2) {
    riskScore += 3;
    reasons.push(`High route deviation (${(route_deviation * 100).toFixed(1)}%)`);
  }

  // Night hours (+2)
  const [hours] = time.split(':').map(Number);
  if (hours >= 22 || hours <= 5) {
    riskScore += 2;
    reasons.push("Late night travel");
  }

  // Risk zone proximity (+2-3)
  const city = getCityFromCoordinates(latitude, longitude);
  const cityData = CRIME_DATABASE[city];
  if (cityData && cityData.crimeStats.riskLevel > 0.6) {
    riskScore += 3;
    reasons.push("High-risk zone proximity");
  } else if (cityData && cityData.crimeStats.riskLevel > 0.4) {
    riskScore += 2;
    reasons.push("Moderate-risk zone proximity");
  }

  // Voice emotion (+3)
  if (voice_emotion === 'panic' || voice_emotion === 'fear' || voice_emotion === 'distress') {
    riskScore += 3;
    reasons.push(`Detected ${voice_emotion} in voice`);
  }

  // Multiple alerts (+1)
  if (previous_alerts > 2) {
    riskScore += 1;
    reasons.push("Multiple recent alerts");
  }

  // Environment light (+1)
  if (environment_light === 'low') {
    riskScore += 1;
    reasons.push("Low environment light");
  }

  // Location zone (+1-2)
  if (location_zone === 'isolated') {
    riskScore += 2;
    reasons.push("Isolated location");
  } else if (location_zone === 'remote') {
    riskScore += 1;
    reasons.push("Remote location");
  }

  // Apply ADA sensitivity adjustment
  riskScore *= adaSensitivity;

  // Cap at 10
  riskScore = Math.min(10, Math.max(0, riskScore));

  // Determine action based on risk score
  let action = 'monitor';
  let priority = 'low';

  if (riskScore >= 9) {
    action = 'critical_emergency';
    priority = 'critical';
  } else if (riskScore >= 7) {
    action = 'trigger_emergency';
    priority = 'high';
  } else if (riskScore >= 5) {
    action = 'warn';
    priority = 'medium';
  }

  // Store in ADA history
  adaRiskHistory.push({
    timestamp: new Date().toISOString(),
    riskScore,
    action,
    reasons,
    inputData
  });

  // Keep only last 50 entries
  if (adaRiskHistory.length > 50) {
    adaRiskHistory = adaRiskHistory.slice(-50);
  }

  // Adaptive learning: adjust sensitivity based on false positives
  if (adaRiskHistory.length > 10) {
    const recentActions = adaRiskHistory.slice(-10);
    const emergencyActions = recentActions.filter(h => h.action === 'trigger_emergency' || h.action === 'critical_emergency').length;
    const totalActions = recentActions.length;

    // If too many emergency actions, reduce sensitivity
    if (emergencyActions / totalActions > 0.3) {
      adaSensitivity = Math.max(0.5, adaSensitivity - 0.1);
    } else if (emergencyActions / totalActions < 0.1) {
      // If too few emergency actions, increase sensitivity
      adaSensitivity = Math.min(1.5, adaSensitivity + 0.05);
    }
  }

  return {
    risk_score: Math.round(riskScore * 10) / 10,
    action,
    reason: reasons,
    priority,
    timestamp: new Date().toISOString(),
    ada_sensitivity: adaSensitivity
  };
}

// Auto-alert function for high-risk areas
async function sendAutoAlert(message, location, type = 'sms') {
  const now = Date.now();
  if (now - lastAlertTime < 300000) { // Prevent alerts more than once every 5 minutes
    return;
  }
  lastAlertTime = now;

  try {
    const alertResponse = await fetch('http://localhost:3001/api/alerts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacts: emergencyContacts,
        message,
        location,
        type
      })
    });

    const alertResult = await alertResponse.json();
    console.log('🚨 Auto-alert sent:', alertResult.summary);
  } catch (error) {
    console.error('Auto-alert failed:', error);
  }
}

// Auto video recording function
async function startAutoVideoRecording(location, reason) {
  if (videoRecordingActive) return; // Already recording

  videoRecordingActive = true;
  videoRecordingContacts = emergencyContacts;

  console.log(`🎥 Auto video recording started: ${reason}`);

  // Simulate video recording for 30 seconds (in production, this would be actual camera recording)
  setTimeout(() => {
    videoRecordingActive = false;
    console.log('🎥 Auto video recording stopped');
  }, 30000);
}

// API Endpoints
app.post('/api/location/update', async (req, res) => {
  try {
    const { lat, lng, settings, expectedRoute, voice_emotion, environment_light, location_zone } = req.body;
    const newLocation = {
      lat,
      lng,
      timestamp: Date.now(),
      isoString: new Date().toISOString()
    };

    // Add to location history
    locationHistory.push(newLocation);

    // Keep only last 50 locations
    if (locationHistory.length > 50) {
      locationHistory = locationHistory.slice(-50);
    }

    currentLocation = newLocation;

    console.log(`Location updated: ${lat}, ${lng}`);

    // Calculate speed and route deviation for ADA
    let speed = 0;
    let route_deviation = 0;

    if (locationHistory.length > 1) {
      const prevLocation = locationHistory[locationHistory.length - 2];
      const distance = calculateDistance(prevLocation.lat, prevLocation.lng, lat, lng);
      const timeDiff = (newLocation.timestamp - prevLocation.timestamp) / 1000 / 3600; // hours
      speed = timeDiff > 0 ? distance / timeDiff : 0; // km/h
    }

    if (expectedRoute && expectedRoute.length > 1) {
      let minDistance = Infinity;
      for (const point of expectedRoute) {
        const distance = calculateDistance(lat, lng, point.lat, point.lng);
        minDistance = Math.min(minDistance, distance);
      }
      route_deviation = minDistance / 1000; // Convert to km for percentage calculation
    }

    // Prepare ADA input data
    const adaInput = {
      speed,
      route_deviation,
      time: new Date().toTimeString().slice(0, 5), // HH:MM format
      latitude: lat,
      longitude: lng,
      voice_emotion: voice_emotion || 'neutral',
      environment_light: environment_light || 'normal',
      location_zone: location_zone || 'urban',
      previous_alerts: adaRiskHistory.filter(h => h.action !== 'monitor').length
    };

    // Run ADA risk assessment
    const adaResult = adaRiskAssessment(adaInput);

    console.log(`🤖 ADA Assessment: Risk ${adaResult.risk_score}, Action: ${adaResult.action}`);

    // Execute ADA actions
    if (adaResult.action === 'trigger_emergency' || adaResult.action === 'critical_emergency') {
      console.log('🚨 ADA TRIGGERING EMERGENCY PROTOCOL');

      // Start video recording
      await startAutoVideoRecording(newLocation, `ADA Emergency: ${adaResult.reason.join(', ')}`);

      // Send emergency alerts
      const emergencyMessage = `🚨 ADA EMERGENCY ALERT: Risk score ${adaResult.risk_score}/10. ${adaResult.reason.join('. ')}. Location: https://maps.google.com/?q=${lat},${lng}`;

      const alertResponse = await fetch('http://localhost:3001/api/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: emergencyContacts,
          message: emergencyMessage,
          location: newLocation,
          type: 'both'
        })
      });

      const alertResult = await alertResponse.json();
      console.log('🚨 ADA Emergency alerts sent:', alertResult.summary);

      // Start continuous location sharing
      continuousSharing = true;
      sharingContacts = emergencyContacts;

      // For critical emergencies, also trigger buzzer and additional measures
      if (adaResult.action === 'critical_emergency') {
        console.log('🚨 CRITICAL EMERGENCY: Activating all safety measures');
        // Additional critical measures can be added here
      }

    } else if (adaResult.action === 'warn') {
      console.log('⚠️ ADA Warning: Preparing emergency systems');
      // Pre-load systems but don't trigger yet
    }

    // Legacy anomaly detection (still works alongside ADA)
    let anomalyResult = null;
    if (settings?.anomalyDetection) {
      const movementAnomaly = detectMovementAnomaly(newLocation, locationHistory);
      const routeDeviation = expectedRoute ? detectRouteDeviation(newLocation, expectedRoute) : false;

      if (movementAnomaly || routeDeviation) {
        anomalyDetected = true;
        anomalyResult = {
          detected: true,
          type: movementAnomaly ? 'movement' : 'route',
          description: movementAnomaly
            ? 'Unusual movement pattern detected (sudden speed change)'
            : 'Route deviation detected',
          timestamp: new Date().toISOString()
        };

        console.log('🚨 LEGACY ANOMALY DETECTED:', anomalyResult);
      } else {
        anomalyDetected = false;
      }
    }

    // Trigger automatic analysis
    const analysis = await analyzeCrimeData({ lat, lng });

    res.json({
      success: true,
      location: currentLocation,
      analysis: analysis,
      anomaly: anomalyResult,
      ada_assessment: adaResult,
      message: 'Location updated and analysis completed'
    });

  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    location: currentLocation,
    analysisStatus: analysisStatus,
    safeZoneStatus: safeZoneStatus,
    ada_status: {
      risk_history_count: adaRiskHistory.length,
      current_sensitivity: adaSensitivity,
      last_action: adaLastAction,
      last_assessment: adaRiskHistory[adaRiskHistory.length - 1] || null
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/analysis/trigger', async (req, res) => {
  if (!currentLocation) {
    return res.status(400).json({ success: false, message: 'No location available for analysis' });
  }

  try {
    const analysis = await analyzeCrimeData(currentLocation);

    // Also run ADA assessment with current data
    const adaInput = {
      speed: 0, // Static analysis, no speed data
      route_deviation: 0,
      time: new Date().toTimeString().slice(0, 5),
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      voice_emotion: 'neutral',
      environment_light: 'normal',
      location_zone: 'urban',
      previous_alerts: adaRiskHistory.filter(h => h.action !== 'monitor').length
    };

    const adaResult = adaRiskAssessment(adaInput);

    res.json({
      success: true,
      analysis: analysis,
      ada_assessment: adaResult,
      anomaly: anomalyDetected ? {
        detected: true,
        type: 'unknown',
        description: 'Anomaly detected in recent location updates',
        timestamp: new Date().toISOString()
      } : null,
      message: 'Analysis completed'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enhanced retry mechanism with multiple messaging services
async function sendAlertWithRetry(contact, message, type, maxRetries = 5, retryDelay = 30000) {
  let attempt = 0;
  let lastError = null;

  // Validate and format phone number
  const formattedPhone = validateAndFormatPhone(contact.phone);

  while (attempt < maxRetries) {
    try {
      const alertResults = {
        sms: null,
        email: null,
        whatsapp: null,
        telegram: null,
        push: null
      };

      // Send SMS if requested (multiple providers)
      if ((type === 'sms' || type === 'both') && formattedPhone) {
        try {
          let smsSent = false;

          // Try Twilio first
          if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
            try {
              const smsResult = await sendTwilioSMS(formattedPhone, process.env.TWILIO_PHONE_NUMBER, message);
              alertResults.sms = { success: true, messageId: smsResult.sid, provider: 'twilio' };
              smsSent = true;
              console.log(`✅ SMS sent to ${contact.name} via Twilio (attempt ${attempt + 1})`);
            } catch (twilioError) {
              console.warn(`⚠️ Twilio failed, trying Textbelt: ${twilioError.message}`);
            }
          }

          // Fallback to Textbelt if Twilio failed or not configured
          if (!smsSent) {
            const textbeltResponse = await fetch('https://textbelt.com/text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: formattedPhone,
                message: message,
                key: process.env.TEXTBELT_API_KEY || 'textbelt' // Use free tier if no key
              })
            });
            const textbeltData = await textbeltResponse.json();
            alertResults.sms = {
              success: textbeltData.success,
              messageId: textbeltData.textId,
              provider: 'textbelt',
              error: textbeltData.success ? null : textbeltData.error
            };
            console.log(`${textbeltData.success ? '✅' : '❌'} SMS sent to ${contact.name} via Textbelt (attempt ${attempt + 1})`);
          }
        } catch (error) {
          console.error(`❌ SMS failed for ${contact.name} (attempt ${attempt + 1}):`, error.message);
          alertResults.sms = { success: false, error: error.message };
        }
      }

      // Send WhatsApp if requested
      if ((type === 'whatsapp' || type === 'both') && formattedPhone) {
        try {
          const whatsappResult = await sendWhatsAppMessage(formattedPhone, message);
          alertResults.whatsapp = { success: true, messageId: whatsappResult.messageId, provider: 'whatsapp' };
          console.log(`✅ WhatsApp sent to ${contact.name} (attempt ${attempt + 1})`);
        } catch (error) {
          console.error(`❌ WhatsApp failed for ${contact.name} (attempt ${attempt + 1}):`, error.message);
          alertResults.whatsapp = { success: false, error: error.message };
        }
      }

      // Send Telegram if requested and chat ID available
      if ((type === 'telegram' || type === 'both') && contact.telegramChatId) {
        try {
          const telegramResult = await sendTelegramMessage(contact.telegramChatId, message);
          alertResults.telegram = { success: true, messageId: telegramResult.messageId, provider: 'telegram' };
          console.log(`✅ Telegram sent to ${contact.name} (attempt ${attempt + 1})`);
        } catch (error) {
          console.error(`❌ Telegram failed for ${contact.name} (attempt ${attempt + 1}):`, error.message);
          alertResults.telegram = { success: false, error: error.message };
        }
      }

      // Send Email if requested
      if ((type === 'email' || type === 'both') && contact.email) {
        try {
          if (sgMail) {
            const emailResult = await sgMail.send({
              to: contact.email,
              from: process.env.SENDGRID_FROM_EMAIL || 'rp0948566@gmail.com',
              subject: '🚨 Emergency Alert - Immediate Assistance Required',
              text: message,
              html: `<div style="font-family: Arial, sans-serif; padding: 20px; background-color: #ffebee; border-left: 5px solid #f44336;">
                <h2 style="color: #d32f2f;">🚨 EMERGENCY ALERT</h2>
                <p style="font-size: 16px; line-height: 1.5;">${message.replace(/\n/g, '<br>')}</p>
                <p style="color: #666; font-size: 14px;">Sent by Raksha-AI Safety System</p>
                <p style="color: #666; font-size: 12px;">Attempt ${attempt + 1}/${maxRetries} - ${new Date().toISOString()}</p>
              </div>`
            });
            alertResults.email = { success: true, messageId: emailResult[0]?.headers?.['x-message-id'], provider: 'sendgrid' };
            console.log(`✅ Email sent to ${contact.name} via SendGrid (attempt ${attempt + 1})`);
          } else {
            console.warn('⚠️ SendGrid not configured, skipping email to', contact.name);
            alertResults.email = { success: false, error: 'SendGrid not configured' };
          }
        } catch (error) {
          console.error(`❌ Email failed for ${contact.name} (attempt ${attempt + 1}):`, error.message);
          alertResults.email = { success: false, error: error.message };
        }
      }

      // Send Push notification if requested and subscription available
      if ((type === 'push' || type === 'both') && contact.pushSubscription) {
        try {
          const pushResult = await sendPushNotification(contact.pushSubscription, message);
          alertResults.push = { success: true, messageId: pushResult.messageId, provider: 'push' };
          console.log(`✅ Push notification sent to ${contact.name} (attempt ${attempt + 1})`);
        } catch (error) {
          console.error(`❌ Push notification failed for ${contact.name} (attempt ${attempt + 1}):`, error.message);
          alertResults.push = { success: false, error: error.message };
        }
      }

      // Determine overall success - at least one method must succeed
      const anySuccess = Object.values(alertResults).some(result => result?.success === true);

      if (anySuccess) {
        return {
          success: true,
          attempts: attempt + 1,
          sms: alertResults.sms,
          email: alertResults.email,
          whatsapp: alertResults.whatsapp,
          telegram: alertResults.telegram,
          push: alertResults.push
        };
      }

      // If not successful, prepare for retry
      lastError = 'All delivery methods failed';
      attempt++;

      if (attempt < maxRetries) {
        console.log(`⏳ Retrying alert to ${contact.name} in ${retryDelay/1000} seconds... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

    } catch (error) {
      console.error(`❌ Alert attempt ${attempt + 1} failed for ${contact.name}:`, error);
      lastError = error.message;
      attempt++;

      if (attempt < maxRetries) {
        console.log(`⏳ Retrying alert to ${contact.name} in ${retryDelay/1000} seconds... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // All retries failed
  console.error(`💀 ALL RETRIES FAILED for ${contact.name} after ${maxRetries} attempts`);
  return {
    success: false,
    attempts: maxRetries,
    error: lastError,
    sms: null,
    email: null,
    whatsapp: null,
    telegram: null,
    push: null
  };
}

app.post('/api/alerts/send', async (req, res) => {
  try {
    const { contacts, message, location, type = 'both' } = req.body;

    console.log(`🚨 SENDING ${type.toUpperCase()} ALERTS WITH RETRY to ${contacts.length} contacts`);
    console.log(`📨 Message: ${message.substring(0, 100)}...`);

    const results = [];

    for (const contact of contacts) {
      console.log(`🔄 Processing alert for ${contact.name} (${contact.phone || 'no phone'}, ${contact.email || 'no email'})`);

      const alertId = `alert_${Date.now()}_${contact.id}`;

      // Send alert with retry mechanism
      const alertResult = await sendAlertWithRetry(contact, message, type);

      results.push({
        id: alertId,
        contact: contact.name,
        type,
        success: alertResult.success,
        attempts: alertResult.attempts,
        timestamp: new Date().toISOString(),
        sms: alertResult.sms,
        email: alertResult.email,
        whatsapp: alertResult.whatsapp,
        telegram: alertResult.telegram,
        push: alertResult.push,
        error: alertResult.success ? null : alertResult.error
      });

      if (alertResult.success) {
        console.log(`✅ Alert successfully delivered to ${contact.name} after ${alertResult.attempts} attempt(s)`);
      } else {
        console.error(`❌ Alert failed for ${contact.name} after ${alertResult.attempts} attempts: ${alertResult.error}`);
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    console.log(`📊 ALERT SUMMARY: ${successful} successful, ${failed} failed out of ${results.length} total`);

    res.json({
      success: successful > 0, // Overall success if at least one alert was delivered
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        totalAttempts: results.reduce((sum, r) => sum + r.attempts, 0)
      },
      message: `Alerts processed: ${successful} successful, ${failed} failed. Total retry attempts: ${results.reduce((sum, r) => sum + r.attempts, 0)}`
    });

  } catch (error) {
    console.error('🚨 CRITICAL: Alert sending system error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sharing/start', (req, res) => {
  try {
    const { contacts, duration = 3600000 } = req.body; // Default 1 hour

    continuousSharing = true;
    sharingContacts = contacts;

    console.log(`Started continuous location sharing with ${contacts.length} contacts for ${duration/1000/60} minutes`);

    // Auto-stop after duration
    setTimeout(() => {
      continuousSharing = false;
      sharingContacts = [];
      console.log('Continuous sharing stopped (timeout)');
    }, duration);

    res.json({
      success: true,
      message: `Continuous sharing started with ${contacts.length} contacts`,
      duration: duration / 1000 / 60, // minutes
      contacts: contacts.map(c => c.name)
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sharing/stop', (req, res) => {
  continuousSharing = false;
  sharingContacts = [];

  console.log('Continuous location sharing stopped manually');

  res.json({
    success: true,
    message: 'Continuous sharing stopped'
  });
});

// SOS Trigger with auto video recording
app.post('/api/sos/trigger', async (req, res) => {
  try {
    const { contacts, location } = req.body;

    console.log('🚨 MANUAL SOS TRIGGERED: Starting emergency response');

    // Start auto video recording immediately
    await startAutoVideoRecording(location, 'Manual SOS button pressed');

    // Send SOS alert to emergency contacts
    const sosMessage = `🚨 MANUAL EMERGENCY SOS ALERT: User has manually triggered emergency alert! Immediate assistance required. Location: https://maps.google.com/?q=${location.lat},${location.lng}`;

    // Send alerts to provided contacts or use default emergency contacts
    const targetContacts = contacts || emergencyContacts;

    const alertResponse = await fetch('http://localhost:3001/api/alerts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacts: targetContacts,
        message: sosMessage,
        location: location,
        type: 'both' // Send both SMS and email
      })
    });

    const alertResult = await alertResponse.json();

    if (alertResult.success) {
      console.log('🚨 Manual SOS alerts sent:', alertResult.summary);
    } else {
      console.error('🚨 Manual SOS alert sending failed:', alertResult.error);
    }

    // Start continuous location sharing for emergency response
    continuousSharing = true;
    sharingContacts = targetContacts;

    console.log(`Started emergency location sharing with ${sharingContacts.length} contacts`);

    res.json({
      success: true,
      message: 'Manual SOS triggered - Emergency response activated',
      videoRecording: true,
      locationSharing: true,
      alertsSent: alertResult.success,
      alertSummary: alertResult.summary
    });

  } catch (error) {
    console.error('Manual SOS trigger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADA Assessment Endpoint (for external integration)
app.post('/api/ada/assess', (req, res) => {
  try {
    const inputData = req.body;
    const assessment = adaRiskAssessment(inputData);

    console.log(`🤖 External ADA Assessment: Risk ${assessment.risk_score}, Action: ${assessment.action}`);

    res.json({
      success: true,
      assessment: assessment,
      message: 'ADA risk assessment completed'
    });

  } catch (error) {
    console.error('ADA assessment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Video recording status
app.get('/api/video/status', (req, res) => {
  res.json({
    active: videoRecordingActive,
    contacts: videoRecordingContacts.length,
    contactNames: videoRecordingContacts.map(c => c.name)
  });
});

app.get('/api/sharing/status', (req, res) => {
  res.json({
    active: continuousSharing,
    contacts: sharingContacts.length,
    contactNames: sharingContacts.map(c => c.name)
  });
});

app.listen(PORT, () => {
  console.log(`Raksha-AI Backend Server running on port ${PORT}`);
  console.log('Raksha-AI: Ready to analyze safety zones...');
});
