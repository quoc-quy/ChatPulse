import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import debounce from "lodash/debounce";
import { searchUsers, blockUser, unblockUser } from "../../apis/user.api";
import { Search, UserX, CheckCircle, X } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

const SearchComponent = () => {
  const navigation = useNavigation<any>();

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // debounce search
  const debouncedSearch = useCallback(
    debounce(async (text: string) => {
      if (!text.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const res = await searchUsers(text);
        setResults(res?.data?.result || []);
      } catch (err) {
        console.log("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, []);

  const handleSearchChange = (text: string) => {
    setKeyword(text);
    debouncedSearch(text);
  };

  const handleClearSearch = () => {
    setKeyword("");
    setResults([]);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  const handleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      if (isBlocked) {
        await unblockUser(userId);
        Alert.alert("Thành công", "Đã bỏ chặn người dùng");
      } else {
        await blockUser(userId);
        Alert.alert("Thành công", "Đã chặn người dùng");
      }

      setResults((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isBlocked: !isBlocked } : u
        )
      );
    } catch (err) {
      Alert.alert("Lỗi", "Thao tác thất bại");
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => {
        handleClearSearch();
        navigation.navigate("ProfileScreen", { userId: item._id });
      }}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.userName}>{item.name}</Text>
      </View>

      <TouchableOpacity
        style={[styles.blockBtn, item.isBlocked && styles.unblockBtn]}
        onPress={() => handleBlock(item._id, item.isBlocked)}
      >
        {item.isBlocked ? (
          <CheckCircle size={18} color="#fff" />
        ) : (
          <UserX size={18} color="#EF4444" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      {/* search box */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" style={styles.icon} />

        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm người dùng..."
          value={keyword}
          onChangeText={handleSearchChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
        />

        {keyword.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch}>
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* result overlay */}
      {isFocused && keyword.length > 0 && (
        <View style={styles.resultsOverlay}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#3B82F6"
              style={{ padding: 20 }}
            />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyText}>Không tìm thấy người dùng</Text>
              }
            />
          )}
        </View>
      )}
    </View>
  );
};

export default SearchComponent;

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 100,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 42,
    marginHorizontal: 16,
    marginVertical: 10,
  },

  icon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  resultsOverlay: {
    position: "absolute",
    top: 55,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    maxHeight: 350,
    borderRadius: 10,
    zIndex: 999,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  avatarText: {
    color: "#fff",
    fontWeight: "bold",
  },

  userName: {
    fontSize: 15,
    fontWeight: "500",
  },

  blockBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },

  unblockBtn: {
    backgroundColor: "#10B981",
  },

  emptyText: {
    textAlign: "center",
    padding: 20,
    color: "#6B7280",
  },
});