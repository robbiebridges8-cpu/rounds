import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

import { compress, uploadImage, type PickedImage } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type FeedbackKind = 'bug' | 'idea' | 'other';

export const FEEDBACK_KINDS: { key: FeedbackKind; label: string }[] = [
  { key: 'bug', label: 'Something broke' },
  { key: 'idea', label: 'An idea' },
  { key: 'other', label: 'Something else' },
];

export function feedbackShotUrl(path: string): string {
  return supabase.storage.from('feedback-shots').getPublicUrl(path).data.publicUrl;
}

/** What the app knows about itself, so the sender does not have to say. */
function deviceLine(): string {
  return [Device.modelName, Device.osName && Device.osVersion ? `${Device.osName} ${Device.osVersion}` : null, Constants.appOwnership === 'expo' ? 'Expo Go' : null]
    .filter(Boolean)
    .join(', ');
}

export function useSendFeedback() {
  return useMutation({
    mutationFn: async (input: { kind: FeedbackKind; message: string; screen: string | null; screenshot: PickedImage | null }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session!.user.id;

      let screenshotPath: string | null = null;
      if (input.screenshot) {
        const small = await compress(input.screenshot, 1080);
        screenshotPath = `${userId}/${Date.now()}.jpg`;
        await uploadImage('feedback-shots', screenshotPath, small);
      }

      const { error } = await supabase.from('feedback').insert({
        user_id: userId,
        kind: input.kind,
        message: input.message.trim(),
        screen: input.screen,
        app_version: Constants.expoConfig?.version ?? null,
        device: deviceLine() || null,
        screenshot_path: screenshotPath,
      });
      if (error) throw error;
    },
  });
}

// --- admin inbox -----------------------------------------------------------

export type FeedbackRow = Tables<'feedback'> & { profiles: Pick<Tables<'profiles'>, 'username' | 'display_name'> | null };
export type CorrectionRow = Tables<'pub_corrections'> & {
  profiles: Pick<Tables<'profiles'>, 'username'> | null;
  pubs: Pick<Tables<'pubs'>, 'name' | 'borough'> | null;
};
export type ReportRow = Tables<'reports'> & { profiles: Pick<Tables<'profiles'>, 'username'> | null };

export function useAdminFeedback(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-feedback'],
    enabled,
    queryFn: async (): Promise<FeedbackRow[]> => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*, profiles!feedback_user_id_fkey(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as FeedbackRow[];
    },
  });
}

export function useAdminCorrections(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-corrections'],
    enabled,
    queryFn: async (): Promise<CorrectionRow[]> => {
      const { data, error } = await supabase
        .from('pub_corrections')
        .select('*, profiles!pub_corrections_user_id_fkey(username), pubs!pub_corrections_pub_id_fkey(name, borough)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CorrectionRow[];
    },
  });
}

export function useAdminReports(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-reports'],
    enabled,
    queryFn: async (): Promise<ReportRow[]> => {
      const { data, error } = await supabase
        .from('reports')
        .select('*, profiles!reports_reporter_id_fkey(username)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as ReportRow[];
    },
  });
}

/** How many things are waiting. Shown next to the Inbox link. */
export function useAdminPending(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-pending'],
    enabled,
    queryFn: async () => {
      const [f, c, r] = await Promise.all([
        supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('pub_corrections').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      return (f.count ?? 0) + (c.count ?? 0) + (r.count ?? 0);
    },
  });
}

type StatusTable = 'feedback' | 'pub_corrections' | 'reports';

export function useSetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ table, id, status }: { table: StatusTable; id: string; status: string }) => {
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-corrections'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-pending'] });
    },
  });
}
