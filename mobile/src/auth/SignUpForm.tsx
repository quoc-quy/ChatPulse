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
  validateUserName,
  validatePhone,
} from "../utils/validations";
import { registerApi } from "../apis/user.api";
import { useTheme } from "../contexts/ThemeContext";

export function SignUpForm({ navigation }: any) {
  const { colors } = useTheme();

  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("2000-01-01");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const handleSignUp = async () => {
    const userError = validateUserName(userName);
    const phoneError = validatePhone(phone);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    let confirmError = null;

    if (password !== confirmPassword) {
      confirmError = "Mật khẩu xác nhận không khớp";
    }

    if (
      userError ||
      phoneError ||
      emailError ||
      passwordError ||
      confirmError
    ) {
      setErrors({
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.secondary }]}>
                Create your account
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Enter your email below to create your account
              </Text>
            </View>

            <View style={styles.formGroup}>
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
              style={[
                styles.btnPrimary,
                { backgroundColor: colors.primary },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={[styles.btnText, { color: colors.primaryForeground }]}
                >
                  Sign up
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.separatorContainer}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.sepText, { color: colors.mutedForeground }]}>
                OR REGISTER WITH
              </Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            <SocialButtons />

            <View style={styles.footer}>
              <Text
                style={[styles.footerGray, { color: colors.mutedForeground }]}
              >
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={[styles.boldLink, { color: colors.primary }]}>
                  Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: "100%",
  },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 8 },
  subtitle: { marginTop: 4, textAlign: "center" },
  formGroup: { marginBottom: 20 },
  btnPrimary: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { fontWeight: "bold", fontSize: 16 },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  line: { flex: 1, height: 1 },
  sepText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerGray: {},
  boldLink: { fontWeight: "bold" },
});
