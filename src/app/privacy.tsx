import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { PRIVACY_TEXT } from '@/lib/privacy-text';

/** The policy, rendered from PRIVACY.md. Headings and bullets only. */
export default function PrivacyScreen() {
  const lines = PRIVACY_TEXT.split('\n');
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy' }} />
      <ScrollView className="flex-1" contentContainerClassName="gap-2 px-5 pb-10 pt-2">
        {lines.map((line, i) => {
          if (line.startsWith('# ')) return <Text key={i} className="text-ink font-display text-[26px] leading-8 pb-1" style={{ letterSpacing: -0.8 }}>{line.slice(2)}</Text>;
          if (line.startsWith('## ')) return <Text key={i} className="text-ink pt-3 text-[13px] font-bold uppercase tracking-wider">{line.slice(3)}</Text>;
          if (line.startsWith('- ')) {
            const body = line.slice(2);
            const m = body.match(/^\*\*(.+?)\*\*\s*(.*)$/);
            return (
              <View key={i} className="flex-row gap-2 pl-1">
                <Text className="text-ink-soft text-[15px]">•</Text>
                <Text className="text-ink flex-1 text-[15px] leading-6">
                  {m ? <Text className="font-bold">{m[1]} </Text> : null}
                  {m ? m[2] : body}
                </Text>
              </View>
            );
          }
          if (!line.trim()) return null;
          return <Text key={i} className="text-ink text-[15px] leading-6">{line}</Text>;
        })}
      </ScrollView>
    </>
  );
}
