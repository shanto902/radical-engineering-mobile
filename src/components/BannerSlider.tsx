import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - SPACING.md * 2;

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  cta: string;
  image: string;
  targetScreen?: string;
}

const BANNERS: BannerItem[] = [
  {
    id: 'b1',
    title: 'Harness the Power\nof the Sun',
    subtitle: 'High-efficiency Tier 1 solar panels with up to 30 years linear warranty.',
    tag: 'SOLAR ENERGY',
    cta: 'Explore Solar',
    image: 'https://admin.atiar.com.bd/assets/3791e375-6479-459c-afd0-5579f41cea68',
    targetScreen: 'RoofPlanner',
  },
  {
    id: 'b2',
    title: 'Smart Solar IPS &\nHybrid Solutions',
    subtitle: 'Keep your lights and fans running uninterrupted during power cuts.',
    tag: 'POWER BACKUP',
    cta: 'Build System',
    image: 'https://admin.atiar.com.bd/assets/b0c27da6-9f3a-4c63-b4ee-665fbf21bb12',
    targetScreen: 'SystemBuilder',
  },
  {
    id: 'b3',
    title: 'Lightning Protection\nSystems (LPS)',
    subtitle: 'Certified surge suppression & pure copper earthing for total building safety.',
    tag: 'ENGINEERING SAFETY',
    cta: 'View Case Study',
    image: 'https://admin.atiar.com.bd/assets/4151bfd8-a685-47a7-b4db-63470e954531',
    targetScreen: 'Projects',
  },
];

interface BannerSliderProps {
  onBannerPress: (targetScreen?: string) => void;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({ onBannerPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);

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
        {BANNERS.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={() => onBannerPress(banner.targetScreen)}
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
        {BANNERS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex ? styles.activeDot : styles.inactiveDot,
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
    ...StyleSheet.absoluteFillObject,
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

