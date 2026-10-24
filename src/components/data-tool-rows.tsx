import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { ArchiveRestore, DatabaseBackup, FileSpreadsheet } from 'lucide-react-native';

import { ListRow } from '@/components/ui/list-row';
import { useThemeColors } from '@/constants/theme';
import { BackupError, createBackup, pickBackup, restoreBackup, type BackupErrorReason } from '@/services/backup';
import { shareCsv } from '@/services/csv';
import { triggerHaptic } from '@/services/haptics';
import { brandParams, t as translateNow, useI18n, type TranslationKey } from '@/services/i18n';

export interface CsvExport {
  key: string;
  title: string;
  /** CSV'yi üretir; dışa aktarılacak kayıt yoksa null döner. `name` dosya adına girer. */
  build: () => Promise<{ name: string; csv: string } | null>;
}

const BACKUP_ERROR_TEXT: Record<BackupErrorReason, TranslationKey> = {
  invalid: 'backupInvalid',
  other_app: 'backupOtherApp',
  too_new: 'backupTooNew',
};

/**
 * Ayarlar → Veriler kartının satırları: yedekle, yedekten geri yükle ve uygulamanın
 * CSV dışa aktarmaları. Hepsi ücretsizdir (kota düşmez, paywall yok).
 * Kartın son satırı ("verileri sil") ekranda kalır; bu bileşen yalnızca üstteki satırları çizer.
 */
export function DataToolRows({
  csvExports = [],
  onRestored,
}: {
  csvExports?: CsvExport[];
  /** Geri yükleme bittikten sonra: dil/tema/kota ve ekran verisini tazeleyin. */
  onRestored?: () => void;
}) {
  const { t, language } = useI18n();
  const colors = useThemeColors();
  const [busy, setBusy] = useState<string | null>(null);

  // SQLite ve dosya paylaşımı yalnızca native; web önizlemesinde gösterilmez.
  if (Platform.OS === 'web') return null;

  const run = async (key: string, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } catch (error) {
      console.warn(`[data-tools] ${key} başarısız:`, error);
      Alert.alert(translateNow('errorTitle'), translateNow('tryAgainLater'));
    } finally {
      setBusy(null);
    }
  };

  const handleBackup = () =>
    run('backup', async () => {
      if ((await createBackup()) === 'unavailable') {
        Alert.alert(t('errorTitle'), t('fileShareUnavailable'));
      }
    });

  const handleRestore = () =>
    run('restore', async () => {
      let picked;
      try {
        picked = await pickBackup();
      } catch (error) {
        if (error instanceof BackupError) {
          triggerHaptic.warning();
          Alert.alert(t('backupRestore'), t(BACKUP_ERROR_TEXT[error.reason], brandParams()));
          return;
        }
        throw error;
      }
      if (!picked) return;

      const backup = picked;
      const date = new Date(backup.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
        dateStyle: 'medium',
      });
      triggerHaptic.warning();
      Alert.alert(t('backupRestoreTitle'), t('backupRestoreBody', { date, count: backup.recordCount }), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('backupRestoreConfirm'),
          style: 'destructive',
          onPress: () =>
            void run('restore', async () => {
              await restoreBackup(backup);
              triggerHaptic.success();
              onRestored?.();
              // Dil yedekle birlikte değişmiş olabilir: güncel dille yaz.
              Alert.alert(translateNow('backupRestoreDone'));
            }),
        },
      ]);
    });

  const handleCsv = (item: CsvExport) =>
    run(item.key, async () => {
      const result = await item.build();
      if (!result) {
        Alert.alert(item.title, t('csvEmpty'));
        return;
      }
      if ((await shareCsv(result.name, result.csv)) === 'unavailable') {
        Alert.alert(t('errorTitle'), t('fileShareUnavailable'));
      }
    });

  return (
    <>
      <ListRow
        icon={<DatabaseBackup size={18} color={colors.primary} />}
        title={busy === 'backup' ? '…' : t('backupCreate')}
        subtitle={t('backupCreateHint')}
        onPress={handleBackup}
      />
      <ListRow
        icon={<ArchiveRestore size={18} color={colors.primary} />}
        title={busy === 'restore' ? '…' : t('backupRestore')}
        subtitle={t('backupRestoreHint')}
        onPress={handleRestore}
      />
      {csvExports.map((item) => (
        <ListRow
          key={item.key}
          icon={<FileSpreadsheet size={18} color={colors.accent} />}
          title={busy === item.key ? '…' : item.title}
          subtitle={t('csvHint')}
          onPress={() => handleCsv(item)}
        />
      ))}
    </>
  );
}
