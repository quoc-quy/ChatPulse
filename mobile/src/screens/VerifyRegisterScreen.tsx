import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Alert } from "react-native";
import { Input, Button } from "../components/ui";
// Giả định bạn có hàm verifyRegisterApi trong user.api giống như resetPasswordApi
import { verifyRegisterApi } from "../apis/user.api";
import { useTheme } from "../contexts/ThemeContext";

export default function VerifyRegisterScreen({ route, navigation }: any) {
  const { email } = route.params;
  const { colors } = useTheme();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp.trim()) {
      return Alert.alert("Lỗi", "Vui lòng nhập mã OTP");
    }

    setLoading(true);
    try {
      // Gọi API xác thực OTP dành riêng cho Register
      const response = await verifyRegisterApi({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (response.status === 200 || response.data) {
        Alert.alert("Thành công", "Tài khoản của bạn đã được kích hoạt.", [
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
          Xác thực tài khoản
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Mã OTP kích hoạt tài khoản đã được gửi đến {email}
        </Text>

        <Input
          label="Mã OTP"
          placeholder="Nhập 6 số"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
        />

        <Button title="Xác nhận" onPress={handleVerify} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, justifyContent: "center", flex: 1, gap: 16 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: { fontSize: 15, marginBottom: 24, textAlign: "center" },
});
