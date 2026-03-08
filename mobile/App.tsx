// App.tsx
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MainTabs from "./src/navigation/MainTabs";
import { LoginForm } from "./src/auth/LoginForm";
import { SignUpForm } from "./src/auth/SignUpForm";

const Stack = createNativeStackNavigator();

export default function App() {
  // 1. Mặc định là false (Chưa đăng nhập)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [navKey, setNavKey] = useState("logged-in");
  const [isCheckingUser, setIsCheckingUser] = useState(true); // Thêm state loading lúc mới mở app

  // 2. Kiểm tra xem trong máy có Token không khi vừa mở app
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // Tạm thời XÓA SẠCH data cũ đi để ép bạn đăng nhập lại lấy Token mới
        // (Sau khi đăng nhập thành công 1 lần, bạn có thể xóa dòng AsyncStorage.clear() này đi)
        await AsyncStorage.clear(); 
        
        const token = await AsyncStorage.getItem("access_token");
        if (token) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.log("Lỗi kiểm tra token:", error);
      } finally {
        setIsCheckingUser(false); // Kiểm tra xong thì tắt loading
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setNavKey("logged-out");
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setNavKey("logged-in");
  };

  // 3. Màn hình chờ trong lúc kiểm tra Token
  if (isCheckingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer key={navKey}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main">
            {(props) => <MainTabs {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginForm {...props} onLoginSuccess={handleLoginSuccess} />
              )}
            </Stack.Screen>
            <Stack.Screen name="SignUp" component={SignUpForm} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
});