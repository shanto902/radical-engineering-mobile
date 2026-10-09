import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { BannerSlider } from '../components/BannerSlider';
import { HotlineBar } from '../components/HotlineBar';
import { QuickActionCard } from '../components/QuickActionCard';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { apiService, FALLBACK_BRANDS } from '../services/api';
import { Product, Category, Project, GoogleReviewsSummary, BannerItem, BrandPartner } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedHomeCat, setSelectedHomeCat] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [brands, setBrands] = useState<BrandPartner[]>(FALLBACK_BRANDS);
  const [reviewsData, setReviewsData] = useState<GoogleReviewsSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const loadData = async () => {
    try {
      const [cats, prods, projs, reviews, sliders, brandList] = await Promise.all([
        apiService.getCategories(),
        apiService.getProducts(),
        apiService.getProjects(),
        apiService.getGoogleReviews(),
        apiService.getSliders(),
        apiService.getBrands(),
      ]);
      setCategories(cats);
      setAllProducts(prods);
      if (brandList && brandList.length > 0) {
        setBrands(brandList);
      }

      const sortedProjs = [...projs].sort((a, b) => {
        const timeA = a.dateCreated
          ? new Date(a.dateCreated).getTime()
          : (a.date && a.date !== 'Recent' ? new Date(a.date).getTime() : 0);
        const timeB = b.dateCreated
          ? new Date(b.dateCreated).getTime()
          : (b.date && b.date !== 'Recent' ? new Date(b.date).getTime() : 0);
        if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB && timeA > 0 && timeB > 0) {
          return timeB - timeA;
        }
        const numA = Number(a.id);
        const numB = Number(b.id);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numB - numA;
        }
        return (b.sort ?? 0) - (a.sort ?? 0);
      });
      setProjects(sortedProjs.slice(0, 3));
      setReviewsData(reviews);
      if (sliders && sliders.length > 0) {
        setBanners(sliders);
      }
    } catch {
      // offline fallback
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleBannerPress = (banner: BannerItem) => {
    const rawLink = (banner.buttonLink || '').trim();

    if (!rawLink) {
      if (banner.targetScreen) {
        navigation.navigate(banner.targetScreen);
      } else {
        navigation.navigate('Catalog');
      }
      return;
    }

    // Handle external links
    if (rawLink.startsWith('http://') || rawLink.startsWith('https://')) {
      const siteBase = (APP_CONFIG.website || 'https://radicalengineering.com.bd').replace(/\/+$/, '');
      if (!rawLink.startsWith(siteBase)) {
        Linking.openURL(rawLink);
        return;
      }
    }

    // Extract path: e.g. "/categories/solar-panels" -> last part is "solar-panels"
    const cleanPath = rawLink.replace(/^https?:\/\/[^\/]+/, '').replace(/\/+$/, '');
    const segments = cleanPath.split('/').filter(Boolean);
    const lastPart = (segments[segments.length - 1] || '').toLowerCase().trim();

    if (cleanPath.includes('categories') || cleanPath.startsWith('/categories')) {
      // e.g. /categories/solar-panels -> navigate to Catalog with categoryId: 'solar-panels'
      navigation.navigate('Catalog', { categoryId: lastPart || 'all' });
    } else if (cleanPath.includes('products') || cleanPath.startsWith('/products')) {
      // e.g. /products/sku-123
      navigation.navigate('ProductDetail', { id: lastPart });
    } else if (lastPart === 'calculator' || lastPart === 'roof-planner' || lastPart === 'solar-calculator') {
      navigation.navigate('RoofPlanner');
    } else if (lastPart === 'system-builder' || lastPart === 'builder' || lastPart === 'ips-builder') {
      navigation.navigate('SystemBuilder');
    } else if (cleanPath.includes('projects') || cleanPath.startsWith('/projects') || lastPart === 'field-installation' || lastPart === 'installations') {
      if (lastPart !== 'projects' && lastPart !== 'field-installation' && lastPart !== 'installations') {
        navigation.navigate('Projects', { projectId: lastPart });
      } else {
        navigation.navigate('Projects');
      }
    } else if (lastPart === 'contact' || lastPart === 'support') {
      navigation.navigate('Contact');
    } else if (lastPart === 'tracker' || lastPart === 'order-tracker') {
      navigation.navigate('OrderTracker');
    } else if (lastPart === 'elearning' || lastPart === 'education') {
      navigation.navigate('ELearning');
    } else if (lastPart) {
      navigation.navigate('Catalog', { categoryId: lastPart });
    } else {
      navigation.navigate('Catalog');
    }
  };

  const filteredFeatured = selectedHomeCat === 'all'
    ? allProducts.slice(0, 6)
    : allProducts.filter(p => p.categoryId === selectedHomeCat).slice(0, 6);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        onOpenCart={() => navigation.navigate('Cart')}
        onSearchPress={() => navigation.navigate('Catalog', { autoFocus: true })}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Hero Banner Carousel */}
        <BannerSlider
          banners={banners}
          onBannerPress={handleBannerPress}
        />

        {/* Value Proposition Highlights Strip */}
        <View style={styles.valueStrip}>
          <View style={styles.valueItem}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
            <Text style={[styles.valueText, { color: colors.text }]}>25-Yr Warranty</Text>
          </View>
          <View style={styles.valueDivider} />
          <View style={styles.valueItem}>
            <Ionicons name="ribbon" size={16} color={colors.primary} />
            <Text style={[styles.valueText, { color: colors.text }]}>Tier-1 Brands</Text>
          </View>
          <View style={styles.valueDivider} />
          <View style={styles.valueItem}>
            <Ionicons name="construct" size={16} color={COLORS.accent} />
            <Text style={[styles.valueText, { color: colors.text }]}>Certified Engineers</Text>
          </View>
        </View>

        {/* 24/7 Hotline Support Bar */}
        <HotlineBar />

        {/* Core Engineering Tools */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Smart Engineering Calculators</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Interactive tools to calculate capacity & estimate bill savings
              </Text>
            </View>
          </View>

          <QuickActionCard
            title="Solar Roof Planner & ROI"
            subtitle="Calculate system capacity, required panels, monthly bill savings & payback period in BDT."
            icon="calculator-outline"
            color={colors.primary}
            badge="FREE SURVEY"
            onPress={() => navigation.navigate('RoofPlanner')}
          />

          <QuickActionCard
            title="Solar IPS & Battery Builder"
            subtitle="Select fans, lights & appliances to size your required inverter VA and battery bank."
            icon="hardware-chip-outline"
            color="#0284C7"
            badge="INTERACTIVE"
            onPress={() => navigation.navigate('SystemBuilder')}
          />

          <QuickActionCard
            title="Live Installation Order Tracker"
            subtitle="Track engineering site survey, transit, and on-site commissioning status."
            icon="navigate-outline"
            color="#16A34A"
            badge="TRACK"
            onPress={() => navigation.navigate('OrderTracker')}
          />
        </View>

        {/* Authorized Brands Marquee Strip */}
        <View style={styles.brandsSection}>
          <Text style={[styles.brandsSectionTitle, { color: colors.textSecondary }]}>
            AUTHORIZED EQUIPMENT PARTNERS
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandsScroll}>
            {brands.map((brand) => (
              <TouchableOpacity
                key={brand.id || brand.name}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Catalog', { brand: brand.name, categoryId: 'all' })}
                style={[
                  styles.brandChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {brand.logo ? (
                  <View style={styles.brandLogoWrap}>
                    <Image
                      source={{ uri: brand.logo }}
                      style={styles.brandLogo}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={[styles.brandLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                    <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                  </View>
                )}
                <Text style={[styles.brandChipText, { color: colors.text }]}>{brand.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Popular Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Product Categories</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                Browse certified solar PV, inverters & battery backup equipment
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('Catalog')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Catalog', { categoryId: cat.id })}
                style={[
                  styles.categoryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.12)' : '#F5EBE6' }]}>
                  <Ionicons name={cat.icon as any} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={2}>
                  {cat.name}
                </Text>
                <Text style={[styles.categoryCount, { color: colors.textMuted }]}>
                  {cat.itemCount} items
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Products with Category Tabs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Equipment</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                Top rated solar panels, inverters & tubular batteries
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('Catalog')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Category Switcher on Home */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.homeFilterRow}>
            {[
              { id: 'all', label: 'All Featured' },
              { id: 'inverter', label: 'Inverters' },
              { id: 'battery', label: 'Batteries' },
              { id: 'solar-panels', label: 'Solar Panels' },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setSelectedHomeCat(f.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: selectedHomeCat === f.id ? colors.primary : colors.surface,
                    borderColor: selectedHomeCat === f.id ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: selectedHomeCat === f.id ? (isDark ? '#260B00' : '#FFFFFF') : colors.text },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.productsGrid}>
            {loadingProducts ? (
              <>
                <ProductCardSkeleton />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
              </>
            ) : (
              filteredFeatured.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                />
              ))
            )}
          </View>
        </View>

        {/* Customer Reviews & Google Rating Section */}
        {reviewsData && reviewsData.reviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.googleTitleRow}>
                  <Ionicons name="logo-google" size={18} color="#EA4335" />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Google Reviews</Text>
                  <View style={styles.ratingPill}>
                    <Text style={styles.ratingPillText}>{reviewsData.rating.toFixed(1)} ★</Text>
                  </View>
                </View>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {reviewsData.totalReviews} verified reviews from real customers
                </Text>
              </View>

              {reviewsData.writeAReviewUrl && (
                <TouchableOpacity
                  style={styles.writeReviewBtn}
                  onPress={() => Linking.openURL(reviewsData.writeAReviewUrl!)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="create-outline" size={14} color={colors.primary} />
                  <Text style={[styles.writeReviewText, { color: colors.primary }]}>Review Us</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reviewsScrollContent}
              decelerationRate="fast"
              snapToInterval={296}
            >
              {reviewsData.reviews.map((rev) => (
                <View
                  key={rev.id}
                  style={[
                    styles.reviewCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      shadowColor: colors.cardShadow,
                    },
                  ]}
                >
                  <View style={styles.reviewCardHeader}>
                    {rev.authorAvatar ? (
                      <Image source={{ uri: rev.authorAvatar }} style={styles.reviewAvatar} />
                    ) : (
                      <View style={[styles.reviewAvatarFallback, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <Text style={[styles.avatarInitial, { color: colors.text }]}>
                          {rev.authorName ? rev.authorName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.reviewAuthorCol}>
                      <Text style={[styles.reviewAuthorName, { color: colors.text }]} numberOfLines={1}>
                        {rev.authorName}
                      </Text>
                      <View style={styles.starsRow}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < rev.rating ? 'star' : 'star-outline'}
                            size={12}
                            color="#F59E0B"
                          />
                        ))}
                        {rev.publishedAt ? (
                          <Text style={[styles.reviewDateText, { color: colors.textMuted }]}>
                            • {rev.publishedAt}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                  </View>

                  <Text style={[styles.reviewCardText, { color: colors.text }]} numberOfLines={4}>
                    "{rev.text}"
                  </Text>

                  <View style={styles.reviewCardFooter}>
                    <Ionicons name="logo-google" size={12} color={colors.textMuted} />
                    <Text style={[styles.reviewFooterText, { color: colors.textMuted }]}>
                      Google Verified Customer
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Installation Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Field Installations</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                Verified engineering deployments across Bangladesh
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('Projects')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Projects', { projectId: project.id })}
              style={[
                styles.projectCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.projectImageContainer, { backgroundColor: isDark ? '#0F172A' : '#1E293B' }]}>
                <Image
                  source={{ uri: project.image }}
                  style={styles.projectImageBackdrop}
                  resizeMode="cover"
                  blurRadius={Platform.OS === 'android' ? 12 : 22}
                />
                <View
                  style={[
                    styles.projectImageOverlay,
                    { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.25)' },
                  ]}
                />
                <Image
                  source={{ uri: project.image }}
                  style={styles.projectImageForeground}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.projectContent}>
                <View style={styles.projectHeaderRow}>
                  <View style={[styles.capacityBadge, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
                    <Text style={[styles.capacityText, { color: colors.primary }]}>{project.capacity}</Text>
                  </View>
                  <Text style={[styles.projectDate, { color: colors.textMuted }]}>{project.date}</Text>
                </View>

                <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={2}>
                  {project.title}
                </Text>

                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color={colors.primary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                    {project.location}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  valueStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    paddingVertical: 8,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  valueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  valueDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm + 4,
  },
  sectionHeaderLeft: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  viewAllBtn: {
    paddingLeft: SPACING.xs,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  brandsSection: {
    marginTop: SPACING.md,
  },
  brandsSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: SPACING.md,
    marginBottom: 8,
  },
  brandsScroll: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 7,
  },
  brandLogoWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  brandLogo: {
    width: 20,
    height: 20,
  },
  brandChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryCard: {
    width: '31%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    height: 28,
  },
  categoryCount: {
    fontSize: 10,
    marginTop: 2,
  },
  homeFilterRow: {
    gap: 8,
    marginBottom: SPACING.md,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  googleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: 4,
  },
  ratingPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  writeReviewText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewsScrollContent: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    paddingVertical: 4,
  },
  reviewCard: {
    width: 280,
    marginRight: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    justifyContent: 'space-between',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
  },
  reviewAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewAuthorCol: {
    flex: 1,
    justifyContent: 'center',
  },
  reviewAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  reviewDateText: {
    fontSize: 10,
    marginLeft: 4,
  },
  reviewCardText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  reviewCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    paddingTop: 6,
  },
  reviewFooterText: {
    fontSize: 10,
    fontWeight: '600',
  },
  projectCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.sm + 4,
  },
  projectImageContainer: {
    width: '100%',
    height: 150,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectImageBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.85,
    transform: [{ scale: 1.15 }],
  },
  projectImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  projectImageForeground: {
    width: '100%',
    height: '100%',
  },
  projectContent: {
    padding: SPACING.md - 2,
  },
  projectHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  capacityBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  capacityText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  projectDate: {
    fontSize: 11,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
});
