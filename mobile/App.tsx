import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, SafeAreaView } from "react-native";
import { LoginForm } from "./components/auth/LoginForm";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.wrapper}>
        <LoginForm />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f5", 
  },
  wrapper: {
    flex: 1,
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20, 
  },
});
