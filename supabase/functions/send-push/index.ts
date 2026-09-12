// Pub'd: deliver one notification row as an Expo push.
// Called by the database (pg_net) after a notifications insert. Auth is a
// shared secret held in app_config, compared here with the service role,
// so no JWT is needed and nothing but the database can trigger a send.
// Deployed with verify_jwt off through the Supabase MCP connection.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });

  const { data: secret } = await supabase.from('app_config').select('value').eq('key', 'push_secret').maybeSingle();
  if (!secret || req.headers.get('x-push-secret') !== secret.value) {
    return new Response('forbidden', { status: 403 });
  }

  const { notification_id } = await req.json().catch(() => ({}));
  if (!notification_id) return new Response('bad request', { status: 400 });

  const { data: n } = await supabase
    .from('notifications')
    .select('id, user_id, kind, title, body, checkin_id, pub_id')
    .eq('id', notification_id)
    .maybeSingle();
  if (!n) return new Response('not found', { status: 404 });

  const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', n.user_id);
  if (!tokens || tokens.length === 0) return Response.json({ sent: 0 });

  const url = n.checkin_id ? `/post/${n.checkin_id}` : n.pub_id ? `/pub/${n.pub_id}` : '/feed';
  const messages = tokens.map((t) => ({
    to: t.token,
    title: n.title,
    body: n.body,
    sound: 'default',
    data: { url, kind: n.kind, id: n.id },
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = await res.json().catch(() => null);

  // Expo tells us about dead tokens; drop them so we stop trying.
  const tickets: { status: string; details?: { error?: string } }[] = result?.data ?? [];
  const dead = tickets
    .map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? tokens[i].token : null))
    .filter((t): t is string => Boolean(t));
  if (dead.length) await supabase.from('push_tokens').delete().in('token', dead);

  return Response.json({ sent: messages.length, dead: dead.length });
});
