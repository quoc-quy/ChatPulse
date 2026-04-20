import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
// Import các API (Điều chỉnh đường dẫn cho đúng với project của bạn)
import { friendApi } from '../apis/friends.api'
import { getConversations } from '../apis/chat.api'
import { forwardMessage } from '../apis/chat.api'

// Định nghĩa kiểu dữ liệu
interface TargetItem {
  _id: string
  name: string
  avatar?: string
  targetType: 'user' | 'group'
}

export default function ForwardMessageScreen() {
  const navigation = useNavigation()
  const route = useRoute<any>()
  const messageId = route.params?.messageId

  const [data, setData] = useState<TargetItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTargets, setSelectedTargets] = useState<TargetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Gọi song song API lấy bạn bè và danh sách đoạn chat (để lọc ra nhóm)
      const [friendsRes, convsRes] = await Promise.all([friendApi.getFriends(), getConversations()])

      const friendsData = friendsRes.data?.result || friendsRes.data || []
      const convsData = convsRes.data?.result || convsRes.data || []

      // Format bạn bè
      const formattedFriends: TargetItem[] = friendsData.map((f: any) => ({
        _id: f._id,
        name: f.userName || f.fullName,
        avatar: f.avatar,
        targetType: 'user'
      }))

      // Format nhóm
      const formattedGroups: TargetItem[] = convsData
        .filter((c: any) => c.type === 'group')
        .map((g: any) => ({
          _id: g._id,
          name: g.name,
          avatar: g.avatar,
          targetType: 'group'
        }))

      setData([...formattedGroups, ...formattedFriends])
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  // Memoize danh sách hiển thị dựa trên search query
  const displayData = useMemo(() => {
    if (!searchQuery) return data
    const lowerQuery = searchQuery.toLowerCase()
    return data.filter((item) => item.name?.toLowerCase().includes(lowerQuery))
  }, [data, searchQuery])

  const toggleSelect = (item: TargetItem) => {
    setSelectedTargets((prev) => {
      const isSelected = prev.some((t) => t._id === item._id)
      if (isSelected) {
        return prev.filter((t) => t._id !== item._id)
      }
      return [...prev, item]
    })
  }

  const handleSend = async () => {
    if (selectedTargets.length === 0 || !messageId) return

    setSending(true)
    try {
      const targetUserIds = selectedTargets.filter((t) => t.targetType === 'user').map((t) => t._id)
      const targetGroupIds = selectedTargets
        .filter((t) => t.targetType === 'group')
        .map((t) => t._id)

      await forwardMessage(messageId, targetUserIds, targetGroupIds)

      Alert.alert('Thành công', 'Đã chuyển tiếp tin nhắn', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ])
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể chuyển tiếp tin nhắn lúc này.')
    } finally {
      setSending(false)
    }
  }

  // Render từng item
  const renderItem = ({ item }: { item: TargetItem }) => {
    const isSelected = selectedTargets.some((t) => t._id === item._id)
    return (
      <TouchableOpacity onPress={() => toggleSelect(item)} style={styles.itemContainer}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={item.targetType === 'group' ? 'people' : 'person'}
            size={24}
            color="#666"
          />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{item.name}</Text>
          <Text style={styles.subText}>{item.targetType === 'group' ? 'Nhóm' : 'Bạn bè'}</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header tùy chỉnh hoặc dùng header của React Navigation */}

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm bạn bè hoặc nhóm..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>Không tìm thấy kết quả.</Text>}
        />
      )}

      {selectedTargets.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Gửi ({selectedTargets.length})</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 15,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  infoContainer: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: '500', color: '#333' },
  subText: { fontSize: 13, color: '#888', marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxSelected: { backgroundColor: '#0066FF', borderColor: '#0066FF' },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff'
  },
  sendButton: {
    backgroundColor: '#0066FF',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 }
})
