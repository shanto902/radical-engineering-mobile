import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { CategoryChip } from '../components/CategoryChip';
import { ProductCard } from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useNetwork } from '../context/NetworkContext';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';
import { realtimeService } from '../services/realtime';
import { Product, Category } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface CatalogScreenProps {
  navigation: any;
  route: any;
}

type SortOption = 'default' | 'price_asc' | 'price_desc';

const PAGE_LIMIT = 16;

export const CatalogScreen: React.FC<CatalogScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { isOffline } = useNetwork();
  const initialCat = route.params?.categoryId || 'all';
  const initialBrand = route.params?.brand || 'all';

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>(['all']);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Debounced search input
  const [inputText, setInputText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Recent searches state
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // Pagination & items state
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);

  // 1. Fetch metadata on mount (categories & brands)
  useEffect(() => {
    let isMounted = true;
    apiService.getCategories().then((cats) => {
      if (isMounted) setCategories(cats);
    });

    apiService.getBrands().then((brandPartners) => {
      if (isMounted && Array.isArray(brandPartners)) {
        const brandNames = brandPartners
          .map((b) => b.name)
          .filter((name) => Boolean(name && name.toLowerCase() !== 'no brand'));
        const unique = Array.from(new Set(brandNames));
        setBrands(['all', ...unique]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync route params
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

  // 2. Debounce Search Input (350ms) to avoid spamming Directus
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(inputText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [inputText]);

  // Load recent searches on mount
  useEffect(() => {
    storageService.getRecentSearches().then(setRecentSearches);
  }, []);

  // Persist debounced search query to recent searches (if >= 2 chars)
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.length >= 2) {
      storageService.addRecentSearch(debouncedSearch).then(setRecentSearches);
    }
  }, [debouncedSearch]);

  const handleSearchSubmit = async () => {
    if (inputText.trim()) {
      setDebouncedSearch(inputText.trim());
      const updated = await storageService.addRecentSearch(inputText.trim());
      setRecentSearches(updated);
    }
  };

  const handleSelectRecent = (term: string) => {
    setInputText(term);
    setDebouncedSearch(term);
    storageService.addRecentSearch(term).then(setRecentSearches);
  };

  const handleRemoveRecent = async (term: string) => {
    const updated = await storageService.removeRecentSearch(term);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = async () => {
    await storageService.clearRecentSearches();
    setRecentSearches([]);
  };

  // 3. Fetch Initial Page of Products (Directus SDK server-side search/filter/sort)
  const fetchProducts = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setPage(1);

      try {
        const result = await apiService.getProductsPaginated({
          page: 1,
          limit: PAGE_LIMIT,
          categoryId: selectedCategory,
          brand: selectedBrand,
          search: debouncedSearch,
          sortBy,
          forceRefresh,
        });

        setProducts(result.products);
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
      } catch (err) {
        console.warn('Failed to fetch paginated products:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory, selectedBrand, debouncedSearch, sortBy]
  );

  // Trigger initial fetch when any filter changes
  useEffect(() => {
    fetchProducts();
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [fetchProducts]);

  // 4. Real-time updates via WebSocket
  useEffect(() => {
    const unsubscribe = realtimeService.onUpdate((event) => {
      if (event.collection === 'products') {
        // Directus notified a product update; invalidate cache & silently refresh page 1
        apiService.getProductsPaginated({
          page: 1,
          limit: PAGE_LIMIT,
          categoryId: selectedCategory,
          brand: selectedBrand,
          search: debouncedSearch,
          sortBy,
          forceRefresh: true,
        }).then((res) => {
          setProducts(res.products);
          setTotalCount(res.totalCount);
          setHasMore(res.hasMore);
        }).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedCategory, selectedBrand, debouncedSearch, sortBy]);

  // 5. Infinite Scroll / Load More Handler
  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const result = await apiService.getProductsPaginated({
        page: nextPage,
        limit: PAGE_LIMIT,
        categoryId: selectedCategory,
        brand: selectedBrand,
        search: debouncedSearch,
        sortBy,
      });

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = result.products.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
      setPage(nextPage);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (err) {
      console.warn('Error loading more items:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts(true);
  };

  const allCategoriesList = [
    { id: 'all', name: 'All Equipment', icon: 'grid-outline' },
    ...categories,
  ];

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Loading more equipment...
          </Text>
        </View>
      );
    }

    if (products.length > 0 && !hasMore) {
      return (
        <View style={styles.footerEnd}>
          <Text style={[styles.footerEndText, { color: colors.textMuted }]}>
            Showing all {totalCount} equipment items
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Equipment Catalog"
        subtitle="Solar & Backup Gear"
        onOpenCart={() => navigation.navigate('Cart')}
      />

      {/* Search Input Bar (Server-side Debounced Directus Search) */}
      <View
        style={[
          styles.searchBarWrapper,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.searchInputContainer, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            autoFocus={Boolean(route.params?.autoFocus)}
            placeholder="Search panels, inverters, batteries..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onSubmitEditing={handleSearchSubmit}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {inputText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setInputText('');
                setDebouncedSearch('');
              }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Searches Chips */}
        {recentSearches.length > 0 && (!debouncedSearch || isSearchFocused) && (
          <View style={styles.recentSearchesContainer}>
            <View style={styles.recentHeaderRow}>
              <View style={styles.recentTitleWrap}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.recentTitleText, { color: colors.textSecondary }]}>
                  Recent Searches
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClearAllRecent}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentChipsScroll}
              keyboardShouldPersistTaps="handled"
            >
              {recentSearches.map((term, index) => (
                <View
                  key={`${term}-${index}`}
                  style={[
                    styles.recentChip,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.recentChipBody}
                    onPress={() => handleSelectRecent(term)}
                  >
                    <Ionicons name="search-outline" size={12} color={colors.textMuted} />
                    <Text
                      style={[styles.recentChipText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {term}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.recentChipClose}
                    onPress={() => handleRemoveRecent(term)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                  >
                    <Ionicons name="close" size={13} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
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
      {brands.length > 1 && (
        <View style={styles.brandsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandsContent}
          >
            {brands.map((b) => (
              <TouchableOpacity
                key={b}
                onPress={() => setSelectedBrand(b)}
                style={[
                  styles.brandPill,
                  {
                    backgroundColor:
                      selectedBrand === b
                        ? isDark
                          ? '#334155'
                          : '#0F172A'
                        : colors.surface,
                    borderColor:
                      selectedBrand === b
                        ? isDark
                          ? '#334155'
                          : '#0F172A'
                        : colors.border,
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

      {/* Sort & Meta Results Count Bar */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {loading
            ? 'Loading equipment...'
            : totalCount > 0
            ? `Showing ${products.length} of ${totalCount} items`
            : '0 items found'}
        </Text>

        {/* Server-side Sort Controls */}
        <View style={styles.sortRow}>
          <TouchableOpacity
            onPress={() =>
              setSortBy((prev) =>
                prev === 'default'
                  ? 'price_asc'
                  : prev === 'price_asc'
                  ? 'price_desc'
                  : 'default'
              )
            }
            style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="swap-vertical" size={13} color={colors.primary} />
            <Text style={[styles.sortBtnText, { color: colors.text }]}>
              {sortBy === 'default'
                ? 'New Arrivals'
                : sortBy === 'price_asc'
                ? 'Price: Low'
                : 'Price: High'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ProductGridSkeleton count={6} />
        </ScrollView>
      ) : products.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons
            name={isOffline ? 'cloud-offline-outline' : 'search'}
            size={52}
            color={colors.textMuted}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {isOffline ? 'No Internet Connection' : 'No products found'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {isOffline
              ? 'Unable to connect to store servers. Only genuine fetched products will display once reconnected.'
              : 'Try clearing search filters or selecting another equipment category.'}
          </Text>
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (isOffline) {
                fetchProducts(true);
              } else {
                setSelectedCategory('all');
                setSelectedBrand('all');
                setInputText('');
                setDebouncedSearch('');
              }
            }}
          >
            <Text style={[styles.resetBtnText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
              {isOffline ? 'Retry Connection' : 'Reset All Filters'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={products}
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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
  recentSearchesContainer: {
    marginTop: SPACING.xs + 4,
    paddingTop: 2,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  recentTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentTitleText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recentChipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  recentChipBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
  },
  recentChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recentChipClose: {
    paddingLeft: 4,
    paddingVertical: 2,
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
  footerLoader: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerEnd: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerEndText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
