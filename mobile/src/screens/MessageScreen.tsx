import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { sendMediaMessage } from "../apis/chat.api";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  PanResponder,
  Linking,
  Modal,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { suggestReplyApi } from "../apis/chat.api";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { markConversationAsSeen } from "../apis/chat.api";

// IMPORT USE THEME
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { useChatContext } from "../contexts/ChatContext";

import {
  getMessages,
  sendMessage,
  reactMessage as reactMessageApi,
  recallMessage as recallMessageApi,
  deleteMessageForMe as deleteMessageForMeApi,
  summarizeChatApi,
  getConversationDetail,
  deleteConversationForMe,
} from "../apis/chat.api";

const lightColors = {
  background: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceSoft: "#EEF2FF",
  text: "#0F172A",
  textLight: "#64748B",
  border: "#E2E8F0",
  primary: "#6366F1",
  accent: "#8B5CF6",
  success: "#10B981",
  badge: "#EF4444",
  headerText: "#FFFFFF",
  fileBg: "#F0F4F8",
};

const darkColors = {
  background: "#070B1A",
  surface: "#11182D",
  surfaceSoft: "#0D1428",
  text: "#F8FAFC",
  textLight: "#9CA3AF",
  border: "#1E2946",
  primary: "#7C3AED",
  accent: "#A855F7",
  success: "#10B981",
  badge: "#EF4444",
  headerText: "#FFFFFF",
  fileBg: "#1E293B",
};

const REACTION_LIST = ["👍", "❤️", "🤣", "😮", "😭", "😡"];
const BLOCKED_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "msi",
  "scr",
  "vbs",
  "sh",
  "ps1",
  "jar",
  "sys",
  "dll",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getFileIconInfo = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { color: "#EF4444", label: "PDF" };
  if (["doc", "docx"].includes(ext || ""))
    return { color: "#3B82F6", label: "DOC" };
  if (["xls", "xlsx"].includes(ext || ""))
    return { color: "#10B981", label: "XLS" };
  if (["zip", "rar"].includes(ext || ""))
    return { color: "#8B5CF6", label: "ZIP" };
  return { color: "#64748B", label: "FILE" };
};

const unarchiveChat = async (conversationId: string) => {
  try {
    const stored = await AsyncStorage.getItem("archived_chats");
    if (stored) {
      let archivedArray: string[] = JSON.parse(stored);
      const index = archivedArray.findIndex(
        (key: string) =>
          key.startsWith(`${conversationId}:`) || key === conversationId,
      );
      if (index !== -1) {
        archivedArray.splice(index, 1);
        await AsyncStorage.setItem(
          "archived_chats",
          JSON.stringify(archivedArray),
        );
      }
    }
  } catch (error) {
    console.log("Lỗi unarchive:", error);
  }
};

const MessageScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);
  const { id } = route.params || {};

  const { isDarkMode } = useTheme();
  const { language, t } = useTranslation();
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(
    () => getStyles(COLORS, isDarkMode),
    [isDarkMode, COLORS],
  );

  const { clearLocalUnread, drafts, updateDraft, socket } =
    useChatContext() as any;

  const {
    id: conversationId,
    name: chatName,
    isGroup,
    targetUserId,
    unreadCount = 0,
    isMuted = false,
  } = route.params || {};

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isMutedState, setIsMutedState] = useState<boolean>(isMuted);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
    Dimensions.get("window");
  const [isGroupDisbanded, setIsGroupDisbanded] = useState(false);
  const [disbandMessage, setDisbandMessage] = useState("");

  const [pendingMedia, setPendingMedia] = useState<any[]>([]);
  const [previewMedia, setPreviewMedia] = useState<{
    items: { id: string; url: string; isVideo: boolean }[];
    initialIndex: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (conversationId && drafts && drafts[conversationId]) {
      setInputText(drafts[conversationId]);
    }
  }, [conversationId]);

  const handleSuggestReply = async () => {
    if (messages.length === 0) return;
    setIsSuggesting(true);
    try {
      const recentMsgs = messages.slice(-5);
      const res = await suggestReplyApi(recentMsgs);
      if (res.data?.result) {
        const text = `@PulseAI ${res.data.result.trim()}`;
        setInputText(text);
        if (updateDraft && conversationId) updateDraft(conversationId, text);
      }
    } catch (error) {
      Alert.alert(t.error, t.messageAiSuggestFailed);
    } finally {
      setIsSuggesting(false);
    }
  };

  const VideoThumbnail = ({ url }: { url: string }) => {
    const player = useVideoPlayer({ uri: url }, (p) => p.pause());
    return (
      <View
        style={{
          width: 240,
          height: 300,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <VideoView
          style={{ width: "100%", height: "100%" }}
          player={player}
          nativeControls={false}
          contentFit="cover"
        />
        <View style={styles.playIconOverlay}>
          <Ionicons
            name="play-circle"
            size={54}
            color="rgba(255, 255, 255, 0.85)"
          />
        </View>
      </View>
    );
  };

  const VideoViewer = ({ url }: { url: string }) => {
    const player = useVideoPlayer({ uri: url }, (player) => {
      player.loop = true;
      player.play();
    });
    return (
      <VideoView
        style={{ width: "100%", height: "100%" }}
        player={player}
        nativeControls={true}
        allowsFullscreen
        allowsPictureInPicture
      />
    );
  };

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
      videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const validAssets: any[] = [];
      for (const asset of result.assets) {
        const isVideo =
          asset.type === "video" || asset.uri.match(/\.(mp4|mov|avi|mkv)$/i);
        validAssets.push({
          ...asset,
          attachmentType: "media",
          detectedType: isVideo ? "video" : "image",
        });
      }
      if (validAssets.length > 0)
        setPendingMedia((prev) => [...prev, ...validAssets]);
    }
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const validAssets: any[] = [];
      for (const asset of result.assets) {
        if (asset.size && asset.size > MAX_FILE_SIZE) {
          Alert.alert(
            t.error || "Lỗi",
            `Không thể gửi file lớn hơn ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          );
          continue;
        }
        const fileName = asset.name || "";
        const extension = fileName.split(".").pop()?.toLowerCase() || "";
        if (BLOCKED_EXTENSIONS.includes(extension)) {
          Alert.alert(
            "Lỗi bảo mật",
            `Không được phép gửi tệp tin định dạng .${extension}`,
          );
          continue;
        }
        validAssets.push({
          ...asset,
          attachmentType: "file",
          fileSize: asset.size,
        });
      }
      if (validAssets.length > 0)
        setPendingMedia((prev) => [...prev, ...validAssets]);
    }
  };

  const uploadAttachment = async (fileData: any, type: "media" | "file") => {
    setIsUploading(true);
    const isVideoFile =
      fileData.type === "video" ||
      fileData.uri.split("?")[0].match(/\.(mp4|mov)$/i);
    const mediaType =
      type === "media" ? (isVideoFile ? "video" : "image") : type;

    const tempId = Date.now().toString();
    const tempMessage = {
      _id: tempId,
      conversationId,
      type: mediaType,
      content: fileData.uri,
      createdAt: new Date().toISOString(),
      sender: { _id: currentUserId, userName: t.messageYou },
      isSending: true,
    };
    setMessages((prev) => [tempMessage, ...prev]);

    try {
      let mimeType = fileData.mimeType;
      let fileName =
        fileData.name || fileData.fileName || fileData.uri.split("/").pop();

      if (type === "media") {
        if (isVideoFile) {
          mimeType = mimeType || "video/mp4";
          fileName = fileName || `video_${Date.now()}.mp4`;
        } else {
          mimeType = mimeType || "image/jpeg";
          fileName = fileName || `image_${Date.now()}.jpg`;
        }
      } else {
        mimeType = mimeType || "application/octet-stream";
        fileName = fileName || `file_${Date.now()}`;
      }

      const formattedFile = {
        uri: fileData.uri,
        name: fileName,
        type: mimeType,
        mimeType: mimeType,
      };

      const res = await sendMediaMessage(conversationId, formattedFile, type);
      const realMessage = res.data?.result || res.data;

      if (realMessage) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === tempId ? realMessage : msg)),
        );
        unarchiveChat(conversationId);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        t.messageAttachmentFailed ||
        "Không thể gửi tệp đính kèm.";
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg._id !== tempId);
        return [
          {
            _id: `error_${Date.now()}`,
            conversationId,
            type: "system_error",
            content: errorMessage,
            createdAt: new Date().toISOString(),
          },
          ...filtered,
        ];
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    let textToSend = inputText.trim();
    if (textToSend === "@PulseAI ") textToSend = "";

    if (textToSend.length > 2000) {
      Alert.alert(
        t.error || "Cảnh báo",
        `Tin nhắn quá dài (${textToSend.length}/2000 ký tự). Vui lòng rút gọn nội dung trước khi gửi.`,
      );
      return;
    }

    const mediaToSend = [...pendingMedia];
    if (textToSend.length === 0 && mediaToSend.length === 0) return;

    setInputText("");
    setPendingMedia([]);
    if (updateDraft && conversationId) updateDraft(conversationId, "");

    if (textToSend.length > 0) {
      const tempId = Date.now().toString();
      const tempMessage = {
        _id: tempId,
        conversationId,
        type: "text",
        content: textToSend,
        createdAt: new Date().toISOString(),
        sender: { _id: currentUserId, userName: t.messageMe },
        isSending: true,
      };
      setMessages((prev) => [tempMessage, ...prev]);

      try {
        const res = await sendMessage(conversationId, textToSend, "text");
        let realMessage = res.data.result || res.data;

        if (realMessage) {
          setMessages((prev) =>
            prev.map((msg) => (msg._id === tempId ? realMessage : msg)),
          );
          unarchiveChat(conversationId);
        }
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message ||
          "Không thể gửi tin nhắn. Vui lòng thử lại.";
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg._id !== tempId);
          return [
            {
              _id: `error_${Date.now()}`,
              conversationId,
              type: "system_error",
              content: errorMessage,
              createdAt: new Date().toISOString(),
            },
            ...filtered,
          ];
        });
      }
    }

    for (const media of mediaToSend) {
      await uploadAttachment(media, media.attachmentType);
    }
  };

  const handleDeleteDisbandedChat = () => {
    Alert.alert(
      "Xóa trò chuyện",
      "Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              // Gọi API xóa phía người dùng hiện tại
              await deleteConversationForMe(conversationId);

              // Cập nhật lại AsyncStorage để gỡ nhóm này khỏi danh sách lưu trữ (nếu đang lưu)
              const stored = await AsyncStorage.getItem("archived_chats");
              if (stored) {
                let archivedArray: string[] = JSON.parse(stored);
                const nextArray = archivedArray.filter(
                  (key: string) => key !== conversationId,
                );
                await AsyncStorage.setItem(
                  "archived_chats",
                  JSON.stringify(nextArray),
                );
              }

              // Quay về màn hình ChatScreen (ChatScreen sẽ tự động reload lại danh sách nhờ useFocusEffect)
              navigation.goBack();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa trò chuyện. Vui lòng thử lại!");
            }
          },
        },
      ],
    );
  };

  const loadMoreMessages = async () => {
    if (!hasMore || isFetchingMore || !cursor) return;
    try {
      setIsFetchingMore(true);
      const res = await getMessages(conversationId, cursor, 20);
      const rawData = res.data.result || res.data.data || [];
      if (rawData.length > 0) {
        setCursor(rawData[rawData.length - 1]._id);
        setMessages((prev) => [...prev, ...rawData]);
      }
      if (rawData.length < 20) setHasMore(false);
    } catch (error: any) {
      console.log("Lỗi tải thêm tin nhắn:", error.message);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
  const [emojiStripWidth, setEmojiStripWidth] = useState(0);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [reactionDetailMessage, setReactionDetailMessage] = useState<any>(null);
  const [reactionFilter, setReactionFilter] = useState<string>("ALL");
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState("");

  useEffect(() => {
    if (id) {
      markConversationAsSeen(id)
        .then(() => clearLocalUnread(id))
        .catch(() => clearLocalUnread(id));
    }
  }, [id]);

  useEffect(() => {
    const initChat = async () => {
      let resolvedUserId = currentUserId;
      if (!resolvedUserId) {
        try {
          const token = await AsyncStorage.getItem("access_token");
          if (token) {
            const decoded: any = jwtDecode(token);
            resolvedUserId = decoded.user_id || decoded._id || decoded.id;
            setCurrentUserId(resolvedUserId);
          }
        } catch (e) {}
      }

      if (conversationId && resolvedUserId) {
        setLoading(true);
        try {
          const res = await getMessages(conversationId, null, 20);
          const rawData = res.data.result || res.data.data || [];
          if (rawData.length > 0) setCursor(rawData[rawData.length - 1]._id);
          if (rawData.length < 20) setHasMore(false);
          setMessages(rawData);

          const detailRes = await getConversationDetail(conversationId);
          const conv = detailRes.data?.result;

          if (conv?.is_disbanded || conv?.isDisbanded) {
            setIsGroupDisbanded(true);
            setDisbandMessage(
              conv.disbanded_message || "Nhóm trưởng đã giải tán nhóm",
            );
          }
          const myMember = (conv?.members || []).find(
            (m: any) => m.userId?.toString() === resolvedUserId,
          );
          if (myMember?.hasMuted !== undefined)
            setIsMutedState(myMember.hasMuted);
        } catch (error: any) {
          console.log("Lỗi tải tin nhắn:", error.message);
        } finally {
          setLoading(false);
        }
      }
    };

    initChat();
  }, [conversationId]);

  // =========================================================================
  // 🔥 FIX REALTIME: LẮNG NGHE SỰ KIỆN SOCKET NHẬN TIN NHẮN TỪ NGƯỜI KHÁC
  // =========================================================================
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleReceiveMessage = (newMessage: any) => {
      console.log("📩 Mobile received:", newMessage);
      // Bỏ qua nếu là tin nhắn của chính mình (đã được xử lý bởi optimistic update)
      if (newMessage.sender?._id === currentUserId) {
        return;
      }

      if (
        newMessage.conversationId === conversationId ||
        newMessage.convId === conversationId
      ) {
        setMessages((prev) => {
          const isExist = prev.some((msg) => msg._id === newMessage._id);
          if (isExist) return prev;
          return [newMessage, ...prev];
        });

        // Đánh dấu đã xem nếu tin nhắn không phải của mình
        if (currentUserId) {
          socket.emit("message_seen", {
            messageId: newMessage._id,
            conversationId,
          });
          clearLocalUnread(conversationId);
        }
      }
    };
    const handleGroupDisbanded = ({
      conversationId: disbandedId,
      message,
    }: any) => {
      if (disbandedId === conversationId) {
        setIsGroupDisbanded(true);
        setDisbandMessage(message || "Nhóm trưởng đã giải tán nhóm");
        setMessages((prev) => [
          {
            _id: `disband_${Date.now()}`,
            conversationId,
            type: "system",
            content: message || "Nhóm trưởng đã giải tán nhóm",
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    };

    const handleMessageRevoked = (data: any) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId
              ? { ...msg, type: "revoked", content: "" }
              : msg,
          ),
        );
      }
    };

    const handleMessageReacted = (data: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg,
        ),
      );
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_revoked", handleMessageRevoked);
    socket.on("message_reacted", handleMessageReacted);
    socket.on("group_disbanded", handleGroupDisbanded);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_revoked", handleMessageRevoked);
      socket.off("message_reacted", handleMessageReacted);
      socket.off("group_disbanded", handleGroupDisbanded);
    };
  }, [socket, conversationId, currentUserId, clearLocalUnread]);

  const groupedMessages = useMemo(() => {
    const result = [];
    let currentGroup: any = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const urlLower = msg.content?.split("?")[0].toLowerCase() || "";
      const isVideo =
        msg.type === "video" || urlLower.match(/\.(mp4|mov|avi|mkv)$/i);
      const isDocument =
        msg.type === "file" ||
        urlLower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv)$/i);
      const isImage =
        (msg.type === "media" ||
          msg.type === "image" ||
          urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) &&
        !isVideo &&
        !isDocument;

      if (isImage && !msg.isSending) {
        if (
          currentGroup &&
          currentGroup.senderId === (msg.sender?._id || msg.senderId)
        ) {
          const timeDiff = Math.abs(
            new Date(currentGroup.createdAt).getTime() -
              new Date(msg.createdAt).getTime(),
          );
          if (timeDiff < 60000) {
            currentGroup.images.push(msg);
            continue;
          }
        }
        if (currentGroup) {
          result.push(currentGroup);
        }
        currentGroup = {
          isGroup: true,
          _id: `group_${msg._id}`,
          senderId: msg.sender?._id || msg.senderId,
          sender: msg.sender,
          createdAt: msg.createdAt,
          images: [msg],
        };
      } else {
        if (currentGroup) {
          result.push(currentGroup);
          currentGroup = null;
        }
        result.push(msg);
      }
    }
    if (currentGroup) result.push(currentGroup);
    return result;
  }, [messages]);

  const handleSummarizeChat = async () => {};
  const handleToggleReact = async (message: any, emoji: string) => {};
  const handleRemoveAllReactions = async (message: any) => {};

  const buildReactionGroups = (reactions: any[] = []) => {
    const groupMap = new Map<
      string,
      { emoji: string; count: number; users: any[] }
    >();
    reactions.forEach((reaction: any) => {
      const emoji = reaction?.emoji;
      if (!emoji) return;
      if (!groupMap.has(emoji))
        groupMap.set(emoji, { emoji, count: 0, users: [] });
      const group = groupMap.get(emoji)!;
      group.count += 1;
      group.users.push(reaction);
    });
    return Array.from(groupMap.values()).sort((a, b) => b.count - a.count);
  };

  const openReactionDetails = (message: any) => {
    setReactionDetailMessage(message);
    setReactionFilter("ALL");
    setShowReactionDetails(true);
  };

  const reactionGroupsForModal = useMemo(
    () => buildReactionGroups(reactionDetailMessage?.reactions || []),
    [reactionDetailMessage, currentUserId],
  );
  const reactionUsersForModal = useMemo(() => {
    return [];
  }, [reactionFilter, reactionGroupsForModal, currentUserId]);

  const handleRevoke = async () => {};
  const handleDeleteForMe = async () => {};
  const handleDoubleTap = (message: any) => {};

  const handleLongPress = (event: any, message: any) => {
    if (message.type === "revoked") return;
    const { pageY } = event.nativeEvent;
    setMenuPos({ x: 0, y: Math.max(100, pageY - 130) });
    setSelectedMsg(message);
    setShowMenu(true);
  };

  useEffect(() => {
    if (!showMenu) setHoveredReaction(null);
  }, [showMenu]);

  const getReactionFromX = useCallback(
    (x: number) => {
      if (emojiStripWidth <= 0) return null;
      const clampedX = Math.max(0, Math.min(x, emojiStripWidth - 1));
      const cellWidth = emojiStripWidth / REACTION_LIST.length;
      const index = Math.floor(clampedX / cellWidth);
      if (index < 0 || index >= REACTION_LIST.length) return null;
      return REACTION_LIST[index];
    },
    [emojiStripWidth],
  );

  const emojiPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          setHoveredReaction(getReactionFromX(event.nativeEvent.locationX));
        },
        onPanResponderMove: (event) => {
          setHoveredReaction(getReactionFromX(event.nativeEvent.locationX));
        },
        onPanResponderRelease: () => {
          if (hoveredReaction && selectedMsg)
            handleToggleReact(selectedMsg, hoveredReaction);
          else setShowMenu(false);
          setHoveredReaction(null);
        },
        onPanResponderTerminate: () => setHoveredReaction(null),
      }),
    [getReactionFromX, hoveredReaction, selectedMsg],
  );

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMessageDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return t.messageToday;
    if (date.toDateString() === yesterday.toDateString())
      return t.messageYesterday;
    return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderAiText = (text: string) => {
    return <Text></Text>;
  };

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMe = (item.sender?._id || item.senderId) === currentUserId;

    if (item.isGroup) {
      const showAvatar = !isMe;
      const orderedImages = item.images.slice().reverse();
      const count = orderedImages.length;
      const displayImages = orderedImages.slice(0, 5);
      const hiddenCount = count - 5;
      const W = 240;
      const gap = 3;

      return (
        <View
          style={[
            styles.messageWrapper,
            isMe ? styles.messageWrapperMe : styles.messageWrapperOther,
          ]}
        ></View>
      );
    }

    const isRevoked = item.type === "revoked";
    const olderItem =
      index < groupedMessages.length - 1 ? groupedMessages[index + 1] : null;
    const newerItem = index > 0 ? groupedMessages[index - 1] : null;

    if (item.type === "system" || item.type === "system_error") {
      const currentDate = new Date(item.createdAt).toDateString();
      const olderDate = olderItem
        ? new Date(olderItem.createdAt).toDateString()
        : null;
      const showDateDivider =
        currentDate !== olderDate && item.type !== "system_error";

      return (
        <View>
          {showDateDivider && (
            <View style={styles.dateDivider}>
              <Text style={styles.dateDividerText}>
                {formatMessageDate(item.createdAt)}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.systemMessageWrapper,
              item.type === "system_error" && {},
            ]}
          >
            <Text
              style={[
                styles.systemMessageText,
                item.type === "system_error"
                  ? { color: COLORS.badge }
                  : { color: COLORS.textLight },
              ]}
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

    const isAiGenerated = item.content?.startsWith("@PulseAI ");
    const displayContent = isAiGenerated
      ? item.content.substring(9)
      : item.content;
    const reactionGroups = buildReactionGroups(item.reactions || []);
    const totalReactions = reactionGroups.reduce(
      (acc, group) => acc + group.count,
      0,
    );
    const hasReactions = totalReactions > 0;
    const reactionPreview = reactionGroups
      .slice(0, 3)
      .map((group) => group.emoji)
      .join(" ");
    const isLatestMessage = index === messages.length - 1;
    const shouldShowReactionCorner =
      !isRevoked && (hasReactions || isLatestMessage);

    const currentDate = new Date(item.createdAt).toDateString();
    const olderDate = olderItem
      ? new Date(olderItem.createdAt).toDateString()
      : null;
    const showDateDivider = currentDate !== olderDate;
    const isSameSenderAsNewer =
      newerItem &&
      (newerItem.sender?._id || newerItem.senderId) ===
        (item.sender?._id || item.senderId);
    let isCloseInTime = false;
    if (newerItem) {
      const diff =
        new Date(newerItem.createdAt).getTime() -
        new Date(item.createdAt).getTime();
      isCloseInTime = diff < 60000;
    }
    const showTime = !isRevoked && !(isSameSenderAsNewer && isCloseInTime);
    const showAvatar = !isMe && !isSameSenderAsNewer;

    return (
      <View>
        {showDateDivider && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateDividerText}>
              {formatMessageDate(item.createdAt)}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageWrapper,
            isMe ? styles.messageWrapperMe : styles.messageWrapperOther,
          ]}
        >
          {!isMe && (
            <View style={styles.avatarPlaceholder}>
              {showAvatar && (
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarText}>
                    {item.sender?.userName?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View
            style={[
              styles.messageContent,
              isMe ? { alignItems: "flex-end" } : { alignItems: "flex-start" },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                const urlLower =
                  displayContent?.split("?")[0].toLowerCase() || "";
                const isVideoClick =
                  item.type === "video" ||
                  urlLower.match(/\.(mp4|mov|avi|mkv)$/i);
                const isDocumentClick =
                  item.type === "file" ||
                  urlLower.match(
                    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv)$/i,
                  );
                const isImageClick =
                  (item.type === "image" ||
                    item.type === "media" ||
                    urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) &&
                  !isVideoClick &&
                  !isDocumentClick;

                if (isDocumentClick) Linking.openURL(displayContent);
                else if (isImageClick || isVideoClick) {
                  setPreviewMedia({
                    items: [
                      {
                        id: item._id,
                        url: displayContent,
                        isVideo: !!isVideoClick,
                      },
                    ],
                    initialIndex: 0,
                  });
                } else handleDoubleTap(item);
              }}
              onLongPress={(e) => handleLongPress(e, item)}
              activeOpacity={0.9}
            >
              <View
                style={[
                  !(
                    item.type === "media" ||
                    item.type === "image" ||
                    item.type === "video" ||
                    item.type === "call" ||
                    item.type === "file" ||
                    displayContent
                      ?.split("?")[0]
                      .toLowerCase()
                      .match(
                        /\.(mp4|mov|avi|mkv|jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv)$/i,
                      )
                  ) && styles.bubble,
                  !(
                    item.type === "media" ||
                    item.type === "image" ||
                    item.type === "video" ||
                    item.type === "call" ||
                    item.type === "file"
                  ) && (isMe ? styles.bubbleMe : styles.bubbleOther),
                  isRevoked && {
                    backgroundColor: isDarkMode ? "#1E2946" : "#E2E8F0",
                    opacity: 0.6,
                  },
                  item.isSending && { opacity: 0.6 },
                  (item.type === "call" || item.type === "file") && {
                    backgroundColor: "transparent",
                    borderWidth: 0,
                    paddingHorizontal: 0,
                    paddingVertical: 0,
                  },
                ]}
              >
                {isRevoked ? (
                  <Text
                    style={[
                      styles.messageText,
                      {
                        fontStyle: "italic",
                        color: COLORS.textLight,
                        paddingRight: 5,
                      },
                    ]}
                  >
                    {t.messageRevoked}
                  </Text>
                ) : (
                  (() => {
                    const urlLower =
                      displayContent?.split("?")[0].toLowerCase() || "";
                    const isVideo =
                      item.type === "video" ||
                      urlLower.match(/\.(mp4|mov|avi|mkv)$/i);
                    const isDocument =
                      item.type === "file" ||
                      urlLower.match(
                        /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv)$/i,
                      );
                    const isImage =
                      (item.type === "image" ||
                        item.type === "media" ||
                        urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) &&
                      !isVideo &&
                      !isDocument;

                    if (isVideo || isImage) {
                      return (
                        <View style={{ position: "relative", marginBottom: 5 }}>
                          {isVideo ? (
                            <VideoThumbnail url={displayContent} />
                          ) : (
                            <Image
                              source={{ uri: displayContent }}
                              style={styles.mediaImage}
                              resizeMode="cover"
                            />
                          )}
                        </View>
                      );
                    }

                    if (isDocument) {
                      const fileName =
                        displayContent.split("/").pop()?.split("?")[0] ||
                        t.messageAttachmentDocument;
                      const { color: fileColor, label: fileLabel } =
                        getFileIconInfo(fileName);
                      return (
                        <View
                          style={[
                            styles.fileCard,
                            {
                              backgroundColor: COLORS.fileBg,
                              borderColor: COLORS.border,
                            },
                          ]}
                        >
                          <View style={styles.fileCardPreview}>
                            <Ionicons
                              name="document-text"
                              size={60}
                              color={COLORS.border}
                              style={{ opacity: 0.5 }}
                            />
                          </View>
                          <View
                            style={[
                              styles.fileCardInfo,
                              { backgroundColor: COLORS.surface },
                            ]}
                          >
                            <View
                              style={[
                                styles.fileTypeBadge,
                                { backgroundColor: fileColor },
                              ]}
                            >
                              <Text style={styles.fileTypeBadgeText}>
                                {fileLabel}
                              </Text>
                            </View>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text
                                style={[
                                  styles.fileNameCardText,
                                  { color: COLORS.text },
                                ]}
                                numberOfLines={1}
                              >
                                {fileName}
                              </Text>
                              <View style={styles.fileMetaRow}>
                                <Text
                                  style={[
                                    styles.fileMetaText,
                                    { color: COLORS.textLight },
                                  ]}
                                >
                                  {item.fileSize
                                    ? formatBytes(item.fileSize)
                                    : "Tệp tin"}
                                </Text>
                                <Text
                                  style={[
                                    styles.fileMetaText,
                                    {
                                      color: COLORS.textLight,
                                      marginHorizontal: 4,
                                    },
                                  ]}
                                >
                                  •
                                </Text>
                                <Ionicons
                                  name="cloud-done-outline"
                                  size={12}
                                  color={COLORS.textLight}
                                />
                                <Text
                                  style={[
                                    styles.fileMetaText,
                                    { color: COLORS.textLight, marginLeft: 2 },
                                  ]}
                                >
                                  Đã có trên Cloud
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={styles.downloadIconBtn}
                              onPress={() => Linking.openURL(displayContent)}
                            >
                              <Ionicons
                                name="download-outline"
                                size={20}
                                color={COLORS.text}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color: isMe ? COLORS.headerText : COLORS.text,
                            paddingRight: 5,
                          },
                        ]}
                      >
                        {isAiGenerated && (
                          <Text
                            style={{
                              color: isMe ? "#E9D5FF" : "#C084FC",
                              fontWeight: "900",
                            }}
                          >
                            @PulseAI{" "}
                          </Text>
                        )}
                        {displayContent}
                      </Text>
                    );
                  })()
                )}
              </View>

              {showTime &&
                !item.isSending &&
                item.type !== "call" &&
                item.type !== "file" && (
                  <Text
                    style={[
                      styles.messageTime,
                      {
                        alignSelf: isMe ? "flex-end" : "flex-start",
                        color: isMe
                          ? "rgba(255,255,255,0.7)"
                          : COLORS.textLight,
                      },
                    ]}
                  >
                    {formatTime(item.createdAt)}
                  </Text>
                )}
              {showTime && (item.type === "call" || item.type === "file") && (
                <Text
                  style={[
                    styles.messageTime,
                    {
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      color: COLORS.textLight,
                      marginTop: 4,
                    },
                  ]}
                >
                  {formatTime(item.createdAt)}
                </Text>
              )}
              {item.isSending && (
                <Text
                  style={[
                    styles.messageTime,
                    {
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      color: COLORS.textLight,
                    },
                  ]}
                >
                  {t.updating}
                </Text>
              )}

              {shouldShowReactionCorner && !item.isSending && (
                <View style={styles.reactionContainer}>
                  {hasReactions ? (
                    <TouchableOpacity
                      style={styles.reactionSummary}
                      onPress={() => openReactionDetails(item)}
                    >
                      <Text style={styles.reactionEmojiPreview}>
                        {reactionPreview}
                      </Text>
                      <Text style={styles.reactionCountText}>
                        {totalReactions}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.defaultLike}
                      onPress={() => handleToggleReact(item, "👍")}
                    >
                      <Ionicons
                        name="heart-outline"
                        size={13}
                        color={COLORS.textLight}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (!viewableItems || viewableItems.length === 0) return;
      const lastVisibleItem = viewableItems[viewableItems.length - 1];
      const lastMessageIndex = messages.length - 1;
      if (lastVisibleItem?.index === lastMessageIndex) {
        clearLocalUnread(conversationId);
      }
    },
    [messages.length, conversationId, clearLocalUnread],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 });
  const onViewableItemsChangedRef = useRef(handleViewableItemsChanged);
  useEffect(() => {
    onViewableItemsChangedRef.current = handleViewableItemsChanged;
  }, [handleViewableItemsChanged]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
        translucent={false}
      />
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.headerName}>{chatName || "Chat"}</Text>
              {isMutedState && (
                <Ionicons
                  name="notifications-off"
                  size={14}
                  color="rgba(255,255,255,0.75)"
                />
              )}
            </View>
            <Text style={styles.headerStatus}>Trực tuyến</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* Ẩn các nút chức năng này nếu nhóm đã bị giải tán */}
          {!isGroupDisbanded && (
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleSummarizeChat}
                disabled={isSummarizing}
              >
                {isSummarizing ? (
                  <ActivityIndicator size="small" color="#FFD700" />
                ) : (
                  <Ionicons name="sparkles" size={24} color="#FFD700" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="call-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="videocam-outline" size={26} color="white" />
              </TouchableOpacity>
            </>
          )}

          {/* Vẫn giữ lại nút Menu để user có thể vào xem chi tiết/xóa nhóm */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              navigation.navigate("ConversationDetail", {
                id: conversationId,
                name: chatName,
                isGroup: isGroup,
              })
            }
          >
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {isGroupDisbanded ? (
          // ── GIAO DIỆN KHI NHÓM ĐÃ GIẢI TÁN (GIỐNG ZALO ẢNH 2) ──
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              alignItems: "center",
              paddingBottom: 24,
            }}
          >
            <View style={styles.dateDivider}>
              <Text style={styles.dateDividerText}>
                {formatMessageDate(new Date().toISOString())}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: isDarkMode ? "#1E293B" : "#E2E8F0",
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ color: COLORS.text, fontSize: 14 }}>
                {disbandMessage || "Trưởng nhóm đã giải tán nhóm."}
              </Text>
              <TouchableOpacity onPress={handleDeleteDisbandedChat}>
                <Text style={{ color: "#3B82F6", fontSize: 14, marginLeft: 6 }}>
                  Xoá trò chuyện
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // ── GIAO DIỆN HIỂN THỊ TIN NHẮN BÌNH THƯỜNG ──
          <>
            <FlatList
              ref={flatListRef}
              inverted={true}
              data={groupedMessages}
              keyExtractor={(item, index) => `${item._id ?? "msg"}_${index}`}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                !hasMore && messages.length > 0 ? (
                  <Text
                    style={{
                      textAlign: "center",
                      color: COLORS.textLight,
                      paddingVertical: 10,
                    }}
                  >
                    Đã tải hết lịch sử trò chuyện
                  </Text>
                ) : isFetchingMore ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.primary}
                    style={{ marginVertical: 10 }}
                  />
                ) : null
              }
              onViewableItemsChanged={(info) =>
                onViewableItemsChangedRef.current(info)
              }
              viewabilityConfig={viewabilityConfig.current}
            />

            {pendingMedia.length > 0 && (
              <View style={styles.pendingContainerWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pendingContainer}
                >
                  {pendingMedia.map((media, index) => (
                    <View key={index} style={styles.pendingMediaWrap}>
                      <TouchableOpacity
                        style={styles.removePendingBtn}
                        onPress={() => {
                          const newPending = [...pendingMedia];
                          newPending.splice(index, 1);
                          setPendingMedia(newPending);
                        }}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </TouchableOpacity>

                      {media.attachmentType === "media" ? (
                        <Image
                          source={{ uri: media.uri }}
                          style={styles.pendingImage}
                        />
                      ) : (
                        <View style={styles.pendingFile}>
                          <Ionicons
                            name="document-text"
                            size={30}
                            color={COLORS.primary}
                          />
                        </View>
                      )}
                      {(media.type === "video" ||
                        media.mimeType?.startsWith("video/")) && (
                        <View style={styles.pendingVideoIcon}>
                          <Ionicons name="videocam" size={14} color="#FFF" />
                        </View>
                      )}
                      {media.attachmentType === "file" && (
                        <Text
                          style={styles.pendingFileNameOverlay}
                          numberOfLines={1}
                        >
                          {media.name || t.messageAttachmentDocument}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {isGroupDisbanded ? (
          // ── Input disabled khi nhóm đã bị giải tán ──────────────────────────
          <View
            style={[
              styles.inputContainer,
              {
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 14,
                backgroundColor: COLORS.surface,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
              },
            ]}
          >
            <Ionicons
              name="ban-outline"
              size={16}
              color={COLORS.textLight}
              style={{ marginRight: 6 }}
            />
            <Text style={{ color: COLORS.textLight, fontSize: 14 }}>
              Nhóm đã bị giải tán, bạn không thể gửi tin nhắn
            </Text>
          </View>
        ) : (
          // ── Input bình thường ────────────────────────────────────────────────
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={handlePickMedia}
              disabled={isUploading}
            >
              <Ionicons
                name="image-outline"
                size={24}
                color={COLORS.textLight}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachBtn}
              onPress={handlePickDocument}
              disabled={isUploading}
            >
              <Ionicons name="attach" size={24} color={COLORS.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachBtn}
              onPress={handleSuggestReply}
              disabled={isSuggesting}
            >
              {isSuggesting ? (
                <ActivityIndicator size="small" color="#A855F7" />
              ) : (
                <Ionicons name="sparkles" size={22} color="#A855F7" />
              )}
            </TouchableOpacity>

            <View
              style={[
                styles.textInput,
                {
                  flexDirection: "row",
                  alignItems: "flex-end",
                  paddingHorizontal: 0,
                },
              ]}
            >
              {inputText.startsWith("@PulseAI ") && (
                <Text
                  style={{
                    color: "#C084FC",
                    fontWeight: "900",
                    paddingLeft: 16,
                    paddingBottom: Platform.OS === "ios" ? 10 : 12,
                  }}
                >
                  @PulseAI
                </Text>
              )}
              <TextInput
                multiline={true}
                maxLength={2000}
                style={{
                  flex: 1,
                  color: COLORS.text,
                  paddingHorizontal: inputText.startsWith("@PulseAI ") ? 6 : 16,
                  minHeight: 40,
                  lineHeight: 20,
                  maxHeight: 70,
                  paddingTop: 10,
                  paddingBottom: 10,
                  textAlignVertical: "center",
                }}
                placeholder={t.messageInputPlaceholder}
                placeholderTextColor={COLORS.textLight}
                value={
                  inputText.startsWith("@PulseAI ")
                    ? inputText.substring(9)
                    : inputText
                }
                onChangeText={(txt) => {
                  let newText = txt;
                  if (inputText.startsWith("@PulseAI ")) {
                    newText = "@PulseAI " + txt;
                  }
                  setInputText(newText);
                  if (updateDraft && conversationId) {
                    updateDraft(conversationId, newText);
                  }
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (
                    nativeEvent.key === "Backspace" &&
                    inputText === "@PulseAI "
                  ) {
                    setInputText("");
                  }
                }}
              />
            </View>

            <TouchableOpacity onPress={handleSend} style={{ marginBottom: 2 }}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                style={styles.sendBtn}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color="white"
                  style={{ marginLeft: 3 }}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal visible={showMenu} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuBox, { top: menuPos.y }]}>
            <View style={styles.emojiRow}>
              <View
                style={styles.emojiStrip}
                onLayout={(event) =>
                  setEmojiStripWidth(event.nativeEvent.layout.width)
                }
                {...emojiPanResponder.panHandlers}
              >
                {REACTION_LIST.map((e) => {
                  const isHovered = hoveredReaction === e;
                  return (
                    <View
                      key={e}
                      style={[
                        styles.reactionEmojiWrap,
                        isHovered && styles.reactionEmojiWrapHovered,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reactionEmojiText,
                          isHovered && styles.reactionEmojiTextHovered,
                        ]}
                      >
                        {e}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveAllReactions(selectedMsg)}
                style={styles.removeAllReactionBtn}
              >
                <Ionicons
                  name="heart-dislike-outline"
                  size={Platform.OS === "android" ? 20 : 24}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.actionRow}>
              {selectedMsg?.sender?._id === currentUserId && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleRevoke}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={20}
                    color={COLORS.badge}
                  />
                  <Text
                    style={{
                      color: COLORS.badge,
                      marginLeft: 12,
                      fontSize: 16,
                    }}
                  >
                    {t.messageRecall}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeleteForMe}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.text} />
                <Text
                  style={{ color: COLORS.text, marginLeft: 12, fontSize: 16 }}
                >
                  {t.messageDeleteForMe}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showReactionDetails} transparent animationType="fade">
        <Pressable
          style={styles.overlay}
          onPress={() => setShowReactionDetails(false)}
        >
          <Pressable style={styles.reactionDetailBox}>
            <View style={styles.reactionDetailHeader}>
              <Text style={styles.reactionDetailTitle}>
                {t.messageReactions}
              </Text>
              <TouchableOpacity onPress={() => setShowReactionDetails(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.reactionDetailBody}>
              <View style={styles.reactionFilterCol}>
                <TouchableOpacity
                  style={[
                    styles.reactionFilterItem,
                    reactionFilter === "ALL" && styles.reactionFilterItemActive,
                  ]}
                  onPress={() => setReactionFilter("ALL")}
                >
                  <Text style={styles.reactionFilterLabel}>Tất cả</Text>
                  <Text style={styles.reactionFilterCount}>
                    {reactionGroupsForModal.reduce(
                      (acc, group) => acc + group.count,
                      0,
                    )}
                  </Text>
                </TouchableOpacity>
                {reactionGroupsForModal.map((group) => (
                  <TouchableOpacity
                    key={group.emoji}
                    style={[
                      styles.reactionFilterItem,
                      reactionFilter === group.emoji &&
                        styles.reactionFilterItemActive,
                    ]}
                    onPress={() => setReactionFilter(group.emoji)}
                  >
                    <Text style={styles.reactionFilterLabel}>
                      {group.emoji}
                    </Text>
                    <Text style={styles.reactionFilterCount}>
                      {group.count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.reactionUsersCol}>
                <FlatList
                  data={reactionUsersForModal}
                  keyExtractor={(reaction: any, index) =>
                    `${reaction.userId}-${reaction.emoji || "ALL"}-${index}`
                  }
                  renderItem={({ item: reaction }: { item: any }) => {
                    const userName = reaction.userName;
                    const avatar = reaction.avatar;
                    const isAllFilter = reactionFilter === "ALL";
                    const rightEmojiText = isAllFilter
                      ? (reaction.emojis || []).join(" ")
                      : reaction?.emoji;
                    const rightCountText = isAllFilter
                      ? reaction.totalCount
                      : reaction?.count;
                    return (
                      <View style={styles.reactionUserRow}>
                        {avatar ? (
                          <Image
                            source={{ uri: avatar }}
                            style={styles.reactionUserAvatar}
                          />
                        ) : (
                          <View style={styles.reactionUserAvatarFallback}>
                            <Text style={styles.reactionUserAvatarText}>
                              {userName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.reactionUserName}>{userName}</Text>
                        <View style={styles.reactionUserRight}>
                          <Text style={styles.reactionUserEmoji}>
                            {rightEmojiText}
                          </Text>
                          <Text style={styles.reactionUserCount}>
                            {rightCountText}
                          </Text>
                        </View>
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={styles.reactionEmptyText}>
                      {t.messageNoReactions}
                    </Text>
                  }
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAiModal} transparent animationType="fade">
        <View style={styles.aiOverlay}>
          <BlurView
            intensity={30}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.aiContainer}>
            <LinearGradient
              colors={["#1e1b4b", "#0f172a"]}
              style={styles.aiHeader}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="sparkles"
                  size={20}
                  color="#A78BFA"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.aiTitle}>{t.messageAiSummaryTitle}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAiModal(false)}>
                <Ionicons name="close-circle" size={24} color="#475569" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView
              style={styles.aiContent}
              showsVerticalScrollIndicator={false}
            >
              {isAiProcessing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.loadingText}>{t.messageAiDecoding}</Text>
                </View>
              ) : (
                <Text style={styles.aiText}>{renderAiText(aiSummaryText)}</Text>
              )}
            </ScrollView>
            {!isAiProcessing && (
              <View style={styles.aiFooter}>
                <TouchableOpacity
                  onPress={() => setShowAiModal(false)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#5b21b6", "#1e1b4b"]}
                    style={styles.aiBtn}
                  >
                    <Text style={styles.aiBtnText}>Đã hiểu</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!previewMedia} transparent={true} animationType="fade">
        <View style={styles.imagePreviewContainer}>
          <TouchableOpacity
            style={styles.closePreviewBtn}
            onPress={() => setPreviewMedia(null)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          {previewMedia && (
            <FlatList
              data={previewMedia.items}
              keyExtractor={(item, index) => item.id + "_" + index}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={previewMedia.initialIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              renderItem={({ item }) => (
                <View
                  style={{
                    width: SCREEN_WIDTH,
                    height: SCREEN_HEIGHT,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {item.isVideo ? (
                    <VideoViewer url={item.url} />
                  ) : (
                    <Image
                      source={{ uri: item.url }}
                      style={styles.fullScreenImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (COLORS: any, isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      paddingVertical: 12,
      paddingTop: Platform.OS === "android" ? 40 : 10,
    },
    headerLeft: { flexDirection: "row", alignItems: "center" },
    backBtn: { marginRight: 10 },
    headerName: { color: COLORS.headerText, fontSize: 18, fontWeight: "600" },
    headerStatus: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
    headerRight: { flexDirection: "row", alignItems: "center" },
    iconBtn: { marginLeft: 16 },
    chatArea: { flex: 1, backgroundColor: COLORS.background },
    listContent: { paddingHorizontal: 16, paddingVertical: 20 },
    messageWrapper: {
      flexDirection: "row",
      alignItems: "flex-end",
      marginBottom: 10,
    },
    aiOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 25,
    },
    aiContainer: {
      width: "100%",
      backgroundColor: "#0F172A",
      borderRadius: 30,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#1E293B",
      shadowColor: "#8B5CF6",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 20,
    },
    aiHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: "#1E293B",
    },
    aiTitle: {
      color: "#F8FAFC",
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 2,
    },
    aiText: {
      color: "#E2E8F0",
      fontSize: 16,
      lineHeight: 28,
      textAlign: "left",
    },
    loadingContainer: { paddingVertical: 40, alignItems: "center" },
    loadingText: {
      marginTop: 15,
      color: "#94A3B8",
      fontSize: 14,
      fontStyle: "italic",
    },
    aiBtn: {
      paddingVertical: 15,
      borderRadius: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#4C1D95",
    },
    aiBtnText: {
      color: "#DDD6FE",
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 1,
    },
    aiLink: {
      color: "#8B5CF6",
      textDecorationLine: "underline",
      fontWeight: "bold",
    },
    messageWrapperMe: { justifyContent: "flex-end" },
    messageWrapperOther: { justifyContent: "flex-start" },
    avatarPlaceholder: { width: 35, marginRight: 8 },
    avatarSmall: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
    messageContent: { maxWidth: "75%" },
    bubble: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 15,
      borderRadius: 18,
      position: "relative",
      minWidth: 60,
      marginBottom: 5,
    },
    bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 2 },
    bubbleOther: {
      backgroundColor: COLORS.surface,
      borderWidth: isDarkMode ? 1 : 1,
      borderColor: COLORS.border,
      borderBottomLeftRadius: 2,
    },
    messageText: { fontSize: 16, lineHeight: 22, paddingRight: 5 },
    messageTime: {
      fontSize: 11,
      color: COLORS.textLight,
      marginTop: 4,
      alignSelf: "flex-end",
    },
    dateDivider: { alignItems: "center", marginVertical: 15 },
    dateDividerText: {
      backgroundColor: COLORS.border,
      color: COLORS.textLight,
      fontSize: 12,
      fontWeight: "600",
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 12,
      overflow: "hidden",
    },
    systemMessageWrapper: {
      alignItems: "center",
      marginVertical: 6,
      paddingHorizontal: 24,
    },
    systemMessageText: { fontSize: 12, textAlign: "center", lineHeight: 17 },
    inputContainer: {
      flexDirection: "row",
      padding: 10,
      backgroundColor: COLORS.surface,
      alignItems: "flex-end",
      borderTopWidth: 1,
      borderColor: COLORS.border,
    },
    attachBtn: {
      padding: 6,
      marginBottom: 4,
    },
    textInput: {
      flex: 1,
      backgroundColor: COLORS.background,
      color: COLORS.text,
      borderRadius: 20,
      paddingHorizontal: 16,
      minHeight: 40,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
    },
    reactionContainer: {
      position: "absolute",
      bottom: -8,
      right: -8,
      flexDirection: "row",
      zIndex: 2,
    },
    miniReact: {
      width: 24,
      height: 24,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: "center",
      alignItems: "center",
      elevation: 2,
    },
    reactionSummary: {
      minHeight: 24,
      minWidth: 40,
      paddingHorizontal: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      elevation: 2,
    },
    reactionEmojiPreview: { fontSize: 11 },
    reactionCountText: { fontSize: 11, fontWeight: "700", color: COLORS.text },
    defaultLike: {
      width: 24,
      height: 24,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: "center",
      alignItems: "center",
      opacity: 0.75,
    },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    reactionDetailBox: {
      position: "absolute",
      top: "20%",
      alignSelf: "center",
      width: "92%",
      maxHeight: 430,
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    reactionDetailHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    reactionDetailTitle: {
      fontSize: 30,
      fontWeight: "700",
      color: COLORS.text,
    },
    reactionDetailBody: {
      flexDirection: "row",
      minHeight: 260,
      maxHeight: 360,
    },
    reactionFilterCol: {
      width: 115,
      backgroundColor: isDarkMode ? "#0F172A" : "#F3F4F6",
    },
    reactionFilterItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    reactionFilterItemActive: {
      backgroundColor: isDarkMode ? "#11182D" : "#E5E7EB",
    },
    reactionFilterLabel: {
      color: COLORS.text,
      fontSize: 20,
      fontWeight: "500",
    },
    reactionFilterCount: {
      color: COLORS.text,
      fontSize: 18,
      fontWeight: "600",
    },
    reactionUsersCol: {
      flex: 1,
      backgroundColor: COLORS.surface,
      paddingVertical: 8,
    },
    reactionUserRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    reactionUserAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 10,
    },
    reactionUserAvatarFallback: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.surfaceSoft,
    },
    reactionUserAvatarText: {
      color: COLORS.text,
      fontWeight: "700",
      fontSize: 14,
    },
    reactionUserName: {
      flex: 1,
      color: COLORS.text,
      fontSize: 20,
      fontWeight: "500",
    },
    reactionUserRight: {
      flexDirection: "row",
      alignItems: "center",
      maxWidth: "48%",
    },
    reactionUserEmoji: {
      color: COLORS.text,
      fontSize: 22,
      marginRight: 8,
      textAlign: "right",
      flexShrink: 1,
    },
    reactionUserCount: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
    reactionEmptyText: {
      textAlign: "center",
      color: COLORS.textLight,
      paddingVertical: 20,
    },
    menuBox: {
      position: "absolute",
      alignSelf: "center",
      backgroundColor: COLORS.surface,
      width: "85%",
      borderRadius: 25,
      padding: 10,
      elevation: 10,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: COLORS.border,
    },
    emojiRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 0.5,
      borderBottomColor: COLORS.border,
      paddingHorizontal: 8,
    },
    emojiStrip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      marginRight: 6,
    },
    reactionEmojiWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    reactionEmojiWrapHovered: {
      backgroundColor: COLORS.surfaceSoft,
      transform: [{ translateY: -6 }],
    },
    reactionEmojiText: { fontSize: 33 },
    reactionEmojiTextHovered: { fontSize: 40 },
    removeAllReactionBtn: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 4,
    },
    actionRow: { paddingVertical: 5 },
    menuItem: { flexDirection: "row", alignItems: "center", padding: 15 },
    aiContent: { maxHeight: 350, paddingHorizontal: 20, paddingVertical: 20 },
    aiFooter: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },

    mediaImage: {
      width: 240,
      height: 300,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: "rgba(0,0,0,0.1)",
    },
    playIconOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.15)",
      borderRadius: 16,
    },

    fileCard: {
      width: 240,
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
      marginBottom: 5,
    },
    fileCardPreview: {
      height: 120,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    fileCardInfo: {
      flexDirection: "row",
      padding: 12,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    fileTypeBadge: {
      width: 40,
      height: 40,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    fileTypeBadgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "bold",
    },
    fileNameCardText: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 4,
    },
    fileMetaRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    fileMetaText: {
      fontSize: 11,
    },
    downloadIconBtn: {
      padding: 6,
      backgroundColor: COLORS.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    imagePreviewContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
      alignItems: "center",
    },
    closePreviewBtn: {
      position: "absolute",
      top: Platform.OS === "ios" ? 50 : 40,
      right: 20,
      zIndex: 10,
      padding: 10,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 20,
    },
    fullScreenImage: {
      width: "100%",
      height: "80%",
    },
    pendingContainerWrap: {
      backgroundColor: COLORS.surface,
      borderTopWidth: 1,
      borderColor: COLORS.border,
    },
    pendingContainer: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    pendingMediaWrap: {
      position: "relative",
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 15,
    },
    pendingImage: { width: "100%", height: "100%", borderRadius: 8 },
    pendingFile: {
      width: "100%",
      height: "100%",
      borderRadius: 8,
      backgroundColor: COLORS.surfaceSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    removePendingBtn: {
      position: "absolute",
      top: -8,
      right: -8,
      backgroundColor: COLORS.badge,
      width: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    pendingFileNameOverlay: {
      position: "absolute",
      bottom: -18,
      left: 0,
      width: 60,
      fontSize: 10,
      color: COLORS.text,
      textAlign: "center",
    },
    pendingVideoIcon: {
      position: "absolute",
      bottom: 4,
      left: 4,
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: 2,
      borderRadius: 4,
    },

    imageGridContainer: {
      width: 240,
      marginTop: 5,
      backgroundColor: "transparent",
      borderWidth: 0.5,
      borderColor: "rgba(0,0,0,0.05)",
    },
    gridRow: { flexDirection: "row", justifyContent: "space-between" },
    gridCol: { flexDirection: "column" },
    gridImageWrapper: { backgroundColor: "#E2E8F0", overflow: "hidden" },
    fullImage: { width: "100%", height: "100%" },
    moreOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
    },
    moreText: { color: "white", fontSize: 24, fontWeight: "700" },
    callCard: {
      minWidth: 220,
      maxWidth: 280,
      padding: 0,
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 5,
    },
    callCardTop: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    callIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    callInfo: {
      flex: 1,
    },
    callTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 3,
    },
    callSubtitle: {
      fontSize: 13,
    },
    callDivider: {
      height: 1,
      width: "100%",
    },
    callActionBtn: {
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    callActionText: {
      fontSize: 15,
      fontWeight: "600",
    },
  });

export default MessageScreen;
