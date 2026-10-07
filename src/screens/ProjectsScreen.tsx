import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { Project } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface ProjectsScreenProps {
  navigation: any;
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    apiService.getProjects().then(p => setProjects(p));
  }, []);

  const handleConsultProject = (project: Project) => {
    const text = encodeURIComponent(
      `Hello Radical Engineering! I saw your project "${project.title}" (${project.capacity}) in ${project.location}. I want to consult for a similar installation.`
    );
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${text}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Engineering Projects"
        subtitle="Field Installations"
        onOpenCart={() => navigation.navigate('Cart')}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerNotice}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Verified Field Projects</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Real installations deployed and maintained by Radical Engineering across Bangladesh.
          </Text>
        </View>

        {projects.map((project) => (
          <View
            key={project.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Image source={{ uri: project.image }} style={styles.image} resizeMode="cover" />

            <View style={styles.body}>
              <View style={styles.metaRow}>
                <View style={styles.capacityBadge}>
                  <Text style={styles.capacityText}>{project.capacity}</Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>{project.date}</Text>
              </View>

              <Text style={[styles.title, { color: colors.text }]}>{project.title}</Text>

              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={COLORS.primary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                  {project.location}
                </Text>
                <Text style={{ color: colors.textMuted }}>•</Text>
                <Text style={[styles.categoryText, { color: COLORS.accent }]}>{project.category}</Text>
              </View>

              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {project.description}
              </Text>

              {/* Highlights */}
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

              <TouchableOpacity
                style={styles.consultBtn}
                onPress={() => handleConsultProject(project)}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                <Text style={styles.consultBtnText}>Inquire for Similar Project</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

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
    marginBottom: SPACING.sm,
  },
  locationText: {
    fontSize: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  highlightsBox: {
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  highlightsHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  consultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    gap: 6,
  },
  consultBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

