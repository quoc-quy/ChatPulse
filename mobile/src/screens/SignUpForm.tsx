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

export function SignUpForm({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

            <Input
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
            />

            <Input
              label="Email"
              placeholder="m@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Input
              label="Confirm Password"
              placeholder="••••••••"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={styles.btnPrimary}>
              <Text style={styles.btnText}>Sign up</Text>
            </TouchableOpacity>

            <View style={styles.separatorContainer}>
              <View style={styles.line} />
              <Text style={styles.sepText}>Or register with</Text>
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
  btnPrimary: {
    backgroundColor: "#18181b",
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
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
