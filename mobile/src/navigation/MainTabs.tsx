import React, { useState, useRef, useMemo, useEffect } from 'react' // 👈 Thêm useEffect vào đây
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView
} from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useChatContext } from '../contexts/ChatContext'
import { MessageCircle, Users, User, Sparkles, X, ArrowUpCircle, Phone } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Import API
import { askChatPulseAIApi } from '../apis/chat.api'

// Import các màn hình thực tế của bạn
import ChatScreen from '../screens/ChatScreen'
import FriendsScreen from '../screens/FriendsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { useTranslation } from '../hooks/useTranslation'
import { useTheme } from '../contexts/ThemeContext'

// 👇 1. Import bộ màu gốc từ colors.ts
import { lightColors as globalLight, darkColors as globalDark } from "../theme/colors";

// 👇 2. Mở rộng (extend) các màu bị thiếu và ép sang màu Tím
const localLightColors = {
  ...globalLight,
  primary: 'hsl(262, 83%, 60%)',
  ring: 'hsl(262, 80%, 55%)',
  badge: 'hsl(0, 84%, 60%)',
  textLight: 'hsl(240, 10%, 45%)',
  surface: globalLight.card,
  text: globalLight.foreground,
  success: 'hsl(142, 76%, 36%)',
  surfaceSoft: 'hsl(240, 15%, 95%)',
};

const localDarkColors = {
  ...globalDark,
  primary: 'hsl(262, 85%, 65%)',
  ring: 'hsl(262, 80%, 65%)',
  badge: 'hsl(0, 62%, 50%)',
  textLight: 'hsl(240, 10%, 65%)',
  surface: globalDark.card,
  text: globalDark.foreground,
  success: 'hsl(142, 69%, 58%)',
  surfaceSoft: 'hsl(240, 20%, 14%)',
};

const Tab = createBottomTabNavigator()

interface MainTabsProps {
  onLogout: () => void
  navigation: any
  route: any
}

const DummyScreen = () => <View style={{ flex: 1, backgroundColor: '#111111' }} />

// Màn hình Coming Soon cho Tab Gọi điện
const ComingSoonScreen = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  const COLORS = useMemo(
    () => (isDarkMode ? localDarkColors : localLightColors),
    [isDarkMode]
  );

  // Khởi tạo các giá trị Animation
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hiệu ứng 1: Tỏa sáng (Pulse) liên tục ra xung quanh
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      })
    ).start();

    // Hiệu ứng 2: Icon lơ lửng (Bouncing/Floating) lên xuống
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Map giá trị anim sang độ lớn (scale) và độ mờ (opacity)
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2], // Tỏa to gấp đôi
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0], // Mờ dần khi tỏa ra
  });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>

      {/* VÙNG CHỨA ICON & ANIMATION */}
      <View style={{ position: 'relative', justifyContent: 'center', alignItems: 'center', height: 160 }}>

        {/* Lớp màu nền tỏa ra (Pulse Effect) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: COLORS.primary,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          }}
        />

        {/* Lớp Icon trôi lơ lửng (Float Effect) */}
        <Animated.View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: COLORS.surfaceSoft,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            transform: [{ translateY: floatAnim }],
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Phone size={44} color={COLORS.primary} />
        </Animated.View>
      </View>

      <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '800', marginBottom: 10, marginTop: 10 }}>
        Tính năng đang phát triển
      </Text>

      <Text style={{ color: COLORS.textLight, fontSize: 15, textAlign: 'center', paddingHorizontal: 40, lineHeight: 24 }}>
        {t.featureComingSoon || "Tính năng gọi điện đang được đội ngũ ChatPulse khẩn trương phát triển và sẽ sớm ra mắt!"}
      </Text>

    </View>
  );
};

const MainTabs = ({ onLogout, navigation }: MainTabsProps) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { isDarkMode } = useTheme()

  // Gán COLORS bằng bộ màu local đã được ép sang Tím
  const COLORS = useMemo(
    () => (isDarkMode ? localDarkColors : localLightColors),
    [isDarkMode]
  );

  const [isAiVisible, setIsAiVisible] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [aiMessages, setAiMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [isAiTyping, setIsAiTyping] = useState(false)
  const { totalUnreadCount } = useChatContext()

  const flatListRef = useRef<FlatList>(null)
  const tabNavRef = useRef<any>(null)

  const openAiPulse = () => {
    setIsAiVisible(true)
    setIsConnecting(true)

    if (aiMessages.length === 0) {
      setTimeout(() => {
        setIsConnecting(false)
        setAiMessages([
          {
            id: Date.now().toString(),
            role: 'ai',
            text: 'Xin chào. Tôi là AI Pulse. Không gian tĩnh lặng này là dành cho bạn. Bạn cần tôi giúp gì?'
          }
        ])
      }, 2000)
    } else {
      setIsConnecting(false)
    }
  }

  const handleSendAi = async () => {
    if (!inputText.trim()) return

    const userQuestion = inputText.trim()
    const userMsg = { id: Date.now().toString(), role: 'user', text: userQuestion }

    const currentHistory = [...aiMessages]

    setAiMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsAiTyping(true)

    try {
      const formattedContext = currentHistory.map((msg) => ({
        sender: { userName: msg.role === 'ai' ? 'AI Pulse' : 'Tôi' },
        content: msg.text
      }))

      const response = await askChatPulseAIApi(formattedContext, userQuestion)

      if (response.data && response.data.result) {
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: response.data.result
        }
        setAiMessages((prev) => [...prev, aiResponse])
      }
    } catch (error) {
      console.log('Lỗi gọi AI Pulse:', error)
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Đường truyền thần giao cách cảm đang bị nhiễu. Vui lòng thử lại sau nhé!'
      }
      setAiMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsAiTyping(false)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }

  const renderAiTextWithLinks = (text: string) => {
    if (!text) return null
    const parts = text.split(/(\[[^\]]+\]\(nav:[^)]+\))/g)

    return parts.map((part, index) => {
      const match = part.match(/\[([^\]]+)\]\(nav:([^)]+)\)/)
      if (match) {
        const linkText = match[1]
        const screenName = match[2]
        return (
          <Text
            key={index}
            style={{
              color: '#C084FC',
              fontWeight: '700'
            }}
            onPress={() => {
              setIsAiVisible(false)
              if (tabNavRef.current) {
                tabNavRef.current.navigate(screenName)
              } else {
                navigation.navigate(screenName)
              }
            }}
          >
            {linkText}
            {'\u00A0'}➔
          </Text>
        )
      }
      return <Text key={index}>{part}</Text>
    })
  }

  const renderAiMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.aiMsgWrapper, isUser ? styles.aiMsgUser : styles.aiMsgBot]}>
        {!isUser && (
          <View style={styles.aiAvatarGlow}>
            <Sparkles size={14} color="#C084FC" />
          </View>
        )}
        <View style={[styles.aiBubble, isUser ? styles.aiBubbleUser : styles.aiBubbleBot]}>
          {!isUser && (
            <Text
              style={{
                color: '#C084FC',
                fontSize: 12,
                fontWeight: '900',
                marginBottom: 4,
                letterSpacing: 0.5
              }}
            >
              @PulseAI
            </Text>
          )}
          <Text style={styles.aiMsgText}>
            {isUser ? item.text : renderAiTextWithLinks(item.text)}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 60 + insets.bottom : 55 + insets.bottom,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8),
            paddingTop: 5,
            backgroundColor: isDarkMode ? '#161618' : COLORS.surface,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            elevation: 0
          }
        }}
      >
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.tabItemContainer}>
                <View>
                  <MessageCircle size={24} color={focused ? COLORS.primary : COLORS.textLight} />
                  {totalUnreadCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabLabel, { color: focused ? COLORS.primary : COLORS.textLight }]}>
                  {t.tabChats}
                </Text>
              </View>
            )
          }}
        />

        <Tab.Screen
          name="Contacts"
          component={FriendsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.tabItemContainer}>
                <Users size={24} color={focused ? COLORS.primary : COLORS.textLight} />
                <Text style={[styles.tabLabel, { color: focused ? COLORS.primary : COLORS.textLight }]}>
                  {t.tabContacts}
                </Text>
              </View>
            )
          }}
        />

        <Tab.Screen
          name="AIPulse"
          component={DummyScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.tabItemContainer}>
                <View style={styles.aiIconCircle}>
                  <Sparkles size={24} color={focused ? COLORS.primary : "#D1D5DB"} />
                </View>
                <Text style={[styles.tabLabel, { color: focused ? COLORS.primary : COLORS.textLight }]}>
                  {t.tabAiPulse}
                </Text>
              </View>
            )
          }}
          listeners={({ navigation: tabNavigation }) => ({
            tabPress: (e) => {
              e.preventDefault()
              tabNavRef.current = tabNavigation
              openAiPulse()
            }
          })}
        />

        <Tab.Screen
          name="Calls"
          component={ComingSoonScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.tabItemContainer}>
                <Phone size={24} color={focused ? COLORS.primary : COLORS.textLight} />
                <Text style={[styles.tabLabel, { color: focused ? COLORS.primary : COLORS.textLight }]}>
                  {t.tabCalls}
                </Text>
              </View>
            )
          }}
        />

        <Tab.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.tabItemContainer}>
                <User size={24} color={focused ? COLORS.primary : COLORS.textLight} />
                <Text style={[styles.tabLabel, { color: focused ? COLORS.primary : COLORS.textLight }]}>
                  {t.tabProfile}
                </Text>
              </View>
            )
          }}
        >
          {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>

      <Modal visible={isAiVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <LinearGradient colors={['#1A1A1D', '#000000']} style={styles.modalGradient}>
              <View style={styles.modalHeader}>
                <View style={{ width: 30 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Sparkles size={20} color="#C084FC" style={{ marginRight: 6 }} />
                  <Text style={styles.modalTitle}>AI Pulse</Text>
                </View>
                <TouchableOpacity onPress={() => setIsAiVisible(false)} style={styles.closeBtn}>
                  <X size={26} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {isConnecting ? (
                <View style={styles.connectingContainer}>
                  <ActivityIndicator size="large" color="#C084FC" />
                  <Text style={styles.connectingText}>Đang kết nối thần giao cách cảm...</Text>
                </View>
              ) : (
                <>
                  <FlatList
                    ref={flatListRef}
                    data={aiMessages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderAiMessage}
                    contentContainerStyle={styles.chatList}
                    showsVerticalScrollIndicator={false}
                  />

                  {isAiTyping && (
                    <View style={styles.typingContainer}>
                      <ActivityIndicator size="small" color="#C084FC" />
                      <Text style={styles.typingText}>AI Pulse đang suy nghĩ...</Text>
                    </View>
                  )}

                  <View style={styles.inputArea}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingHorizontal: 10,
                        alignItems: 'center'
                      }}
                      style={{
                        marginBottom: 8,
                        maxHeight: 45
                      }}
                    >
                      {[
                        'Gần đây tôi trò chuyện với ai?',
                        'Tóm tắt chủ đề các tin nhắn gần đây',
                        'Tôi có bao nhiêu người bạn?'
                      ].map((prompt, index) => (
                        <TouchableOpacity
                          key={index}
                          style={{
                            flexShrink: 0,
                            backgroundColor: 'rgba(192, 132, 252, 0.15)',
                            paddingHorizontal: 14,
                            paddingVertical: 6,
                            borderRadius: 16,
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: 'rgba(192, 132, 252, 0.3)'
                          }}
                          onPress={() => setInputText(prompt)}
                        >
                          <Text style={{ color: '#E5E7EB', fontSize: 13 }}>{prompt}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Hỏi AI bất cứ điều gì..."
                        placeholderTextColor="#6B7280"
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={handleSendAi}
                      />
                      <TouchableOpacity
                        style={styles.sendBtn}
                        onPress={handleSendAi}
                        disabled={isAiTyping || !inputText.trim()}
                      >
                        <ArrowUpCircle size={32} color={inputText.trim() ? '#C084FC' : '#4B5563'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </LinearGradient>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    width: 70 // 👈 Đổi từ flex: 1 thành width: 70 để đảm bảo đủ chỗ cho chữ "Contacts"
  },
  tabLabel: {
    fontSize: 10, // 👈 Giảm font size xuống một xíu (từ 11 xuống 10) để chữ không bị tràn
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center', // 👈 Đảm bảo chữ luôn canh giữa
  },
  activeLine: {
    height: 3,
    width: 20,
    borderRadius: 2,
    position: 'absolute',
    bottom: -10
  },
  aiIconCircle: {
    width: 65,
    height: 65,
    borderRadius: 50,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#161618'
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold'
  },
  modalOverlay: { flex: 1, backgroundColor: '#000000' },
  modalContent: { flex: 1 },
  modalGradient: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  modalTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  closeBtn: { padding: 4 },
  connectingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  connectingText: { color: '#9CA3AF', marginTop: 15, fontSize: 15, fontStyle: 'italic' },
  chatList: { paddingHorizontal: 16, paddingVertical: 20 },
  aiMsgWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  aiMsgUser: { justifyContent: 'flex-end' },
  aiMsgBot: { justifyContent: 'flex-start', paddingRight: 40 },
  aiAvatarGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  aiBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, maxWidth: '85%' },
  aiBubbleUser: {
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    borderBottomRightRadius: 4
  },
  aiBubbleBot: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 4
  },
  aiMsgText: { color: '#E5E7EB', fontSize: 15, lineHeight: 24 },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  typingText: { color: '#6B7280', fontSize: 12, marginLeft: 10 },
  inputArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: 'transparent'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 30,
    paddingLeft: 20,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  input: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    maxHeight: 100
  },
  sendBtn: { padding: 4 }
})

export default MainTabs