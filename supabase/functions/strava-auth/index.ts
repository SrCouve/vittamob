// Supabase Edge Function: strava-auth
// Handles Strava OAuth token exchange and refresh
// Deploy: supabase functions deploy strava-auth
// Secrets: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID');
    const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Strava credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, code, user_id } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── EXCHANGE: code → tokens ──
    if (action === 'exchange') {
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'code is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenRes = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        return new Response(
          JSON.stringify({ error: tokenData.message || 'Token exchange failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upsert strava_connections
      const { error: connError } = await supabase
        .from('strava_connections')
        .upsert({
          user_id,
          strava_athlete_id: tokenData.athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          scope: tokenData.scope || '',
          athlete_firstname: tokenData.athlete.firstname,
          athlete_lastname: tokenData.athlete.lastname,
          athlete_profile_url: tokenData.athlete.profile,
        }, { onConflict: 'user_id' });

      if (connError) {
        return new Response(
          JSON.stringify({ error: connError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create initial stats cache row
      await supabase
        .from('strava_stats_cache')
        .upsert({ user_id }, { onConflict: 'user_id' });

      return new Response(
        JSON.stringify({
          access_token: tokenData.access_token,
          expires_at: tokenData.expires_at,
          athlete: tokenData.athlete,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── REFRESH: get new access_token ──
    if (action === 'refresh') {
      // Get current refresh_token from DB
      const { data: conn, error: fetchError } = await supabase
        .from('strava_connections')
        .select('refresh_token')
        .eq('user_id', user_id)
        .single();

      if (fetchError || !conn) {
        return new Response(
          JSON.stringify({ error: 'No Strava connection found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenRes = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        return new Response(
          JSON.stringify({ error: tokenData.message || 'Token refresh failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update tokens in DB
      await supabase
        .from('strava_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
        })
        .eq('user_id', user_id);

      return new Response(
        JSON.stringify({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "exchange" or "refresh".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
