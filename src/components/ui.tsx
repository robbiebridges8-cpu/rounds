import { Image } from 'expo-image';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type ColorValue,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';
import { APP_NAME } from '@/lib/brand';
import { PintGlass } from '@/components/pint';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text className="text-ink font-display text-[30px] leading-[34px]" style={{ letterSpacing: -1 }}>
      {children}
    </Text>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return <Text className="text-ink-soft text-[17px] leading-6">{children}</Text>;
}

/** Section label: small caps with a short red rule, like a sign. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View className="flex-row items-end justify-between px-1 pb-2 pt-1">
      <Text className="text-ink text-[13px] font-bold uppercase tracking-wider">{children}</Text>
      {action}
    </View>
  );
}

/** A big number or a short line in the display face. */
export function Display({ children, size = 44, color }: { children: ReactNode; size?: number; color?: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.display,
        fontSize: size,
        lineHeight: size * 1.05,
        letterSpacing: -size * 0.03,
        color: color ?? colors.ink,
      }}
      allowFontScaling={false}>
      {children}
    </Text>
  );
}

/**
 * "pub'd" with the apostrophe drawn as a tilted pint. Colour is the ink for
 * the letters and the glass rim; the beer stays gold.
 */
export function Wordmark({ size = 22, color }: { size?: number; color?: string }) {
  const ink = color ?? colors.ink;
  const glass = Math.max(6, size * 0.3);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} accessibilityRole="header" accessibilityLabel={APP_NAME}>
      <Text style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.05, color: ink, letterSpacing: -size * 0.06 }} allowFontScaling={false}>
        pub
      </Text>
      <View style={{ width: glass, height: glass / 0.7, marginHorizontal: size * 0.035, marginTop: size * 0.02, transform: [{ rotate: '12deg' }] }}>
        <PintGlass width={glass} level={0.75} rim={ink} strokeWidth={1.6} />
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.05, color: ink, letterSpacing: -size * 0.06 }} allowFontScaling={false}>
        d
      </Text>
    </View>
  );
}

/** SF Symbol on iOS. Elsewhere it renders nothing, so always pair with a label. */
export function Icon({
  name,
  size = 20,
  color,
  weight = 'medium',
}: {
  name: SFSymbol;
  size?: number;
  color?: ColorValue;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  return <SymbolView name={name} size={size} tintColor={color ?? colors.ink} weight={weight} resizeMode="scaleAspectFit" />;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet' | 'outline' | 'accent';
  disabled?: boolean;
  loading?: boolean;
  icon?: SFSymbol;
};

/** Pill buttons. Primary is ink on canvas, the way Luma and Patreon do it. */
export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, icon }: ButtonProps) {
  const inert = disabled || loading;
  const foreground = variant === 'primary' || variant === 'accent' ? '#FFFFFF' : colors.ink;
  const surface =
    variant === 'primary'
      ? 'bg-ink active:opacity-80'
      : variant === 'accent'
        ? 'bg-ale active:opacity-80'
      : variant === 'outline'
        ? 'border-2 border-ink bg-surface active:bg-raised'
        : 'bg-raised active:bg-line';

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      className={`h-[54px] flex-row items-center justify-center gap-2 rounded-full px-6 ${surface} ${inert ? 'opacity-40' : ''}`}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={foreground} weight="semibold" /> : null}
          <Text className="text-[17px] font-bold" style={{ color: foreground }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label?: string; hint?: string; error?: string | null };

/** Patreon's input: a soft filled block, no border until it errors. */
export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, hint, error, multiline, ...props }, ref) {
  return (
    <View className="gap-2">
      {label ? <Text className="text-ink text-[13px] font-bold uppercase tracking-wider">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.slate}
        multiline={multiline}
        className={[
          'text-ink rounded-md bg-raised px-4 text-[17px]',
          multiline ? 'min-h-[100px] py-3' : 'h-[54px]',
          error ? 'border-[1.5px] border-danger' : '',
        ].join(' ')}
        style={multiline ? { textAlignVertical: 'top' } : undefined}
        {...props}
      />
      {error ? <Text className="text-danger text-sm">{error}</Text> : hint ? <Text className="text-ink-soft text-sm">{hint}</Text> : null}
    </View>
  );
});

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center rounded-lg bg-surface py-4">
      <Text className="text-ink" style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text className="text-ink-soft mt-1 text-xs font-semibold uppercase tracking-wide">{label}</Text>
    </View>
  );
}

export function Avatar({ url, name, size = 44 }: { url: string | null | undefined; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View className="items-center justify-center overflow-hidden bg-raised" style={{ width: size, height: size, borderRadius: size / 2 }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} transition={150} />
      ) : (
        <Text className="text-ink" style={{ fontFamily: fonts.display, fontSize: size * 0.46 }}>
          {initial}
        </Text>
      )}
    </View>
  );
}

/** A grouped-list card. Put ListRow children inside. */
export function Card({ children }: { children: ReactNode }) {
  return <View className="overflow-hidden rounded-lg bg-surface">{children}</View>;
}

type ListRowProps = {
  title: string;
  subtitle?: string | null;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
};

/** 44 pt minimum height, separator inset to the text like a UITableView. */
export function ListRow({ title, subtitle, left, right, onPress, chevron, last }: ListRowProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} className={onPress ? 'active:bg-raised' : ''}>
      <View className="min-h-[44px] flex-row items-center gap-3 pl-4">
        {left}
        <View className={`flex-1 flex-row items-center gap-3 py-3 pr-4 ${last ? '' : 'border-b border-line'}`}>
          <View className="flex-1">
            <Text className="text-ink text-[17px] font-semibold" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-ink-soft mt-0.5 text-[14px]" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
          {(chevron ?? Boolean(onPress)) ? <Icon name="chevron.right" size={13} color={colors.slate} weight="semibold" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Stars, 0 to 5 in halves, Letterboxd style. Read-only when there is no
 * onChange. Interactive: tap the left half of a star for the half, the right
 * for the whole; tap the current value again to clear.
 */
export function Stars({
  value,
  onChange,
  size = 16,
  color,
}: {
  value: number | null | undefined;
  onChange?: (value: number) => void;
  size?: number;
  color?: string;
}) {
  const v = Number(value ?? 0);
  const tint = color ?? colors.ale;
  const gap = onChange ? 6 : 2;

  return (
    <View className="flex-row" style={{ gap }} accessibilityRole={onChange ? 'adjustable' : 'text'} accessibilityLabel={v ? `${v} out of 5 stars` : 'Not rated'}>
      {[1, 2, 3, 4, 5].map((n) => {
        const name: SFSymbol = v >= n ? 'star.fill' : v >= n - 0.5 ? 'star.leadinghalf.filled' : 'star';
        const filled = v >= n - 0.5;
        const glyph = <Icon name={name} size={size} color={filled ? tint : colors.slate} />;
        if (!onChange) return <View key={n}>{glyph}</View>;
        const hit = Math.max(44, size + 12);
        return (
          <View key={n} style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}>
            {glyph}
            <Pressable
              accessibilityLabel={`${n - 0.5} stars`}
              onPress={() => onChange(v === n - 0.5 ? 0 : n - 0.5)}
              style={{ position: 'absolute', left: 0, top: 0, width: hit / 2, height: hit }}
            />
            <Pressable
              accessibilityLabel={`${n} stars`}
              onPress={() => onChange(v === n ? 0 : n)}
              style={{ position: 'absolute', right: 0, top: 0, width: hit / 2, height: hit }}
            />
          </View>
        );
      })}
    </View>
  );
}

/** Resy's rating: a red star, the number, and how many said so. */
export function Rating({ value, count, size = 15 }: { value: number | string | null | undefined; count?: number | null; size?: number }) {
  if (value == null) return <Text className="text-ink-soft text-[14px]">Not rated yet</Text>;
  return (
    <View className="flex-row items-center gap-1">
      <Icon name="star.fill" size={size * 0.9} color={colors.ale} />
      <Text className="text-ale font-bold" style={{ fontSize: size, fontVariant: ['tabular-nums'] }}>
        {Number(value).toFixed(1)}
      </Text>
      {count != null ? (
        <Text className="text-ink-soft" style={{ fontSize: size }}>
          ({count})
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: SFSymbol; title: string; body?: string; children?: ReactNode }) {
  return (
    <View className="items-center gap-2 px-6 py-12">
      <Icon name={icon} size={40} color={colors.slate} weight="regular" />
      <Text className="text-ink mt-2 text-lg font-bold">{title}</Text>
      {body ? <Text className="text-ink-soft text-center text-[15px]">{body}</Text> : null}
      {children}
    </View>
  );
}

/** Floating map control: a dark square, like Resy's locate button. */
export function MapButton({ icon, label, onPress }: { icon: SFSymbol; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-12 w-12 items-center justify-center rounded-full bg-ink active:opacity-80"
      style={{ shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
      <Icon name={icon} size={20} color={colors.canvas} weight="semibold" />
    </Pressable>
  );
}
