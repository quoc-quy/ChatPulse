//
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export const Input = ({ label, error, isPassword, ...props }: InputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputContainer}>
        <TextInput
          {...props} // Đẩy props lên đầu để các thuộc tính định danh bên dưới ghi đè nếu cần
          style={[
            styles.input,
            error ? styles.inputError : null,
            isPassword ? { paddingRight: 40 } : null,
          ]}
          placeholderTextColor="#a1a1aa"
          // Kiểm soát chặt chẽ thuộc tính ẩn mật khẩu
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
  label: { fontSize: 14, fontWeight: "500", color: "#09090b", marginBottom: 8 },
  inputContainer: { position: "relative" },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#09090b", // Đảm bảo màu chữ hiển thị rõ
  },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4 },
  eyeIcon: { position: "absolute", right: 12, top: 10, zIndex: 1 },
});
