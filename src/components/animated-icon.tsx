import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { getI18nState } from '@/services/i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  // Animation values
  const scale = useSharedValue(0.9);
  const pulse = useSharedValue(1);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Hide native splash immediately so our interactive animated splash takes over
    SplashScreen.hideAsync().catch(() => {});

    // 1. Logo entrance bounce
    scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.4)) });

    // 2. Subtle continuous breathing pulse on logo
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 3. Smooth loading progress bar (0 to 100%)
    progress.value = withTiming(1, { duration: 1600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });

    // 4. Fade out entire overlay after loading finishes
    const timer = setTimeout(() => {
      opacity.value = withTiming(
        0,
        { duration: 450, easing: Easing.out(Easing.ease) },
        (finished) => {
          if (finished) {
            runOnJS(setVisible)(false);
          }
        }
      );
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulse.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, containerAnimatedStyle]} pointerEvents="none">
      {/* Background Ambient Glows */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      <View style={styles.contentContainer}>
        {/* App Icon Container with Glossy Halo */}
        <Animated.View style={[styles.iconWrapper, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.iconImage}
            contentFit="cover"
            transition={200}
          />
        </Animated.View>

        {/* App Title & Tagline */}
        <Text style={styles.titleText}>{appName}</Text>
        <Text style={styles.taglineText}>{displayTagline}</Text>

        {/* Loading Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, progressAnimatedStyle]} />
        </View>

        {/* Loading Status Indicator */}
        <View style={styles.statusRow}>
          <View style={styles.pulsingDot} />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
        <Text style={styles.subText}>{subText}</Text>
      </View>

      {/* Subtle Studio Footer Badge */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>OBAPPSTUDIO • SECURE OFFLINE STORAGE</Text>
      </View>
    </Animated.View>
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
  ambientGlowTop: {
    position: 'absolute',
    top: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
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
    elevation: 16,
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
  footerContainer: {
    position: 'absolute',
    bottom: 36,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#475569',
  },
});
