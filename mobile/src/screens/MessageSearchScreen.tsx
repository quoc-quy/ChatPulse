import React, { useState, useCallback, useRef } from "react";
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
  if (!keyword.trim()) return <Text style={textStyle}>{text}</Text>;

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

  if (diffDays === 0)
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7)
    return date.toLocaleDateString("vi-VN", { weekday: "short" });
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MessageSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { conversationId, conversationName, isGroup } = route.params || {};

  const { colors } = useTheme();

  // màu highlight từ khóa — không có trong colors.ts nên giữ inline theo theme
  const highlightColor = colors.ring;

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
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
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [conversationId],
  );

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

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    doSearch(keyword, page + 1, true);
  };

  const handleSelectResult = (item: any) => {
    Keyboard.dismiss();
    navigation.navigate("MessageScreen", {
      id: conversationId,
      name: conversationName,
      isGroup,
      targetMessageId: item._id,
    });
  };

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: any) => {
    const senderName = item.sender?.userName || "Thành viên";
    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: colors.border }]}
        onPress={() => handleSelectResult(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={styles.avatarText}>
            {senderName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text
              style={[styles.senderName, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {senderName}
            </Text>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          <HighlightText
            text={item.content || ""}
            keyword={keyword}
            textStyle={[
              styles.messagePreview,
              { color: colors.mutedForeground },
            ]}
            highlightColor={highlightColor}
          />
        </View>

        <Feather
          name="chevron-right"
          size={16}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View style={[styles.searchBar, { backgroundColor: colors.input }]}>
          <Ionicons
            name="search-outline"
            size={16}
            color={colors.mutedForeground}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Tìm tin nhắn..."
            placeholderTextColor={colors.mutedForeground}
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
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Kết quả */}
      {loading ? (
        <ActivityIndicator
          color={colors.primary}
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
                style={[styles.resultCount, { color: colors.mutedForeground }]}
              >
                {total} kết quả cho "{keyword}"
              </Text>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={colors.primary}
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
                  color={colors.border}
                />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Không tìm thấy kết quả
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.mutedForeground },
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
                  color={colors.border}
                />
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.mutedForeground },
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

  resultCount: { fontSize: 12, paddingHorizontal: 16, paddingVertical: 10 },

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
