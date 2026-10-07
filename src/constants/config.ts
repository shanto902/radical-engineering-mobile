const rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://admin.atiar.com.bd';

// Normalize trailing slash
const apiBaseUrl = rawApiUrl.replace(/\/+$/, '');

const rawAssetsUrl =
  process.env.EXPO_PUBLIC_ASSETS_URL ||
  process.env.NEXT_PUBLIC_ASSETS_URL ||
  `${apiBaseUrl}/assets`;

const assetsBaseUrl = rawAssetsUrl.replace(/\/+$/, '');

const accessToken =
  process.env.EXPO_PUBLIC_ACCESS_TOKEN ||
  process.env.ACCESS_TOKEN ||
  'tlaoVoH-cJOVcNpAadhVFGQzHmAO3W5y';

export const APP_CONFIG = {
  companyName: 'Radical Engineering',
  tagline: 'Powering your home with trusted solar and battery solutions',
  website:
    process.env.EXPO_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://radicalengineering.com.bd',
  apiBaseUrl,
  assetsBaseUrl,
  accessToken,
  hotline1: '+880 1760195100',
  hotline2: '+880 1787224460',
  hotline1Raw: '+8801760195100',
  hotline2Raw: '+8801787224460',
  whatsappNumber: '+8801760195100',
  email: 'radicalengineeringbd@gmail.com',
  address: '1400, Hazi Hasen Ali Market, Station Road (opposite Medilab), Kishoreganj, Bangladesh',
  operatingHours: 'Saturday - Thursday: 9:00 AM - 8:00 PM',
  facebookUrl: 'https://www.facebook.com/radical.engineering.bd',
  youtubeUrl: 'https://www.youtube.com/@RadicalEngineeringBD',
  currency: '৳',
  currencyCode: 'BDT',
};
