import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { getI18nState } from '@/services/i18n';

export interface AnimatedSplashOverlayProps {
  appName?: string;
  tagline?: string;
}

export function AnimatedSplashOverlay({
  appName = 'RentLedger Pro',
  tagline,
}: AnimatedSplashOverlayProps) {
  const [visible, setVisible] = useState(true);
  const lang = getI18nState().lang;
  const isTr = lang === 'tr';

  const defaultTagline = isTr ? 'Kira Takip & Resmi Makbuz' : 'Smart Rent Ledger & Receipts';
  const displayTagline = tagline || defaultTagline;
  const loadingText = isTr ? 'Yükleniyor...' : 'Loading...';
  const subText = isTr ? 'Kira kayıtlarınız hazırlanıyor' : 'Preparing your workspace';

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.contentContainer}>
        <View style={styles.iconWrapper}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.iconImage}
            contentFit="cover"
          />
        </View>

        <Text style={styles.titleText}>{appName}</Text>
        <Text style={styles.taglineText}>{displayTagline}</Text>

        <View style={styles.progressTrack}>
          <View style={styles.progressBar} />
        </View>

        <View style={styles.statusRow}>
          <View style={styles.pulsingDot} />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
        <Text style={styles.subText}>{subText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#070b14',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 420,
  },
  iconWrapper: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  taglineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34d399',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 36,
    textAlign: 'center',
  },
  progressTrack: {
    width: '75%',
    height: 5,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  progressBar: {
    height: '100%',
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 999,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.3,
  },
  subText: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 0.2,
  },
});
