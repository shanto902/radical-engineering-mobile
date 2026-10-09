import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { CategoryChip } from '../components/CategoryChip';
import { ProductCard } from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { Product, Category } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface CatalogScreenProps {
  navigation: any;
  route: any;
}

type SortOption = 'default' | 'price_asc' | 'price_desc';

export const CatalogScreen: React.FC<CatalogScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const initialCat = route.params?.categoryId || 'all';
  const initialBrand = route.params?.brand || 'all';

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getCategories().then(cats => setCategories(cats));
  }, []);

  useEffect(() => {
    if (route.params?.categoryId) {
      setSelectedCategory(route.params.categoryId);
    }
  }, [route.params?.categoryId]);

  useEffect(() => {
    if (route.params?.brand) {
      setSelectedBrand(route.params.brand);
    }
  }, [route.params?.brand]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  const fetchProducts = async () => {
    setLoading(true);
    const prods = await apiService.getProducts(selectedCategory, searchQuery);
    setProducts(prods);
    setLoading(false);
  };

  // Distinct brands available in current products
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach(p => {
      if (p.brand && p.brand !== 'Radical Engineering') {
        brandsSet.add(p.brand);
      }
    });
    if (selectedBrand !== 'all' && !brandsSet.has(selectedBrand)) {
      brandsSet.add(selectedBrand);
    }
    return ['all', ...Array.from(brandsSet)];
  }, [products, selectedBrand]);

  // Filter and sort products
  const displayedProducts = useMemo(() => {
    let list = [...products];
    if (selectedBrand !== 'all') {
      const lowerBrand = selectedBrand.toLowerCase().trim();
      list = list.filter(p => {
        const prodBrand = (p.brand || '').toLowerCase().trim();
        return (
          prodBrand === lowerBrand ||
          prodBrand.includes(lowerBrand) ||
          lowerBrand.includes(prodBrand)
        );
      });
    }
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    }
    return list;
  }, [products, selectedBrand, sortBy]);

  const allCategoriesList = [
    { id: 'all', name: 'All Equipment', icon: 'grid-outline' },
    ...categories,
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Equipment Catalog"
        subtitle="Solar & Backup Gear"
        onOpenCart={() => navigation.navigate('Cart')}
      />

      {/* Search Input Bar */}
      <View style={[styles.searchBarWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            placeholder="Search panels, inverters, batteries..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Category Chips */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {allCategoriesList.map((cat) => (
            <CategoryChip
              key={cat.id}
              category={cat}
              isSelected={selectedCategory === cat.id}
              onSelect={() => {
                setSelectedCategory(cat.id);
                setSelectedBrand('all');
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Secondary Filter: Brands Strip */}
      {availableBrands.length > 1 && (
        <View style={styles.brandsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandsContent}
          >
            {availableBrands.map((b) => (
              <TouchableOpacity
                key={b}
                onPress={() => setSelectedBrand(b)}
                style={[
                  styles.brandPill,
                  {
                    backgroundColor: selectedBrand === b ? (isDark ? '#334155' : '#0F172A') : colors.surface,
                    borderColor: selectedBrand === b ? (isDark ? '#334155' : '#0F172A') : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.brandPillText,
                    { color: selectedBrand === b ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {b === 'all' ? 'All Brands' : b}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Sort & Results Count Bar */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          Showing {displayedProducts.length} items
        </Text>

        {/* Sort Controls */}
        <View style={styles.sortRow}>
          <TouchableOpacity
            onPress={() =>
              setSortBy(prev => (prev === 'default' ? 'price_asc' : prev === 'price_asc' ? 'price_desc' : 'default'))
            }
            style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="swap-vertical" size={13} color={colors.primary} />
            <Text style={[styles.sortBtnText, { color: colors.text }]}>
              {sortBy === 'default' ? 'Featured' : sortBy === 'price_asc' ? 'Price: Low' : 'Price: High'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ProductGridSkeleton count={6} />
        </ScrollView>
      ) : displayedProducts.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="search" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No products found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Try clearing search filters or selecting another equipment category.
          </Text>
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setSelectedCategory('all');
              setSelectedBrand('all');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.resetBtnText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>Reset All Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.rowWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarWrapper: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 44,
    borderRadius: RADIUS.full,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  categoriesWrapper: {
    paddingVertical: SPACING.sm,
  },
  categoriesContent: {
    paddingHorizontal: SPACING.md,
  },
  brandsWrapper: {
    paddingBottom: SPACING.xs + 2,
  },
  brandsContent: {
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  brandPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 4,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  rowWrapper: {
    justifyContent: 'space-between',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  resetBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
