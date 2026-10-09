import { createDirectus, rest, staticToken, readItems, readItem, createItem, createItems } from '@directus/sdk';
import { APP_CONFIG } from '../constants/config';
import { CATEGORIES, PRODUCTS, PROJECTS, ELEARNING_ARTICLES, SAMPLE_ORDERS } from '../constants/mockData';
import { Product, ProductDoc, Category, Project, ELearningArticle, Order, TrackedOrder, TrackedOrderItem, GoogleReview, GoogleReviewsSummary, BannerItem, BrandPartner } from '../types';

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
  let str = html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Multi-pass entity decoding (handles double-encoded entities like &amp;deg; &amp;lt;)
  for (let i = 0; i < 2; i++) {
    str = str
      .replace(/&#(\d+);/g, (match, dec) => {
        try { return String.fromCodePoint(parseInt(dec, 10)); } catch { return match; }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
        try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return match; }
      })
      .replace(/&deg;?/gi, '°')
      .replace(/&plusmn;?/gi, '±')
      .replace(/&micro;?/gi, 'µ')
      .replace(/&Omega;?/g, 'Ω')
      .replace(/&omega;?/g, 'ω')
      .replace(/&times;?/gi, '×')
      .replace(/&divide;?/gi, '÷')
      .replace(/&le;?/gi, '≤')
      .replace(/&ge;?/gi, '≥')
      .replace(/&ne;?/gi, '≠')
      .replace(/&nbsp;?/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#60;/gi, '<')
      .replace(/&#62;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&bull;/gi, '•')
      .replace(/&mdash;/gi, '—')
      .replace(/&ndash;/gi, '–')
      .replace(/&amp;/gi, '&');
  }
  return str.trim();
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

    const richDescription = (item.description && String(item.description).trim())
      ? String(item.description)
      : (item.short_description || '');
    const cleanDesc = cleanHtml(richDescription);

    const richShortDesc = (item.short_description && String(item.short_description).trim())
      ? String(item.short_description).trim()
      : undefined;
    const shortDesc = richShortDesc || (cleanDesc.length > 160 ? `${cleanDesc.slice(0, 160)}...` : cleanDesc);

    const featuresList = (Array.isArray(item.features) && item.features.length > 0)
      ? item.features
      : [];

    const extractedW = extractWattage(item.name || item.title || '');
    const regularPrice = Number(item.price) || 0;
    const discountedPrice = item.discounted_price ? Number(item.discounted_price) : undefined;
    const finalPrice = discountedPrice && discountedPrice < regularPrice ? discountedPrice : regularPrice;
    const originalPrice = discountedPrice && discountedPrice < regularPrice ? regularPrice : undefined;

    // Technical specifications map - only add verified attributes
    const specsMap: Record<string, string> = {};
    if (brandName) specsMap['Brand'] = brandName;
    if (item.sku) specsMap['Model / SKU'] = item.sku;
    specsMap['Category'] = catInfo.name;
    if (item.sub_category) specsMap['Sub-Category'] = item.sub_category;
    let formattedWarranty: string | undefined = undefined;
    if (item.warranty && String(item.warranty).trim()) {
      const w = String(item.warranty).trim();
      formattedWarranty = w.toLowerCase().includes('warrant') || w.toLowerCase().includes('warrent')
        ? w
        : `${w} Warranty`;
      specsMap['Warranty'] = formattedWarranty;
    }
    specsMap['Stock Status'] = item.status === 'in-stock'
      ? 'Available in Stock'
      : (item.status === 'out-of-stock' ? 'Out of Stock' : (item.status || 'In Stock'));

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

    const mainImgUrl = item.image ? `${this.assetsUrl}/${item.image}` : PRODUCTS[0].image;
    const galleryUrls: string[] = [];
    if (mainImgUrl) {
      galleryUrls.push(mainImgUrl);
    }
    if (Array.isArray(item.image_gallery)) {
      item.image_gallery.forEach((g: any) => {
        let fileId: string | undefined;
        if (typeof g === 'string') {
          fileId = g;
        } else if (g && typeof g.directus_files_id === 'string') {
          fileId = g.directus_files_id;
        } else if (g && typeof g.directus_files_id === 'object' && g.directus_files_id?.id) {
          fileId = String(g.directus_files_id.id);
        } else if (g && typeof g.id === 'string' && !g.directus_files_id) {
          fileId = g.id;
        }
        if (fileId) {
          const url = `${this.assetsUrl}/${fileId}`;
          if (!galleryUrls.includes(url)) {
            galleryUrls.push(url);
          }
        }
      });
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
      rating: 5.0,
      reviewsCount: 0,
      image: mainImgUrl,
      images: galleryUrls.length > 0 ? galleryUrls : [mainImgUrl],
      wattage: extractedW,
      voltage: undefined,
      warranty: formattedWarranty,
      description: cleanDesc.length > 10 ? cleanDesc : `${item.name || 'Solar Equipment'}. Distributed and backed by Radical Engineering, Kishoreganj.`,
      rawDescription: richDescription.length > 5 ? richDescription : undefined,
      shortDescription: shortDesc,
      subCategory: item.sub_category,
      sku: item.sku,
      tags: item.tags || [brandName, catInfo.name],
      features: featuresList,
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
      const query: any = {
        limit: 100,
        fields: ['*', 'datasheet.*', 'user_manual.*', 'image_gallery.*', 'image_gallery.directus_files_id.*'],
      };

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
        directus.request(
          readItem('products' as any, id as any, {
            fields: ['*', 'datasheet.*', 'user_manual.*', 'image_gallery.*', 'image_gallery.directus_files_id.*'],
          } as any)
        ),
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
    const sortLatestFirst = (list: Project[]) => {
      return [...list].sort((a, b) => {
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
    };

    try {
      const data: any = await Promise.race([
        directus.request(
          readItems('projects' as any, {
            limit: 30,
            fields: ['*'],
            sort: ['-id', '-date_created'],
          } as any)
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
      ]);
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((item: any) => {
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
        return sortLatestFirst(mapped);
      }
    } catch {
      // Offline fallback
    }
    return sortLatestFirst(PROJECTS);
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
    address?: string;
    serviceType: string;
    notes?: string;
    email?: string;
  }): Promise<{ success: boolean; message: string; inquiryId?: number }> {
    const cleanPhone = (data.phone || '').trim();
    const cleanName = (data.name || '').trim();
    const cleanService = (data.serviceType || '').trim();
    const cleanMessage =
      (data.notes || '').trim() ||
      `Inquiry for ${cleanService}${data.address ? ` [Address: ${data.address}]` : ''}`;

    try {
      // 1. Directus SDK createItem into 'messages' collection with new 'service_req' field
      const created: any = await directus.request(
        createItem('messages' as any, {
          name: cleanName,
          phone: cleanPhone,
          service_req: cleanService,
          message: cleanMessage,
          email: data.email ? data.email.trim() : null,
          status: 'published',
        } as any)
      );

      return {
        success: true,
        inquiryId: created?.id ? Number(created.id) : undefined,
        message: 'আপনার অনুরোধটি Directus সার্ভারে সফলভাবে সংরক্ষিত হয়েছে। Radical Engineering প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন।',
      };
    } catch (directusErr: any) {
      console.warn('Directus messages submission error:', directusErr);

      // 2. Direct REST fallback to Directus /items/messages
      try {
        const resp = await fetch(`${APP_CONFIG.apiBaseUrl}/items/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${APP_CONFIG.accessToken}`,
          },
          body: JSON.stringify({
            name: cleanName,
            phone: cleanPhone,
            service_req: cleanService,
            message: cleanMessage,
            status: 'published',
          }),
        });

        if (resp.ok) {
          const json = await resp.json();
          return {
            success: true,
            inquiryId: json?.data?.id ? Number(json.data.id) : undefined,
            message: 'আপনার অনুরোধটি Directus সার্ভারে সফলভাবে সংরক্ষিত হয়েছে। Radical Engineering প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন।',
          };
        }
      } catch (fetchErr) {
        console.warn('Direct fetch messages error:', fetchErr);
      }

      return {
        success: false,
        message: 'Could not send inquiry. Please call our hotline or try again.',
      };
    }
  }

  async getGoogleReviews(): Promise<GoogleReviewsSummary> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const siteBase = (APP_CONFIG.website || 'https://radicalengineering.com.bd').replace(/\/+$/, '');
      const res = await fetch(`${siteBase}/api/reviews`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        const widget = json.widget;
        if (widget && Array.isArray(widget.reviews) && widget.reviews.length > 0) {
          const mappedReviews: GoogleReview[] = widget.reviews
            .map((r: any) => ({
              id: String(r.id || Math.random()),
              authorName: r.author?.name || 'Verified Customer',
              authorAvatar: r.author?.avatarUrl || undefined,
              rating: typeof r.rating?.value === 'number' ? r.rating.value : 5,
              text: r.text || r.originalText || '',
              publishedAt: r.publishedAt
                ? new Date(r.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Verified Customer',
            }))
            .filter((r: GoogleReview) => r.text.trim().length > 0);

          return {
            rating: Number(widget.gbpLocationSummary?.rating) || 5.0,
            totalReviews: Number(widget.gbpLocationSummary?.reviewsCount) || mappedReviews.length,
            writeAReviewUrl:
              widget.gbpLocationSummary?.writeAReviewUri ||
              FALLBACK_GOOGLE_REVIEWS.writeAReviewUrl,
            reviews: mappedReviews.length > 0 ? mappedReviews : FALLBACK_GOOGLE_REVIEWS.reviews,
          };
        }
      }
    } catch {
      // Offline fallback
    }
    return FALLBACK_GOOGLE_REVIEWS;
  }

  async getSliders(): Promise<BannerItem[]> {
    try {
      const data: any = await Promise.race([
        directus.request(
          readItems('sliders' as any, {
            filter: { status: { _eq: 'published' } },
            sort: ['sort', '-id'],
          } as any)
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
      ]);

      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const bodyHtml = String(item.body || '');
          const hMatch = bodyHtml.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/is);
          let title = '';
          if (hMatch && hMatch[1]) {
            title = cleanHtml(hMatch[1]).trim();
          }

          let remaining = bodyHtml;
          if (hMatch) {
            remaining = bodyHtml.replace(hMatch[0], '');
          }
          let subtitle = cleanHtml(remaining).trim();

          if (!title) {
            const lines = cleanHtml(bodyHtml).split('\n').map(l => l.trim()).filter(Boolean);
            title = lines[0] || 'Clean Energy Solutions';
            subtitle = lines.slice(1).join(' ') || '';
          }

          const buttonLink = String(item.button_link || '').trim();
          const buttonText = String(item.button_text || 'Explore Now').trim();

          // Derive tag from content
          const combined = (title + ' ' + buttonLink).toLowerCase();
          let tag = 'CLEAN ENERGY';
          if (combined.includes('batter')) tag = 'POWER STORAGE';
          else if (combined.includes('solar') || combined.includes('panel')) tag = 'SOLAR ENERGY';
          else if (combined.includes('inverter') || combined.includes('ips')) tag = 'POWER BACKUP';
          else if (combined.includes('lps') || combined.includes('lightn')) tag = 'SAFETY SYSTEMS';

          const image = item.image ? `${this.assetsUrl}/${item.image}` : FALLBACK_BANNERS[0].image;

          return {
            id: String(item.id),
            title,
            subtitle,
            tag,
            cta: buttonText,
            image,
            buttonLink,
          };
        });
      }
    } catch (err) {
      console.warn('Directus sliders fetch error:', err);

      // REST fallback
      try {
        const resp = await fetch(
          `${APP_CONFIG.apiBaseUrl}/items/sliders?filter[status][_eq]=published&sort=sort,-id`,
          {
            headers: {
              Authorization: `Bearer ${APP_CONFIG.accessToken}`,
              Accept: 'application/json',
            },
          }
        );
        if (resp.ok) {
          const json = await resp.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            return json.data.map((item: any) => {
              const bodyHtml = String(item.body || '');
              const hMatch = bodyHtml.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/is);
              let title = hMatch && hMatch[1] ? cleanHtml(hMatch[1]).trim() : '';
              let remaining = hMatch ? bodyHtml.replace(hMatch[0], '') : bodyHtml;
              let subtitle = cleanHtml(remaining).trim();
              if (!title) {
                const lines = cleanHtml(bodyHtml).split('\n').map(l => l.trim()).filter(Boolean);
                title = lines[0] || 'Clean Energy Solutions';
                subtitle = lines.slice(1).join(' ') || '';
              }
              const buttonLink = String(item.button_link || '').trim();
              const buttonText = String(item.button_text || 'Explore Now').trim();
              const combined = (title + ' ' + buttonLink).toLowerCase();
              let tag = 'CLEAN ENERGY';
              if (combined.includes('batter')) tag = 'POWER STORAGE';
              else if (combined.includes('solar') || combined.includes('panel')) tag = 'SOLAR ENERGY';
              else if (combined.includes('inverter') || combined.includes('ips')) tag = 'POWER BACKUP';
              const image = item.image ? `${this.assetsUrl}/${item.image}` : FALLBACK_BANNERS[0].image;
              return {
                id: String(item.id),
                title,
                subtitle,
                tag,
                cta: buttonText,
                image,
                buttonLink,
              };
            });
          }
        }
      } catch (fetchErr) {
        console.warn('REST sliders fallback error:', fetchErr);
      }
    }

    return FALLBACK_BANNERS;
  }

  /**
   * Fetch official equipment brand partners with their logos
   */
  async getBrands(): Promise<BrandPartner[]> {
    try {
      const items = await directus.request(
        readItems('brands' as any, {
          fields: ['id', 'name', 'logo', 'link', 'sort'] as any,
          sort: ['sort', 'id'] as any,
          limit: 50,
        })
      );

      if (Array.isArray(items) && items.length > 0) {
        const filtered = items
          .filter((item: any) => {
            const name = (item.name || '').trim();
            return name && name.toLowerCase() !== 'no brand';
          })
          .map((item: any): BrandPartner => ({
            id: String(item.id),
            name: (item.name || '').trim(),
            logo: item.logo ? `${this.assetsUrl}/${item.logo}` : undefined,
            link: item.link && item.link !== '#' ? item.link : undefined,
          }));

        if (filtered.length > 0) {
          filtered.forEach((b: BrandPartner) => {
            this.brandsMap[b.id] = b.name;
          });
          return filtered;
        }
      }
    } catch (err) {
      console.warn('Directus brands fetch error:', err);

      // REST fallback
      try {
        const resp = await fetch(
          `${APP_CONFIG.apiBaseUrl}/items/brands?limit=50&sort=sort,id`,
          {
            headers: {
              Authorization: `Bearer ${APP_CONFIG.accessToken}`,
              Accept: 'application/json',
            },
          }
        );
        if (resp.ok) {
          const json = await resp.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            const filtered = json.data
              .filter((item: any) => {
                const name = (item.name || '').trim();
                return name && name.toLowerCase() !== 'no brand';
              })
              .map((item: any): BrandPartner => ({
                id: String(item.id),
                name: (item.name || '').trim(),
                logo: item.logo ? `${this.assetsUrl}/${item.logo}` : undefined,
                link: item.link && item.link !== '#' ? item.link : undefined,
              }));

            if (filtered.length > 0) {
              filtered.forEach((b: BrandPartner) => {
                this.brandsMap[b.id] = b.name;
              });
              return filtered;
            }
          }
        }
      } catch (fetchErr) {
        console.warn('REST brands fallback error:', fetchErr);
      }
    }

    return FALLBACK_BRANDS;
  }
}

export const FALLBACK_BRANDS: BrandPartner[] = [
  {
    id: '2',
    name: 'Growatt',
    logo: 'https://admin.atiar.com.bd/assets/fe980091-355e-4765-9925-8a60b5584365',
    link: 'https://en.growatt.com/',
  },
  {
    id: '4',
    name: 'Solis',
    logo: 'https://admin.atiar.com.bd/assets/d1c94b54-a216-47fc-ba66-3ac0fe166c2f',
    link: 'https://www.solisinverters.com/global',
  },
  {
    id: '16',
    name: 'Longi',
    logo: 'https://admin.atiar.com.bd/assets/649852ae-6af3-4073-81e2-006955ec0280',
    link: 'https://www.longi.com/en/',
  },
  {
    id: '3',
    name: 'Trina Solar',
    logo: 'https://admin.atiar.com.bd/assets/5ae1250e-886a-47d3-8b75-83cf6822dec7',
    link: 'https://www.trinasolar.com/en-glb',
  },
  {
    id: '17',
    name: 'JA Solar',
    logo: 'https://admin.atiar.com.bd/assets/d48c9ec8-ec9d-456b-b9d1-1af031c8f8ff',
    link: 'https://www.jasolar.com/html/en/',
  },
  {
    id: '12',
    name: 'Huawei',
    logo: 'https://admin.atiar.com.bd/assets/45a5f5d4-e70f-426a-8a54-c376efb5654c',
    link: 'https://solar.huawei.com/',
  },
  {
    id: '6',
    name: 'Volvo (Panna Group)',
    logo: 'https://admin.atiar.com.bd/assets/9ccc7d75-5814-4b06-a032-9e3c05819173',
    link: 'https://www.pannagroupbd.com/product-category/batteries/',
  },
  {
    id: '20',
    name: 'Rahimafrooz',
    logo: 'https://admin.atiar.com.bd/assets/b958aa5f-599f-4cf2-ad61-5d5c880b9673',
    link: 'https://www.rahimafrooz.com/',
  },
  {
    id: '21',
    name: 'GOODWE',
    logo: 'https://admin.atiar.com.bd/assets/643d9d75-021a-4d65-a0a0-44a7e6c26d04',
    link: 'https://en.goodwe.com',
  },
];

export const FALLBACK_BANNERS: BannerItem[] = [
  {
    id: 'b1',
    title: 'Harness the Power of the Sun',
    subtitle: 'High-efficiency solar panels for your home or business.',
    tag: 'SOLAR ENERGY',
    cta: 'Explore Solar Panels',
    image: 'https://admin.atiar.com.bd/assets/3791e375-6479-459c-afd0-5579f41cea68',
    buttonLink: '/categories/solar-panels',
  },
  {
    id: 'b2',
    title: 'Energy That Never Sleeps',
    subtitle: 'Smart battery systems for day and night energy storage.',
    tag: 'POWER STORAGE',
    cta: 'See Batteries',
    image: 'https://admin.atiar.com.bd/assets/ae1a61ab-1876-4a01-95db-87dc200124a6',
    buttonLink: '/categories/battery',
  },
];

const FALLBACK_GOOGLE_REVIEWS: GoogleReviewsSummary = {
  rating: 5.0,
  totalReviews: 4,
  writeAReviewUrl:
    'https://www.google.com/maps/place//data=!4m3!3m2!1s0x375693e4553ce883:0x538771cd5d083f9e!12e1?g_mp=CiVnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLkdldFBsYWNlEAIYBCAA',
  reviews: [
    {
      id: 'bccc79f6-28aa-4677-900c-08a1598587e0',
      authorName: 'Dr. Faruqul Islam FARUK',
      authorAvatar:
        'https://lh3.googleusercontent.com/a-/ALV-UjUQClmzuEffohDKwydXAZMngNvssKS9MK3DViVgrIwds-NruPg-=s64-c-rp-mo-ba12-br100',
      rating: 5,
      text: 'I bought a IPS from Radical engineering👍. Best service in Kishoreganj.',
      publishedAt: 'Aug 18, 2026',
    },
    {
      id: '8411cc2c-c687-4f19-8302-5af539e16a44',
      authorName: 'mohiuddin shahin',
      authorAvatar:
        'https://lh3.googleusercontent.com/a-/ALV-UjUu4SjxSLCAHfsVMA4yReF3RCY7A6VxGq1FdwTJMrWJ9Pv0gIDo=s64-c-rp-mo-br100',
      rating: 5,
      text: 'Best IPS and Solar inverter seller in Kishoreganj. Their support is absolutely fantastic.',
      publishedAt: 'Jun 26, 2025',
    },
    {
      id: '0069dc42-a0fe-4efc-8c8d-a53d59123126',
      authorName: 'Md. Arifur Rahman',
      authorAvatar:
        'https://lh3.googleusercontent.com/a-/ALV-UjVxS5jn2qt1hVcAxbEYj12g6B2V8UlZM-9gZ83uZ02xi_RYOGFmxg=s64-c-rp-mo-ba12-br100',
      rating: 5,
      text: "Radical Engineering gave me support on our office's solar system setup. Best service and support I got from them. Worth it.",
      publishedAt: 'Jun 26, 2025',
    },
    {
      id: '73b74a32-0b19-4d79-a4bd-9375a705cfb9',
      authorName: 'Jahirul Islam Jony',
      authorAvatar:
        'https://lh3.googleusercontent.com/a-/ALV-UjVDK5hjoMsgJ1C04CcZKWItDq7qRPte5681WcvaWLeJnLkKCj8=s64-c-rp-mo-br100',
      rating: 5,
      text: 'Good service and professional.',
      publishedAt: 'Jun 30, 2025',
    },
  ],
};

export const apiService = new ApiService();
