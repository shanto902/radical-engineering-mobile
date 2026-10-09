import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { BannerItem } from '../types';
import { apiService, FALLBACK_BANNERS } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - SPACING.md * 2;

interface BannerSliderProps {
  banners?: BannerItem[];
  onBannerPress: (banner: BannerItem) => void;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({ banners: propBanners, onBannerPress }) => {
  const { colors } = useTheme();
  const [internalBanners, setInternalBanners] = useState<BannerItem[]>(FALLBACK_BANNERS);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (propBanners && propBanners.length > 0) {
      setInternalBanners(propBanners);
    } else {
      apiService.getSliders().then((data) => {
        if (data && data.length > 0) {
          setInternalBanners(data);
        }
      });
    }
  }, [propBanners]);

  const activeBanners = propBanners && propBanners.length > 0 ? propBanners : internalBanners;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH);
    if (slide !== activeIndex) {
      setActiveIndex(slide);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={BANNER_WIDTH + SPACING.sm}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {activeBanners.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={() => onBannerPress(banner)}
            style={styles.bannerCard}
          >
            <Image source={{ uri: banner.image }} style={styles.image} resizeMode="cover" />
            <View style={styles.overlay} />
            <View style={styles.content}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{banner.tag}</Text>
              </View>
              <Text style={styles.title}>{banner.title}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {banner.subtitle}
              </Text>
              <View style={styles.ctaButton}>
                <Text style={styles.ctaText}>{banner.cta}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {activeBanners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex ? [styles.activeDot, { backgroundColor: colors.primary }] : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: 190,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  content: {
    padding: SPACING.md,
    flex: 1,
    justifyContent: 'space-between',
  },
  tagBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 4,
  },
  subtitle: {
    color: '#E2E8F0',
    fontSize: 11,
    lineHeight: 15,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  ctaText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: COLORS.primary,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
});

