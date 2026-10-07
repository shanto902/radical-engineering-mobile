import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { RichText } from '../components/RichText';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { ELearningArticle } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface ELearningScreenProps {
  navigation: any;
}

export const ELearningScreen: React.FC<ELearningScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [articles, setArticles] = useState<ELearningArticle[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>('art-battery-care');

  useEffect(() => {
    apiService.getELearningArticles().then(arts => setArticles(arts));
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleShare = async (article: ELearningArticle) => {
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nRead more engineering guides on the Radical Engineering App: ${APP_CONFIG.website}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="E-Learning"
        subtitle="Solar & Battery Knowledge"
        onOpenCart={() => navigation.navigate('Cart')}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introBox}>
          <Text style={[styles.introTitle, { color: colors.text }]}>Engineering Knowledge Base</Text>
          <Text style={[styles.introSub, { color: colors.textSecondary }]}>
            Expert maintenance advice, battery preservation tips, and technical standards.
          </Text>
        </View>

        {articles.map((art) => {
          const isExpanded = expandedId === art.id;
          return (
            <View
              key={art.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Image source={{ uri: art.image }} style={styles.image} resizeMode="cover" />

              <View style={styles.cardContent}>
                <View style={styles.metaRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{art.category}</Text>
                  </View>
                  <View style={styles.readTimeRow}>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.readTimeText, { color: colors.textMuted }]}>{art.readTime}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => toggleExpand(art.id)} activeOpacity={0.8}>
                  <Text style={[styles.title, { color: colors.text }]}>{art.title}</Text>
                </TouchableOpacity>

                <Text style={[styles.excerpt, { color: colors.textSecondary }]}>
                  {art.excerpt}
                </Text>

                {/* Expanded full body */}
                {isExpanded && (
                  <View style={[styles.expandedBody, { borderTopColor: colors.border }]}>
                    {art.bodyHtml ? (
                      <RichText html={art.bodyHtml} />
                    ) : (
                      art.content.map((paragraph, pIdx) => (
                        <Text
                          key={pIdx}
                          style={[styles.paragraphText, { color: colors.text }]}
                        >
                          {paragraph}
                        </Text>
                      ))
                    )}

                    {/* Official PDF Download Button if available */}
                    {art.downloadUrl && (
                      <TouchableOpacity
                        style={styles.pdfDownloadBtn}
                        onPress={() => Linking.openURL(art.downloadUrl!)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="document-text" size={18} color="#FFFFFF" />
                        <Text style={styles.pdfDownloadBtnText}>
                          Download Official PDF Document ({art.downloadFilename || 'Manual'})
                        </Text>
                        <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}

                    <View style={styles.tagsRow}>
                      {art.tags.map((tag, tIdx) => (
                        <View key={tIdx} style={[styles.tagChip, { backgroundColor: colors.surfaceVariant }]}>
                          <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={[styles.authorText, { color: colors.textMuted }]}>
                      Author: {art.author} • {art.publishedDate}
                    </Text>
                  </View>
                )}

                {/* Footer Controls */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.expandToggleBtn}
                    onPress={() => toggleExpand(art.id)}
                  >
                    <Text style={styles.expandToggleText}>
                      {isExpanded ? 'Show Less' : 'Read Full Guide'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => handleShare(art)}
                  >
                    <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  introBox: {
    marginBottom: SPACING.md,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  introSub: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
  },
  cardContent: {
    padding: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 6,
  },
  excerpt: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  expandedBody: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm + 4,
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  paragraphText: {
    fontSize: 13,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  authorText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandToggleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    padding: 4,
  },
  pdfDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.xs,
    gap: 8,
  },
  pdfDownloadBtnText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

