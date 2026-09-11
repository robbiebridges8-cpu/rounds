import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { Card, EmptyState } from '@/components/ui';
import { useIsAdmin } from '@/lib/admin';
import { feedbackShotUrl, useAdminCorrections, useAdminFeedback, useAdminReports, useSetStatus, type CorrectionRow, type FeedbackRow, type ReportRow } from '@/lib/feedback';
import { formatWhen } from '@/lib/format';
import { colors } from '@/theme';

type Tab = 'feedback' | 'corrections' | 'reports';

const KIND_LABEL: Record<string, string> = { bug: 'Bug', idea: 'Idea', other: 'Other' };
const KIND_COLOUR: Record<string, string> = { bug: colors.ale, idea: colors.you, other: colors.slate };
const CORRECTION_LABEL: Record<string, string> = { closed: 'Closed down', wrong_location: 'Wrong place on the map', wrong_name: 'Wrong name', duplicate: 'Duplicate', other: 'Other' };

/** Everything people have sent: feedback, pub fixes, reports. Admins only. */
export default function AdminInboxScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isAdmin = useIsAdmin();
  const enabled = Boolean(isAdmin.data);
  const [tab, setTab] = useState<Tab>('feedback');
  const [showDone, setShowDone] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const feedback = useAdminFeedback(enabled);
  const corrections = useAdminCorrections(enabled);
  const reports = useAdminReports(enabled);
  const setStatus = useSetStatus();

  if (isAdmin.isSuccess && !isAdmin.data) return <EmptyState icon="lock" title="Admins only" />;

  const refreshing = feedback.isRefetching || corrections.isRefetching || reports.isRefetching;
  const refresh = () => {
    void feedback.refetch();
    void corrections.refetch();
    void reports.refetch();
  };

  const pending = {
    feedback: (feedback.data ?? []).filter((f) => f.status === 'new').length,
    corrections: (corrections.data ?? []).filter((c) => c.status === 'open').length,
    reports: (reports.data ?? []).filter((r) => r.status === 'open').length,
  };

  const choose = (title: string, options: { label: string; onPress: () => void }[]) => {
    if (Platform.OS !== 'ios') return options[0]?.onPress();
    ActionSheetIOS.showActionSheetWithOptions({ title, options: [...options.map((o) => o.label), 'Cancel'], cancelButtonIndex: options.length }, (i) => options[i]?.onPress());
  };

  const feedbackRows = (feedback.data ?? []).filter((f) => showDone || f.status !== 'done');
  const correctionRows = (corrections.data ?? []).filter((c) => showDone || c.status === 'open');
  const reportRows = (reports.data ?? []).filter((r) => showDone || r.status === 'open');
  const loading = tab === 'feedback' ? feedback.isPending : tab === 'corrections' ? corrections.isPending : reports.isPending;

  return (
    <>
      <Stack.Screen options={{ title: 'Inbox' }} />
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-10 pt-2" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View className="flex-row gap-2">
          {(
            [
              ['feedback', 'Feedback'],
              ['corrections', 'Pub fixes'],
              ['reports', 'Reports'],
            ] as [Tab, string][]
          ).map(([key, label]) => {
            const on = tab === key;
            const n = pending[key];
            return (
              <Pressable key={key} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} className={`h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-full ${on ? 'bg-ink' : 'bg-surface'}`}>
                <Text className={`text-[14px] font-bold ${on ? 'text-canvas' : 'text-ink'}`}>{label}</Text>
                {n > 0 ? (
                  <View className="h-5 min-w-[20px] items-center justify-center rounded-full px-1.5" style={{ backgroundColor: on ? colors.butter : colors.ale }}>
                    <Text className="text-[11px] font-bold" style={{ color: on ? '#101014' : '#fff' }}>{n}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => setShowDone((v) => !v)} accessibilityRole="switch" accessibilityState={{ checked: showDone }} className="self-end">
          <Text className="text-ink-soft text-[13px] font-semibold">{showDone ? 'Hide done' : 'Show done'}</Text>
        </Pressable>

        {loading ? (
          <View className="py-10">
            <ActivityIndicator color={colors.ale} />
          </View>
        ) : null}

        {tab === 'feedback'
          ? feedbackRows.length === 0 && !loading
            ? <EmptyState icon="tray" title="Nothing waiting" body="Feedback from Settings lands here." />
            : feedbackRows.map((f) => (
                <FeedbackCard
                  key={f.id}
                  row={f}
                  expanded={open === f.id}
                  width={width - 32}
                  onPress={() => setOpen(open === f.id ? null : f.id)}
                  onLongPress={() =>
                    choose(f.message.slice(0, 80), [
                      { label: 'Mark seen', onPress: () => setStatus.mutate({ table: 'feedback', id: f.id, status: 'seen' }) },
                      { label: 'Mark done', onPress: () => setStatus.mutate({ table: 'feedback', id: f.id, status: 'done' }) },
                      { label: 'Back to new', onPress: () => setStatus.mutate({ table: 'feedback', id: f.id, status: 'new' }) },
                    ])
                  }
                />
              ))
          : null}

        {tab === 'corrections'
          ? correctionRows.length === 0 && !loading
            ? <EmptyState icon="tray" title="Nothing waiting" body="Long-press a pub page to report a problem with it." />
            : correctionRows.map((c) => (
                <CorrectionCard
                  key={c.id}
                  row={c}
                  onPress={() => router.push({ pathname: '/pub/[id]', params: { id: c.pub_id } })}
                  onLongPress={() =>
                    choose(c.pubs?.name ?? 'Pub', [
                      { label: 'Accepted, fixed it', onPress: () => setStatus.mutate({ table: 'pub_corrections', id: c.id, status: 'accepted' }) },
                      { label: 'Rejected', onPress: () => setStatus.mutate({ table: 'pub_corrections', id: c.id, status: 'rejected' }) },
                      { label: 'Reopen', onPress: () => setStatus.mutate({ table: 'pub_corrections', id: c.id, status: 'open' }) },
                    ])
                  }
                />
              ))
          : null}

        {tab === 'reports'
          ? reportRows.length === 0 && !loading
            ? <EmptyState icon="tray" title="Nothing waiting" body="Reports on posts and profiles land here." />
            : reportRows.map((r) => (
                <ReportCard
                  key={r.id}
                  row={r}
                  onPress={() => {
                    if (r.target_type === 'checkin') router.push({ pathname: '/post/[id]', params: { id: r.target_id } });
                    if (r.target_type === 'profile') router.push({ pathname: '/user/[id]', params: { id: r.target_id } });
                  }}
                  onLongPress={() =>
                    choose(r.reason.slice(0, 80), [
                      { label: 'Actioned', onPress: () => setStatus.mutate({ table: 'reports', id: r.id, status: 'actioned' }) },
                      { label: 'Dismissed', onPress: () => setStatus.mutate({ table: 'reports', id: r.id, status: 'dismissed' }) },
                      { label: 'Reopen', onPress: () => setStatus.mutate({ table: 'reports', id: r.id, status: 'open' }) },
                    ])
                  }
                />
              ))
          : null}

        <Text className="text-ink-soft px-1 text-[12px]">Tap to open or expand. Long press to change the status.</Text>
      </ScrollView>
    </>
  );
}

function StatusDot({ status }: { status: string }) {
  const colour = status === 'new' || status === 'open' ? colors.ale : status === 'seen' ? colors.butter : colors.mint;
  return <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} />;
}

function Meta({ children }: { children: string }) {
  return <Text className="text-ink-soft text-[12px]">{children}</Text>;
}

function FeedbackCard({ row, expanded, width, onPress, onLongPress }: { row: FeedbackRow; expanded: boolean; width: number; onPress: () => void; onLongPress: () => void }) {
  const who = row.profiles ? `@${row.profiles.username}` : 'deleted account';
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button">
      <Card>
        <View className="gap-2 p-4">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: KIND_COLOUR[row.kind] ?? colors.slate }}>
              <Text className="text-[11px] font-bold text-white">{KIND_LABEL[row.kind] ?? row.kind}</Text>
            </View>
            <Text className="text-ink flex-1 text-[13px] font-semibold" numberOfLines={1}>{who}</Text>
            <StatusDot status={row.status} />
            <Meta>{formatWhen(row.created_at)}</Meta>
          </View>
          <Text className="text-ink text-[16px] leading-6" numberOfLines={expanded ? undefined : 3}>{row.message}</Text>
          {row.screenshot_path ? (
            <Image source={{ uri: feedbackShotUrl(row.screenshot_path) }} style={{ width: expanded ? width - 32 : 72, height: expanded ? (width - 32) * 1.6 : 128, borderRadius: 10, backgroundColor: colors.raised }} contentFit={expanded ? 'contain' : 'cover'} />
          ) : null}
          <Meta>{[row.screen ? `on ${row.screen}` : null, row.device, row.app_version ? `v${row.app_version}` : null].filter(Boolean).join(' · ')}</Meta>
        </View>
      </Card>
    </Pressable>
  );
}

function CorrectionCard({ row, onPress, onLongPress }: { row: CorrectionRow; onPress: () => void; onLongPress: () => void }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button">
      <Card>
        <View className="gap-1.5 p-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-ink flex-1 text-[16px] font-bold" numberOfLines={1}>{row.pubs?.name ?? 'Pub'}</Text>
            <StatusDot status={row.status} />
            <Meta>{formatWhen(row.created_at)}</Meta>
          </View>
          <Text className="text-ink text-[15px]">{CORRECTION_LABEL[row.type] ?? row.type}{row.detail ? `: ${row.detail}` : ''}</Text>
          <Meta>{[row.pubs?.borough, row.profiles ? `@${row.profiles.username}` : null, row.status].filter(Boolean).join(' · ')}</Meta>
        </View>
      </Card>
    </Pressable>
  );
}

function ReportCard({ row, onPress, onLongPress }: { row: ReportRow; onPress: () => void; onLongPress: () => void }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button">
      <Card>
        <View className="gap-1.5 p-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-ink flex-1 text-[16px] font-bold">Reported {row.target_type}</Text>
            <StatusDot status={row.status} />
            <Meta>{formatWhen(row.created_at)}</Meta>
          </View>
          <Text className="text-ink text-[15px]">{row.reason}</Text>
          <Meta>{[row.profiles ? `by @${row.profiles.username}` : null, row.status].filter(Boolean).join(' · ')}</Meta>
        </View>
      </Card>
    </Pressable>
  );
}
