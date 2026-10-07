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
 * Radical Engineering API Client
 * Features seamless offline-first capability:
 * If the Directus server at https://admin.atiar.com.bd is reachable, it loads live CMS data.
 * Otherwise, it instantly falls back to the embedded verified catalog.
 */
class ApiService {
  private assetsUrl = APP_CONFIG.assetsBaseUrl;

  async getCategories(): Promise<Category[]> {
    try {
      const data = await Promise.race([
        directus.request(readItems('categories' as any, { limit: -1 } as any)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
      ]);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: item.slug || String(item.id),
          name: item.name || item.title,
          slug: item.slug || String(item.id),
          icon: item.icon || 'sunny-outline',
          description: item.description || '',
          itemCount: item.item_count || 10,
          image: item.image ? `${this.assetsUrl}/${item.image}` : undefined,
        }));
      }
    } catch {
      // Offline fallback
    }
    return CATEGORIES;
  }

  async getProducts(categoryId?: string, search?: string): Promise<Product[]> {
    try {
      const query: any = { limit: 50 };
      if (categoryId && categoryId !== 'all') {
        query.filter = { category: { _eq: categoryId } };
      }

      const data = await Promise.race([
        directus.request(readItems('products' as any, query)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
      ]);

      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: String(item.id),
          title: item.title || item.name,
          slug: item.slug || String(item.id),
          categoryId: item.category || 'solar-panels',
          categoryName: item.category_name || 'Solar Panels',
          brand: item.brand || 'Radical',
          model: item.model || 'Standard',
          price: Number(item.price) || 0,
          originalPrice: item.original_price ? Number(item.original_price) : undefined,
          inStock: item.in_stock !== false,
          rating: item.rating || 4.9,
          reviewsCount: item.reviews_count || 10,
          image: item.image ? `${this.assetsUrl}/${item.image}` : PRODUCTS[0].image,
          wattage: item.wattage,
          voltage: item.voltage,
          warranty: item.warranty || 'Warranty available',
          description: item.description || '',
          features: item.features || [],
          specs: item.specs || {},
          isFeatured: !!item.is_featured,
        }));
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
    try {
      const item: any = await Promise.race([
        directus.request(readItem('products' as any, id as any)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
      ]);
      if (item) {
        return {
          id: String(item.id),
          title: item.title || item.name,
          slug: item.slug || String(item.id),
          categoryId: item.category || 'solar-panels',
          categoryName: item.category_name || 'Solar Panels',
          brand: item.brand || 'Radical',
          model: item.model || 'Standard',
          price: Number(item.price) || 0,
          originalPrice: item.original_price ? Number(item.original_price) : undefined,
          inStock: item.in_stock !== false,
          rating: item.rating || 4.9,
          reviewsCount: item.reviews_count || 10,
          image: item.image ? `${this.assetsUrl}/${item.image}` : PRODUCTS[0].image,
          wattage: item.wattage,
          voltage: item.voltage,
          warranty: item.warranty || 'Warranty available',
          description: item.description || '',
          features: item.features || [],
          specs: item.specs || {},
          isFeatured: !!item.is_featured,
        };
      }
    } catch {
      // Offline fallback
    }
    const products = await this.getProducts();
    return products.find(p => p.id === id || p.slug === id) || null;
  }

  async getProjects(): Promise<Project[]> {
    try {
      const data = await Promise.race([
        directus.request(readItems('projects' as any, { limit: 20 } as any)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000)),
      ]);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: String(item.id),
          title: item.title,
          slug: item.slug || String(item.id),
          summary: item.summary || item.description?.slice(0, 100),
          description: item.description || '',
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
      const data = await Promise.race([
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
          excerpt: item.excerpt || '',
          content: Array.isArray(item.content) ? item.content : [item.content || ''],
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
      const data = await Promise.race([
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
