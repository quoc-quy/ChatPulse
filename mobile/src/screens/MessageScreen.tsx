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
import { useVideoPlayer, VideoView } from 'expo-video';
import { E2E } from "../utils/e2e.utils"; // Import file tiện ích E2E đã tạo
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
import {
  useRoute,
  useNavigation,
} from "@react-navigation/native";
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

// IMPORT useChatContext để xoá badge khi đọc xong
import { useChatContext } from "../contexts/ChatContext";

import {
  getMessages,
  sendMessage,
  reactMessage as reactMessageApi,
  recallMessage as recallMessageApi,
  deleteMessageForMe as deleteMessageForMeApi,
  summarizeChatApi,
  getConversationDetail,
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
  fileBg: "#F0F4F8", // Màu nền card file
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
  fileBg: "#1E293B", // Màu nền card file dark
};

const REACTION_LIST = ["👍", "❤️", "🤣", "😮", "😭", "😡"];

const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'msi', 'scr', 'vbs', 'sh', 'ps1', 'jar', 'sys', 'dll'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // Tăng lên 50MB để cho phép gửi video

// Hàm định dạng dung lượng file
const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Hàm lấy màu và chữ cho icon File
const getFileIconInfo = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { color: '#EF4444', label: 'PDF' };
  if (['doc', 'docx'].includes(ext || '')) return { color: '#3B82F6', label: 'DOC' };
  if (['xls', 'xlsx'].includes(ext || '')) return { color: '#10B981', label: 'XLS' };
  if (['zip', 'rar'].includes(ext || '')) return { color: '#8B5CF6', label: 'ZIP' };
  return { color: '#64748B', label: 'FILE' };
};

// ✅ HÀM TIỆN ÍCH DÙNG CHUNG ĐỂ BỎ LƯU TRỮ KHI CÓ TIN NHẮN MỚI
const unarchiveChat = async (conversationId: string) => {
  try {
    const stored = await AsyncStorage.getItem("archived_chats");
    if (stored) {
      let archivedArray: string[] = JSON.parse(stored);
      const index = archivedArray.findIndex((key: string) => key.startsWith(`${conversationId}:`) || key === conversationId);
      if (index !== -1) {
        archivedArray.splice(index, 1);
        await AsyncStorage.setItem("archived_chats", JSON.stringify(archivedArray));
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
  const lastTap = useRef(0);
  const { id } = route.params || {};

  const { isDarkMode } = useTheme();
  const { language, t } = useTranslation();
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(
    () => getStyles(COLORS, isDarkMode),
    [isDarkMode, COLORS]
  );

  const { clearLocalUnread, drafts, updateDraft } = useChatContext() as any;

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
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
  const [myPrivateKey, setMyPrivateKey] = useState<string>("");
  const [myPublicKey, setMyPublicKey] = useState<string>("");
  const [targetPublicKey, setTargetPublicKey] = useState<string>("");
  const [isE2EEnabled, setIsE2EEnabled] = useState<boolean>(true); // Bật/tắt E2E (Tùy chọn)

  const [pendingMedia, setPendingMedia] = useState<any[]>([]);
  // Thay thế dòng cũ bằng dòng này:
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

  const formatDuration = (seconds: number) => {
    if (!seconds) return t.messageDurationZero;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h} ${t.messageHour} ${m} ${t.messageMinute}`;
    if (m > 0) return `${m} ${t.messageMinute} ${s} ${t.messageSecond}`;
    return `${s} ${t.messageSecond}`;
  };

  const processEncryptedMessages = (rawMsgs: any[], privateKey: string, myId: string) => {
    return rawMsgs.map((msg) => {
      // Chỉ giải mã nếu tin nhắn là E2E và là text
      if (msg.isE2E && msg.type === "text" && msg.encryptedKeys) {

        // Lấy chìa khóa đã mã hóa dành riêng cho ID của mình
        const myEncryptedAesKey = msg.encryptedKeys[myId];

        if (myEncryptedAesKey && privateKey) {
          // 1. Giải mã khóa AES bằng Private Key của mình
          const aesKey = E2E.decryptAESKeyWithRSA(myEncryptedAesKey, privateKey);
          if (aesKey) {
            // 2. Giải mã nội dung bằng khóa AES
            const decryptedContent = E2E.decryptMessageAES(msg.content, aesKey);
            msg.content = decryptedContent;
          } else {
            msg.content = "🔒 Lỗi giải mã khóa AES";
          }
        } else {
          // 🔴 BẮT BỆNH: In ra log xem thiếu myId hay thiếu PrivateKey
          console.log("❌ LỖI QUYỀN GIẢI MÃ:");
          console.log("- myId đang tìm:", myId);
          console.log("- Các ID có trong tin nhắn:", Object.keys(msg.encryptedKeys));
          console.log("- Có PrivateKey chưa:", !!privateKey);

          msg.content = "🔒 Không có quyền giải mã";
        }
      }
      return msg;
    });
  };

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
    const player = useVideoPlayer({ uri: url }, p => p.pause());
    return (
      <View style={{ width: 240, height: 300, borderRadius: 16, overflow: 'hidden' }}>
        <VideoView
          style={{ width: '100%', height: '100%' }}
          player={player}
          nativeControls={false}
          contentFit="cover"
        />
        <View style={styles.playIconOverlay}>
          <Ionicons name="play-circle" size={54} color="rgba(255, 255, 255, 0.85)" />
        </View>
      </View>
    );
  };

  const VideoViewer = ({ url }: { url: string }) => {
    const player = useVideoPlayer({ uri: url }, player => {
      player.loop = true;
      player.play();
    });

    return (
      <VideoView
        style={{ width: '100%', height: '100%' }}
        player={player}
        nativeControls={true} // <-- Thêm dòng này để hiện nút Play/Pause
        allowsFullscreen
        allowsPictureInPicture
      />
    );
  };

  // ✅ SỬA LỖI VIDEO: Thêm thông số videoQuality và kiểm tra đúng mimeType
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
        const isVideo = asset.type === "video" || asset.uri.match(/\.(mp4|mov|avi|mkv)$/i);
        validAssets.push({
          ...asset,
          attachmentType: "media",
          detectedType: isVideo ? "video" : "image"
        });
      }
      if (validAssets.length > 0) {
        setPendingMedia((prev) => [...prev, ...validAssets]);
      }
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
          Alert.alert(t.error || "Lỗi", `Không thể gửi file lớn hơn ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
          continue;
        }

        const fileName = asset.name || "";
        const extension = fileName.split('.').pop()?.toLowerCase() || "";
        if (BLOCKED_EXTENSIONS.includes(extension)) {
          Alert.alert("Lỗi bảo mật", `Không được phép gửi tệp tin định dạng .${extension}`);
          continue;
        }
        // Lưu kèm fileSize để hiển thị trên UI
        validAssets.push({ ...asset, attachmentType: "file", fileSize: asset.size });
      }
      if (validAssets.length > 0) {
        setPendingMedia((prev) => [...prev, ...validAssets]);
      }
    }
  };

  const uploadAttachment = async (fileData: any, type: "media" | "file") => {
    setIsUploading(true);

    const isVideoFile = fileData.type === "video" || fileData.uri.split('?')[0].match(/\.(mp4|mov)$/i);
    const mediaType = type === "media" ? (isVideoFile ? "video" : "image") : type;

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
      let fileName = fileData.name || fileData.fileName || fileData.uri.split('/').pop();

      if (type === "media") {
        if (isVideoFile) {
          mimeType = mimeType || "video/mp4";
          fileName = fileName || `video_${Date.now()}.mp4`;
        } else {
          mimeType = mimeType || "image/jpeg";
          fileName = fileName || `image_${Date.now()}.jpg`;
        }
      } else {
        // Xử lý riêng cho DocumentPicker để giữ đúng định dạng file
        mimeType = mimeType || "application/octet-stream";
        fileName = fileName || `file_${Date.now()}`;
      }

      // ✅ FIX Ở ĐÂY: Thêm trường `mimeType` để tương thích với cấu trúc của chat.api.ts
      const formattedFile = {
        uri: fileData.uri,
        name: fileName,
        type: mimeType,
        mimeType: mimeType // Bắt buộc phải có để API lấy đúng đuôi file thay vì fallback
      };

      const res = await sendMediaMessage(conversationId, formattedFile, type);
      const realMessage = res.data?.result || res.data;

      if (realMessage) {
        setMessages((prev) => prev.map((msg) => (msg._id === tempId ? realMessage : msg)));

        // Gọi hàm bỏ lưu trữ chat khi gửi file thành công
        unarchiveChat(conversationId);
      }
    } catch (error: any) {
      console.log("Lỗi upload:", error);
      const errorMessage = error.response?.data?.message || t.messageAttachmentFailed || "Không thể gửi tệp đính kèm.";

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
    console.log("=== KIỂM TRA LÚC BẤM NÚT GỬI ===");
    console.log("1. isE2EEnabled:", isE2EEnabled);
    console.log("2. targetUserId:", targetUserId || "THIẾU (undefined)");
    console.log("3. myPublicKey có chưa:", myPublicKey ? "CÓ" : "THIẾU");
    console.log("4. targetPublicKey có chưa:", targetPublicKey ? "CÓ" : "THIẾU");

    if (textToSend.length > 2000) {
      Alert.alert(
        t.error || "Cảnh báo",
        `Tin nhắn quá dài (${textToSend.length}/2000 ký tự). Vui lòng rút gọn nội dung trước khi gửi.`
      );
      return;
    }

    const mediaToSend = [...pendingMedia];
    if (textToSend.length === 0 && mediaToSend.length === 0) return;

    setInputText("");
    setPendingMedia([]);
    if (updateDraft && conversationId) updateDraft(conversationId, "");

    if (textToSend.length > 0) {
      // ... KHAI BÁO BIẾN MỚI CHO E2E
      let finalContent = textToSend;
      let isE2E = false;
      let finalEncryptedKeys: Record<string, string> = {};

      // Nếu là chat 1-1, có khóa của đối phương và E2E đang bật
      if (isE2EEnabled && targetPublicKey && myPublicKey && targetUserId) {
        isE2E = true;
        // 1. Tạo khóa AES ngẫu nhiên
        const aesKey = await E2E.generateRandomAESKey();


        // 2. Mã hóa nội dung
        finalContent = E2E.encryptMessageAES(textToSend, aesKey);

        // 3. Mã hóa khóa AES cho mình và cho người nhận
        finalEncryptedKeys[currentUserId] = E2E.encryptAESKeyWithRSA(aesKey, myPublicKey);
        finalEncryptedKeys[targetUserId] = E2E.encryptAESKeyWithRSA(aesKey, targetPublicKey);
      }

      const tempId = Date.now().toString();
      const tempMessage = {
        _id: tempId,
        conversationId,
        type: "text",
        content: textToSend, // UI vẫn hiển thị text gốc cho mượt
        createdAt: new Date().toISOString(),
        sender: { _id: currentUserId, userName: t.messageMe },
        isSending: true,
        isE2E: isE2E // Hiển thị biểu tượng 🔒 nếu muốn
      };
      setMessages((prev) => [tempMessage, ...prev]);

      try {
        // TRUYỀN THÊM isE2E và finalEncryptedKeys VÀO API
        const res = await sendMessage(conversationId, finalContent, "text", isE2E, finalEncryptedKeys);
        let realMessage = res.data.result || res.data;

        if (realMessage) {
          // Vì backend trả về ciphertext, ta cần gắn lại plaintext để UI hiển thị đúng
          if (realMessage.isE2E) {
            realMessage.content = textToSend;
          }
          setMessages((prev) => prev.map((msg) => (msg._id === tempId ? realMessage : msg)));
          unarchiveChat(conversationId);
        }
      } catch (error: any) {
        console.log("Lỗi khi gửi text:", error);
        const errorMessage = error.response?.data?.message || "Không thể gửi tin nhắn. Vui lòng thử lại.";

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

  const loadMoreMessages = async () => {
    if (!hasMore || isFetchingMore || !cursor) return;
    try {
      setIsFetchingMore(true);
      const res = await getMessages(conversationId, cursor, 20);
      const rawData = res.data.result || res.data.data || [];
      if (rawData.length > 0) {
        setCursor(rawData[rawData.length - 1]._id);

        // GIẢI MÃ THÊM TẠI ĐÂY
        const processedData = processEncryptedMessages(rawData, myPrivateKey, currentUserId);
        setMessages((prev) => [...prev, ...processedData]);
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
        .catch((error) => {
          console.log("Lỗi khi đánh dấu đã xem tin nhắn:", error);
          clearLocalUnread(id);
        });
    }
  }, [id]);

  const fetchCurrentUserId = async (): Promise<string | undefined> => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        const decoded: any = jwtDecode(token);
        const userId = decoded.user_id || decoded._id || decoded.id;
        setCurrentUserId(userId);
        return userId;
      }
    } catch (error) {
      console.log("Lỗi token:", error);
    }
    return undefined;
  };
  useEffect(() => {
    const loadKeys = async () => {
      // 1. LẤY HOẶC TẠO KHÓA CỦA CHÍNH MÌNH
      let privateK = await AsyncStorage.getItem("rsa_private_key");
      let publicK = await AsyncStorage.getItem("rsa_public_key");

      if (!privateK || !publicK) {
        console.log("⚠️ Máy này chưa có khóa RSA, đang tạo mới...");
        const keys = await E2E.generateRSAKeys(); // Sẽ không bị đơ nữa
        privateK = keys.privateKey;
        publicK = keys.publicKey;

        await AsyncStorage.setItem("rsa_private_key", privateK);
        await AsyncStorage.setItem("rsa_public_key", publicK);
        console.log("✅ Đã tạo khóa thành công!");
      }

      setMyPrivateKey(privateK);
      setMyPublicKey(publicK);

      // 2. LẤY KHÓA CỦA ĐỐI PHƯƠNG
      if (conversationId && targetUserId) {
        try {
          const res = await getConversationDetail(conversationId);
          const members = res.data?.result?.members || [];

          const targetUser = members.find((m: any) =>
            m.userId?.toString() === targetUserId ||
            m.user_id?.toString() === targetUserId ||
            m._id?.toString() === targetUserId
          );

          if (targetUser && targetUser.publicKey) {
            setTargetPublicKey(targetUser.publicKey);
          } else {
            // 🔴 DÙNG TẠM ĐỂ TEST: Nếu Database bạn chưa lưu publicKey của user kia, 
            // thì hãy mượn tạm khóa public của chính bạn để mã hóa, như vậy app sẽ không bị lỗi
            setTargetPublicKey(publicK);
          }
        } catch (e) {
          console.log("Lỗi gọi API getConversationDetail:", e);
        }
      }
    };

    loadKeys();
  }, [conversationId, targetUserId]);

  // Truyền thẳng userId vào hàm thay vì đợi State cập nhật
  const fetchInitialMessages = async (activeUserId?: string) => {
    if (!conversationId) return;

    // Sử dụng ID được truyền vào, nếu không có mới dùng currentUserId
    const uId = activeUserId || currentUserId;

    try {
      setLoading(true);
      const res = await getMessages(conversationId, null, 20);
      const rawData = res.data.result || res.data.data || [];
      if (rawData.length > 0) setCursor(rawData[rawData.length - 1]._id);
      if (rawData.length < 20) setHasMore(false);

      // Đảm bảo PrivateKey không bị rỗng ngay lần đầu mở màn hình
      let pkToDecrypt = myPrivateKey;
      if (!pkToDecrypt) {
        pkToDecrypt = await AsyncStorage.getItem("rsa_private_key") || "";
        if (pkToDecrypt) setMyPrivateKey(pkToDecrypt);
      }

      // GIẢI MÃ VỚI ID CHUẨN
      const processedData = processEncryptedMessages(rawData, pkToDecrypt, uId);
      setMessages(processedData);
    } catch (error: any) {
      console.log("Lỗi tải tin nhắn:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMuteState = async (userId: string) => {
    if (!conversationId || !userId) return;
    try {
      const res = await getConversationDetail(conversationId);
      const conv = res.data?.result;
      const myMember = (conv?.members || []).find(
        (m: any) => m.userId?.toString() === userId
      );
      if (myMember?.hasMuted !== undefined) {
        setIsMutedState(myMember.hasMuted);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchCurrentUserId().then((userId?: string) => {
      // ✅ TRUYỀN `userId` VÀO ĐÂY ĐỂ TRÁNH BẤT ĐỒNG BỘ
      fetchInitialMessages(userId);
      if (userId) fetchMuteState(userId);
    });
  }, [conversationId]);

  const groupedMessages = useMemo(() => {
    const result = [];
    let currentGroup: any = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const urlLower = msg.content?.split('?')[0].toLowerCase() || "";

      // ✅ FIX: Phân loại rõ ràng từ đầu để Document không bị gom chung vào mảng Grid Ảnh
      const isVideo = msg.type === "video" || urlLower.match(/\.(mp4|mov|avi|mkv)$/i);
      const isDocument = msg.type === "file" || urlLower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv)$/i);
      const isImage = (msg.type === "media" || msg.type === "image" || urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && !isVideo && !isDocument;

      if (isImage && !msg.isSending) {
        if (currentGroup && currentGroup.senderId === (msg.sender?._id || msg.senderId)) {
          const timeDiff = Math.abs(new Date(currentGroup.createdAt).getTime() - new Date(msg.createdAt).getTime());
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
          images: [msg]
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

  const handleSummarizeChat = async () => {
    if (unreadCount === 0) {
      Alert.alert(t.chatNotice, t.messageAllRead);
      return;
    }
    setIsSummarizing(true);
    setShowAiModal(true);
    setIsAiProcessing(true);
    setAiSummaryText("");
    try {
      const messagesToSend = messages.slice(-unreadCount);
      const response = await summarizeChatApi(messagesToSend);
      setTimeout(() => {
        if (response.data?.result) {
          setAiSummaryText(response.data.result);
        }
        setIsAiProcessing(false);
        setIsSummarizing(false);
      }, 1500);
    } catch (error) {
      setShowAiModal(false);
      setIsSummarizing(false);
      Alert.alert(t.error, t.messageAiBusy);
    }
  };

  const scrollToMessage = (messageId: string) => {
    const index = messages.findIndex((m) => m._id === messageId);
    if (index !== -1) {
      setShowAiModal(false);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      }, 300);
    }
  };

  const handleToggleReact = async (message: any, emoji: string) => {
    if (!message || message.type === "revoked") return;
    try {
      const response = await reactMessageApi(message._id, emoji);
      const apiReactions =
        response?.data?.result?.reactions ||
        response?.data?.result?.value?.reactions ||
        null;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== message._id) return msg;
          if (Array.isArray(apiReactions)) {
            return { ...msg, reactions: apiReactions };
          }
          const currentReactions = Array.isArray(msg.reactions)
            ? msg.reactions
            : [];
          const nextReactions = [
            ...currentReactions,
            {
              emoji,
              user_id: currentUserId,
              user: { _id: currentUserId, userName: t.messageYou },
            },
          ];
          return { ...msg, reactions: nextReactions };
        })
      );
      setReactionDetailMessage((prev: any) => {
        if (!prev || prev._id !== message._id) return prev;
        return {
          ...prev,
          reactions: Array.isArray(apiReactions)
            ? apiReactions
            : prev.reactions,
        };
      });
    } catch (error) {
      console.log("Lỗi thả react :", error);
    }
    setShowMenu(false);
  };

  const handleRemoveAllReactions = async (message: any) => {
    if (!message || message.type === "revoked") return;
    try {
      const response = await reactMessageApi(message._id, "REMOVE_ALL");
      const apiReactions =
        response?.data?.result?.reactions ||
        response?.data?.result?.value?.reactions ||
        [];
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === message._id ? { ...msg, reactions: apiReactions } : msg
        )
      );
      setReactionDetailMessage((prev: any) => {
        if (!prev || prev._id !== message._id) return prev;
        return { ...prev, reactions: apiReactions };
      });
    } catch (error) {
      console.log("Lỗi xoá tất cả reaction:", error);
    }
    setShowMenu(false);
  };

  const getReactionUserId = (reaction: any) =>
    (reaction?.user?._id || reaction?.userId || reaction?.user_id || "")
      ?.toString?.()
      ?.trim?.() || "";

  const getReactionUserName = (reaction: any) => {
    const reactionUserId = getReactionUserId(reaction);
    if (reactionUserId && reactionUserId === currentUserId?.toString?.())
      return t.messageYou;
    return (
      reaction?.user?.userName ||
      reaction?.user?.displayName ||
      reaction?.userName ||
      t.messageUser
    );
  };

  const getReactionUserAvatar = (reaction: any) => reaction?.user?.avatar || "";

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
    [reactionDetailMessage, currentUserId]
  );

  const reactionUsersForModal = useMemo(() => {
    const groupByUserAndEmoji = (reactions: any[]) => {
      const grouped = new Map<
        string,
        {
          userId: string;
          userName: string;
          avatar: string;
          emoji: string;
          count: number;
        }
      >();
      reactions.forEach((reaction: any) => {
        const emoji = reaction?.emoji;
        if (!emoji) return;
        const userId = getReactionUserId(reaction) || "unknown";
        const key = `${userId}-${emoji}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            userId,
            userName: getReactionUserName(reaction),
            avatar: getReactionUserAvatar(reaction),
            emoji,
            count: 0,
          });
        }
        grouped.get(key)!.count += 1;
      });
      return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
    };

    const groupByUserAllEmojis = (reactions: any[]) => {
      const grouped = new Map<
        string,
        {
          userId: string;
          userName: string;
          avatar: string;
          totalCount: number;
          emojiCounts: Record<string, number>;
        }
      >();
      reactions.forEach((reaction: any) => {
        const emoji = reaction?.emoji;
        if (!emoji) return;
        const userId = getReactionUserId(reaction) || "unknown";
        if (!grouped.has(userId)) {
          grouped.set(userId, {
            userId,
            userName: getReactionUserName(reaction),
            avatar: getReactionUserAvatar(reaction),
            totalCount: 0,
            emojiCounts: {},
          });
        }
        const row = grouped.get(userId)!;
        row.totalCount += 1;
        row.emojiCounts[emoji] = (row.emojiCounts[emoji] || 0) + 1;
      });
      return Array.from(grouped.values())
        .map((row) => ({
          ...row,
          emojis: Object.entries(row.emojiCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([emoji]) => emoji),
        }))
        .sort((a, b) => b.totalCount - a.totalCount);
    };

    if (reactionFilter !== "ALL") {
      const selectedGroup = reactionGroupsForModal.find(
        (group) => group.emoji === reactionFilter
      );
      return groupByUserAndEmoji(selectedGroup?.users || []);
    }
    return groupByUserAllEmojis(
      reactionGroupsForModal.flatMap((group) => group.users)
    );
  }, [reactionFilter, reactionGroupsForModal, currentUserId]);

  const handleRevoke = async () => {
    if (!selectedMsg) return;
    try {
      await recallMessageApi(selectedMsg._id);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === selectedMsg._id
            ? { ...msg, type: "revoked", content: "", reactions: [] }
            : msg
        )
      );
    } catch (error) {
      console.log("Lỗi thu hồi:", error);
    }
    setShowMenu(false);
  };

  const handleDeleteForMe = async () => {
    if (!selectedMsg) return;
    try {
      await deleteMessageForMeApi(selectedMsg._id);
      setMessages((prev) => prev.filter((msg) => msg._id !== selectedMsg._id));
    } catch (error) {
      console.log("Lỗi xóa phía tôi :", error);
    }
    setShowMenu(false);
  };

  const handleDoubleTap = (message: any) => {
    if (message.type === "revoked") return;
    const now = Date.now();
    if (now - lastTap.current < 300) handleToggleReact(message, "❤️");
    else lastTap.current = now;
  };

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
    [emojiStripWidth]
  );

  const emojiPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const emoji = getReactionFromX(event.nativeEvent.locationX);
          setHoveredReaction(emoji);
        },
        onPanResponderMove: (event) => {
          const emoji = getReactionFromX(event.nativeEvent.locationX);
          setHoveredReaction(emoji);
        },
        onPanResponderRelease: () => {
          if (hoveredReaction && selectedMsg)
            handleToggleReact(selectedMsg, hoveredReaction);
          else setShowMenu(false);
          setHoveredReaction(null);
        },
        onPanResponderTerminate: () => setHoveredReaction(null),
      }),
    [getReactionFromX, hoveredReaction, selectedMsg]
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
    if (date.toDateString() === yesterday.toDateString()) return t.messageYesterday;
    return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderAiText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[xem:.*?\]|\*\*.*?\*\*)/g);
    return (
      <Text style={styles.aiText}>
        {parts.map((part, index) => {
          if (part.startsWith("[xem:") && part.endsWith("]")) {
            const msgId = part.slice(5, -1);
            return (
              <Text
                key={index}
                style={styles.aiLink}
                onPress={() => scrollToMessage(msgId)}
              >
                {" "}
                (Xem){" "}
              </Text>
            );
          }
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <Text key={index} style={{ fontWeight: "900", color: "#A78BFA" }}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
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

      // Thêm tham số `indexInGroup` ở cuối
      const renderImg = (imgMsg: any, style: any, isLast: boolean = false, indexInGroup: number = 0) => (
        <TouchableOpacity
          key={imgMsg._id}
          style={[styles.gridImageWrapper, style]}
          activeOpacity={0.85}
          onPress={() => {
            // Lấy toàn bộ ảnh trong nhóm chuyển thành mảng
            const items = orderedImages.map((img: any) => ({
              id: img._id,
              url: img.content,
              isVideo: false
            }));
            // Mở modal và cuộn đến đúng ảnh đang bấm
            setPreviewMedia({ items, initialIndex: indexInGroup });
          }}
          onLongPress={(e) => handleLongPress(e, imgMsg)}
        >
          <Image source={{ uri: imgMsg.content }} style={styles.fullImage} resizeMode="cover" />
          {isLast && hiddenCount > 0 && (
            <View style={styles.moreOverlay}>
              <Text style={styles.moreText}>+{hiddenCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      );

      return (
        <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
          {!isMe && (
            <View style={styles.avatarPlaceholder}>
              {showAvatar && (
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarText}>{item.sender?.userName?.charAt(0).toUpperCase() || "U"}</Text>
                </View>
              )}
            </View>
          )}
          <View style={[styles.messageContent, isMe ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
            <View style={[styles.imageGridContainer, { borderRadius: 14, overflow: 'hidden' }]}>
              {count === 1 && renderImg(displayImages[0], { width: W, height: 300 }, false, 0)}
              {count === 2 && (
                <View style={styles.gridRow}>
                  {renderImg(displayImages[0], { width: (W - gap) / 2, height: W * 0.8 }, false, 0)}
                  {renderImg(displayImages[1], { width: (W - gap) / 2, height: W * 0.8 }, false, 1)}
                </View>
              )}
              {count === 3 && (
                <View style={styles.gridCol}>
                  <View style={{ marginBottom: gap }}>
                    {renderImg(displayImages[0], { width: W, height: W * 0.65 }, false, 0)}
                  </View>
                  <View style={styles.gridRow}>
                    {renderImg(displayImages[1], { width: (W - gap) / 2, height: (W - gap) / 2 }, false, 1)}
                    {renderImg(displayImages[2], { width: (W - gap) / 2, height: (W - gap) / 2 }, false, 2)}
                  </View>
                </View>
              )}
              {count === 4 && (
                <View style={styles.gridCol}>
                  <View style={[styles.gridRow, { marginBottom: gap }]}>
                    {renderImg(displayImages[0], { width: (W - gap) / 2, height: (W - gap) / 2 }, false, 0)}
                    {renderImg(displayImages[1], { width: (W - gap) / 2, height: (W - gap) / 2 }, false, 1)}
                  </View>
                  <View style={styles.gridRow}>
                    {renderImg(displayImages[2], { width: (W - gap) / 2, height: (W - gap) / 2 }, false, 2)}
                    {renderImg(displayImages[3], { width: (W - gap) / 2, height: (W - gap) / 2 }, false, 3)}
                  </View>
                </View>
              )}
              {count >= 5 && (
                <View style={styles.gridCol}>
                  <View style={[styles.gridRow, { marginBottom: gap }]}>
                    {renderImg(displayImages[0], { width: (W - gap) / 2, height: (W - gap) / 2 }, false, 0)}
                    {renderImg(displayImages[1], { width: (W - gap) / 2, height: (W - gap) / 2 }, false, 1)}
                  </View>
                  <View style={styles.gridRow}>
                    {renderImg(displayImages[2], { width: (W - gap * 2) / 3, height: (W - gap * 2) / 3 }, false, 2)}
                    {renderImg(displayImages[3], { width: (W - gap * 2) / 3, height: (W - gap * 2) / 3 }, false, 3)}
                    {renderImg(displayImages[4], { width: (W - gap * 2) / 3, height: (W - gap * 2) / 3 }, true, 4)}
                  </View>
                </View>
              )}
            </View>
            <Text style={[styles.messageTime, { alignSelf: isMe ? "flex-end" : "flex-start", color: COLORS.textLight, marginTop: 4 }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    }

    const isRevoked = item.type === "revoked";

    const olderItem = index < groupedMessages.length - 1 ? groupedMessages[index + 1] : null;
    const newerItem = index > 0 ? groupedMessages[index - 1] : null;

    if (item.type === "system" || item.type === "system_error") {
      const currentDate = new Date(item.createdAt).toDateString();
      const olderDate = olderItem ? new Date(olderItem.createdAt).toDateString() : null;
      const showDateDivider = currentDate !== olderDate && item.type !== "system_error";

      return (
        <View>
          {showDateDivider && (
            <View style={styles.dateDivider}>
              <Text style={styles.dateDividerText}>
                {formatMessageDate(item.createdAt)}
              </Text>
            </View>
          )}

          <View style={[
            styles.systemMessageWrapper,
            item.type === "system_error" && {
              marginVertical: 16,
              backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(254, 226, 226, 0.8)",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isDarkMode ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.2)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }
          ]}>
            {item.type === "system_error" && (
              <Ionicons name="warning-outline" size={18} color={COLORS.badge} />
            )}

            <Text
              style={[
                styles.systemMessageText,
                item.type === "system_error"
                  ? {
                    color: COLORS.badge,
                    fontWeight: "600",
                    fontSize: 13,
                    textAlign: "center",
                    flexShrink: 1
                  }
                  : { color: isDarkMode ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)" },
              ]}
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

    const isAiGenerated = item.content?.startsWith("@PulseAI ");
    const displayContent = isAiGenerated ? item.content.substring(9) : item.content;
    const reactionGroups = buildReactionGroups(item.reactions || []);
    const totalReactions = reactionGroups.reduce((acc, group) => acc + group.count, 0);
    const hasReactions = totalReactions > 0;
    const reactionPreview = reactionGroups.slice(0, 3).map((group) => group.emoji).join(" ");
    const isLatestMessage = index === messages.length - 1;
    const shouldShowReactionCorner = !isRevoked && (hasReactions || isLatestMessage);

    const currentDate = new Date(item.createdAt).toDateString();
    const olderDate = olderItem ? new Date(olderItem.createdAt).toDateString() : null;
    const showDateDivider = currentDate !== olderDate;

    const isSameSenderAsNewer =
      newerItem &&
      (newerItem.sender?._id || newerItem.senderId) === (item.sender?._id || item.senderId);

    let isCloseInTime = false;
    if (newerItem) {
      const diff = new Date(newerItem.createdAt).getTime() - new Date(item.createdAt).getTime();
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
        <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
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
                const urlLower = displayContent?.split('?')[0].toLowerCase() || "";
                const isVideoClick = item.type === "video" || urlLower.match(/\.(mp4|mov|avi|mkv)$/i);
                const isDocumentClick = item.type === "file" || urlLower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv)$/i);
                const isImageClick = (item.type === "image" || item.type === "media" || urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && !isVideoClick && !isDocumentClick;

                if (isDocumentClick) {
                  Linking.openURL(displayContent);
                } else if (isImageClick || isVideoClick) {
                  // Gọi dạng mảng 1 phần tử cho tin nhắn lẻ
                  setPreviewMedia({
                    items: [{ id: item._id, url: displayContent, isVideo: !!isVideoClick }],
                    initialIndex: 0
                  });
                } else {
                  handleDoubleTap(item);
                }
              }}
              onLongPress={(e) => handleLongPress(e, item)}
              activeOpacity={0.9}
            >
              <View
                style={[
                  !(item.type === "media" || item.type === "image" || item.type === "video" || item.type === "call" || item.type === "file" || displayContent?.split('?')[0].toLowerCase().match(/\.(mp4|mov|avi|mkv|jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv)$/i)) && styles.bubble,
                  !(item.type === "media" || item.type === "image" || item.type === "video" || item.type === "call" || item.type === "file") && (isMe ? styles.bubbleMe : styles.bubbleOther),
                  isRevoked && {
                    backgroundColor: isDarkMode ? "#1E2946" : "#E2E8F0",
                    opacity: 0.6,
                  },
                  item.isSending && { opacity: 0.6 },
                  (item.type === "call" || item.type === "file") && { backgroundColor: "transparent", borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 }
                ]}
              >
                {isRevoked ? (
                  <Text style={[styles.messageText, { fontStyle: "italic", color: COLORS.textLight, paddingRight: 5 }]}>
                    {t.messageRevoked}
                  </Text>
                ) : (() => {
                  // ✅ LOGIC XÁC ĐỊNH CHÍNH XÁC LOẠI FILE ĐỂ RENDER
                  const urlLower = displayContent?.split('?')[0].toLowerCase() || "";

                  // Xác định Video
                  const isVideo = item.type === "video" || urlLower.match(/\.(mp4|mov|avi|mkv)$/i);

                  // Xác định File Tài liệu (PDF, Word, Excel, Text, Zip...)
                  // Nếu type backend trả về 'file', hoặc URL có đuôi tài liệu -> Ép thành File Card
                  const isDocument = item.type === "file" || urlLower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv)$/i);

                  // Xác định Ảnh (không phải video, không phải document)
                  const isImage = (item.type === "image" || item.type === "media" || urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && !isVideo && !isDocument;

                  if (isVideo || isImage) {
                    return (
                      <View style={{ position: "relative", marginBottom: 5 }}>
                        {isVideo ? (
                          <VideoThumbnail url={displayContent} />
                        ) : (
                          <Image source={{ uri: displayContent }} style={styles.mediaImage} resizeMode="cover" />
                        )}
                      </View>
                    );
                  }

                  if (isDocument) {
                    // GIAO DIỆN CARD FILE MỚI CHUẨN ZALO
                    const fileName = displayContent.split("/").pop()?.split("?")[0] || t.messageAttachmentDocument;
                    const { color: fileColor, label: fileLabel } = getFileIconInfo(fileName);

                    return (
                      <View style={[styles.fileCard, { backgroundColor: COLORS.fileBg, borderColor: COLORS.border }]}>
                        {/* Ảnh nền nhạt mô phỏng file */}
                        <View style={styles.fileCardPreview}>
                          <Ionicons name="document-text" size={60} color={COLORS.border} style={{ opacity: 0.5 }} />
                        </View>

                        <View style={[styles.fileCardInfo, { backgroundColor: COLORS.surface }]}>
                          <View style={[styles.fileTypeBadge, { backgroundColor: fileColor }]}>
                            <Text style={styles.fileTypeBadgeText}>{fileLabel}</Text>
                          </View>

                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={[styles.fileNameCardText, { color: COLORS.text }]} numberOfLines={1}>
                              {fileName}
                            </Text>
                            <View style={styles.fileMetaRow}>
                              <Text style={[styles.fileMetaText, { color: COLORS.textLight }]}>
                                {item.fileSize ? formatBytes(item.fileSize) : "Tệp tin"}
                              </Text>
                              <Text style={[styles.fileMetaText, { color: COLORS.textLight, marginHorizontal: 4 }]}>•</Text>
                              <Ionicons name="cloud-done-outline" size={12} color={COLORS.textLight} />
                              <Text style={[styles.fileMetaText, { color: COLORS.textLight, marginLeft: 2 }]}>Đã có trên Cloud</Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.downloadIconBtn}
                            onPress={() => Linking.openURL(displayContent)}
                          >
                            <Ionicons name="download-outline" size={20} color={COLORS.text} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }

                  // Fallback: Text thông thường
                  return (
                    <Text
                      style={[
                        styles.messageText,
                        { color: isMe ? COLORS.headerText : COLORS.text, paddingRight: 5 },
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
                })()}
              </View>

              {showTime && !item.isSending && item.type !== "call" && item.type !== "file" && (
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

              {/* Time riêng cho call hoặc file card */}
              {showTime && (item.type === "call" || item.type === "file") && (
                <Text
                  style={[
                    styles.messageTime,
                    { alignSelf: isMe ? "flex-end" : "flex-start", color: COLORS.textLight, marginTop: 4 }
                  ]}
                >
                  {formatTime(item.createdAt)}
                </Text>
              )}

              {item.isSending && (
                <Text style={[styles.messageTime, { alignSelf: isMe ? "flex-end" : "flex-start", color: COLORS.textLight }]}>
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
    [messages.length, conversationId, clearLocalUnread]
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
        <FlatList
          ref={flatListRef}
          inverted={true}
          data={groupedMessages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            !hasMore && messages.length > 0 ? (
              <Text style={{ textAlign: "center", color: COLORS.textLight, paddingVertical: 10 }}>
                Đã tải hết lịch sử trò chuyện
              </Text>
            ) : isFetchingMore ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 10 }} />
            ) : null
          }
          onViewableItemsChanged={(info) => onViewableItemsChangedRef.current(info)}
          viewabilityConfig={viewabilityConfig.current}
        />

        {pendingMedia.length > 0 && (
          <View style={styles.pendingContainerWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pendingContainer}>
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
                    <Image source={{ uri: media.uri }} style={styles.pendingImage} />
                  ) : (
                    <View style={styles.pendingFile}>
                      <Ionicons name="document-text" size={30} color={COLORS.primary} />
                    </View>
                  )}
                  {(media.type === "video" || media.mimeType?.startsWith('video/')) && (
                    <View style={styles.pendingVideoIcon}>
                      <Ionicons name="videocam" size={14} color="#FFF" />
                    </View>
                  )}
                  {media.attachmentType === "file" && (
                    <Text style={styles.pendingFileNameOverlay} numberOfLines={1}>
                      {media.name || t.messageAttachmentDocument}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputContainer}>
          {/* NÚT 1: GỬI ẢNH/VIDEO */}
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handlePickMedia}
            disabled={isUploading}
          >
            <Ionicons name="image-outline" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          {/* NÚT 2: GỬI FILE/TÀI LIỆU */}
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handlePickDocument}
            disabled={isUploading}
          >
            <Ionicons name="attach" size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          {/* NÚT 3: GỢI Ý CỦA AI */}
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

          {/* Ô NHẬP TEXT */}
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
                  paddingBottom: Platform.OS === 'ios' ? 10 : 12
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
                textAlignVertical: 'center',
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
              <Text style={styles.reactionDetailTitle}>{t.messageReactions}</Text>
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
                      0
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
                  <Text style={styles.loadingText}>
                    {t.messageAiDecoding}
                  </Text>
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
              pagingEnabled // <-- Tạo hiệu ứng lướt từng trang
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={previewMedia.initialIndex} // Cuộn tới đúng ảnh đang chọn
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              renderItem={({ item }) => (
                <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: "center", alignItems: "center" }}>
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
      padding: 6, // Giảm từ 8 xuống 6
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

    // ✅ STYLE CHO CARD HIỂN THỊ FILE CHUẨN ZALO
    fileCard: {
      width: 240,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: 5,
    },
    fileCardPreview: {
      height: 120,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    fileCardInfo: {
      flexDirection: 'row',
      padding: 12,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    fileTypeBadge: {
      width: 40,
      height: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    fileTypeBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 'bold',
    },
    fileNameCardText: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    fileMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    // STYLE CẬP NHẬT CHO HÀNG CHỜ FILE/MEDIA (Nhiều item)
    pendingContainerWrap: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderColor: COLORS.border },
    pendingContainer: { paddingHorizontal: 10, paddingVertical: 10, alignItems: 'center' },
    pendingMediaWrap: { position: 'relative', width: 60, height: 60, borderRadius: 8, marginRight: 15 },
    pendingImage: { width: '100%', height: '100%', borderRadius: 8 },
    pendingFile: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: COLORS.surfaceSoft, justifyContent: 'center', alignItems: 'center' },
    removePendingBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.badge, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    pendingFileNameOverlay: { position: 'absolute', bottom: -18, left: 0, width: 60, fontSize: 10, color: COLORS.text, textAlign: 'center' },
    pendingVideoIcon: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', padding: 2, borderRadius: 4 },

    // GRID LAYOUT ẢNH CHUẨN ZALO
    imageGridContainer: {
      width: 240,
      marginTop: 5,
      backgroundColor: 'transparent',
      // Thêm viền nhẹ ngoài cùng cho đẹp
      borderWidth: 0.5,
      borderColor: 'rgba(0,0,0,0.05)',
    },
    gridRow: { flexDirection: 'row', justifyContent: 'space-between' },
    gridCol: { flexDirection: 'column' },
    gridImageWrapper: { backgroundColor: '#E2E8F0', overflow: 'hidden' },
    fullImage: { width: '100%', height: '100%' },
    moreOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    moreText: { color: 'white', fontSize: 24, fontWeight: '700' },
    // STYLE MỚI CHO CALL CARD CHUẨN ZALO
    callCard: {
      minWidth: 220,
      maxWidth: 280,
      padding: 0, // Bỏ padding cũ để chia vạch ngang full chiều rộng
      borderRadius: 18,
      overflow: 'hidden',
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