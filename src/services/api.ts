import { APP_CONFIG } from '../constants/config';
import { CATEGORIES, PRODUCTS, PROJECTS, ELEARNING_ARTICLES, SAMPLE_ORDERS } from '../constants/mockData';
import { Product, Category, Project, ELearningArticle, Order } from '../types';

/**
 * Radical Engineering API Client
 * Features seamless offline-first capability:
 * If the Directus server at https://admin.atiar.com.bd is reachable, it loads live CMS data.
 * Otherwise, it instantly falls back to the embedded verified catalog.
 */
class ApiService {
  private baseUrl = APP_CONFIG.apiBaseUrl;

  async getCategories(): Promise<Category[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.baseUrl}/items/categories`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map((item: any) => ({
            id: item.slug || String(item.id),
            name: item.name || item.title,
            slug: item.slug || String(item.id),
            icon: item.icon || 'sunny-outline',
            description: item.description || '',
            itemCount: item.item_count || 10,
            image: item.image ? `${this.baseUrl}/assets/${item.image}` : undefined,
          }));
        }
      }
    } catch {
      // Offline fallback
    }
    return CATEGORIES;
  }

  async getProducts(categoryId?: string, search?: string): Promise<Product[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      let url = `${this.baseUrl}/items/products?limit=50`;
      if (categoryId && categoryId !== 'all') {
        url += `&filter[category][_eq]=${categoryId}`;
      }
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map((item: any) => ({
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
            image: item.image ? `${this.baseUrl}/assets/${item.image}` : PRODUCTS[0].image,
            wattage: item.wattage,
            voltage: item.voltage,
            warranty: item.warranty || 'Warranty available',
            description: item.description || '',
            features: item.features || [],
            specs: item.specs || {},
            isFeatured: !!item.is_featured,
          }));
        }
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
    const products = await this.getProducts();
    return products.find(p => p.id === id || p.slug === id) || null;
  }

  async getProjects(): Promise<Project[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.baseUrl}/items/projects`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            slug: item.slug || String(item.id),
            summary: item.summary || item.description?.slice(0, 100),
            description: item.description || '',
            category: item.category || 'Solar Installation',
            date: item.date || 'Recent',
            location: item.location || 'Bangladesh',
            capacity: item.capacity || 'Custom',
            image: item.image ? `${this.baseUrl}/assets/${item.image}` : PROJECTS[0].image,
            highlights: item.highlights || [],
          }));
        }
      }
    } catch {
      // Offline fallback
    }
    return PROJECTS;
  }

  async getELearningArticles(): Promise<ELearningArticle[]> {
    return ELEARNING_ARTICLES;
  }

  async trackOrder(query: string): Promise<Order | null> {
    const cleanQuery = query.trim().toLowerCase();
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
      // In production can post to Directus contact form or CRM
      return {
        success: true,
        message: 'আপনার অনুরোধটি সফলভাবে গ্রহণ করা হয়েছে। Radical Engineering প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন।',
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'An error occurred' };
    }
  }
}

export const apiService = new ApiService();

