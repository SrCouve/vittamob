import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { system, message, mode } = await req.json();

    if (!system || !message) {
      return new Response(JSON.stringify({ error: 'system and message required' }), { status: 400, headers: corsHeaders });
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: corsHeaders });
    }

    // Use higher max_tokens for plan generation (review + full week plan)
    const maxTokens = mode === 'chat' ? 2048 : 12000;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', response.status, error.slice(0, 500));

      return new Response(JSON.stringify({ error: 'AI service error', details: error.slice(0, 200) }), { status: 502, headers: corsHeaders });
    }

    const data = await response.json();
    return processAIResponse(data);

  } catch (e) {
    console.error('Edge function error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});

function processAIResponse(data: any): Response {
  const aiResponse = data.content?.[0]?.text || '';

  // Extract JSON from response — multiple strategies
  let jsonStr = aiResponse;

  // Strategy 1: Strip markdown code blocks
  const mdMatch = aiResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (mdMatch) {
    jsonStr = mdMatch[1];
  }

  // Strategy 2: Find first { and last } to extract JSON object
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }

  // Strategy 3: Try to parse
  try {
    const parsed = JSON.parse(jsonStr);
    return new Response(JSON.stringify({ response: parsed }), { headers: corsHeaders });
  } catch {
    // If JSON parse fails, try to fix common issues
    try {
      // Remove trailing commas before } or ]
      const cleaned = jsonStr
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\x00-\x1f]/g, ' '); // Remove control characters
      const parsed = JSON.parse(cleaned);
      return new Response(JSON.stringify({ response: parsed }), { headers: corsHeaders });
    } catch {
      console.error('Failed to parse AI JSON. First 300 chars:', jsonStr.slice(0, 300));
      return new Response(JSON.stringify({ response: jsonStr, raw: true }), { headers: corsHeaders });
    }
  }
}
