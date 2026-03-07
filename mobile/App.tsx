// App.tsx
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View, StyleSheet } from "react-native";

// Import các màn hình và navigation
import MainTabs from "./src/navigation/MainTabs";
import ChatScreen from "./src/screens/ChatScreen";
import { LoginForm } from "./src/auth/LoginForm";
import { SignUpForm } from "./src/auth/SignUpForm";

const Stack = createNativeStackNavigator();

export default function App() {
  // Trạng thái đăng nhập: null (đang kiểm tra), true (đã login), false (chưa login)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Kiểm tra trạng thái đăng nhập khi khởi động App
  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      // Nếu có token thì coi như đã đăng nhập
      setIsLoggedIn(!!token);
    } catch (e) {
      console.error("Lỗi khi kiểm tra token:", e);
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Hàm xử lý khi đăng xuất thành công (sẽ được truyền xuống ProfileScreen)
  const handleLogoutAction = () => {
    setIsLoggedIn(false);
    // Khi state này chuyển sang false, React Navigation sẽ tự động gỡ bỏ MainTabs
    // và đưa người dùng về cụm Auth (Login)
  };

  // Hiển thị màn hình chờ khi đang check token
  if (isLoggedIn === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          // Cụm màn hình sau khi đăng nhập (Main Stack)
          <Stack.Group>
            <Stack.Screen name="Main">
              {(props) => <MainTabs {...props} onLogout={handleLogoutAction} />}
            </Stack.Screen>
            <Stack.Screen name="Chat" component={ChatScreen} />
          </Stack.Group>
        ) : (
          // Cụm màn hình đăng nhập/đăng ký (Auth Stack)
          <Stack.Group>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginForm
                  {...props}
                  onLoginSuccess={() => setIsLoggedIn(true)}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="SignUp" component={SignUpForm} />
          </Stack.Group>
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
