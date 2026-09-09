import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type PubDetails = Tables<'pub_details'>;
export type Claim = Tables<'pub_claims'>;
export type ClaimRole = 'landlord' | 'manager' | 'brand';

/** What the pub says about itself, plus whether it is claimed and whether by you. */
export function usePubClaim(pubId: string | undefined) {
  return useQuery({
    queryKey: ['pub-claim', pubId],
    enabled: Boolean(pubId),
    queryFn: async () => {
      const [details, claimed, mine] = await Promise.all([
        supabase.from('pub_details').select('*').eq('pub_id', pubId!).maybeSingle(),
        supabase.rpc('pub_is_claimed', { p: pubId! }),
        supabase.from('pub_claims').select('*').eq('pub_id', pubId!).maybeSingle(),
      ]);
      if (details.error) throw details.error;
      if (claimed.error) throw claimed.error;
      if (mine.error) throw mine.error;
      return { details: details.data, claimed: Boolean(claimed.data), mine: mine.data };
    },
  });
}

export function useClaimPub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pubId, role, contact }: { pubId: string; role: ClaimRole; contact: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('pub_claims')
        .insert({ pub_id: pubId, user_id: session!.user.id, role, contact: contact.trim() });
      if (error) throw error;
    },
    onSuccess: (_, { pubId }) => void queryClient.invalidateQueries({ queryKey: ['pub-claim', pubId] }),
  });
}

export function useSavePubDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pubId, ...fields }: { pubId: string } & Partial<Pick<PubDetails, 'hours' | 'offer' | 'event' | 'website'>>) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase.from('pub_details').upsert({
        pub_id: pubId,
        ...fields,
        updated_by: session!.user.id,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: (_, { pubId }) => void queryClient.invalidateQueries({ queryKey: ['pub-claim', pubId] }),
  });
}

/** Adding a pub the import missed. Unverified until someone checks in. */
export function useCreatePub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; lat: number; lng: number; address?: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('pubs')
        .insert({
          name: input.name.trim(),
          lat: input.lat,
          lng: input.lng,
          address: input.address?.trim() || null,
          created_by: session!.user.id,
          status: 'unverified',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['map-pubs'] });
      void queryClient.invalidateQueries({ queryKey: ['nearby-pubs'] });
    },
  });
}
