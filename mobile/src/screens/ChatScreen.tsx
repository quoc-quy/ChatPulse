import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from "react-native"

interface User {
  _id: string
  name: string
  email: string
  isBlocked?: boolean
}

interface Conversation {
  _id: string
  name?: string
  type: "direct" | "group"
  updated_at: string
  last_message?: {
    content: string
    created_at: string
  }
  unreadCount?: number
}

const mockConversations: Conversation[] = [
  {
    _id: "1",
    type: "direct",
    updated_at: new Date().toISOString(),
    last_message: {
      content: "Ê tối nay code tiếp không?",
      created_at: new Date().toISOString()
    },
    unreadCount: 2
  },
  {
    _id: "2",
    type: "group",
    name: "Nhóm CNM",
    updated_at: new Date().toISOString(),
    last_message: {
      content: "Nộp bài trước 23h59 nhé!",
      created_at: new Date().toISOString()
    }
  }
]

const mockUsers: User[] = [
  { _id: "u1", name: "Nguyen Van A", email: "a@gmail.com" },
  { _id: "u2", name: "Tran Thi B", email: "b@gmail.com" },
  { _id: "u3", name: "Le Van C", email: "c@gmail.com" }
]

const ChatScreen: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Load conversations giả lập
  useEffect(() => {
    setTimeout(() => {
      setConversations(mockConversations)
      setLoading(false)
    }, 500)
  }, [])

  // SEARCH xử lý tại đây
  useEffect(() => {
    const handler = setTimeout(() => {
      if (!searchText.trim()) {
        setSearchResults([])
        return
      }

      const keyword = searchText.toLowerCase()

      // Tìm user
      const filteredUsers = mockUsers.filter((user) =>
        user.name.toLowerCase().includes(keyword)
      )

      // Tìm conversation theo name hoặc nội dung tin nhắn cuối
      const filteredConversations = mockConversations.filter((conv) =>
        (conv.name || "direct chat")
          .toLowerCase()
          .includes(keyword) ||
        conv.last_message?.content
          ?.toLowerCase()
          .includes(keyword)
      )

      // Gộp lại
      setSearchResults([
        ...filteredUsers,
        ...filteredConversations as any
      ])
    }, 400)

    return () => clearTimeout(handler)
  }, [searchText])

  const renderConversation = ({ item }: { item: Conversation }) => {
    return (
      <TouchableOpacity style={styles.card}>
        <View style={styles.avatar} />
        <View style={styles.content}>
          <Text style={styles.name}>
            {item.type === "group" ? item.name : "Direct Chat"}
          </Text>
          <Text style={styles.message}>
            {item.last_message?.content || "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.blockBtn,
          item.isBlocked && { backgroundColor: "#EF4444" }
        ]}
        onPress={() => {
          setSearchResults((prev) =>
            prev.map((u) =>
              u._id === item._id
                ? { ...u, isBlocked: !u.isBlocked }
                : u
            )
          )
        }}
      >
        <Text style={styles.blockText}>
          {item.isBlocked ? "Unblock" : "Block"}
        </Text>
      </TouchableOpacity>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>Messages</Text>

      <View style={styles.searchBox}>
        <TextInput
          placeholder="Search users..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {searchText.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item: any) => item._id}
          renderItem={({ item }: any) => {
            if (item.type) {
              return renderConversation({ item })
            }
            return renderUser({ item })
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No results found</Text>
          }
        />
      ) : (
        <FlatList
          data={conversations}   // ✅ ĐÚNG
          keyExtractor={(item) => item._id}
          renderItem={renderConversation}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No conversations found
            </Text>
          }
        />
      )}
    </SafeAreaView>
  )
}

export default ChatScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
    paddingHorizontal: 16
  },

  center: {
    flex: 1,
    backgroundColor: "#0B1220",
    justifyContent: "center",
    alignItems: "center"
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    marginVertical: 16
  },

  searchBox: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16
  },

  searchInput: {
    color: "#FFF"
  },

  card: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1F2937"
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1F2937",
    marginRight: 12
  },

  content: {
    flex: 1
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF"
  },

  message: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4
  },

  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 40
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1F2937"
  },

  userName: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600"
  },

  userEmail: {
    color: "#9CA3AF",
    fontSize: 12
  },

  blockBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },

  blockText: {
    color: "#FFF",
    fontWeight: "600"
  }
})