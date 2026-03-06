import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";

import MainTabs from "./src/navigation/MainTabs";
import ChatScreen from "./src/screens/ChatScreen";
import { LoginForm } from "./src/auth/LoginForm";
import { SignUpForm } from "./src/auth/SignUpForm";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState("Login");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");

        if (token) {
          setInitialRoute("Main");
        }
      } catch (error) {
        console.error("Lỗi kiểm tra đăng nhập:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />

        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginForm} />
          <Stack.Screen name="SignUp" component={SignUpForm} />

          {/* Sau khi login sẽ vào MainTabs */}
          <Stack.Screen name="Main" component={MainTabs} />

          {/* Chat mở riêng */}
          <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>

      </NavigationContainer>
    </SafeAreaProvider>
  );
}