import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Alert } from "react-native";
import { Input, Button } from "../components/ui"; //
import { resetPasswordApi } from "../apis/user.api"; //

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { email } = route.params;
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
      // Gọi phương thức POST theo đúng cấu trúc backend của bạn
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Xác thực OTP</Text>
        <Text style={styles.subtitle}>Nhập mã xác thực gửi đến {email}</Text>

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
          isPassword //
        />

        <Button
          title="Đổi mật khẩu"
          onPress={handleReset}
          loading={loading} //
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 24, flex: 1, justifyContent: "center" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4F46E5",
    marginBottom: 8,
  },
  subtitle: { color: "#64748B", marginBottom: 32 },
});
