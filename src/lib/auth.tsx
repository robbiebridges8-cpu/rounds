import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Profile = Tables<'profiles'>;

type SessionState = { session: Session | null; initialising: boolean };

const SessionContext = createContext<SessionState>({ session: null, initialising: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, initialising: true });
  const queryClient = useQueryClient();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, initialising: false });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, initialising: false });
      // Everything we cache is scoped to the signed-in user.
      void queryClient.invalidateQueries();
    });

    return () => subscription.subscription.unsubscribe();
  }, [queryClient]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

/** null means signed in but no profile yet, which is what sends you to onboarding. */
export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Three states, one redirect rule: signed out goes to sign-in, signed in
 * without a profile goes to onboarding, everyone else goes to the app.
 */
export function useAuthRedirect() {
  const { session, initialising } = useSession();
  const profile = useProfile();
  const segments = useSegments();
  const router = useRouter();

  const settled = !initialising && (!session || !profile.isPending);

  useEffect(() => {
    if (!settled) return;

    const path = segments.join('/');
    const inAuthFlow = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthFlow) router.replace('/welcome');
      return;
    }
    if (!profile.data) {
      if (!path.includes('onboarding')) router.replace('/onboarding');
      return;
    }
    // first-pubs is the one auth-group screen you visit with a profile.
    if (inAuthFlow && !path.includes('first-pubs')) router.replace('/');
  }, [settled, session, profile.data, segments, router]);

  return settled;
}

export async function signOut() {
  await supabase.auth.signOut();
}
