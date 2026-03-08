// App.tsx
import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";

import MainTabs from "./src/navigation/MainTabs";
import { LoginForm } from "./src/auth/LoginForm";
import { SignUpForm } from "./src/auth/SignUpForm";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [navKey, setNavKey] = useState("logged-in"); // 👈 KEY to force NavigationContainer reset

  const handleLogout = () => {
    setIsLoggedIn(false);
    setNavKey("logged-out"); // 👈 Changing the key forces full navigation reset
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setNavKey("logged-in"); // 👈 Reset again on login
  };

  return (
    // 👇 The "key" prop forces NavigationContainer to fully remount on logout,
    //    clearing all navigation state (stack, tabs, etc.)
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
