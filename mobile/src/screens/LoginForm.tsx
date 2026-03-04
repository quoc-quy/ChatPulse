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
} from "react-native";
import { Input } from "../components/ui/Input";
import { SocialButtons } from "../components/auth/SocialButtons";

export function LoginForm({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                Login to your ChatPulse account
              </Text>
            </View>

            <Input
              label="Email"
              placeholder="m@example.com"
              value={email}
              onChangeText={setEmail}
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
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.replace("Chat")}
            >
              <Text style={styles.btnText}>Login</Text>
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
