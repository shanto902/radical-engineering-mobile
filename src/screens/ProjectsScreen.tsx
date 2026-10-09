import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { RichText } from '../components/RichText';
import { ProjectCardSkeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { Project } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { getVideoPlatformInfo } from '../utils/video';

interface ProjectsScreenProps {
  navigation: any;
}

type SortOrder = 'latest' | 'oldest';

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');

  useEffect(() => {
    setLoading(true);
    apiService
      .getProjects()
      .then((p) => {
        setProjects(p);
        if (p.length > 0) {
          setExpandedIds({ [p[0].id]: true });
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getProjectTimestamp = (project: Project): number => {
    if (project.dateCreated) {
      const t = new Date(project.dateCreated).getTime();
      if (!isNaN(t)) return t;
    }
    if (project.date && project.date !== 'Recent') {
      const t = new Date(project.date).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const timeA = getProjectTimestamp(a);
      const timeB = getProjectTimestamp(b);

      if (sortOrder === 'latest') {
        if (timeA !== timeB) return timeB - timeA;
        return (a.sort ?? 0) - (b.sort ?? 0);
      } else {
        if (timeA !== timeB) return timeA - timeB;
        return (b.sort ?? 0) - (a.sort ?? 0);
      }
    });
  }, [projects, sortOrder]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConsultProject = (project: Project) => {
    const loc = project.location || 'Bangladesh';
    const text = encodeURIComponent(
      `Hello Radical Engineering! I saw your post "${project.title}" (${project.capacity}) in ${loc}. I want to consult for a similar installation.`
    );
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${text}`);
  };

  const handleShareProject = async (project: Project) => {
    try {
      await Share.share({
        title: project.title,
        message: `${project.title}\n\nRead more engineering projects on Radical Engineering:\n${APP_CONFIG.website}`,
      });
    } catch {
      // ignore
    }
  };

  const handleOpenVideo = (url: string) => {
    if (!url) return;
    const formattedUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;
    Linking.openURL(formattedUrl).catch((err) => {
      console.warn('Cannot open video link:', formattedUrl, err);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Field Projects & Blog"
        subtitle="Installations & Guides"
        onOpenCart={() => navigation.navigate('Cart')}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Notice */}
        <View style={styles.headerNotice}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Verified Field Projects & Engineering Posts
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Real engineering installations, video walkthroughs, and technical blog guides across Bangladesh.
          </Text>
        </View>

        {/* Sort Controls Bar */}
        <View
          style={[
            styles.sortBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sortBarLeft}>
            <Ionicons name="funnel-outline" size={13} color={colors.primary} />
            <Text style={[styles.sortBarCount, { color: colors.text }]}>
              {projects.length} Projects
            </Text>
          </View>

          <View style={styles.sortButtonsRow}>
            <TouchableOpacity
              style={[
                styles.sortPill,
                sortOrder === 'latest'
                  ? [styles.sortPillActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  : [styles.sortPillInactive, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }],
              ]}
              onPress={() => setSortOrder('latest')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-down"
                size={12}
                color={sortOrder === 'latest' ? (isDark ? '#260B00' : '#FFFFFF') : colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortPillText,
                  {
                    color: sortOrder === 'latest' ? (isDark ? '#260B00' : '#FFFFFF') : colors.textSecondary,
                    fontWeight: sortOrder === 'latest' ? '700' : '500',
                  },
                ]}
              >
                Latest First
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortPill,
                sortOrder === 'oldest'
                  ? [styles.sortPillActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  : [styles.sortPillInactive, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }],
              ]}
              onPress={() => setSortOrder('oldest')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up"
                size={12}
                color={sortOrder === 'oldest' ? (isDark ? '#260B00' : '#FFFFFF') : colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortPillText,
                  {
                    color: sortOrder === 'oldest' ? (isDark ? '#260B00' : '#FFFFFF') : colors.textSecondary,
                    fontWeight: sortOrder === 'oldest' ? '700' : '500',
                  },
                ]}
              >
                Oldest First
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Projects List or Skeleton Loading */}
        {loading ? (
          <>
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </>
        ) : (
          sortedProjects.map((project) => {
            const isExpanded = !!expandedIds[project.id];
            return (
              <View
                key={project.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Image source={{ uri: project.image }} style={styles.image} resizeMode="cover" />

                <View style={styles.body}>
                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.capacityBadge,
                        { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' },
                      ]}
                    >
                      <Text style={[styles.capacityText, { color: colors.primary }]}>{project.capacity}</Text>
                    </View>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{project.date}</Text>
                  </View>

                  <Text style={[styles.title, { color: colors.text }]}>{project.title}</Text>

                  {/* Location and Category */}
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color={colors.primary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {project.location || 'Kishoreganj, Bangladesh'}
                    </Text>
                    <Text style={{ color: colors.textMuted }}>•</Text>
                    <Text style={[styles.categoryText, { color: COLORS.accent }]}>{project.category}</Text>
                  </View>

                  {/* Short Description */}
                  {project.shortDescription ? (
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                      {project.shortDescription}
                    </Text>
                  ) : null}

                  {/* Video Links */}
                  {project.videos && project.videos.length > 0 && (
                    <View style={styles.videosContainer}>
                      {project.videos.map((vid, vIdx) => {
                        const meta = getVideoPlatformInfo(vid.link, colors.primary, isDark);
                        return (
                          <TouchableOpacity
                            key={vIdx}
                            style={[
                              styles.videoWatchBtn,
                              {
                                backgroundColor: meta.backgroundColor,
                                borderColor: meta.borderColor,
                              },
                            ]}
                            onPress={() => handleOpenVideo(vid.link)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name={meta.icon} size={18} color={meta.color} />
                            <Text style={[styles.videoWatchText, { color: meta.color }]}>
                              {meta.label}
                            </Text>
                            <Ionicons name="open-outline" size={14} color={meta.color} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Expanded Full Rich Text Content */}
                  {isExpanded && project.body && (
                    <View style={[styles.richTextSection, { borderTopColor: colors.border }]}>
                      <RichText html={project.body} />
                    </View>
                  )}

                  {/* Expand / Collapse Button */}
                  {project.body ? (
                    <TouchableOpacity
                      style={[styles.toggleBtn, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => toggleExpand(project.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.toggleBtnText, { color: colors.text }]}>
                        {isExpanded ? 'Hide Details' : 'Read Full Post & Photos'}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={15}
                        color={colors.text}
                      />
                    </TouchableOpacity>
                  ) : null}

                  {/* Highlights */}
                  {project.highlights && project.highlights.length > 0 && (
                    <View style={[styles.highlightsBox, { backgroundColor: colors.surfaceVariant }]}>
                      <Text style={[styles.highlightsHeading, { color: colors.text }]}>
                        Technical Highlights:
                      </Text>
                      {project.highlights.map((h, i) => (
                        <View key={i} style={styles.highlightItem}>
                          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                          <Text style={[styles.highlightText, { color: colors.text }]}>{h}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions Row */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.consultBtn}
                      onPress={() => handleConsultProject(project)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                      <Text style={styles.consultBtnText}>Inquire for Similar Project</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.shareBtn, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => handleShareProject(project)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="share-social-outline" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

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
  headerNotice: {
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  sortBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortBarCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  sortButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 4,
  },
  sortPillActive: {},
  sortPillInactive: {},
  sortPillText: {
    fontSize: 11,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  body: {
    padding: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  capacityText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 11,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  videosContainer: {
    marginVertical: SPACING.xs,
    gap: 8,
  },
  videoWatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  videoWatchText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  richTextSection: {
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    gap: 4,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  highlightsBox: {
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  highlightsHeading: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: 8,
  },
  consultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    gap: 8,
  },
  consultBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  shareBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
});
