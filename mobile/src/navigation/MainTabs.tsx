import React, { useState, useRef } from 'react'
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
  ScrollView
} from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useChatContext } from '../contexts/ChatContext'
import { MessageCircle, Users, User, Sparkles, X, ArrowUpCircle, Phone } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
// Thêm dòng này vào phần import ở đầu file
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Import API
import { askChatPulseAIApi } from '../apis/chat.api'

// Import các màn hình thực tế của bạn
import ChatScreen from '../screens/ChatScreen'
import FriendsScreen from '../screens/FriendsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { useTranslation } from '../hooks/useTranslation'

const Tab = createBottomTabNavigator()

interface MainTabsProps {
  onLogout: () => void
  navigation: any
  route: any
}

const DummyScreen = () => <View style={{ flex: 1, backgroundColor: '#111111' }} />

const MainTabs = ({ onLogout, navigation }: MainTabsProps) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
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

  // ==========================================
  // HÀM DỊCH LINK ĐÃ ĐƯỢC LÀM ĐẸP
  // ==========================================
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
              color: '#C084FC', // Màu tím sáng
              fontWeight: '700' // Đậm vừa phải, thanh lịch hơn
              // ĐÃ XÓA gạch chân (underline) để không bị lỗi nét đứt
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
            {/* Dùng \u00A0 (Non-breaking space) để mũi tên dính chặt vào chữ cuối, không bị rớt dòng */}
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
            height: Platform.OS === 'ios' ? 85 + insets.bottom : 65 + insets.bottom,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 10),
            backgroundColor: '#161618',
            borderTopWidth: 1,
            borderTopColor: '#2A2A2A',
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
                  <MessageCircle size={24} color={focused ? '#818CF8' : '#9CA3AF'} />
                  {/* Chỉ hiển thị badge khi có tin nhắn chưa đọc */}
                  {totalUnreadCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabLabel, { color: focused ? '#818CF8' : '#9CA3AF' }]}>
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
                <Users size={24} color={focused ? '#818CF8' : '#9CA3AF'} />
                <Text style={[styles.tabLabel, { color: focused ? '#818CF8' : '#9CA3AF' }]}>
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
            tabBarIcon: () => (
              <View style={styles.tabItemContainer}>
                <View style={styles.aiIconCircle}>
                  <Sparkles size={24} color="#D1D5DB" />
                </View>
                <Text style={[styles.tabLabel, { color: '#9CA3AF', marginTop: 4 }]}>
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
          component={DummyScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.tabItemContainer}>
                <Phone size={24} color={focused ? '#818CF8' : '#9CA3AF'} />
                <Text style={[styles.tabLabel, { color: focused ? '#818CF8' : '#9CA3AF' }]}>
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
                <User size={24} color={focused ? '#818CF8' : '#9CA3AF'} />
                <Text style={[styles.tabLabel, { color: focused ? '#818CF8' : '#9CA3AF' }]}>
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
                    {/* GỢI Ý DÍNH TRÊN INPUT */}
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

                    {/* INPUT */}
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
    width: 60
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
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
    justifyContent: 'center'
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
