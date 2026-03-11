import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui";
import { validateEmail } from "../utils/validations";
import { forgotPasswordApi } from "../apis/user.api";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await forgotPasswordApi(email.trim().toLowerCase());
      if (response.status === 200) {
        Alert.alert("Thành công", "Mã xác thực đã được gửi.", [
          {
            text: "Tiếp tục",
            onPress: () =>
              navigation.navigate("ResetPassword", { email: email.trim() }),
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể gửi yêu cầu.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you instructions to reset your
          password.
        </Text>

        <Input
          label="Email Address"
          placeholder="m@example.com"
          value={email}
          error={error || undefined}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Button
          title="Send Instructions"
          onPress={handleResetPassword}
          loading={loading}
          style={styles.btn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  content: { padding: 24, justifyContent: "center", flex: 1 },
  title: { fontSize: 28, fontWeight: "800", color: "#4F46E5", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#64748B", marginBottom: 32 },
  btn: { marginTop: 10, height: 50 },
});
