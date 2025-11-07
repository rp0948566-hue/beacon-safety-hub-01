import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, address } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Missing latitude or longitude' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing safety for location: ${latitude}, ${longitude} (${address || 'Unknown'})`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use AI to search for and analyze crime data
    const prompt = `Analyze the safety of this location:
Location: ${latitude}, ${longitude}
Address: ${address || 'Not provided'}

Task:
1. Search for recent crime statistics, safety reports, and incident data for this specific area
2. Consider crime rates, types of crimes, time trends, and local safety reports
3. Provide a comprehensive safety assessment

Return a JSON response with this exact structure:
{
  "safetyLevel": "safe" | "moderate" | "unsafe",
  "safetyScore": <number 0-100>,
  "riskFactors": ["list of specific risk factors found"],
  "safetyTips": ["3-5 practical safety recommendations"],
  "lastUpdated": "data recency information",
  "summary": "2-3 sentence summary of the area's safety"
}

Be specific and factual. If you can't find current data, indicate this and provide a conservative assessment.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a safety analysis AI that searches for and analyzes crime data and safety reports. Always search for the most recent crime statistics and safety information available online. Provide factual, data-driven assessments.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from AI service');
    }

    console.log('AI response:', aiContent);

    // Parse the AI response
    let safetyData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        safetyData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured data from text response
        safetyData = {
          safetyLevel: 'moderate',
          safetyScore: 50,
          riskFactors: ['Data unavailable - conservative assessment'],
          safetyTips: [
            'Stay aware of your surroundings',
            'Avoid poorly lit areas at night',
            'Keep valuables secure',
          ],
          lastUpdated: 'Unable to retrieve current data',
          summary: aiContent.substring(0, 200),
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      safetyData = {
        safetyLevel: 'moderate',
        safetyScore: 50,
        riskFactors: ['Unable to analyze - data parsing error'],
        safetyTips: ['Exercise general caution', 'Stay in well-populated areas'],
        lastUpdated: 'Analysis error',
        summary: 'Unable to complete safety analysis. Please try again.',
      };
    }

    console.log('Safety assessment:', safetyData.safetyLevel, `(${safetyData.safetyScore}/100)`);

    return new Response(
      JSON.stringify({
        success: true,
        location: { latitude, longitude, address },
        safety: safetyData,
        analyzedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in check-area-safety function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});