import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/colors';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'primary' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '600' },

  primary: { backgroundColor: Colors.primaryLight },
  success: { backgroundColor: Colors.secondaryLight },
  warning: { backgroundColor: Colors.warningLight },
  error: { backgroundColor: Colors.errorLight },
  neutral: { backgroundColor: Colors.border },

  text_primary: { color: Colors.primaryDark },
  text_success: { color: '#065F46' },
  text_warning: { color: '#92400E' },
  text_error: { color: '#991B1B' },
  text_neutral: { color: Colors.textSecondary },
});
