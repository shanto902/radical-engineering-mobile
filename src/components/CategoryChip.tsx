import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface CategoryChipProps {
  category: Category | { id: string; name: string; icon: string };
  isSelected: boolean;
  onSelect: () => void;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({ category, isSelected, onSelect }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onSelect}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? COLORS.primary : colors.surface,
          borderColor: isSelected ? COLORS.primary : colors.border,
        },
      ]}
    >
      <Ionicons
        name={category.icon as any}
        size={16}
        color={isSelected ? '#FFFFFF' : colors.textSecondary}
        style={styles.icon}
      />
      <Text
        style={[
          styles.name,
          { color: isSelected ? '#FFFFFF' : colors.text },
          isSelected && styles.selectedName,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: SPACING.sm,
  },
  icon: {
    marginRight: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectedName: {
    fontWeight: '700',
  },
});

