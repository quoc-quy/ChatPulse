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
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Input } from "../components/ui/Input"; //
import { SocialButtons } from "../components/auth/SocialButtons"; //
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Cấu hình URL API (đảm bảo đúng IP máy tính của bạn)
const API_URL = "http://192.168.1.17:4000";

export function LoginForm({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log("Nút Login đã được bấm!"); // 1. Kiểm tra xem nút có ăn không
    console.log("Email:", email, "Pass:", password); // 2. Kiểm tra xem đã nhận text chưa

    // Validate
    if (!email || !password) {
      Alert.alert("Lỗi nhập liệu", "Email và mật khẩu không được để trống");
      return;
    }

    setLoading(true);
    try {
      console.log(`Đang kết nối tới: ${API_URL}/users/login`); // 3. Kiểm tra IP

      const response = await axios.post(`${API_URL}/users/login`, {
        email: email.trim(),
        password: password,
      });

      console.log("Phản hồi từ server:", response.data);

      // Kiểm tra cấu trúc trả về chính xác từ Backend của bạn
      // Backend ChatPulse thường trả về: { result: { access_token: "..." } }
      const result = response.data.result || response.data;
      const token = result.access_token || result.token;

      if (token) {
        await AsyncStorage.setItem("access_token", token);
        await AsyncStorage.setItem("refresh_token", result.refresh_token || "");

        // Chuyển màn hình
        Alert.alert("Thành công", "Đăng nhập thành công!", [
          { text: "OK", onPress: () => navigation.replace("Main") },
        ]);
      } else {
        Alert.alert("Lỗi Token", "Server không trả về access_token.");
      }
    } catch (error: any) {
      console.error("Lỗi chi tiết:", error);

      // Hiển thị lỗi chi tiết để biết sai ở đâu
      const message =
        error.response?.data?.message || error.message || "Lỗi không xác định";

      if (error.message.includes("Network Error")) {
        Alert.alert(
          "Lỗi Mạng",
          "Không thể kết nối Server. Vui lòng kiểm tra:\n1. Backend đã chạy chưa?\n2. IP trong code có đúng IP máy tính không?",
        );
      } else {
        Alert.alert("Đăng nhập thất bại", message);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback>
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
                value={email} // Gán giá trị từ state
                onChangeText={(text) => setEmail(text)} // Cập nhật state khi gõ
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.passwordSection}>
                <View style={styles.rowBetween}>
                  <Text style={styles.labelSmall}>Password</Text>
                  <TouchableOpacity>
                    <Text style={styles.link}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                <Input
                  label="Password"
                  placeholder="••••••••"
                  value={password} // Gán giá trị từ state
                  onChangeText={(text) => setPassword(text)} // Cập nhật state khi gõ
                  isPassword={true}
                />
              </View>

              {/* Nút Login đã được gắn hàm xử lý */}
              <TouchableOpacity
                style={styles.btnPrimary}
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
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                  <Text style={styles.boldLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  labelSmall: { fontSize: 14, fontWeight: "500", color: "#09090b" },
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
