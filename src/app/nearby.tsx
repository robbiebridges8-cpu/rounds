import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Card, EmptyState, Icon, ListRow, Rating } from '@/components/ui';
import { formatDistance, plural } from '@/lib/format';
import { getPosition, type Coords } from '@/lib/location';
import { useNearbyPubs, type NearbyPub } from '@/lib/pubs';
import { colors } from '@/theme';
import { APP_NAME } from '@/lib/brand';

export default function NearbyScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [denied, setDenied] = useState(false);
  const pubs = useNearbyPubs(coords);

  useEffect(() => {
    void getPosition().then((position) => (position ? setCoords(position) : setDenied(true)));
  }, []);

  const open = (pub: NearbyPub) => {
    router.dismiss();
    router.push({ pathname: '/pub/[id]', params: { id: pub.id } });
  };

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-4 px-4 pb-10 pt-6">
      <Text className="text-ink font-display text-[28px]">Near you</Text>

      {denied ? (
        <EmptyState
          icon="location.slash"
          title="Location is off"
          body={`Allow location for ${APP_NAME} in Settings to see what is within walking distance.`}
        />
      ) : null}

      {!denied && (!coords || pubs.isPending) ? (
        <View className="py-12">
          <ActivityIndicator color={colors.ale} />
        </View>
      ) : null}

      {pubs.data && pubs.data.length === 0 ? (
        <EmptyState icon="mappin.slash" title="Nothing within 1.5 km" />
      ) : null}

      {pubs.data && pubs.data.length > 0 ? (
        <Card>
          {pubs.data.map((pub, index) => (
            <ListRow
              key={pub.id}
              title={pub.name}
              subtitle={[
                formatDistance(pub.distance_m),
                pub.checkin_count > 0 ? plural(pub.checkin_count, 'visit') : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              left={<Dot pub={pub} />}
              right={pub.avg_rating != null ? <Rating value={pub.avg_rating} size={14} /> : undefined}
              onPress={() => open(pub)}
              last={index === pubs.data.length - 1}
            />
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Dot({ pub }: { pub: NearbyPub }) {
  if (pub.visited_by_me) return <Icon name="checkmark.circle.fill" size={22} color={colors.you} />;
  if (pub.friend_visits > 0) return <Icon name="person.2.circle.fill" size={22} color={colors.mates} />;
  return <Icon name="circle" size={22} color={colors.line} />;
}
