import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = ({
  label,
  error,
  isPassword,
  labelStyle,
  inputStyle,
  containerStyle,
  ...props
}: InputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.foreground }, labelStyle]}>
          {label}
        </Text>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          {...props}
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              borderColor: error ? "#ef4444" : colors.border,
              color: colors.foreground,
            },
            isPassword ? { paddingRight: 44 } : null,
            inputStyle,
            props.style,
          ]}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={isPassword ? !showPassword : props.secureTextEntry}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={{ fontSize: 18 }}>{showPassword ? "👁️" : "🙈"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: "100%" },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  inputContainer: { position: "relative" },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4 },
  eyeIcon: { position: "absolute", right: 12, top: 12, zIndex: 1 },
});
