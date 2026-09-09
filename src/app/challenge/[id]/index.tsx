import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ChallengeIcon, ProgressBar } from '@/components/challenge-card';
import { Body, Button, Card, EmptyState, Icon, SectionTitle } from '@/components/ui';
import { useSession } from '@/lib/auth';
import {
  challengeColor,
  useChallengePubs,
  useChallenges,
  useDeleteChallenge,
  useJoinChallenge,
  useLeaveChallenge,
  useRemoveChallengePub,
} from '@/lib/challenges';
import { formatWhen } from '@/lib/format';
import { colors, fonts } from '@/theme';

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const challenges = useChallenges();
  const pubs = useChallengePubs(id);
  const join = useJoinChallenge();
  const leave = useLeaveChallenge();
  const removePub = useRemoveChallengePub();
  const remove = useDeleteChallenge();

  const challenge = challenges.data?.find((c) => c.id === id);
  const isCreator = Boolean(challenge?.creator_id && challenge.creator_id === session?.user.id);

  if (challenges.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.ale} />
      </View>
    );
  }
  if (!challenge) return <EmptyState icon="trophy" title="That challenge is gone" />;

  const color = challengeColor(challenge.color);
  const done = Boolean(challenge.completed_at);
  const list = [...(pubs.data ?? [])].sort((a, b) => Number(a.done) - Number(b.done));

  const menu = () => {
    const destroy = () =>
      Alert.alert('Delete this challenge?', 'Everyone doing it loses their progress.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => remove.mutate(id, { onSuccess: () => router.back() }),
        },
      ]);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Add pubs', 'Delete challenge'], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
        (index) => {
          if (index === 1) router.push({ pathname: '/challenge/[id]/add', params: { id } });
          if (index === 2) destroy();
        }
      );
    } else {
      destroy();
    }
  };

  const toggleJoin = () => {
    void Haptics.selectionAsync();
    if (challenge.joined) {
      Alert.alert('Leave this challenge?', 'Your check-ins stay. Only the badge goes.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => leave.mutate(id) },
      ]);
    } else {
      join.mutate(id);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: isCreator
            ? () => (
                <Pressable onPress={menu} hitSlop={8} accessibilityRole="button" accessibilityLabel="More">
                  <Icon name="ellipsis.circle" size={22} color={colors.ale} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-10 pt-2"
        refreshControl={
          <RefreshControl
            refreshing={pubs.isRefetching}
            onRefresh={() => {
              void pubs.refetch();
              void challenges.refetch();
            }}
          />
        }>
        <View className="items-center gap-3 pt-2">
          <ChallengeIcon icon={challenge.icon} color={color} size={88} done={done} />
          <Text className="text-ink font-display text-center text-[30px] leading-9">{challenge.title}</Text>
          {challenge.description ? (
            <Text className="text-ink-soft text-center text-[16px] leading-6">{challenge.description}</Text>
          ) : null}
          <Text className="text-ink-soft text-[13px]">
            {challenge.pub_count} {challenge.pub_count === 1 ? 'pub' : 'pubs'} · {challenge.member_count}{' '}
            {challenge.member_count === 1 ? 'person' : 'people'} · set by {challenge.creator_name}
          </Text>
        </View>

        {done ? (
          <View className="items-center gap-1 rounded-lg px-4 py-5" style={{ backgroundColor: color }}>
            <Icon name="checkmark.seal.fill" size={28} color="#fff" />
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: '#fff' }}>Badge earned</Text>
            <Text className="text-[13px] text-white/85">Completed {formatWhen(challenge.completed_at)}</Text>
          </View>
        ) : challenge.joined ? (
          <View className="gap-2 rounded-lg border border-line bg-surface p-4">
            <View className="flex-row items-baseline justify-between">
              <Text style={{ fontFamily: fonts.displayBlack, fontSize: 30, color }}>
                {challenge.done_count}
                <Text className="text-ink-soft text-[17px]"> of {challenge.pub_count}</Text>
              </Text>
              <Text className="text-ink-soft text-[13px]">
                {challenge.pub_count - challenge.done_count} to go
              </Text>
            </View>
            <ProgressBar value={challenge.done_count} total={challenge.pub_count} color={color} />
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label={done ? 'Done' : challenge.joined ? 'Leave' : 'Take it on'}
              variant={challenge.joined ? 'quiet' : 'primary'}
              icon={challenge.joined ? undefined : 'flag.fill'}
              onPress={toggleJoin}
              disabled={done}
              loading={join.isPending || leave.isPending}
            />
          </View>
          {isCreator ? (
            <View className="flex-1">
              <Button
                label="Add pubs"
                icon="plus"
                variant={challenge.pub_count === 0 ? 'primary' : 'quiet'}
                onPress={() => router.push({ pathname: '/challenge/[id]/add', params: { id } })}
              />
            </View>
          ) : null}
        </View>

        <View>
          <SectionTitle>Pubs</SectionTitle>
          {pubs.isSuccess && list.length === 0 ? (
            <Card>
              <View className="p-5">
                <Body>
                  {isCreator
                    ? 'No pubs yet. Add some and this becomes a challenge.'
                    : 'The creator has not added any pubs yet.'}
                </Body>
              </View>
            </Card>
          ) : null}
          {list.length > 0 ? (
            <Card>
              {list.map((pub, index) => (
                <Pressable
                  key={pub.pub_id}
                  onPress={() => router.push({ pathname: '/pub/[id]', params: { id: pub.pub_id } })}
                  onLongPress={
                    isCreator
                      ? () =>
                          Alert.alert(`Remove ${pub.name}?`, undefined, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: () => removePub.mutate({ id, pubId: pub.pub_id }),
                            },
                          ])
                      : undefined
                  }
                  className="flex-row items-center gap-3 pl-4 active:bg-ale-tint">
                  <Icon
                    name={pub.done ? 'checkmark.circle.fill' : 'circle'}
                    size={24}
                    color={pub.done ? color : colors.line}
                  />
                  <View
                    className={`flex-1 flex-row items-center gap-3 py-3 pr-4 ${
                      index === list.length - 1 ? '' : 'border-b border-line'
                    }`}>
                    <View className="flex-1">
                      <Text
                        className={`text-[17px] ${pub.done ? 'text-ink-soft' : 'text-ink'}`}
                        numberOfLines={1}>
                        {pub.name}
                      </Text>
                      <Text className="text-ink-soft text-[13px]" numberOfLines={1}>
                        {[pub.borough, pub.friends_done > 0 ? `${pub.friends_done} ${pub.friends_done === 1 ? 'mate' : 'mates'} been` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <Icon name="chevron.right" size={14} color={colors.slate} weight="semibold" />
                  </View>
                </Pressable>
              ))}
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
