import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';

type BannerStatus = 'hidden' | 'offline' | 'restored';

export const NetworkBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isOffline, checkConnectivity } = useNetwork();
  const [status, setStatus] = useState<BannerStatus>('hidden');
  const [isRetrying, setIsRetrying] = useState(false);
  const translateY = useRef(new Animated.Value(-120)).current;
  const wasOfflineRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOffline) {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      wasOfflineRef.current = true;
      setStatus('offline');

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
        speed: 12,
      }).start();
    } else {
      if (wasOfflineRef.current) {
        // Transition from offline to back online
        setStatus('restored');
        setIsRetrying(false);

        // Slide down briefly as restored, then auto-hide after 2.5s
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }).start();

        dismissTimerRef.current = setTimeout(() => {
          Animated.timing(translateY, {
            toValue: -120,
            duration: 350,
            useNativeDriver: true,
          }).start(() => {
            setStatus('hidden');
            wasOfflineRef.current = false;
          });
        }, 2500);
      } else {
        // App started online, stay hidden
        setStatus('hidden');
        translateY.setValue(-120);
      }
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [isOffline, translateY]);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      const isOnline = await checkConnectivity();
      if (!isOnline) {
        // Still offline: small feedback vibration/shake could go here
        setIsRetrying(false);
      }
    } catch {
      setIsRetrying(false);
    }
  };

  if (status === 'hidden') {
    return null;
  }

  const isRestored = status === 'restored';
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 10 : 14);

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          paddingTop: topPadding,
          backgroundColor: isRestored ? '#15803D' : '#991B1B',
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.contentRow}>
        <View style={styles.iconAndText}>
          <View style={[styles.iconBadge, { backgroundColor: isRestored ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)' }]}>
            <Ionicons
              name={isRestored ? 'checkmark-circle' : 'cloud-offline'}
              size={18}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.titleText}>
              {isRestored ? 'Back Online' : 'No Internet Connection'}
            </Text>
            <Text style={styles.subtitleText} numberOfLines={1}>
              {isRestored
                ? 'Connection restored. Realtime synced.'
                : 'Showing offline data. Reconnecting...'}
            </Text>
          </View>
        </View>

        {!isRestored && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRetry}
            activeOpacity={0.8}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="refresh" size={13} color="#FFFFFF" />
                <Text style={styles.retryText}>Retry</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingHorizontal: 16,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    gap: 12,
  },
  iconAndText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
