import { Ionicons } from '@expo/vector-icons';

export type VideoIconName = keyof typeof Ionicons.glyphMap;

export interface VideoPlatformMeta {
  platform: string;
  label: string;
  icon: VideoIconName;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

/**
 * Inspects a video URL to detect the hosting platform (YouTube, Facebook,
 * Instagram, TikTok, LinkedIn, Vimeo, X/Twitter, etc.) and returns appropriate
 * UI metadata (label, icon, branded colors).
 *
 * If the platform is not a common one, it falls back to label "Watch Video".
 */
export function getVideoPlatformInfo(
  rawUrl?: string,
  primaryColor: string = '#C2410C',
  isDark: boolean = false
): VideoPlatformMeta {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      platform: '',
      label: 'Watch Video',
      icon: 'play-circle',
      color: primaryColor,
      backgroundColor: isDark ? 'rgba(252, 185, 116, 0.12)' : 'rgba(194, 65, 12, 0.08)',
      borderColor: isDark ? 'rgba(252, 185, 116, 0.3)' : 'rgba(194, 65, 12, 0.25)',
    };
  }

  const clean = rawUrl.trim().toLowerCase();

  // 1. YouTube
  if (
    clean.includes('youtube.com') ||
    clean.includes('youtu.be')
  ) {
    const red = isDark ? '#FF5555' : '#E00000';
    return {
      platform: 'YouTube',
      label: 'Watch Video on YouTube',
      icon: 'logo-youtube',
      color: red,
      backgroundColor: isDark ? 'rgba(255, 68, 68, 0.12)' : 'rgba(224, 0, 0, 0.08)',
      borderColor: isDark ? 'rgba(255, 68, 68, 0.32)' : 'rgba(224, 0, 0, 0.25)',
    };
  }

  // 2. Facebook
  if (
    clean.includes('facebook.com') ||
    clean.includes('fb.watch') ||
    clean.includes('fb.com')
  ) {
    const blue = isDark ? '#4599FF' : '#1877F2';
    return {
      platform: 'Facebook',
      label: 'Watch Video on Facebook',
      icon: 'logo-facebook',
      color: blue,
      backgroundColor: isDark ? 'rgba(69, 153, 255, 0.12)' : 'rgba(24, 119, 242, 0.08)',
      borderColor: isDark ? 'rgba(69, 153, 255, 0.32)' : 'rgba(24, 119, 242, 0.25)',
    };
  }

  // 3. Instagram
  if (
    clean.includes('instagram.com') ||
    clean.includes('instagr.am')
  ) {
    const pink = isDark ? '#FF659A' : '#E1306C';
    return {
      platform: 'Instagram',
      label: 'Watch Video on Instagram',
      icon: 'logo-instagram',
      color: pink,
      backgroundColor: isDark ? 'rgba(255, 101, 154, 0.12)' : 'rgba(225, 48, 108, 0.08)',
      borderColor: isDark ? 'rgba(255, 101, 154, 0.32)' : 'rgba(225, 48, 108, 0.25)',
    };
  }

  // 4. TikTok
  if (clean.includes('tiktok.com')) {
    const color = isDark ? '#25F4EE' : '#FE2C55';
    return {
      platform: 'TikTok',
      label: 'Watch Video on TikTok',
      icon: 'logo-tiktok',
      color,
      backgroundColor: isDark ? 'rgba(37, 244, 238, 0.12)' : 'rgba(254, 44, 85, 0.08)',
      borderColor: isDark ? 'rgba(37, 244, 238, 0.32)' : 'rgba(254, 44, 85, 0.25)',
    };
  }

  // 5. LinkedIn
  if (clean.includes('linkedin.com')) {
    const blue = isDark ? '#3894E6' : '#0A66C2';
    return {
      platform: 'LinkedIn',
      label: 'Watch Video on LinkedIn',
      icon: 'logo-linkedin',
      color: blue,
      backgroundColor: isDark ? 'rgba(56, 148, 230, 0.12)' : 'rgba(10, 102, 194, 0.08)',
      borderColor: isDark ? 'rgba(56, 148, 230, 0.32)' : 'rgba(10, 102, 194, 0.25)',
    };
  }

  // 6. Vimeo
  if (clean.includes('vimeo.com')) {
    const cyan = isDark ? '#42C6F0' : '#1AB7EA';
    return {
      platform: 'Vimeo',
      label: 'Watch Video on Vimeo',
      icon: 'logo-vimeo',
      color: cyan,
      backgroundColor: isDark ? 'rgba(66, 198, 240, 0.12)' : 'rgba(26, 183, 234, 0.08)',
      borderColor: isDark ? 'rgba(66, 198, 240, 0.32)' : 'rgba(26, 183, 234, 0.25)',
    };
  }

  // 7. X / Twitter
  if (
    clean.includes('twitter.com') ||
    clean.includes('x.com')
  ) {
    const blue = isDark ? '#4AB3F4' : '#1DA1F2';
    return {
      platform: 'X',
      label: 'Watch Video on X',
      icon: 'logo-twitter',
      color: blue,
      backgroundColor: isDark ? 'rgba(74, 179, 244, 0.12)' : 'rgba(29, 161, 242, 0.08)',
      borderColor: isDark ? 'rgba(74, 179, 244, 0.32)' : 'rgba(29, 161, 242, 0.25)',
    };
  }

  // Fallback for uncommon or direct video streams
  return {
    platform: '',
    label: 'Watch Video',
    icon: 'play-circle',
    color: primaryColor,
    backgroundColor: isDark ? 'rgba(252, 185, 116, 0.12)' : 'rgba(194, 65, 12, 0.08)',
    borderColor: isDark ? 'rgba(252, 185, 116, 0.3)' : 'rgba(194, 65, 12, 0.25)',
  };
}

