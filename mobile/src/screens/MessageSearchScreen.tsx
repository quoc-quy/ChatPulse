import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { searchMessages } from "../apis/chat.api";

// ── Colors (đồng nhất toàn app) ───────────────────────────────────────────────
const lightColors = {
  background: "hsl(240, 30%, 98%)",
  foreground: "hsl(240, 10%, 15%)",
  card: "hsl(240, 30%, 100%)",
  primary: "hsl(230, 85%, 60%)",
  secondary: "hsl(270, 75%, 65%)",
  muted: "hsl(240, 15%, 90%)",
  mutedForeground: "hsl(240, 10%, 40%)",
  border: "hsl(240, 15%, 85%)",
  searchBg: "hsl(240, 15%, 94%)",
  highlight: "hsl(50, 100%, 70%)", // màu highlight từ khóa
};

const darkColors = {
  background: "hsl(240, 25%, 7%)",
  foreground: "hsl(240, 20%, 98%)",
  card: "hsl(240, 25%, 10%)",
  primary: "hsl(230, 85%, 65%)",
  secondary: "hsl(270, 75%, 60%)",
  muted: "hsl(240, 20%, 18%)",
  mutedForeground: "hsl(240, 10%, 65%)",
  border: "hsl(240, 20%, 18%)",
  searchBg: "hsl(240, 20%, 15%)",
  highlight: "hsl(50, 80%, 45%)",
};

// ── Highlight từ khóa trong text ─────────────────────────────────────────────
const HighlightText = ({
  text,
  keyword,
  textStyle,
  highlightColor,
}: {
  text: string;
  keyword: string;
  textStyle: any;
  highlightColor: string;
}) => {
  if (!keyword.trim()) {
    return <Text style={textStyle}>{text}</Text>;
  }

  const regex = new RegExp(
    `(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);

  return (
    <Text style={textStyle}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Text
            key={i}
            style={[
              textStyle,
              {
                backgroundColor: highlightColor,
                color: "#000",
                borderRadius: 2,
                fontWeight: "700",
              },
            ]}
          >
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
};

// ── Format ngày giờ ───────────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffDays === 1) {
    return "Hôm qua";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("vi-VN", { weekday: "short" });
  } else {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MessageSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { conversationId, conversationName, isGroup } = route.params || {};

  const { isDarkMode } = useTheme();
  const COLORS = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode],
  );

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); // đã từng search chưa
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search ────────────────────────────────────────────────────────────────
  const doSearch = useCallback(
    async (q: string, pageNum: number = 1, append = false) => {
      if (!q.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }

      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await searchMessages(conversationId, q.trim(), pageNum);
        const data = res.data?.result;
        const newItems: any[] = data?.results || [];

        setResults((prev) => (append ? [...prev, ...newItems] : newItems));
        setTotal(data?.total || 0);
        setTotalPages(data?.totalPages || 1);
        setPage(pageNum);
        setSearched(true);
      } catch {
        // silent — không cần Alert, chỉ hiện empty state
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [conversationId],
  );

  // Debounce khi gõ — tự động search sau 400ms
  const handleChangeText = (text: string) => {
    setKeyword(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(text, 1, false);
    }, 400);
  };

  // Load thêm khi scroll tới cuối
  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    doSearch(keyword, page + 1, true);
  };

  // Bấm vào kết quả → navigate về MessageScreen, truyền messageId để scroll tới
  const handleSelectResult = (item: any) => {
    Keyboard.dismiss();
    navigation.navigate("MessageScreen", {
      id: conversationId,
      name: conversationName,
      isGroup,
      targetMessageId: item._id, // MessageScreen dùng để scroll tới
    });
  };

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: any) => {
    const senderName = item.sender?.userName || "Thành viên";
    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: COLORS.border }]}
        onPress={() => handleSelectResult(item)}
        activeOpacity={0.7}
      >
        {/* Avatar chữ cái */}
        <View style={[styles.avatar, { backgroundColor: COLORS.secondary }]}>
          <Text style={styles.avatarText}>
            {senderName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.itemContent}>
          {/* Tên người gửi + thời gian */}
          <View style={styles.itemHeader}>
            <Text
              style={[styles.senderName, { color: COLORS.foreground }]}
              numberOfLines={1}
            >
              {senderName}
            </Text>
            <Text style={[styles.dateText, { color: COLORS.mutedForeground }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>

          {/* Nội dung tin nhắn với từ khóa được highlight */}
          <HighlightText
            text={item.content || ""}
            keyword={keyword}
            textStyle={[
              styles.messagePreview,
              { color: COLORS.mutedForeground },
            ]}
            highlightColor={COLORS.highlight}
          />
        </View>

        <Feather
          name="chevron-right"
          size={16}
          color={COLORS.mutedForeground}
        />
      </TouchableOpacity>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={24} color={COLORS.foreground} />
        </TouchableOpacity>

        {/* Search input */}
        <View style={[styles.searchBar, { backgroundColor: COLORS.searchBg }]}>
          <Ionicons
            name="search-outline"
            size={16}
            color={COLORS.mutedForeground}
          />
          <TextInput
            style={[styles.searchInput, { color: COLORS.foreground }]}
            placeholder="Tìm tin nhắn..."
            placeholderTextColor={COLORS.mutedForeground}
            value={keyword}
            onChangeText={handleChangeText}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(keyword, 1, false)}
            autoFocus
          />
          {keyword.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setKeyword("");
                setResults([]);
                setSearched(false);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={COLORS.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Kết quả */}
      {loading ? (
        <ActivityIndicator
          color={COLORS.primary}
          size="large"
          style={{ marginTop: 48 }}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            results.length === 0 ? styles.emptyContainer : { paddingBottom: 24 }
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            searched && results.length > 0 ? (
              <Text
                style={[styles.resultCount, { color: COLORS.mutedForeground }]}
              >
                {total} kết quả cho "{keyword}"
              </Text>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={COLORS.primary}
                style={{ paddingVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            searched ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="search-outline"
                  size={52}
                  color={COLORS.border}
                />
                <Text style={[styles.emptyTitle, { color: COLORS.foreground }]}>
                  Không tìm thấy kết quả
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: COLORS.mutedForeground },
                  ]}
                >
                  Không có tin nhắn nào chứa "{keyword}"
                </Text>
              </View>
            ) : !keyword ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="chatbubble-outline"
                  size={52}
                  color={COLORS.border}
                />
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: COLORS.mutedForeground },
                  ]}
                >
                  Nhập từ khóa để tìm kiếm tin nhắn
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 4 },

  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  resultCount: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

  itemContent: { flex: 1 },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  senderName: { fontSize: 14, fontWeight: "600", flex: 1 },
  dateText: { fontSize: 11, marginLeft: 8 },
  messagePreview: { fontSize: 13, lineHeight: 18 },

  emptyContainer: { flex: 1 },
  emptyState: {
    alignItems: "center",
    marginTop: 80,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 18 },
});
