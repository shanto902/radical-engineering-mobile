import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  StyleProp,
  ViewStyle,
  TextStyle,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface RichTextProps {
  html?: string | null;
  style?: StyleProp<ViewStyle>;
  baseTextStyle?: StyleProp<TextStyle>;
}

type BlockType =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; segments: InlineSegment[] }
  | { type: 'bullet'; text: string }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'video'; videoId: string; url: string; title?: string }
  | { type: 'image_grid'; images: string[] };

interface InlineSegment {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  linkHref?: string;
}

/**
 * Decode common HTML entities
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&bull;/gi, '•')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');
}

/**
 * Extract YouTube ID from link
 */
function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Parse an HTML snippet with inline formatting (bold, italic, links) into inline segments
 */
function parseInline(content: string): InlineSegment[] {
  const segments: InlineSegment[] = [];

  // Replace <br> with newlines
  const textWithBreaks = content
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '');

  // Regex to split by <a>, <strong>, <b>, <em>, <i> tags
  const tagRegex = /<(a\s+[^>]*href=["']([^"']+)["'][^>]*|strong|b|em|i)>([\s\S]*?)<\/\1>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(textWithBreaks)) !== null) {
    const preText = textWithBreaks.slice(lastIndex, match.index);
    if (preText) {
      const cleanPre = decodeEntities(preText.replace(/<[^>]+>/g, ''));
      if (cleanPre) segments.push({ text: cleanPre });
    }

    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const innerContent = decodeEntities(match[3].replace(/<[^>]+>/g, ''));

    if (tagName.startsWith('a')) {
      const hrefMatch = fullTag.match(/href=["']([^"']+)["']/i);
      segments.push({
        text: innerContent || (hrefMatch ? hrefMatch[1] : 'Link'),
        linkHref: hrefMatch ? hrefMatch[1] : undefined,
        isBold: true,
      });
    } else if (tagName === 'strong' || tagName === 'b') {
      segments.push({ text: innerContent, isBold: true });
    } else if (tagName === 'em' || tagName === 'i') {
      segments.push({ text: innerContent, isItalic: true });
    }

    lastIndex = tagRegex.lastIndex;
  }

  const remaining = textWithBreaks.slice(lastIndex);
  if (remaining) {
    const cleanRemaining = decodeEntities(remaining.replace(/<[^>]+>/g, ''));
    if (cleanRemaining) segments.push({ text: cleanRemaining });
  }

  if (segments.length === 0) {
    const fallback = decodeEntities(content.replace(/<[^>]+>/g, '')).trim();
    if (fallback) segments.push({ text: fallback });
  }

  return segments;
}

/**
 * Parses raw HTML string into structured display blocks
 */
function parseHtmlToBlocks(html: string): BlockType[] {
  if (!html || html.trim() === '') return [];

  const blocks: BlockType[] = [];

  // Check if there are tables with multiple images (e.g. project gallery tables)
  const tableImgRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
  let tableMatch: RegExpExecArray | null;
  const processedTableRanges: [number, number][] = [];

  while ((tableMatch = tableImgRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[0];
    const imgMatches = Array.from(tableHtml.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi));
    if (imgMatches.length > 0) {
      const imageUrls = imgMatches.map(m => m[1]);
      blocks.push({ type: 'image_grid', images: imageUrls });
      processedTableRanges.push([tableMatch.index, tableMatch.index + tableHtml.length]);
    }
  }

  // Remove processed tables from main body
  let cleanedHtml = html;
  for (const [start, end] of processedTableRanges.reverse()) {
    cleanedHtml = cleanedHtml.slice(0, start) + cleanedHtml.slice(end);
  }

  // Split by top-level block tags
  const blockRegex = /<(h[1-6]|p|li|img|blockquote)[^>]*>([\s\S]*?)<\/\1>|<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let hasParsedBlocks = false;

  while ((match = blockRegex.exec(cleanedHtml)) !== null) {
    hasParsedBlocks = true;
    const tag = match[1] ? match[1].toLowerCase() : 'img';
    const content = match[2] || '';
    const standaloneImgSrc = match[3];

    if (tag === 'img' || standaloneImgSrc) {
      const imgSrc = standaloneImgSrc || content.match(/src=["']([^"']+)["']/i)?.[1];
      if (imgSrc) {
        blocks.push({ type: 'image', src: imgSrc });
      }
    } else if (tag.startsWith('h')) {
      const level = parseInt(tag[1], 10) || 2;
      const cleanHeading = decodeEntities(content.replace(/<[^>]+>/g, '')).trim();
      if (cleanHeading) {
        blocks.push({ type: 'heading', level, text: cleanHeading });
      }
    } else if (tag === 'li') {
      const cleanBullet = decodeEntities(content.replace(/<[^>]+>/g, '')).trim();
      if (cleanBullet) {
        blocks.push({ type: 'bullet', text: cleanBullet });
      }
    } else {
      // Paragraph or blockquote
      // Check for standalone YouTube link
      const ytId = extractYouTubeId(content);
      if (ytId) {
        const linkMatch = content.match(/href=["']([^"']+)["']/) || content.match(/https?:\/\/[^\s<"']+/);
        const ytUrl = linkMatch ? linkMatch[0] : `https://www.youtube.com/watch?v=${ytId}`;
        blocks.push({ type: 'video', videoId: ytId, url: ytUrl });
      }

      // Check for images inside paragraph
      const imgInP = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (imgInP && imgInP[1]) {
        blocks.push({ type: 'image', src: imgInP[1] });
      }

      const segments = parseInline(content);
      // Only add if there is visible text
      const totalText = segments.map(s => s.text).join('').trim();
      if (totalText && totalText !== 'Youtube Video :') {
        blocks.push({ type: 'paragraph', segments });
      }
    }

    lastIndex = blockRegex.lastIndex;
  }

  // Fallback if no HTML tags were detected (plain text)
  if (!hasParsedBlocks) {
    const lines = cleanedHtml.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lines.forEach(line => {
      const ytId = extractYouTubeId(line);
      if (ytId) {
        blocks.push({ type: 'video', videoId: ytId, url: line });
      } else if (line.startsWith('•') || line.startsWith('-')) {
        blocks.push({ type: 'bullet', text: line.replace(/^[•\-]\s*/, '') });
      } else {
        blocks.push({ type: 'paragraph', segments: [{ text: decodeEntities(line) }] });
      }
    });
  }

  return blocks;
}

export const RichText: React.FC<RichTextProps> = ({ html, style, baseTextStyle }) => {
  const { colors } = useTheme();

  if (!html || html.trim() === '') {
    return null;
  }

  const blocks = parseHtmlToBlocks(html);

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const fontSize = block.level === 1 ? 20 : block.level === 2 ? 18 : 16;
          return (
            <Text
              key={idx}
              style={[
                styles.heading,
                { fontSize, color: colors.text, marginTop: idx > 0 ? SPACING.md : 0 },
              ]}
            >
              {block.text}
            </Text>
          );
        }

        if (block.type === 'bullet') {
          return (
            <View key={idx} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: COLORS.primary }]} />
              <Text style={[styles.bulletText, { color: colors.text }, baseTextStyle]}>
                {block.text}
              </Text>
            </View>
          );
        }

        if (block.type === 'image') {
          return (
            <View key={idx} style={styles.imageWrapper}>
              <Image source={{ uri: block.src }} style={styles.embeddedImage} resizeMode="cover" />
            </View>
          );
        }

        if (block.type === 'image_grid') {
          return (
            <View key={idx} style={styles.gridContainer}>
              {block.images.map((imgUri, imgIdx) => (
                <View key={imgIdx} style={styles.gridItem}>
                  <Image source={{ uri: imgUri }} style={styles.gridImage} resizeMode="cover" />
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'video') {
          const thumbUrl = `https://img.youtube.com/vi/${block.videoId}/hqdefault.jpg`;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.videoCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
              onPress={() => Linking.openURL(block.url)}
              activeOpacity={0.85}
            >
              <View style={styles.videoThumbWrapper}>
                <Image source={{ uri: thumbUrl }} style={styles.videoThumb} resizeMode="cover" />
                <View style={styles.playButtonOverlay}>
                  <Ionicons name="play" size={26} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.videoMetaRow}>
                <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.videoTitle, { color: colors.text }]}>Watch Demonstration on YouTube</Text>
                  <Text style={[styles.videoSub, { color: colors.textSecondary }]}>Click to open official video stream</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <Text
              key={idx}
              style={[styles.paragraph, { color: colors.text }, baseTextStyle]}
            >
              {block.segments.map((seg, sIdx) => {
                if (seg.linkHref) {
                  return (
                    <Text
                      key={sIdx}
                      style={styles.linkText}
                      onPress={() => Linking.openURL(seg.linkHref!)}
                    >
                      {seg.text}
                    </Text>
                  );
                }
                return (
                  <Text
                    key={sIdx}
                    style={[
                      seg.isBold && styles.boldText,
                      seg.isItalic && styles.italicText,
                    ]}
                  >
                    {seg.text}
                  </Text>
                );
              })}
            </Text>
          );
        }

        return null;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  heading: {
    fontWeight: '800',
    marginBottom: SPACING.sm,
    lineHeight: 24,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: SPACING.sm + 2,
  },
  boldText: {
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  imageWrapper: {
    marginVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  embeddedImage: {
    width: '100%',
    height: 220,
    borderRadius: RADIUS.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: SPACING.sm,
  },
  gridItem: {
    width: '48%',
    height: 140,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  videoCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: SPACING.md,
  },
  videoThumbWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -24,
    marginLeft: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 4,
    gap: 8,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  videoSub: {
    fontSize: 11,
  },
});

