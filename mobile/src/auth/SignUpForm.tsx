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
} from "react-native";
import { Input } from "../components/ui/Input";
import { SocialButtons } from "../components/auth/SocialButtons";
import {
  validateEmail,
  validatePassword,
  validateFullName,
  validateUserName,
  validatePhone,
} from "../utils/validations";
import { registerApi } from "../apis/user.api";

export function SignUpForm({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("2000-01-01");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const handleSignUp = async () => {
    const nameError = validateFullName(fullName);
    const userError = validateUserName(userName);
    const phoneError = validatePhone(phone);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    let confirmError = null;

    if (password !== confirmPassword) {
      confirmError = "Mật khẩu xác nhận không khớp";
    }

    if (
      nameError ||
      userError ||
      phoneError ||
      emailError ||
      passwordError ||
      confirmError
    ) {
      setErrors({
        fullName: nameError,
        userName: userError,
        phone: phoneError,
        email: emailError,
        password: passwordError,
        confirmPassword: confirmError,
      });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const response = await registerApi({
        fullName: fullName.trim(),
        userName: userName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        date_of_birth: dob,
        password: password,
        confirm_password: confirmPassword,
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert("Thành công", "Đăng ký tài khoản thành công!", [
          {
            text: "Đăng nhập ngay",
            onPress: () => navigation.navigate("Login"),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        "Đăng ký thất bại",
        error.response?.data?.message || "Đã có lỗi xảy ra.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>
                Join the ChatPulse community today
              </Text>
            </View>

            {/* Các trường dữ liệu với Spacing hợp lý */}
            <View style={styles.formGroup}>
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={fullName}
                error={errors.fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) setErrors({ ...errors, fullName: null });
                }}
              />
              <Input
                label="User Name"
                placeholder="johndoe123"
                value={userName}
                error={errors.userName}
                onChangeText={(text) => {
                  setUserName(text);
                  if (errors.userName) setErrors({ ...errors, userName: null });
                }}
                autoCapitalize="none"
              />
              <Input
                label="Phone Number"
                placeholder="0969831..."
                value={phone}
                error={errors.phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errors.phone) setErrors({ ...errors, phone: null });
                }}
                keyboardType="phone-pad"
              />
              <Input
                label="Email"
                placeholder="m@example.com"
                value={email}
                error={errors.email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Password"
                placeholder="••••••••"
                isPassword={true}
                value={password}
                error={errors.password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
              />
              <Input
                label="Confirm Password"
                placeholder="••••••••"
                isPassword={true}
                value={confirmPassword}
                error={errors.confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword)
                    setErrors({ ...errors, confirmPassword: null });
                }}
              />
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Sign up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.separatorContainer}>
              <View style={styles.line} />
              <Text style={styles.sepText}>OR REGISTER WITH</Text>
              <View style={styles.line} />
            </View>

            <SocialButtons />

            <View style={styles.footer}>
              <Text style={styles.footerGray}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.boldLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Màu nền nhạt hơn giúp Card nổi bật
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  card: {
    padding: 24,
    borderRadius: 20, // Bo góc mềm mại hơn theo hình mẫu
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 24, // Giảm khoảng cách header để gọn hơn
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#A855F7", // Màu chữ tiêu đề đậm hơn
    marginBottom: 8,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 20, // Gom nhóm các input lại
  },
  btnPrimary: {
    backgroundColor: "#4F46E5", // Giữ màu chủ đạo của bạn
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  sepText: {
    marginHorizontal: 12,
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerGray: {
    color: "#64748B",
  },
  boldLink: {
    fontWeight: "bold",
    color: "#4F46E5",
  },
});
