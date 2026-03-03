import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LoginForm } from "./src/screens/LoginForm";
import { SignUpForm } from "./src/screens/SignUpForm";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            contentStyle: { flex: 1, backgroundColor: "#f4f4f5" },
          }}
        >
          <Stack.Screen name="Login" component={LoginForm} />
          <Stack.Screen name="SignUp" component={SignUpForm} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
