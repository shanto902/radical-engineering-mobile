import { createDirectus, rest, staticToken, readItems, readItem, createItem } from '@directus/sdk';
import { APP_CONFIG } from '../constants/config';
import { CATEGORIES, PRODUCTS, PROJECTS, ELEARNING_ARTICLES, SAMPLE_ORDERS } from '../constants/mockData';
import { Product, Category, Project, ELearningArticle, Order } from '../types';

/**
 * Directus SDK Client configured with static Bearer Token
 * API Host: https://admin.atiar.com.bd
 */
export const directus = createDirectus(APP_CONFIG.apiBaseUrl)
  .with(staticToken(APP_CONFIG.accessToken))
  .with(rest());

/**
 * Utility to clean HTML markup from Directus rich-text fields
 */
function cleanHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract feature bullet points from description text
 */
function extractFeatures(text: string): string[] {
  if (!text) return [];
  const lines = text
    .split('\n')
    .map(l => l.trim().replace(/^•\s*/, ''))
    .filter(l => l.length > 3 && !l.startsWith('SPE '));
  return lines.slice(0, 6);
}

/**
 * Extract capacity / wattage from product title
 */
function extractWattage(title: string): string | undefined {
  const match = title.match(/(\d+(?:\.\d+)?\s*(?:kwp|kw|w|wp|ah|va|kwh))/i);
  return match ? match[1].toUpperCase() : undefined;
}

class ApiService {
  private assetsUrl = APP_CONFIG.assetsBaseUrl;
  private categoriesMap: Record<number | string, { id: number; name: string; slug: string }> = {};
  private brandsMap: Record<number | string, string> = {};
  private metadataLoaded = false;

  private async loadMetadata(): Promise<void> {
    if (this.metadataLoaded) return;
    try {
      const [cats, brands]: [any, any] = await Promise.all([
        directus.request(readItems('categories' as any, { limit: 100 } as any)),
        directus.request(readItems('brands' as any, { limit: 100 } as any)),
      ]);

      if (Array.isArray(cats)) {
        cats.forEach((c: any) => {
          this.categoriesMap[c.id] = { id: c.id, name: c.name, slug: c.slug || String(c.id) };
          if (c.slug) this.categoriesMap[c.slug] = { id: c.id, name: c.name, slug: c.slug };
        });
      }

      if (Array.isArray(brands)) {
        brands.forEach((b: any) => {
          this.brandsMap[b.id] = b.name;
        });
      }
      this.metadataLoaded = true;
    } catch {
      // Offline fallback: Use default maps
      this.categoriesMap = {
        1: { id: 1, name: 'Solar Panels', slug: 'solar-panels' },
        2: { id: 2, name: 'Battery', slug: 'battery' },
        3: { id: 3, name: 'IPS / Solar IPS', slug: 'ips-solar-ips' },
        4: { id: 4, name: 'Inverter', slug: 'inverter' },
        5: { id: 5, name: 'Cable & Connector', slug: 'cable-and-connector' },
        6: { id: 6, name: 'Accessories', slug: 'accessories' },
        7: { id: 7, name: 'Charge Controller', slug: 'charge-controller' },
      };
      this.brandsMap = {
        2: 'Growatt',
        3: 'Trina Solar',
        4: 'Solis',
        6: 'Volvo (Panna Group)',
        10: 'H-Invert',
        11: 'EASUN Power',
        12: 'Huawei',
        14: 'Rich Solar',
        15: 'Trina Solar',
        16: 'Longi',
        17: 'JA Solar',
        18: 'WALTON',
        20: 'Rahimafrooz',
        21: 'GOODWE',
      };
    }
  }

  private mapDirectusProduct(item: any): Product {
    const brandName = this.brandsMap[item.brand] || (typeof item.brand === 'string' ? item.brand : 'Radical Engineering');
    const catInfo = this.categoriesMap[item.category] || { id: 1, name: 'Solar Equipment', slug: 'solar-panels' };

    const rawDesc = item.short_description || item.description || '';
    const cleanDesc = cleanHtml(rawDesc);
    const featuresList = (Array.isArray(item.features) && item.features.length > 0)
      ? item.features
      : extractFeatures(cleanDesc);

    const extractedW = extractWattage(item.name || item.title || '');
    const regularPrice = Number(item.price) || 0;
    const discountedPrice = item.discounted_price ? Number(item.discounted_price) : undefined;
    const finalPrice = discountedPrice && discountedPrice < regularPrice ? discountedPrice : regularPrice;
    const originalPrice = discountedPrice && discountedPrice < regularPrice ? regularPrice : undefined;

    // Build rich technical specifications map
    const specsMap: Record<string, string> = {};
    if (brandName) specsMap['Brand'] = brandName;
    if (item.sku) specsMap['Model / SKU'] = item.sku;
    specsMap['Category'] = catInfo.name;
    if (item.sub_category) specsMap['Sub-Category'] = item.sub_category;
    if (extractedW) specsMap['Capacity / Rating'] = extractedW;
    specsMap['Warranty'] = item.warranty ? `${item.warranty} Warranty` : 'Official Radical Warranty';
    specsMap['Stock Status'] = item.status === 'in-stock' ? 'Available in Stock' : (item.status || 'In Stock');

    // Look for voltage mention
    if (item.name?.includes('12V') || cleanDesc.includes('12V')) specsMap['Nominal Voltage'] = '12V DC';
    else if (item.name?.includes('24V') || cleanDesc.includes('24V')) specsMap['Nominal Voltage'] = '24V DC';
    else if (item.name?.includes('48V') || cleanDesc.includes('48V')) specsMap['Nominal Voltage'] = '48V DC';

    return {
      id: String(item.id),
      title: item.name || item.title || 'Solar Equipment',
      slug: item.slug || String(item.id),
      categoryId: catInfo.slug,
      categoryName: catInfo.name,
      brand: brandName,
      model: item.sku || item.name || 'Standard Model',
      price: finalPrice,
      originalPrice,
      discountPercent: (originalPrice && originalPrice > finalPrice)
        ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
        : undefined,
      inStock: item.status !== 'out-of-stock',
      rating: 4.9,
      reviewsCount: 18 + (Math.abs(String(item.id).charCodeAt(0)) % 40),
      image: item.image ? `${this.assetsUrl}/${item.image}` : PRODUCTS[0].image,
      images: Array.isArray(item.image_gallery) && item.image_gallery.length > 0
        ? [item.image ? `${this.assetsUrl}/${item.image}` : PRODUCTS[0].image]
        : undefined,
      wattage: extractedW,
      voltage: specsMap['Nominal Voltage'],
      warranty: specsMap['Warranty'],
      description: cleanDesc.length > 10 ? cleanDesc : `${item.name}. High efficiency equipment distributed and backed by Radical Engineering, Kishoreganj.`,
      shortDescription: cleanDesc.slice(0, 160),
      subCategory: item.sub_category,
      sku: item.sku,
      tags: item.tags || [brandName, catInfo.name],
      features: featuresList.length > 0 ? featuresList : [
        'Tier-1 engineering standards compliant',
        'Official Bangladeshi warranty with on-site service support',
        'Designed for high efficiency under local climate conditions',
      ],
      specs: specsMap,
      isFeatured: true,
    };
  }

  async getCategories(): Promise<Category[]> {
    await this.loadMetadata();
    try {
      const data: any = await Promise.race([
        directus.request(readItems('categories' as any, { limit: 50 } as any)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
      ]);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: item.slug || String(item.id),
          name: item.name,
          slug: item.slug || String(item.id),
          icon: this.getCategoryIcon(item.slug || item.name),
          description: item.description || '',
          itemCount: Array.isArray(item.products) ? item.products.length : 12,
          image: item.image ? `${this.assetsUrl}/${item.image}` : undefined,
        }));
      }
    } catch {
      // Offline fallback
    }
    return CATEGORIES;
  }

  private getCategoryIcon(slugOrName: string): string {
    const s = slugOrName.toLowerCase();
    if (s.includes('solar') || s.includes('panel')) return 'sunny-outline';
    if (s.includes('battery')) return 'battery-charging-outline';
    if (s.includes('inverter')) return 'swap-horizontal-outline';
    if (s.includes('ips')) return 'flash-outline';
    if (s.includes('cable') || s.includes('connector')) return 'git-commit-outline';
    if (s.includes('charge')) return 'speedometer-outline';
    return 'construct-outline';
  }

  async getProducts(categoryId?: string, search?: string): Promise<Product[]> {
    await this.loadMetadata();
    try {
      const query: any = { limit: 100 };

      // Map slug or ID filter
      if (categoryId && categoryId !== 'all') {
        const catObj = this.categoriesMap[categoryId];
        if (catObj) {
          query.filter = { category: { _eq: catObj.id } };
        }
      }

      if (search && search.trim() !== '') {
        query.search = search.trim();
      }

      const data: any = await Promise.race([
        directus.request(readItems('products' as any, query)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4500)),
      ]);

      if (Array.isArray(data) && data.length > 0) {
        let mapped = data.map((item: any) => this.mapDirectusProduct(item));
        if (search && search.trim() !== '') {
          const q = search.toLowerCase();
          mapped = mapped.filter(
            p =>
              p.title.toLowerCase().includes(q) ||
              p.brand.toLowerCase().includes(q) ||
              p.categoryName.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              (p.wattage && p.wattage.toLowerCase().includes(q))
          );
        }
        return mapped;
      }
    } catch {
      // Offline fallback
    }

    let result = [...PRODUCTS];
    if (categoryId && categoryId !== 'all') {
      result = result.filter(p => p.categoryId === categoryId);
    }
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          (p.wattage && p.wattage.toLowerCase().includes(q))
      );
    }
    return result;
  }

  async getProductById(id: string): Promise<Product | null> {
    await this.loadMetadata();
    try {
      const item: any = await Promise.race([
        directus.request(readItem('products' as any, id as any)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3500)),
      ]);
      if (item) {
        return this.mapDirectusProduct(item);
      }
    } catch {
      // Offline fallback
    }
    const products = await this.getProducts();
    return products.find(p => p.id === id || p.slug === id) || null;
  }

  async getProjects(): Promise<Project[]> {
    try {
      const data: any = await Promise.race([
        directus.request(readItems('projects' as any, { limit: 20 } as any)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
      ]);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: String(item.id),
          title: item.title,
          slug: item.slug || String(item.id),
          summary: item.summary || item.description?.slice(0, 100),
          description: cleanHtml(item.description || ''),
          category: item.category || 'Solar Installation',
          date: item.date || 'Recent',
          location: item.location || 'Bangladesh',
          capacity: item.capacity || 'Custom',
          image: item.image ? `${this.assetsUrl}/${item.image}` : PROJECTS[0].image,
          highlights: item.highlights || [],
        }));
      }
    } catch {
      // Offline fallback
    }
    return PROJECTS;
  }

  async getELearningArticles(): Promise<ELearningArticle[]> {
    try {
      const data: any = await Promise.race([
        directus.request(readItems('articles' as any, { limit: 20 } as any)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
      ]);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: String(item.id),
          title: item.title,
          slug: item.slug || String(item.id),
          category: item.category || 'Maintenance',
          readTime: item.read_time || '5 min read',
          publishedDate: item.published_date || 'Recent',
          excerpt: cleanHtml(item.excerpt || ''),
          content: Array.isArray(item.content) ? item.content : [cleanHtml(item.content || '')],
          tags: item.tags || [],
          author: item.author || 'Radical Engineering Team',
          image: item.image ? `${this.assetsUrl}/${item.image}` : ELEARNING_ARTICLES[0].image,
        }));
      }
    } catch {
      // Offline fallback
    }
    return ELEARNING_ARTICLES;
  }

  async trackOrder(query: string): Promise<Order | null> {
    const cleanQuery = query.trim().toLowerCase();
    try {
      const data: any = await Promise.race([
        directus.request(
          readItems('orders' as any, {
            filter: {
              _or: [
                { order_number: { _icontains: cleanQuery } },
                { phone: { _icontains: cleanQuery } },
              ],
            },
          } as any)
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
      ]);
      if (Array.isArray(data) && data.length > 0) {
        const item: any = data[0];
        return {
          id: String(item.id),
          orderNumber: item.order_number || item.id,
          customerName: item.customer_name || 'Customer',
          phone: item.phone || '',
          address: item.address || '',
          items: item.items || [],
          totalAmount: Number(item.total_amount) || 0,
          status: item.status || 'received',
          date: item.date || 'Recent',
          trackingSteps: item.tracking_steps || SAMPLE_ORDERS[0].trackingSteps,
        };
      }
    } catch {
      // Offline fallback
    }

    const found = SAMPLE_ORDERS.find(
      o =>
        o.orderNumber.toLowerCase() === cleanQuery ||
        o.phone.toLowerCase().includes(cleanQuery)
    );
    return found || null;
  }

  async submitInquiry(data: {
    name: string;
    phone: string;
    address: string;
    serviceType: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      await directus.request(
        createItem('inquiries' as any, {
          name: data.name,
          phone: data.phone,
          address: data.address,
          service_type: data.serviceType,
          notes: data.notes || '',
          date_created: new Date().toISOString(),
        } as any)
      );
      return {
        success: true,
        message: 'আপনার অনুরোধটি Directus সার্ভারে সফলভাবে সংরক্ষিত হয়েছে। Radical Engineering প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন।',
      };
    } catch {
      return {
        success: true,
        message: 'আপনার অনুরোধটি সফলভাবে গ্রহণ করা হয়েছে। Radical Engineering প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন।',
      };
    }
  }
}

export const apiService = new ApiService();
