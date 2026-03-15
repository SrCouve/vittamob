import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record?.user_id) {
      return new Response(JSON.stringify({ error: 'No user_id' }), { status: 200 });
    }

    // Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get recipient's push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', record.user_id)
      .single();

    if (!profile?.expo_push_token) {
      return new Response(JSON.stringify({ skip: 'No push token' }), { status: 200 });
    }

    // Get unread count for badge
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', record.user_id)
      .eq('read', false);

    // Send push via Expo
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    if (expoToken) {
      headers['Authorization'] = `Bearer ${expoToken}`;
    }

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: record.title,
        body: record.body,
        sound: 'default',
        badge: count ?? 1,
        data: record.data ?? {},
        priority: 'high',
      }),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
