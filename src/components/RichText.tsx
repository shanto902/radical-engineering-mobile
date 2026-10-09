import React, { useState } from 'react';
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
import { ImageZoomModal } from './ImageZoomModal';

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
  | { type: 'image_grid'; images: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

interface InlineSegment {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  linkHref?: string;
}

const HTML_ENTITY_MAP: Record<string, string> = {
  deg: '°',
  plusmn: '±',
  micro: 'µ',
  Omega: 'Ω',
  omega: 'ω',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  Delta: 'Δ',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  tau: 'τ',
  phi: 'φ',
  le: '≤',
  ge: '≥',
  ne: '≠',
  times: '×',
  divide: '÷',
  sim: '~',
  asymp: '≈',
  approx: '≈',
  copy: '©',
  reg: '®',
  trade: '™',
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  bull: '•',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  permil: '‰',
  prime: '′',
  Prime: '″',
  radic: '√',
  infin: '∞',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
};

/**
 * Decode common HTML entities (including &deg;, &plusmn;, numeric &#176;, &#x00b0;, and double-escaped &amp;deg;)
 */
export function decodeEntities(str: string): string {
  if (!str) return '';
  let result = str;
  for (let i = 0; i < 2; i++) {
    // Decimal numeric entities (&#176; -> °)
    result = result.replace(/&#(\d+);/g, (match, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return match;
      }
    });

    // Hex numeric entities (&#x00b0; -> °)
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return match;
      }
    });

    // Named entities (&deg; -> °, &plusmn; -> ±, &lt; -> <, etc.)
    result = result.replace(/&([a-zA-Z0-9]+);/g, (match, entity) => {
      const lower = entity.toLowerCase();
      return HTML_ENTITY_MAP[entity] ?? HTML_ENTITY_MAP[lower] ?? match;
    });

    // Common unclosed or semi-closed entities (e.g. -25&degC to +60&degC)
    result = result
      .replace(/&deg;?/gi, '°')
      .replace(/&plusmn;?/gi, '±')
      .replace(/&micro;?/gi, 'µ')
      .replace(/&Omega;?/g, 'Ω')
      .replace(/&omega;?/g, 'ω')
      .replace(/&times;?/gi, '×')
      .replace(/&nbsp;?/gi, ' ');
  }
  return result;
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

  // Robust regex to split by <a>, <strong>, <b>, <em>, <i> tags with optional attributes
  const tagRegex = /<(strong|b|em|i)\b[^>]*>([\s\S]*?)<\/\1>|<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(textWithBreaks)) !== null) {
    const preText = textWithBreaks.slice(lastIndex, match.index);
    if (preText) {
      const cleanPre = decodeEntities(preText.replace(/<[^>]+>/g, ''));
      if (cleanPre) segments.push({ text: cleanPre });
    }

    if (match[3] !== undefined) {
      // <a> tag match
      const href = match[3];
      const innerContent = decodeEntities(match[4].replace(/<[^>]+>/g, ''));
      segments.push({
        text: innerContent || href || 'Link',
        linkHref: href,
        isBold: true,
      });
    } else if (match[1]) {
      // <strong>, <b>, <em>, <i> tag match
      const tagName = match[1].toLowerCase();
      const innerContent = decodeEntities(match[2].replace(/<[^>]+>/g, ''));
      if (tagName === 'strong' || tagName === 'b') {
        segments.push({ text: innerContent, isBold: true });
      } else if (tagName === 'em' || tagName === 'i') {
        segments.push({ text: innerContent, isItalic: true });
      }
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

  // Normalize <div> to <p> so Directus dir="auto" divs are parsed cleanly
  const normalizedHtml = html
    .replace(/<div(?:\s+[^>]*)?>/gi, '<p>')
    .replace(/<\/div>/gi, '</p>');

  // Split by top-level block tags
  const blockRegex = /<(table|h[1-6]|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>|<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let hasParsedBlocks = false;

  while ((match = blockRegex.exec(normalizedHtml)) !== null) {
    hasParsedBlocks = true;
    const tag = match[1] ? match[1].toLowerCase() : 'img';
    const content = match[2] || '';
    const standaloneImgSrc = match[3];

    if (tag === 'table') {
      const imgMatches = Array.from(content.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi));
      if (imgMatches.length > 0) {
        const imageUrls = imgMatches.map(m => m[1]);
        blocks.push({ type: 'image_grid', images: imageUrls });
      } else {
        const rowMatches = Array.from(content.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
        let headers: string[] = [];
        const rows: string[][] = [];
        rowMatches.forEach((rm, idx) => {
          const isThRow = /<th[^>]*>/i.test(rm[1]);
          const cellMatches = Array.from(rm[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi));
          const cells = cellMatches.map(c => decodeEntities(c[1].replace(/<[^>]+>/g, '')).trim());
          if (cells.length === 0) return;
          if (idx === 0 && (isThRow || /<thead>/i.test(content) || /^(specification|parameter|attribute|feature|name|item)s?$/i.test(cells[0]))) {
            headers = cells;
          } else {
            rows.push(cells);
          }
        });
        if (headers.length > 0 || rows.length > 0) {
          blocks.push({ type: 'table', headers, rows });
        }
      }
    } else if (tag === 'img' || standaloneImgSrc) {
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
    const lines = normalizedHtml.split('\n').map(l => l.trim()).filter(l => l.length > 0);
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
  const { colors, isDark } = useTheme();
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [zoomIndex, setZoomIndex] = useState(0);

  if (!html || html.trim() === '') {
    return null;
  }

  const blocks = parseHtmlToBlocks(html);

  const handleOpenZoom = (images: string[], index = 0) => {
    setZoomImages(images);
    setZoomIndex(index);
    setZoomVisible(true);
  };

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
              <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.text }, baseTextStyle]}>
                {block.text}
              </Text>
            </View>
          );
        }

        if (block.type === 'image') {
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.imageWrapper, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
              onPress={() => handleOpenZoom([block.src])}
              activeOpacity={0.9}
            >
              <Image source={{ uri: block.src }} style={styles.embeddedImage} resizeMode="contain" />
            </TouchableOpacity>
          );
        }

        if (block.type === 'image_grid') {
          return (
            <View key={idx} style={styles.gridContainer}>
              {block.images.map((imgUri, imgIdx) => (
                <TouchableOpacity
                  key={imgIdx}
                  style={[styles.gridItem, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                  onPress={() => handleOpenZoom(block.images, imgIdx)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: imgUri }} style={styles.gridImage} resizeMode="cover" />
                  <View style={styles.gridZoomIcon}>
                    <Ionicons name="expand" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
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
                      style={[styles.linkText, { color: colors.primary }]}
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

        if (block.type === 'table') {
          return (
            <View
              key={idx}
              style={[
                styles.tableContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {block.headers.length > 0 && (
                <View
                  style={[
                    styles.tableHeaderRow,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  {block.headers.map((h, hIdx) => (
                    <Text
                      key={`h-${hIdx}`}
                      style={[
                        styles.tableHeaderCell,
                        { color: colors.text },
                        hIdx === 0 && { width: '42%' },
                        hIdx > 0 && { flex: 1 },
                      ]}
                      numberOfLines={2}
                    >
                      {h}
                    </Text>
                  ))}
                </View>
              )}

              {block.rows.map((row, rIdx) => {
                const isEven = rIdx % 2 === 0;
                const isLast = rIdx === block.rows.length - 1;
                return (
                  <View
                    key={`r-${rIdx}`}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: isEven
                          ? colors.surface
                          : (isDark ? '#162032' : '#F8FAFC'),
                        borderBottomColor: colors.border,
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    {row.map((cell, cIdx) => (
                      <Text
                        key={`c-${rIdx}-${cIdx}`}
                        style={[
                          styles.tableCell,
                          cIdx === 0
                            ? [styles.tableKeyCell, { color: colors.text, width: '42%' }]
                            : [styles.tableValCell, { color: colors.textSecondary, flex: 1 }],
                        ]}
                      >
                        {cell}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        }

        return null;
      })}

      <ImageZoomModal
        visible={zoomVisible}
        images={zoomImages}
        initialIndex={zoomIndex}
        onClose={() => setZoomVisible(false)}
      />
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
  gridZoomIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginVertical: SPACING.sm + 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableCell: {
    fontSize: 13,
    lineHeight: 18,
  },
  tableKeyCell: {
    fontWeight: '700',
    paddingRight: 8,
  },
  tableValCell: {
    fontWeight: '400',
  },
});

