import { PaywallModal } from '@/components/paywall-modal';
import { useI18n } from '@/services/i18n';

/** Şablon paywall'u, RentLedger'ın gerçek Pro faydalarıyla. */
export function RentPaywall({
  visible,
  onClose,
  reason,
}: {
  visible: boolean;
  onClose: () => void;
  reason?: string;
}) {
  const { t } = useI18n();
  return (
    <PaywallModal
      visible={visible}
      onClose={onClose}
      reason={reason}
      benefits={[
        t('benefitUnlimitedReceipts'),
        t('benefitUnlimitedProperties'),
        t('paywallBenefitNoAds'),
        t('benefitCleanOutput'),
      ]}
    />
  );
}
