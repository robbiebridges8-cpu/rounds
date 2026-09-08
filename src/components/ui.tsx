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

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text className="text-ink font-display text-[34px] leading-[40px]">{children}</Text>;
}

/** A big number or a short line in the display face. */
export function Display({
  children,
  size = 44,
  color = colors.ink,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
}) {
  return (
    <Text
      style={{ fontFamily: fonts.displayBlack, fontSize: size, lineHeight: size * 1.05, color }}
      allowFontScaling={false}>
      {children}
    </Text>
  );
}

export function Wordmark({ size = 20, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Text
      style={{ fontFamily: fonts.displayBlack, fontSize: size, color, letterSpacing: -size * 0.02 }}
      allowFontScaling={false}>
      Rounds
    </Text>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return <Text className="text-ink-soft text-[17px] leading-6">{children}</Text>;
}

/** iOS grouped-list section header: small caps, generous top space. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View className="flex-row items-end justify-between px-1 pb-2 pt-2">
      <Text className="text-ink-soft text-sm font-semibold uppercase tracking-wide">{children}</Text>
      {action}
    </View>
  );
}

/** SF Symbol on iOS. Elsewhere it renders nothing, so always pair with a label. */
export function Icon({
  name,
  size = 20,
  color = colors.ink,
  weight = 'medium',
}: {
  name: SFSymbol;
  size?: number;
  color?: ColorValue;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  return (
    <SymbolView name={name} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" />
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet';
  disabled?: boolean;
  loading?: boolean;
  icon?: SFSymbol;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
}: ButtonProps) {
  const inert = disabled || loading;
  const primary = variant === 'primary';
  const foreground = primary ? '#fff' : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      className={[
        'h-[52px] flex-row items-center justify-center gap-2 rounded-md px-6',
        primary ? 'bg-ale active:bg-ale-dark' : 'bg-ale-tint active:bg-line',
        inert ? 'opacity-40' : '',
      ].join(' ')}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={foreground} weight="semibold" /> : null}
          <Text className={`text-[17px] font-semibold ${primary ? 'text-white' : 'text-ink'}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label?: string; hint?: string; error?: string | null };

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, hint, error, multiline, ...props },
  ref
) {
  return (
    <View className="gap-2">
      {label ? (
        <Text className="text-ink text-sm font-bold uppercase tracking-wide">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.slate}
        multiline={multiline}
        className={[
          'text-ink rounded-md border-2 bg-card px-4 text-[17px]',
          multiline ? 'min-h-[96px] py-3' : 'h-[50px]',
          error ? 'border-danger' : 'border-line',
        ].join(' ')}
        style={multiline ? { textAlignVertical: 'top' } : undefined}
        {...props}
      />
      {error ? (
        <Text className="text-danger text-sm">{error}</Text>
      ) : hint ? (
        <Text className="text-ink-soft text-sm">{hint}</Text>
      ) : null}
    </View>
  );
});

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center rounded-md border border-line bg-card py-4">
      <Text
        className="text-ink"
        style={{ fontFamily: fonts.displayBlack, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text className="text-ink-soft mt-1 text-xs font-semibold uppercase tracking-wide">{label}</Text>
    </View>
  );
}

export function Avatar({
  url,
  name,
  size = 44,
}: {
  url: string | null | undefined;
  name: string;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      className="items-center justify-center overflow-hidden bg-ale-tint"
      style={{ width: size, height: size, borderRadius: size / 2 }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} transition={150} />
      ) : (
        <Text className="text-ale" style={{ fontFamily: fonts.displayBlack, fontSize: size * 0.46 }}>
          {initial}
        </Text>
      )}
    </View>
  );
}

/** A grouped-list card. Put ListRow children inside. */
export function Card({ children }: { children: ReactNode }) {
  return <View className="overflow-hidden rounded-md border border-line bg-card">{children}</View>;
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
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className={onPress ? 'active:bg-ale-tint' : ''}>
      <View className="min-h-[44px] flex-row items-center gap-3 pl-4">
        {left}
        <View
          className={`flex-1 flex-row items-center gap-3 py-3 pr-4 ${
            last ? '' : 'border-b border-line'
          }`}>
          <View className="flex-1">
            <Text className="text-ink text-[17px]" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-ink-soft mt-0.5 text-[15px]" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
          {chevron ?? Boolean(onPress) ? (
            <Icon name="chevron.right" size={14} color={colors.slate} weight="semibold" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function Stars({
  value,
  onChange,
  size = 20,
}: {
  value: number | null;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const filled = value ?? 0;
  return (
    <View
      className="flex-row"
      style={{ gap: onChange ? 8 : 2 }}
      accessibilityRole={onChange ? 'adjustable' : 'text'}
      accessibilityLabel={value ? `${value} out of 5 stars` : 'Not rated'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          onPress={() => onChange?.(n === filled ? 0 : n)}
          hitSlop={8}
          style={onChange ? { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' } : undefined}>
          <Icon
            name={n <= filled ? 'star.fill' : 'star'}
            size={size}
            color={n <= filled ? colors.gold : colors.slate}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: SFSymbol;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <View className="items-center gap-2 px-6 py-12">
      <Icon name={icon} size={40} color={colors.slate} weight="regular" />
      <Text className="text-ink mt-2 text-lg font-semibold">{title}</Text>
      {body ? <Text className="text-ink-soft text-center text-[15px]">{body}</Text> : null}
      {children}
    </View>
  );
}

/** Floating map control: a circle that reads well over any map tile. */
export function MapButton({
  icon,
  label,
  onPress,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:bg-ale-tint"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}>
      <Icon name={icon} size={20} color={colors.ale} weight="semibold" />
    </Pressable>
  );
}
