import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import { Input } from "../components/ui/Input";
import { SocialButtons } from "../components/auth/SocialButtons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../apis/api";
import { validateEmail, validatePassword } from "../utils/validations";

export function LoginForm({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const handleLogin = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError || undefined,
        password: passwordError || undefined,
      });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // ĐÚNG ROUTE: Dựa trên auth.routes.ts, route là /auth/login
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password: password,
      });

      // Backend trả về result chứa tokens
      if (response.data.result) {
        const { access_token, refresh_token } = response.data.result;
        await AsyncStorage.setItem("access_token", access_token);
        await AsyncStorage.setItem("refresh_token", refresh_token);
        navigation.replace("Main");
      }
    } catch (error: any) {
      console.log("Lỗi chi tiết:", error.response?.data);
      Alert.alert(
        "Đăng nhập thất bại",
        error.response?.data?.message || "Email hoặc mật khẩu không chính xác.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // LƯU Ý: Hiện tại trong các file route bạn gửi (auth, users, message...)
    // CHƯA có route /forgot-password. Bạn cần kiểm tra lại Backend.
    Alert.alert("Thông báo", "Tính năng này đang được cập nhật trên Server.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback accessible={false}>
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.title}>Welcome back</Text>
                  <Text style={styles.subtitle}>
                    Login to your ChatPulse account
                  </Text>
                </View>

                <Input
                  label="Email"
                  placeholder="m@example.com"
                  value={email}
                  error={errors.email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email)
                      setErrors({ ...errors, email: undefined });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <View style={styles.passwordSection}>
                  <View style={styles.rowBetween}>
                    <View />
                    <TouchableOpacity onPress={handleForgotPassword}>
                      <Text style={styles.link}>Forgot password?</Text>
                    </TouchableOpacity>
                  </View>

                  <Input
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    error={errors.password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password)
                        setErrors({ ...errors, password: undefined });
                    }}
                    isPassword={true}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Login</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.separatorContainer}>
                  <View style={styles.line} />
                  <Text style={styles.sepText}>Or continue with</Text>
                  <View style={styles.line} />
                </View>

                <SocialButtons />

                <View style={styles.footer}>
                  <Text style={styles.footerGray}>Don't have an account? </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("SignUp")}
                  >
                    <Text style={styles.boldLink}>Sign up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f5" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    width: "100%",
  },
  header: { alignItems: "center", marginBottom: 30 },
  title: { fontSize: 24, fontWeight: "bold", color: "#09090b" },
  subtitle: { color: "#71717a", marginTop: 4 },
  passwordSection: { marginBottom: 10 },
  btnPrimary: {
    backgroundColor: "#18181b",
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  link: { fontSize: 12, textDecorationLine: "underline", color: "#09090b" },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  line: { flex: 1, height: 1, backgroundColor: "#e4e4e7" },
  sepText: {
    marginHorizontal: 10,
    color: "#71717a",
    fontSize: 12,
    textTransform: "uppercase",
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerGray: { color: "#71717a" },
  boldLink: {
    fontWeight: "bold",
    textDecorationLine: "underline",
    color: "#09090b",
  },
});
