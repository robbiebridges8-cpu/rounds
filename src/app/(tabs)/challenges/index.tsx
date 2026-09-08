import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { ChallengeCard } from '@/components/challenge-card';
import { Body, Button, Card, EmptyState, Icon, SectionTitle } from '@/components/ui';
import { useChallenges } from '@/lib/challenges';
import { colors } from '@/theme';

export default function ChallengesScreen() {
  const router = useRouter();
  const challenges = useChallenges();

  const mine = challenges.data?.filter((c) => c.joined) ?? [];
  const others = challenges.data?.filter((c) => !c.joined) ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Challenges',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/challenge/new')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Create a challenge">
              <Icon name="plus.circle.fill" size={24} color={colors.ale} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-4 pb-10 pt-2"
        refreshControl={
          <RefreshControl refreshing={challenges.isRefetching} onRefresh={() => void challenges.refetch()} />
        }>
        {challenges.isPending ? (
          <View className="py-10">
            <ActivityIndicator color={colors.ale} />
          </View>
        ) : null}

        {mine.length > 0 ? (
          <View>
            <SectionTitle>Yours</SectionTitle>
            <View className="gap-3">
              {mine.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })}
                />
              ))}
            </View>
          </View>
        ) : null}

        {others.length > 0 ? (
          <View>
            <SectionTitle>Take one on</SectionTitle>
            <View className="gap-3">
              {others.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })}
                />
              ))}
            </View>
          </View>
        ) : null}

        {challenges.isSuccess ? (
          <Card>
            <View className="gap-3 p-5">
              <Body>
                A challenge is a list of pubs and a badge for finishing it. Every Wetherspoons. The
                Circle line. Every pub with a garden. Make one and see who bites.
              </Body>
              <Button
                label="Create a challenge"
                icon="plus"
                variant={challenges.data.length ? 'quiet' : 'primary'}
                onPress={() => router.push('/challenge/new')}
              />
            </View>
          </Card>
        ) : null}

        {challenges.isSuccess && challenges.data.length === 0 ? (
          <EmptyState icon="trophy" title="No challenges yet" body="Be the first to set one." />
        ) : null}
      </ScrollView>
    </>
  );
}
