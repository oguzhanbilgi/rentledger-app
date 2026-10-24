import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Metin dosyası paylaşma ve seçme (yedek ve CSV dışa aktarma).
 *
 * Dosya önbellek klasörüne yazılır ve sistem paylaşım penceresi açılır; kullanıcı
 * dosyayı Drive'a, e-postaya veya Dosyalar'a kendisi kaydeder. Uygulama hiçbir
 * sunucuya veri göndermez. Yalnızca native (web önizlemesinde bu araçlar gizlenir).
 */

export interface TextFileShare {
  fileName: string;
  content: string;
  mimeType: string;
  /** iOS tür tanımlayıcısı (ör. `public.json`). */
  uti?: string;
  dialogTitle: string;
}

export async function shareTextFile(options: TextFileShare): Promise<'shared' | 'unavailable'> {
  const file = new File(Paths.cache, options.fileName);
  file.create({ overwrite: true });
  await file.write(options.content);
  if (!(await Sharing.isAvailableAsync())) {
    return 'unavailable';
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: options.mimeType,
    UTI: options.uti,
    dialogTitle: options.dialogTitle,
  });
  return 'shared';
}

/** Sistem dosya seçicisini açar; vazgeçilirse null döner. */
export async function pickTextFile(): Promise<string | null> {
  // Drive/indirilenler JSON'u farklı MIME türleriyle bildirebilir; içerik ayrıca doğrulanır.
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (picked.canceled) return null;
  return picked.result.text();
}
