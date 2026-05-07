import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "outline" | "ghost";
}

const Button = ({
  title,
  onPress,
  loading,
  style,
  variant = "primary",
}: ButtonProps) => {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    switch (variant) {
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: colors.border,
        };
      case "ghost":
        return { backgroundColor: colors.muted };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "outline":
        return colors.primary;
      case "ghost":
        return colors.foreground;
      default:
        return colors.primaryForeground;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, getButtonStyle(), style]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontWeight: "600", fontSize: 15 },
});

export default Button;
