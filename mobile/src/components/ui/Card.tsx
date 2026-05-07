import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
});

export default Card;
