import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'outline' | 'ghost';
}

const Button = ({ title, onPress, loading, style, variant = 'primary' }: ButtonProps) => {
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity 
      style={[styles.btn, styles[variant], style]} 
      onPress={onPress} 
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? "#6366f1" : "white"} />
      ) : (
        <Text style={[styles.text, isOutline ? { color: "#6366f1" } : { color: "white" }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#6366f1' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e2e8f0' },
  ghost: { backgroundColor: '#f1f5f9' },
  text: { fontWeight: '600', fontSize: 15 },
});

export default Button;