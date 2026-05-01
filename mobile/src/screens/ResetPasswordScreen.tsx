import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Alert } from "react-native";
import { Input, Button } from "../components/ui";
import { resetPasswordApi } from "../apis/user.api";
import { useTheme } from "../contexts/ThemeContext";

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { email } = route.params;
  const { colors } = useTheme();

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!otp || newPassword.length < 6) {
      return Alert.alert(
        "Lỗi",
        "Vui lòng nhập đầy đủ OTP và mật khẩu mới (ít nhất 6 ký tự)",
      );
    }

    setLoading(true);
    try {
      const response = await resetPasswordApi({
        email,
        otp,
        password: newPassword,
        confirm_password: newPassword,
      });

      if (response.status === 200) {
        Alert.alert("Thành công", "Mật khẩu của bạn đã được cập nhật.", [
          {
            text: "Đăng nhập ngay",
            onPress: () => navigation.navigate("Login"),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        "Thất bại",
        error.response?.data?.message ||
          "Mã OTP không chính xác hoặc đã hết hạn.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>
          Xác thực OTP
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Nhập mã xác thực gửi đến {email}
        </Text>

        <Input
          label="Mã OTP"
          placeholder="Nhập 6 số"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
        />
        <Input
          label="Mật khẩu mới"
          placeholder="••••••••"
          value={newPassword}
          onChangeText={setNewPassword}
          isPassword
        />

        <Button title="Đổi mật khẩu" onPress={handleReset} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, flex: 1, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  subtitle: { marginBottom: 32 },
});
