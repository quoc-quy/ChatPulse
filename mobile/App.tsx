// App.tsx
import React, { useState, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StyleSheet, ActivityIndicator, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
// Import ThemeProvider từ thư mục contexts
import { ThemeProvider } from './src/contexts/ThemeContext'

import MainTabs from './src/navigation/MainTabs'
import { LoginForm } from './src/auth/LoginForm'
import { SignUpForm } from './src/auth/SignUpForm'
import FriendRequestsScreen from './src/screens/FriendRequestsScreen'
import MessageScreen from './src/screens/MessageScreen'
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'
import ResetPasswordScreen from './src/screens/ResetPasswordScreen'
import SentRequestsScreen from './src/screens/SentRequestsScreen'
import ConversationDetailScreen from './src/screens/ConversationDetail'
import MembersScreen from './src/screens/MembersScreen'
import AddMemberScreen from './src/screens/AddMembersScreen'
import UserProfileScreen from './src/screens/UserProfileScreen'
import BlockedUsersScreen from './src/screens/BlockUserScreen'
import { ChatProvider } from './src/contexts/ChatContext'
import MessageSearchScreen from './src/screens/MessageSearchScreen'

const Stack = createNativeStackNavigator()

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [navKey, setNavKey] = useState('logged-in')
  const [isCheckingUser, setIsCheckingUser] = useState(true)

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token')
        if (token) {
          setIsLoggedIn(true)
        } else {
          setIsLoggedIn(false)
        }
      } catch (error) {
        console.log('Lỗi kiểm tra token:', error)
      } finally {
        setIsCheckingUser(false)
      }
    }

    checkLoginStatus()
  }, [])

  const handleLogout = () => {
    setIsLoggedIn(false)
    setNavKey('logged-out')
  }

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
    setNavKey('logged-in')
  }

  if (isCheckingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    // Bọc ThemeProvider ra ngoài cùng để mọi màn hình đều có thể gọi useTheme()
    <ThemeProvider>
      <ChatProvider>
        <NavigationContainer key={navKey}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isLoggedIn ? (
              <>
                <Stack.Screen name="Main">
                  {(props) => <MainTabs {...props} onLogout={handleLogout} />}
                </Stack.Screen>

                <Stack.Screen
                  name="FriendRequests"
                  component={FriendRequestsScreen}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="SentRequest"
                  component={SentRequestsScreen}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="ConversationDetail"
                  component={ConversationDetailScreen}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="UserProfile"
                  component={UserProfileScreen}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="MembersScreen"
                  component={MembersScreen}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="AddMemberScreen"
                  component={AddMemberScreen}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />

                <Stack.Screen
                  name="MessageScreen"
                  component={MessageScreen}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="MessageSearchScreen"
                  component={MessageSearchScreen}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen
                  name="BlockedUsers"
                  component={BlockedUsersScreen}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right'
                  }}
                />
              </>
            ) : (
              <>
                <Stack.Screen name="Login">
                  {(props) => <LoginForm {...props} onLoginSuccess={handleLoginSuccess} />}
                </Stack.Screen>
                <Stack.Screen name="SignUp" component={SignUpForm} />
                <Stack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ChatProvider>
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  }
})
