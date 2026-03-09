import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

const Card = ({ children, style }: { children: React.ReactNode, style?: ViewStyle }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 2 },
});
export default Card;