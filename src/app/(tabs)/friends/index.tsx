import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Leaderboard, MetricPicker, type Metric } from '@/components/leaderboard';
import { Avatar, Button, Card, EmptyState, Field, Icon, ListRow, SectionTitle } from '@/components/ui';
import { useProfile, type Profile } from '@/lib/auth';
import { useAcceptFriend, useFriendships, useRemoveFriend, useRequestFriend } from '@/lib/friends';
import { shareInvite, useAcceptInvite, useInviteCode } from '@/lib/invites';
import { useLeaderboard } from '@/lib/social';
import { colors } from '@/theme';
import { APP_NAME } from '@/lib/brand';

export default function FriendsScreen() {
  const router = useRouter();
  const { data: me } = useProfile();
  const friendships = useFriendships();
  const leaderboard = useLeaderboard();
  const inviteCode = useInviteCode();
  const request = useRequestFriend();
  const acceptInvite = useAcceptInvite();
  const accept = useAcceptFriend();
  const remove = useRemoveFriend();
  const [username, setUsername] = useState('');
  const [metric, setMetric] = useState<Metric>('borough_count');

  const invite = () => {
    if (!inviteCode.data || !me) return;
    void shareInvite(inviteCode.data, me.display_name);
  };

  const addByUsername = (name: string) => {
    if (!name.trim()) return;
    request.mutate(name, {
      onSuccess: (row) => {
        setUsername('');
        Alert.alert(
          row.status === 'accepted' ? 'You are now friends' : 'Request sent',
          row.status === 'accepted'
            ? 'They had already asked you, so that is settled.'
            : `They will see it the next time they open ${APP_NAME}.`
        );
      },
      onError: (error) => Alert.alert('Could not add friend', error.message),
    });
  };

  const enterCode = (code: string) => {
    if (!code.trim()) return;
    acceptInvite.mutate(code, {
      onSuccess: (inviter) =>
        Alert.alert('You are now friends', `${inviter.display_name}'s pubs are green on your map.`),
      onError: (error) => Alert.alert('That code did not work', error.message),
    });
  };

  const prompt = (title: string, message: string, onSubmit: (value: string) => void) => {
    Alert.prompt(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add', onPress: (value?: string) => onSubmit(value ?? '') },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const addMenu = () => {
    if (Platform.OS !== 'ios') {
      invite();
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Share an invite link', 'Enter an invite code', 'Add by username'],
        cancelButtonIndex: 0,
      },
      (index) => {
        if (index === 1) invite();
        if (index === 2) prompt('Enter a code', 'The eight characters from their invite.', enterCode);
        if (index === 3) prompt('Add by username', `Their ${APP_NAME} username.`, addByUsername);
      }
    );
  };

  const confirmRemove = (profile: Profile, verb: 'Unfriend' | 'Withdraw' | 'Decline') => {
    Alert.alert(`${verb} ${profile.display_name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: verb, style: 'destructive', onPress: () => remove.mutate(profile.id) },
    ]);
  };

  const data = friendships.data;
  const noFriends = data && data.friends.length === 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Mates',
          headerRight: () => (
            <View className="flex-row items-center gap-5">
            <Pressable onPress={() => router.push('/search')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search pubs">
              <Icon name="magnifyingglass" size={20} color={colors.ink} weight="semibold" />
            </Pressable>
            <Pressable
              onPress={addMenu}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Add a friend">
              <Icon name="person.badge.plus" size={22} color={colors.ale} />
            </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-4 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={friendships.isRefetching || leaderboard.isRefetching}
            onRefresh={() => {
              void friendships.refetch();
              void leaderboard.refetch();
            }}
          />
        }>
        <View>
          <SectionTitle>Leaderboard</SectionTitle>
          <MetricPicker value={metric} onChange={setMetric} />
          <Leaderboard rows={leaderboard.data ?? []} metric={metric} />
        </View>

        {Platform.OS !== 'ios' ? (
          <View className="gap-3">
            <Field
              value={username}
              onChangeText={setUsername}
              placeholder="Add by username or invite code"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() =>
                /^[A-Z2-9]{8}$/i.test(username.trim()) ? enterCode(username) : addByUsername(username)
              }
            />
          </View>
        ) : null}

        {data && data.incoming.length > 0 ? (
          <View>
            <SectionTitle>Requests</SectionTitle>
            <Card>
              {data.incoming.map((profile, index) => (
                <ListRow
                  key={profile.id}
                  title={profile.display_name}
                  subtitle={`@${profile.username}`}
                  left={<Avatar url={profile.avatar_url} name={profile.display_name} />}
                  chevron={false}
                  last={index === data.incoming.length - 1}
                  right={
                    <View className="flex-row gap-2">
                      <SmallButton label="Accept" onPress={() => accept.mutate(profile.id)} />
                      <SmallButton label="Decline" quiet onPress={() => confirmRemove(profile, 'Decline')} />
                    </View>
                  }
                />
              ))}
            </Card>
          </View>
        ) : null}

        {data && data.friends.length > 0 ? (
          <View>
            <SectionTitle>Friends</SectionTitle>
            <Card>
              {data.friends.map((profile, index) => (
                <ListRow
                  key={profile.id}
                  title={profile.display_name}
                  subtitle={`@${profile.username}`}
                  left={<Avatar url={profile.avatar_url} name={profile.display_name} />}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: profile.id } })}
                  last={index === data.friends.length - 1}
                />
              ))}
            </Card>
          </View>
        ) : null}

        {data && data.outgoing.length > 0 ? (
          <View>
            <SectionTitle>Waiting on them</SectionTitle>
            <Card>
              {data.outgoing.map((profile, index) => (
                <ListRow
                  key={profile.id}
                  title={profile.display_name}
                  subtitle={`@${profile.username}`}
                  left={<Avatar url={profile.avatar_url} name={profile.display_name} />}
                  chevron={false}
                  last={index === data.outgoing.length - 1}
                  right={<SmallButton label="Withdraw" quiet onPress={() => confirmRemove(profile, 'Withdraw')} />}
                />
              ))}
            </Card>
          </View>
        ) : null}

        {noFriends ? (
          <Card>
            <EmptyState
              icon="person.2"
              title="Nobody here yet"
              body="Send a mate your link. When they join, their pubs go green on your map and the borough race is on.">
              <View className="w-full gap-2 pt-4">
                <Button label="Invite a mate" icon="square.and.arrow.up" onPress={invite} disabled={!inviteCode.data} />
                {inviteCode.data ? (
                  <Text className="text-ink-soft text-center text-[13px]">
                    Your code is <Text className="text-ink font-bold">{inviteCode.data}</Text>
                  </Text>
                ) : null}
              </View>
            </EmptyState>
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}

function SmallButton({ label, onPress, quiet }: { label: string; onPress: () => void; quiet?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={`h-9 items-center justify-center rounded-full px-4 ${
        quiet ? 'bg-ale-tint active:bg-line' : 'bg-ale active:bg-ale-dark'
      }`}>
      <Text className={`text-[15px] font-semibold ${quiet ? 'text-ale' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}
