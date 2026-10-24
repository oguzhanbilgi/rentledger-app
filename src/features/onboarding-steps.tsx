import { useState } from 'react';
import { Text, View } from 'react-native';

import type { OnboardingStep } from '@/components/onboarding-modal';
import { Card } from '@/components/ui/card';
import { amountInWords } from '@/services/amount-in-words';
import { useDefaultCurrency } from '@/services/currency';
import { formatMoney, t, useI18n } from '@/services/i18n';
import { formatPeriod, paymentMethodLabel, toPeriodKey } from '@/services/rent-format';

/**
 * RentLedger onboarding (6 adım): mülk sayısı → mevcut takip yöntemi → en büyük sorun →
 * tahsilat ritmi → kalibrasyon → makbuz önizlemesi. Cevaplar `app_onboarding_answers`
 * içinde saklanır. Önizlemedeki örnek veri YALNIZCA burada, bellekte yaşar.
 */
export function buildOnboardingSteps(): OnboardingStep[] {
  return [
    {
      kind: 'choice',
      id: 'properties',
      title: t('onboardingRoleTitle'),
      options: [
        { value: '1-2', label: t('onboardingRoleA') },
        { value: '3-5', label: t('onboardingRoleB') },
        { value: '6+', label: t('onboardingRoleC') },
      ],
    },
    {
      kind: 'choice',
      id: 'tracking',
      title: t('onboardingHistoryTitle'),
      options: [
        { value: 'paper', label: t('onboardingHistoryA') },
        { value: 'spreadsheet', label: t('onboardingHistoryB') },
        { value: 'bank', label: t('onboardingHistoryC') },
      ],
    },
    {
      kind: 'choice',
      id: 'pain',
      title: t('onboardingPainTitle'),
      options: [
        { value: 'late_rent', label: t('onboardingPainA') },
        { value: 'receipts', label: t('onboardingPainB') },
        { value: 'who_paid', label: t('onboardingPainC') },
      ],
    },
    {
      kind: 'choice',
      id: 'rhythm',
      title: t('onboardingGoalTitle'),
      options: [
        { value: 'start', label: t('onboardingGoalA') },
        { value: 'mid', label: t('onboardingGoalB') },
        { value: 'mixed', label: t('onboardingGoalC') },
      ],
    },
    {
      kind: 'calibration',
      title: t('onboardingCalibrating'),
      checkpoints: [
        t('onboardingCalibrateStep1'),
        t('onboardingCalibrateStep2'),
        t('onboardingCalibrateStep3'),
        t('onboardingCalibrateStep4'),
      ],
    },
    {
      kind: 'preview',
      title: t('onboardingPreviewTitle'),
      body: t('onboardingPreviewBody'),
      content: <SampleReceiptPreview />,
    },
  ];
}

/** Önizleme, dil ve para birimini hook'larla okur (React Compiler bayat değer tutmasın). */
function SampleReceiptPreview() {
  const { t: tr, language } = useI18n();
  const currency = useDefaultCurrency();
  const amount = currency === 'TRY' ? 25000 : 1200;
  const [period] = useState(() => toPeriodKey());
  const year = period.slice(0, 4);

  return (
    <Card>
      <View className="flex-row items-start justify-between gap-3 border-b border-line pb-3 dark:border-line-dark">
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-muted dark:text-muted-dark">
            {tr('onboardingSampleRecord')}
          </Text>
          <Text className="mt-1 text-lg font-extrabold text-ink dark:text-ink-dark">{tr('pdfTitle')}</Text>
        </View>
        <Text className="text-xs font-bold text-accent">RL-{year}-0001</Text>
      </View>

      <View className="mt-3 gap-1">
        <Text className="text-sm font-bold text-ink dark:text-ink-dark">{tr('onboardingSampleTenant')}</Text>
        <Text className="text-xs text-muted dark:text-muted-dark">
          {tr('onboardingSampleProperty')} · {tr('pdfRentFor', { period: formatPeriod(period, language) })}
        </Text>
        <Text className="text-xs text-muted dark:text-muted-dark">
          {tr('fieldPaymentMethod')}: {paymentMethodLabel('bank_transfer', language)}
        </Text>
      </View>

      <View className="mt-4 rounded-2xl border border-accent/30 bg-accent/10 p-3">
        <Text className="text-[22px] font-extrabold text-accent">{formatMoney(amount, currency, language)}</Text>
        <Text className="mt-1 text-xs italic text-ink dark:text-ink-dark">
          {amountInWords(amount, currency, language)}
        </Text>
      </View>
    </Card>
  );
}
