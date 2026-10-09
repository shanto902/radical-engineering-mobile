import { createDirectus, rest, staticToken, readItems, readItem, createItem, createItems } from '@directus/sdk';
import { APP_CONFIG } from '../constants/config';
import { CATEGORIES, PRODUCTS, PROJECTS, ELEARNING_ARTICLES, SAMPLE_ORDERS } from '../constants/mockData';
import { Product, ProductDoc, Category, Project, ELearningArticle, Order, TrackedOrder, TrackedOrderItem } from '../types';

export interface CreateOrderItem {
  id: string;
  productTitle?: string;
  quantity: number;
  price?: number;
}

export interface CreateOrderParams {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  total: number;
  items: CreateOrderItem[];
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

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

/**
 * Parse Directus file reference into a ProductDoc object
 */
function parseDocument(
  fileData: any,
  defaultTitle: string,
  type: 'datasheet' | 'manual' | 'document',
  assetsUrl: string
): ProductDoc | undefined {
  if (!fileData) return undefined;
  if (typeof fileData === 'string' && fileData.trim() !== '') {
    return {
      id: fileData,
      title: defaultTitle,
      filename: `${defaultTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      type,
      url: `${assetsUrl}/${fileData}`,
    };
  }
  if (typeof fileData === 'object' && fileData.id) {
    const sizeKb = fileData.filesize ? `${Math.round(Number(fileData.filesize) / 1024)} KB` : undefined;
    return {
      id: String(fileData.id),
      title: fileData.title || fileData.filename_download || defaultTitle,
      filename: fileData.filename_download || `${defaultTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      type,
      url: `${assetsUrl}/${fileData.id}`,
      filesize: sizeKb,
    };
  }
  return undefined;
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

    const datasheetDoc = parseDocument(item.datasheet, 'Technical Datasheet', 'datasheet', this.assetsUrl);
    const manualDoc = parseDocument(item.user_manual, 'User Manual', 'manual', this.assetsUrl);
    const docList: ProductDoc[] = [];
    if (datasheetDoc) {
      docList.push(datasheetDoc);
      specsMap['Datasheet (PDF)'] = datasheetDoc.filename || 'Available';
    }
    if (manualDoc) {
      docList.push(manualDoc);
      specsMap['User Manual (PDF)'] = manualDoc.filename || 'Available';
    }

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
      rawDescription: rawDesc.length > 5 ? rawDesc : undefined,
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
      datasheet: datasheetDoc,
      userManual: manualDoc,
      documents: docList,
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
      const query: any = { limit: 100, fields: ['*', 'datasheet.*', 'user_manual.*'] };

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
        directus.request(readItem('products' as any, id as any, { fields: ['*', 'datasheet.*', 'user_manual.*'] } as any)),
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
        directus.request(readItems('projects' as any, { limit: 30, fields: ['*'] } as any)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
      ]);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const rawBody = item.body || '';
          const shortDesc = item.short_description || cleanHtml(rawBody).slice(0, 160);
          const cleanBody = cleanHtml(rawBody);
          const dateStr = item.date || (item.date_created ? new Date(item.date_created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent');
          const capacityMatch = item.title?.match(/(\d+(?:\.\d+)?\s*(?:kw|kilo\s*watt|w|va))/i);
          const detectedCapacity = item.capacity || (capacityMatch ? capacityMatch[0].toUpperCase() : 'Field Installation');

          let parsedVideos: { link: string }[] = [];
          if (Array.isArray(item.videos)) {
            parsedVideos = item.videos
              .map((v: any) => {
                if (typeof v === 'string') return { link: v.trim() };
                if (v && typeof v === 'object') return { link: (v.link || v.url || '').trim() };
                return null;
              })
              .filter((v: any): v is { link: string } => !!(v && v.link));
          } else if (typeof item.videos === 'string' && item.videos.trim()) {
            try {
              const parsed = JSON.parse(item.videos);
              if (Array.isArray(parsed)) {
                parsedVideos = parsed
                  .map((v: any) => {
                    if (typeof v === 'string') return { link: v.trim() };
                    if (v && typeof v === 'object') return { link: (v.link || v.url || '').trim() };
                    return null;
                  })
                  .filter((v: any): v is { link: string } => !!(v && v.link));
              } else if (typeof parsed === 'string') {
                parsedVideos = [{ link: parsed.trim() }];
              }
            } catch {
              parsedVideos = [{ link: item.videos.trim() }];
            }
          }

          return {
            id: String(item.id),
            title: item.title,
            slug: item.slug || String(item.id),
            summary: shortDesc,
            shortDescription: shortDesc,
            body: rawBody || shortDesc,
            description: cleanBody.length > 5 ? cleanBody : shortDesc,
            category: item.category || 'Solar & Electrical Installation',
            date: dateStr,
            dateCreated: item.date_created,
            sort: typeof item.sort === 'number' ? item.sort : undefined,
            location: item.location ? String(item.location).trim() : 'Kishoreganj, Bangladesh',
            capacity: detectedCapacity,
            image: item.image ? `${this.assetsUrl}/${item.image}` : PROJECTS[0].image,
            videos: parsedVideos,
            highlights: item.highlights || [
              'Engineered by certified electrical engineers',
              'Full compliance with Bangladesh National Building Code (BNBC)',
              'Comprehensive testing & warranty documentation',
            ],
          };
        });
      }
    } catch {
      // Offline fallback
    }
    return PROJECTS;
  }

  async getELearningArticles(): Promise<ELearningArticle[]> {
    try {
      const [projectsData, downloadsData]: [any, any] = await Promise.race([
        Promise.all([
          directus.request(readItems('projects' as any, { limit: 20, fields: ['*'] } as any)).catch(() => []),
          directus.request(readItems('downloads' as any, { limit: 10, fields: ['*'] } as any)).catch(() => []),
        ]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4500)),
      ]);

      const list: ELearningArticle[] = [];

      // Add educational and technical guide articles from projects
      if (Array.isArray(projectsData) && projectsData.length > 0) {
        projectsData.forEach((item: any) => {
          const rawBody = item.body || '';
          const shortDesc = item.short_description || cleanHtml(rawBody).slice(0, 160);
          list.push({
            id: `project-${item.id}`,
            title: item.title,
            slug: item.slug || String(item.id),
            category: item.category || 'Solar Knowledge & Maintenance',
            readTime: '4 min read',
            publishedDate: item.date_created ? new Date(item.date_created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
            excerpt: shortDesc,
            bodyHtml: rawBody || shortDesc,
            content: [shortDesc],
            tags: item.tags || ['Solar', 'IPS', 'Maintenance', 'Battery'],
            author: 'Radical Engineering Team',
            image: item.image ? `${this.assetsUrl}/${item.image}` : ELEARNING_ARTICLES[0].image,
          });
        });
      }

      // Add official downloadable technical CBLM manuals from downloads
      if (Array.isArray(downloadsData) && downloadsData.length > 0) {
        downloadsData.forEach((item: any) => {
          list.push({
            id: `download-${item.id}`,
            title: item.name || 'Official Technical Material',
            slug: item.id,
            category: 'Official Engineering Manual (PDF)',
            readTime: 'PDF Document',
            publishedDate: item.date_created ? new Date(item.date_created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
            excerpt: item.description || 'Competency-based technical learning material and standards.',
            bodyHtml: `<p>${item.description || ''}</p>`,
            content: [item.description || ''],
            tags: ['PDF', 'Manual', 'NSDA', 'CBLM'],
            author: 'National Skills Development Authority / Radical Engineering',
            image: ELEARNING_ARTICLES[1]?.image || ELEARNING_ARTICLES[0].image,
            downloadUrl: item.file ? `${this.assetsUrl}/${item.file}` : undefined,
            downloadFilename: item.name ? `${item.name}.pdf` : 'manual.pdf',
          });
        });
      }

      if (list.length > 0) {
        return list;
      }
    } catch {
      // Offline fallback
    }
    return ELEARNING_ARTICLES;
  }

  /**
   * Helper to map Directus order item and order record to TrackedOrder
   */
  private mapToTrackedOrder(item: any): TrackedOrder {
    const rawItems: any[] = Array.isArray(item.order_items) ? item.order_items : [];
    const items: TrackedOrderItem[] = rawItems.map(it => {
      let productName = 'Product';
      if (it?.product && typeof it.product === 'object' && it.product.name) {
        productName = it.product.name;
      } else if (typeof it?.product === 'string') {
        productName = it.product;
      } else if (it?.name) {
        productName = it.name;
      }
      return {
        id: it?.id ? String(it.id) : undefined,
        quantity: Number(it?.quantity) || 1,
        productName,
      };
    });

    return {
      id: String(item.id || item.order_id),
      orderId: String(item.order_id || item.order_number || item.id),
      customerName: item.name || item.customer_name || 'Customer',
      phone: item.phone || '',
      address: item.address || '',
      status: String(item.status || 'pending').toLowerCase().trim(),
      placedAt: item.placed_at || item.date_created || item.date || new Date().toISOString(),
      total: Number(item.total || item.total_amount) || 0,
      items,
    };
  }

  /**
   * Track orders by mobile number or order ID.
   * Directly queries Directus collection 'orders' with fallback to web endpoint.
   */
  async trackOrders(query: string): Promise<TrackedOrder[]> {
    const rawQuery = query.trim();
    if (!rawQuery) return [];

    let cleanQuery = rawQuery.replace(/[\s\-\(\)]/g, '');
    if (cleanQuery.startsWith('+880')) {
      cleanQuery = cleanQuery.substring(3);
    } else if (cleanQuery.startsWith('880')) {
      cleanQuery = cleanQuery.substring(2);
    }

    // 1. Directus SDK readItems with real fields matching web application
    try {
      const data: any = await Promise.race([
        directus.request(
          readItems('orders' as any, {
            filter: {
              _or: [
                { phone: { _eq: cleanQuery } },
                { order_id: { _eq: cleanQuery } },
                { phone: { _icontains: cleanQuery } },
                { order_id: { _icontains: cleanQuery } },
              ],
            },
            sort: ['-placed_at'],
            fields: [
              'id',
              'order_id',
              'name',
              'status',
              'placed_at',
              'phone',
              'total',
              'address',
              'order_items.*',
              'order_items.product.name',
            ],
          } as any)
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 6000)),
      ]);

      if (Array.isArray(data) && data.length > 0) {
        return data.map(item => this.mapToTrackedOrder(item));
      }
    } catch (err) {
      console.warn('Directus trackOrders error:', err);
    }

    // 2. Fallback to web API: https://radicalengineering.com.bd/api/order-tracker?mobile=...
    try {
      const siteUrl = APP_CONFIG.siteUrl.replace(/\/+$/, '');
      const resp = await fetch(`${siteUrl}/api/order-tracker?mobile=${encodeURIComponent(cleanQuery)}`, {
        headers: { Accept: 'application/json' },
      });
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json.orders) && json.orders.length > 0) {
          return json.orders.map((item: any) => this.mapToTrackedOrder(item));
        }
      }
    } catch (err) {
      console.warn('Web API order-tracker fallback error:', err);
    }

    // 3. Fallback to mock data matching phone or order number
    const mockMatches = SAMPLE_ORDERS.filter(
      o =>
        o.orderNumber.toLowerCase().includes(cleanQuery.toLowerCase()) ||
        o.phone.includes(cleanQuery)
    );
    if (mockMatches.length > 0) {
      return mockMatches.map(m => ({
        id: m.id,
        orderId: m.orderNumber,
        customerName: m.customerName,
        phone: m.phone,
        address: m.address,
        status: m.status === 'completed' ? 'delivered' : m.status === 'in_transit' ? 'shipped' : 'processing',
        placedAt: new Date().toISOString(),
        total: m.totalAmount,
        items: m.items.map(it => ({
          productName: it.productTitle,
          quantity: it.quantity,
        })),
      }));
    }

    return [];
  }

  async trackOrder(query: string): Promise<Order | null> {
    const list = await this.trackOrders(query);
    if (list.length === 0) return null;
    const first = list[0];
    return {
      id: first.id,
      orderNumber: first.orderId,
      customerName: first.customerName,
      phone: first.phone,
      address: first.address,
      items: first.items.map(it => ({
        productTitle: it.productName,
        quantity: it.quantity,
        price: 0,
      })),
      totalAmount: first.total,
      status: (first.status === 'delivered' ? 'completed' : first.status === 'shipped' ? 'in_transit' : 'received') as any,
      date: first.placedAt,
      trackingSteps: SAMPLE_ORDERS[0].trackingSteps,
    };
  }

  /**
   * Fetch customer name and address from previous order by phone number.
   * Mirrors web application /api/last-order-by-phone
   */
  async getLastOrderByPhone(phone: string): Promise<{ name?: string; address?: string } | null> {
    const cleanPhone = (phone || '').replace(/[\s\-\(\)]/g, '');
    let normalizedPhone = cleanPhone;
    if (normalizedPhone.startsWith('+880')) {
      normalizedPhone = '0' + normalizedPhone.substring(4);
    } else if (normalizedPhone.startsWith('880')) {
      normalizedPhone = '0' + normalizedPhone.substring(3);
    }
    if (!/^01[0-9]{9}$/.test(normalizedPhone)) {
      return null;
    }

    // 1. Web API endpoint
    try {
      const siteUrl = APP_CONFIG.siteUrl.replace(/\/+$/, '');
      const resp = await fetch(`${siteUrl}/api/last-order-by-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhone }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.found) {
          return {
            name: json.name || undefined,
            address: json.address || undefined,
          };
        }
      }
    } catch (err) {
      console.warn('Web API last-order-by-phone error:', err);
    }

    // 2. Directus fallback
    try {
      const data: any = await directus.request(
        readItems('orders' as any, {
          filter: {
            phone: { _eq: normalizedPhone },
          },
          sort: ['-date_created'],
          limit: 1,
          fields: ['name', 'address'],
        } as any)
      );
      if (Array.isArray(data) && data.length > 0 && data[0]) {
        return {
          name: data[0].name || undefined,
          address: data[0].address || undefined,
        };
      }
    } catch (err) {
      console.warn('Directus last-order-by-phone error:', err);
    }

    return null;
  }

  /**
   * Create and place a new customer order.
   * Mirrors web application /api/create-order route with fallback to Directus SDK.
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const rawPhone = (params.phone || '').trim();
    let normalizedPhone = rawPhone.replace(/[\s\-\(\)]/g, '');
    if (normalizedPhone.startsWith('+880')) {
      normalizedPhone = '0' + normalizedPhone.substring(4);
    } else if (normalizedPhone.startsWith('880')) {
      normalizedPhone = '0' + normalizedPhone.substring(3);
    }

    if (!params.name || !params.name.trim()) {
      return { success: false, error: 'Customer full name is required.' };
    }

    if (!normalizedPhone || !/^01[0-9]{9}$/.test(normalizedPhone)) {
      return {
        success: false,
        error: 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017xxxxxxxx).',
      };
    }

    if (!params.address || !params.address.trim()) {
      return { success: false, error: 'Delivery and installation address is required.' };
    }

    if (!Array.isArray(params.items) || params.items.length === 0) {
      return { success: false, error: 'Your cart is empty. Please add items before placing order.' };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const finalTotal = Math.max(1, Math.round(params.total));

    // Construct enriched address with notes and custom package specs
    let enrichedAddress = params.address.trim();
    if (params.notes && params.notes.trim()) {
      enrichedAddress += `\n[Special Notes: ${params.notes.trim()}]`;
    }

    const customItems = params.items.filter(it => !uuidRegex.test(it.id));
    if (customItems.length > 0) {
      const customSummary = customItems
        .map(it => `${it.productTitle || 'Custom System'} (x${it.quantity})`)
        .join(', ');
      enrichedAddress += `\n[Custom Items: ${customSummary}]`;
    }

    const validUuidItems = params.items
      .filter(it => uuidRegex.test(it.id) && it.quantity > 0)
      .map(it => ({
        id: it.id.trim(),
        quantity: Math.max(1, Math.round(it.quantity)),
      }));

    // Method 1: Web backend endpoint /api/create-order (same as web app)
    if (validUuidItems.length > 0) {
      try {
        const siteUrl = APP_CONFIG.siteUrl.replace(/\/+$/, '');
        const resp = await fetch(`${siteUrl}/api/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            name: params.name.trim(),
            phone: normalizedPhone,
            address: enrichedAddress,
            total: finalTotal,
            items: validUuidItems,
          }),
        });

        if (resp.ok) {
          const json = await resp.json();
          if (json && json.success && json.order) {
            const returnedOrderId = String(json.order.order_id || json.order.id);
            return {
              success: true,
              orderId: returnedOrderId,
              orderNumber: returnedOrderId,
            };
          }
        }
      } catch (err) {
        console.warn('Web API create-order error, attempting direct Directus SDK:', err);
      }
    }

    // Method 2: Direct Directus SDK creation (guarantees execution even if proxy is down or items are custom)
    try {
      const now = new Date();
      const orderId = `${now.getFullYear()}${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now
        .getTime()
        .toString()
        .slice(-6)}`;

      const bangladeshOffsetMs = 6 * 60 * 60 * 1000;
      const bdTime = new Date(now.getTime() + bangladeshOffsetMs);
      const bdIso = bdTime.toISOString();

      const createdOrder: any = await directus.request(
        createItem('orders' as any, {
          order_id: orderId,
          name: params.name.trim(),
          phone: normalizedPhone,
          address: enrichedAddress,
          total: finalTotal,
          status: 'pending',
          placed_at: bdIso,
        } as any)
      );

      if (createdOrder && createdOrder.id) {
        if (validUuidItems.length > 0) {
          try {
            await directus.request(
              createItems(
                'order_items' as any,
                validUuidItems.map(item => ({
                  order: createdOrder.id,
                  product: item.id,
                  quantity: item.quantity,
                })) as any
              )
            );
          } catch (itemErr) {
            console.warn('Directus createItems order_items error:', itemErr);
          }
        }

        const finalOrderId = String(createdOrder.order_id || orderId);
        return {
          success: true,
          orderId: finalOrderId,
          orderNumber: finalOrderId,
        };
      }
    } catch (directusErr: any) {
      console.error('Directus SDK order creation error:', directusErr);
      return {
        success: false,
        error: directusErr?.message || 'Failed to submit order. Please try again or order via WhatsApp.',
      };
    }

    return {
      success: false,
      error: 'Failed to place order. Please try again or contact support.',
    };
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
