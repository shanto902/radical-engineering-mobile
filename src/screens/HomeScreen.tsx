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

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
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
      setFeaturedProducts(prods.filter(p => p.isFeatured).slice(0, 4));
      setProjects(projs.slice(0, 3));
    } catch (e) {
      // offline fallback handled by apiService
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
        {/* Banner Carousel */}
        <BannerSlider
          onBannerPress={(targetScreen) => {
            if (targetScreen) navigation.navigate(targetScreen);
          }}
        />

        {/* 24/7 Hotline Support Bar */}
        <HotlineBar />

        {/* Core Engineering Tools */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Smart Engineering Tools</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Calculate solar capacity or build your custom IPS
              </Text>
            </View>
          </View>

          <QuickActionCard
            title="Solar Roof Planner"
            subtitle="Calculate system size, panel count, bill savings & ROI payback in BDT."
            icon="calculator-outline"
            color="#EA580C"
            badge="POPULAR"
            onPress={() => navigation.navigate('RoofPlanner')}
          />

          <QuickActionCard
            title="Solar IPS & IPS Builder"
            subtitle="Select fans, lights & appliances to size your required inverter & battery bank."
            icon="hardware-chip-outline"
            color="#0284C7"
            badge="INTERACTIVE"
            onPress={() => navigation.navigate('SystemBuilder')}
          />

          <QuickActionCard
            title="Live Order Tracker"
            subtitle="Track engineering site survey, dispatch, and installation progress."
            icon="navigate-outline"
            color="#16A34A"
            onPress={() => navigation.navigate('OrderTracker')}
          />

          <QuickActionCard
            title="E-Learning & Knowledge Base"
            subtitle="Battery longevity guides, distilled water care & solar maintenance."
            icon="book-outline"
            color="#8B5CF6"
            onPress={() => navigation.navigate('ELearning')}
          />
        </View>

        {/* Popular Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore Categories</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Tier-1 solar equipment & power backup gear
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

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Equipment</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Top rated solar panels, inverters & batteries
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Catalog')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.productsGrid}>
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              />
            ))}
          </View>
        </View>

        {/* Recent Installation Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Projects</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Verified engineering installations across Bangladesh
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
    fontWeight: '700',
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
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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

