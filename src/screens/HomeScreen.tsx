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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { BannerSlider } from '../components/BannerSlider';
import { HotlineBar } from '../components/HotlineBar';
import { QuickActionCard } from '../components/QuickActionCard';
import { ProductCard } from '../components/ProductCard';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { Product, Category, Project } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface HomeScreenProps {
  navigation: any;
}

const AUTHORIZED_BRANDS = [
  'Growatt',
  'Solis',
  'Longi',
  'Volvo (Panna Group)',
  'Trina Solar',
  'JA Solar',
  'Huawei',
  'Rahimafrooz',
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedHomeCat, setSelectedHomeCat] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [cats, prods, projs] = await Promise.all([
        apiService.getCategories(),
        apiService.getProducts(),
        apiService.getProjects(),
      ]);
      setCategories(cats);
      setAllProducts(prods);
      setProjects(projs.slice(0, 3));
    } catch {
      // offline fallback
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Live Weather / Solar Irradiance Widget */}
        <View style={[styles.solarStatusStrip, { backgroundColor: isDark ? '#1E293B' : '#FFF7ED', borderColor: '#FED7AA' }]}>
          <View style={styles.solarStatusLeft}>
            <Ionicons name="sunny" size={18} color={COLORS.primary} />
            <Text style={styles.solarStatusText}>
              <Text style={{ fontWeight: '800' }}>Kishoreganj Solar Index: </Text>
              4.8 kWh/m² peak sun • Ideal PV yield
            </Text>
          </View>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTagText}>LIVE</Text>
          </View>
        </View>

        {/* Hero Banner Carousel */}
        <BannerSlider
          onBannerPress={(targetScreen) => {
            if (targetScreen) navigation.navigate(targetScreen);
          }}
        />

        {/* Value Proposition Highlights Strip */}
        <View style={styles.valueStrip}>
          <View style={styles.valueItem}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
            <Text style={[styles.valueText, { color: colors.text }]}>25-Yr Warranty</Text>
          </View>
          <View style={styles.valueDivider} />
          <View style={styles.valueItem}>
            <Ionicons name="ribbon" size={16} color={COLORS.primary} />
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
            <View>
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
            color="#EA580C"
            badge="FREE SURVEY"
            onPress={() => navigation.navigate('RoofPlanner')}
          />

          <QuickActionCard
            title="Solar IPS & Battery Sizing Builder"
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

          <QuickActionCard
            title="E-Learning & Battery Longevity Guides"
            subtitle="Learn battery preservation, DM water checks & lightning protection standards."
            icon="book-outline"
            color="#8B5CF6"
            onPress={() => navigation.navigate('ELearning')}
          />
        </View>

        {/* Authorized Brands Marquee Strip */}
        <View style={styles.brandsSection}>
          <Text style={[styles.brandsSectionTitle, { color: colors.textSecondary }]}>
            AUTHORIZED EQUIPMENT PARTNERS
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandsScroll}>
            {AUTHORIZED_BRANDS.map((brandName) => (
              <View
                key={brandName}
                style={[
                  styles.brandChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                <Text style={[styles.brandChipText, { color: colors.text }]}>{brandName}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Popular Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Product Categories</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Browse certified solar PV, inverters & battery backup equipment
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Catalog')}>
              <Text style={styles.viewAllText}>View All</Text>
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
                <View style={[styles.categoryIconCircle, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name={cat.icon as any} size={22} color={COLORS.primary} />
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
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Equipment</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Top rated solar panels, inverters & tubular batteries
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Catalog')}>
              <Text style={styles.viewAllText}>See All</Text>
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
                    backgroundColor: selectedHomeCat === f.id ? COLORS.primary : colors.surface,
                    borderColor: selectedHomeCat === f.id ? COLORS.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: selectedHomeCat === f.id ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.productsGrid}>
            {filteredFeatured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              />
            ))}
          </View>
        </View>

        {/* Customer Reviews & Google Rating Card */}
        <View style={[styles.reviewsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.reviewsHeaderRow}>
            <View style={styles.googleBadge}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <Text style={styles.googleRatingText}>4.9 ★★★★★</Text>
            </View>
            <Text style={[styles.googleVerified, { color: colors.textSecondary }]}>
              Verified Customer Rating
            </Text>
          </View>
          <Text style={[styles.testimonialQuote, { color: colors.text }]}>
            "Radical Engineering installed our 3.5kW hybrid solar system in Kishoreganj. Their calculation of our fan and fridge load was pinpoint accurate, saving over 70% on electricity bills."
          </Text>
          <Text style={[styles.testimonialAuthor, { color: colors.textMuted }]}>
            — Engr. Rafiqul Islam, Station Road, Kishoreganj
          </Text>
        </View>

        {/* Recent Installation Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Field Installations</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Verified engineering deployments across Bangladesh
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Projects')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Projects')}
              style={[
                styles.projectCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Image source={{ uri: project.image }} style={styles.projectImage} resizeMode="cover" />
              <View style={styles.projectContent}>
                <View style={styles.projectHeaderRow}>
                  <View style={styles.capacityBadge}>
                    <Text style={styles.capacityText}>{project.capacity}</Text>
                  </View>
                  <Text style={[styles.projectDate, { color: colors.textMuted }]}>{project.date}</Text>
                </View>

                <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={2}>
                  {project.title}
                </Text>

                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color={COLORS.primary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                    {project.location}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Company Profile Footer */}
        <View style={[styles.footerContainer, { backgroundColor: colors.surfaceVariant }]}>
          <View style={styles.footerBrandRow}>
            <View style={styles.footerLogoBadge}>
              <Ionicons name="sunny" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.footerTitle, { color: colors.text }]}>{APP_CONFIG.companyName}</Text>
              <Text style={[styles.footerTagline, { color: colors.textSecondary }]}>
                {APP_CONFIG.tagline}
              </Text>
            </View>
          </View>

          <Text style={[styles.footerAddress, { color: colors.textSecondary }]}>
            📍 {APP_CONFIG.address}
          </Text>

          <View style={styles.footerLinksRow}>
            <TouchableOpacity onPress={() => Linking.openURL(APP_CONFIG.website)}>
              <Text style={styles.footerLink}>Website</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textMuted }}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL(APP_CONFIG.facebookUrl)}>
              <Text style={styles.footerLink}>Facebook</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textMuted }}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL(APP_CONFIG.youtubeUrl)}>
              <Text style={styles.footerLink}>YouTube</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.copyrightText, { color: colors.textMuted }]}>
            © 2026 Radical Engineering. Developed by Ashik Ali Shanto.
          </Text>
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
  solarStatusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  solarStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  solarStatusText: {
    fontSize: 11,
    color: '#9A3412',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveTagText: {
    color: '#166534',
    fontSize: 9,
    fontWeight: '800',
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
    alignItems: 'center',
    marginBottom: SPACING.sm + 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 5,
  },
  brandChipText: {
    fontSize: 11,
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
  reviewsCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  googleRatingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA4335',
  },
  googleVerified: {
    fontSize: 11,
    fontWeight: '500',
  },
  testimonialQuote: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  testimonialAuthor: {
    fontSize: 11,
    fontWeight: '600',
  },
  projectCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.sm + 4,
  },
  projectImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
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
  footerContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  footerLogoBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  footerTagline: {
    fontSize: 11,
    maxWidth: 220,
  },
  footerAddress: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  footerLinksRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  copyrightText: {
    fontSize: 10,
    textAlign: 'center',
  },
});
