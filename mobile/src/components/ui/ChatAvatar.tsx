import React from 'react';
import { View, Text, Image } from 'react-native';

export const ChatAvatar = ({
  chatName = "U",
  chatAvatarUrl,
  isGroup = false,
  membersData = [],
  COLORS,
  style = {} // Dùng để truyền thêm margin nếu cần (ví dụ: marginRight: 10)
}: any) => {
  
  // Hàm render avatar đơn lẻ hoặc chữ cái đầu
  const renderAvatarImg = (m: any, size: number) => {
    const avatarImg = m?.avatar || m?.avatarUrl;
    const initial = (m?.userName || m?.fullName || m?.displayName || "G").charAt(0).toUpperCase();
    return avatarImg ? (
      <Image source={{ uri: avatarImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    ) : (
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.45, fontWeight: "bold" }}>{initial}</Text>
    );
  };

  // 1. Nếu là chat 1-1 HOẶC nhóm đã có sẵn ảnh đại diện
  if (!isGroup || chatAvatarUrl) {
    const m = membersData.length > 0 ? membersData[0] : null;
    return (
      <View style={[{ width: 54, height: 54, justifyContent: 'center', alignItems: 'center' }, style]}>
        <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: COLORS.surface || 'rgba(255,255,255,0.4)', overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' }}>
          {chatAvatarUrl ? (
            <Image source={{ uri: chatAvatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : m ? (
            renderAvatarImg(m, 50)
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "bold" }}>
              {chatName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // 2. Logic xếp chồng ảnh cho nhóm chưa có ảnh đại diện (giống Zalo)
  const count = membersData.length;
  if (count === 0) return <View style={[{ width: 54, height: 54 }, style]} />;

  return (
    <View style={[{ width: 54, height: 54, justifyContent: 'center', alignItems: 'center' }, style]}>
      {count === 1 && (
        <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: COLORS.surface || 'rgba(255,255,255,0.4)', overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' }}>
          {renderAvatarImg(membersData[0], 50)}
        </View>
      )}
      
      {count === 2 && (
        <>
          <View style={{ position: 'absolute', bottom: 2, left: 2, width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: COLORS.surface || COLORS.primary, overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>{renderAvatarImg(membersData[0], 34)}</View>
          <View style={{ position: 'absolute', top: 2, right: 2, width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: COLORS.surface || COLORS.primary, overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>{renderAvatarImg(membersData[1], 34)}</View>
        </>
      )}
      
      {count === 3 && (
        <>
          <View style={{ position: 'absolute', top: 0, alignSelf: 'center', width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.surface || COLORS.primary, overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>{renderAvatarImg(membersData[0], 28)}</View>
          <View style={{ position: 'absolute', bottom: 2, left: 2, width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.surface || COLORS.primary, overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>{renderAvatarImg(membersData[1], 28)}</View>
          <View style={{ position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.surface || COLORS.primary, overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 3 }}>{renderAvatarImg(membersData[2], 28)}</View>
        </>
      )}
      
      {count >= 4 && (
        <>
          <View style={{ position: 'absolute', top: 2, left: 2, width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.surface || COLORS.primary, overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>{renderAvatarImg(membersData[0], 28)}</View>
          <View style={{ position: 'absolute', top: 2, right: 2, width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.surface || COLORS.primary, overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>{renderAvatarImg(membersData[1], 28)}</View>
          <View style={{ position: 'absolute', bottom: 2, left: 2, width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.surface || COLORS.primary, overflow: 'hidden', backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 3 }}>{renderAvatarImg(membersData[2], 28)}</View>
          <View style={{ position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.surface || COLORS.primary, overflow: 'hidden', backgroundColor: count > 4 ? '#94a3b8' : COLORS.accent, justifyContent: 'center', alignItems: 'center', zIndex: 4 }}>
            {count === 4 ? renderAvatarImg(membersData[3], 28) : <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "bold" }}>+{count - 3}</Text>}
          </View>
        </>
      )}
    </View>
  );
};