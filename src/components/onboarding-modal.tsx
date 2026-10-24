import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronLeft } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/constants/theme';
import { triggerHaptic } from '@/services/haptics';
import { brandParams, useI18n } from '@/services/i18n';

/**
 * Genel onboarding sihirbazı (15–30 sn). Adımlar uygulama tarafından verilir:
 *   choice      → tek seçimli soru (cevap kaydedilir, otomatik ilerler)
 *   calibration → 3,1 sn ilerleme + sıralı haptik onay işaretleri
 *   preview     → örnek çıktı önizlemesi (örnek veri SADECE burada yaşar)
 */
export type OnboardingStep =
  | {
      kind: 'choice';
      id: string;
      title: string;
      options: { value: string; label: string }[];
    }
  | { kind: 'calibration'; title: string; checkpoints: string[] }
  | { kind: 'preview'; title: string; body?: string; content: ReactNode };

const CALIBRATION_MS = 3100;
const ADVANCE_DELAY_MS = 180;

interface OnboardingProps {
  steps: OnboardingStep[];
  onFinish: (answers: Record<string, string>) => void;
}

export function OnboardingModal({ visible, steps, onFinish }: OnboardingProps & { visible: boolean }) {
  // Akış yalnızca görünürken bağlanır: her açılışta (ilk kurulum veya Ayarlar'dan
  // tekrar) durum sıfırdan başlar, sıfırlamak için effect gerekmez.
  return visible ? <OnboardingFlow steps={steps} onFinish={onFinish} /> : null;
}

function OnboardingFlow({ steps, onFinish }: OnboardingProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});

  const step = steps[index];

  const goNext = (fromIndex: number) => {
    if (fromIndex >= steps.length - 1) {
      triggerHaptic.success();
      onFinish({ ...answersRef.current });
    } else {
      setIndex(fromIndex + 1);
    }
  };
  const next = () => goNext(index);

  if (!step) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={() => setIndex((i) => Math.max(0, i - 1))}>
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            disabled={index === 0}
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
            hitSlop={12}
            className={`h-10 w-10 items-center justify-center ${index === 0 ? 'opacity-0' : ''}`}>
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <Text className="text-xs font-semibold text-muted dark:text-muted-dark">
            {t('onboardingStepOf', { current: index + 1, total: steps.length })}
          </Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mx-5 mt-2 h-1.5 overflow-hidden rounded-full bg-elevated dark:bg-elevated-dark">
          <View className="h-full rounded-full bg-primary" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 28, flexGrow: 1 }}>
          {step.kind === 'choice' ? (
            <ChoiceStep
              key={step.id}
              step={step}
              selected={answers[step.id]}
              onSelect={(value) => {
                triggerHaptic.selection();
                answersRef.current = { ...answersRef.current, [step.id]: value };
                setAnswers(answersRef.current);
                const fromIndex = index;
                setTimeout(() => goNext(fromIndex), ADVANCE_DELAY_MS);
              }}
            />
          ) : null}

          {step.kind === 'calibration' ? <CalibrationStep key={`cal-${index}`} step={step} onDone={next} /> : null}

          {step.kind === 'preview' ? (
            <View className="flex-1">
              <Text className="text-[26px] font-extrabold leading-tight text-ink dark:text-ink-dark">{step.title}</Text>
              {step.body ? (
                <Text className="mt-2 text-[15px] text-muted dark:text-muted-dark">{step.body}</Text>
              ) : null}
              <View className="mt-6">{step.content}</View>
              <View className="flex-1" />
              <Button label={t('onboardingStart', brandParams())} onPress={next} className="mt-8" />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ChoiceStep({
  step,
  selected,
  onSelect,
}: {
  step: Extract<OnboardingStep, { kind: 'choice' }>;
  selected?: string;
  onSelect: (value: string) => void;
}) {
  const colors = useThemeColors();
  return (
    <View>
      <Text className="text-[26px] font-extrabold leading-tight text-ink dark:text-ink-dark">{step.title}</Text>
      <View className="mt-6 gap-3">
        {step.options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(option.value)}
              className={`min-h-[56px] flex-row items-center justify-between rounded-2xl border-2 px-4 py-3 active:opacity-80 ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark'
              }`}>
              <Text className="flex-1 text-[16px] font-semibold text-ink dark:text-ink-dark">{option.label}</Text>
              {isSelected ? <Check size={18} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CalibrationStep({
  step,
  onDone,
}: {
  step: Extract<OnboardingStep, { kind: 'calibration' }>;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  // Animated.Value render boyunca sabit kalmalı; ref yerine state (derleyici uyumlu).
  const [progress] = useState(() => new Animated.Value(0));
  const [ticked, setTicked] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: CALIBRATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();

    const interval = CALIBRATION_MS / step.checkpoints.length;
    const timers = step.checkpoints.map((_, i) =>
      setTimeout(() => {
        setTicked(i + 1);
        triggerHaptic.selection();
      }, interval * (i + 1))
    );
    const doneTimer = setTimeout(() => {
      setFinished(true);
      triggerHaptic.success();
    }, CALIBRATION_MS + 100);

    return () => {
      animation.stop();
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
  }, [progress, step.checkpoints]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View className="flex-1">
      <Text className="text-[26px] font-extrabold leading-tight text-ink dark:text-ink-dark">{step.title}</Text>
      <View className="mt-8 h-2 overflow-hidden rounded-full bg-elevated dark:bg-elevated-dark">
        <Animated.View style={{ width, height: '100%', backgroundColor: colors.accent, borderRadius: 999 }} />
      </View>
      <View className="mt-8 gap-4">
        {step.checkpoints.map((label, i) => {
          const done = i < ticked;
          return (
            <View key={label} className="flex-row items-center gap-3">
              <View
                className={`h-6 w-6 items-center justify-center rounded-full ${
                  done ? 'bg-accent' : 'bg-elevated dark:bg-elevated-dark'
                }`}>
                {done ? <Check size={14} color={colors.onBrand} /> : null}
              </View>
              <Text
                className={`text-[15px] ${
                  done ? 'font-semibold text-ink dark:text-ink-dark' : 'text-muted dark:text-muted-dark'
                }`}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <View className="flex-1" />
      <Button label={t('continue')} onPress={onDone} disabled={!finished} className="mt-8" />
    </View>
  );
}
