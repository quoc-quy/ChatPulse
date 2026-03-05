import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import này để check token
import { ActivityIndicator, View } from "react-native";

// Import các màn hình
// Lưu ý: Đảm bảo ChatScreen export default, nếu không phải dùng { ChatScreen }
import ChatScreen from "./src/screens/ChatScreen";
import { LoginForm } from "./src/screens/LoginForm";
import { SignUpForm } from "./src/screens/SignUpForm";
import FriendsScreen from "./src/screens/FriendsScreen"; //

const Stack = createNativeStackNavigator();

export default function App() {
  // State để xác định màn hình đầu tiên (Login hay Main)
  const [initialRoute, setInitialRoute] = useState("Login");
  const [isLoading, setIsLoading] = useState(true);

  // Logic kiểm tra đăng nhập tự động
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // Kiểm tra xem trong máy có Token chưa
        const token = await AsyncStorage.getItem("access_token");
        if (token) {
          console.log("Token found, auto-login to Main");
          setInitialRoute("Main"); // Nếu có token, set màn hình đầu là Main (FriendsScreen)
        }
      } catch (error) {
        console.error("Lỗi kiểm tra đăng nhập:", error);
      } finally {
        setIsLoading(false); // Kết thúc quá trình kiểm tra
      }
    };

    checkLoginStatus();
  }, []);

  // Hiển thị màn hình chờ khi đang check token
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f4f4f5",
        }}
      >
        <ActivityIndicator size="large" color="#18181b" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName={initialRoute} // Sử dụng state đã check
          screenOptions={{
            headerShown: false,
            contentStyle: { flex: 1, backgroundColor: "#f4f4f5" },
            animation: "slide_from_right", // Thêm hiệu ứng chuyển cảnh cho mượt
          }}
        >
          <Stack.Screen name="Login" component={LoginForm} />
          <Stack.Screen name="SignUp" component={SignUpForm} />

          {/* Main map với FriendsScreen là đúng logic bạn đang làm */}
          <Stack.Screen name="Friends" component={FriendsScreen} />

          <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
