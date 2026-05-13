import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";

export const ChatQRScannerModal = ({
  showQRScanner,
  setShowQRScanner,
  handleBarcodeScanned,
  t,
}: any) => {
  return (
    <Modal visible={showQRScanner} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.qrHeader}>
            <TouchableOpacity onPress={() => setShowQRScanner(false)}>
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>
            <Text style={styles.qrTitle}>{t.chatScanQr}</Text>
            <View style={{ width: 32 }} />
          </View>

          <View style={styles.qrCameraContainer}>
            {showQRScanner && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={handleBarcodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              />
            )}
            <View style={styles.qrTargetOverlay}>
              <View style={styles.qrTargetBox} />
            </View>
          </View>

          <View style={styles.qrFooter}>
            <Text style={styles.qrFooterText}>{t.chatScanQrHint}</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  qrHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15 },
  qrTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  qrCameraContainer: { flex: 1, borderRadius: 24, overflow: "hidden", marginHorizontal: 15, marginTop: 10, marginBottom: 20, justifyContent: "center", alignItems: "center", backgroundColor: "#222" },
  qrTargetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  qrTargetBox: { width: 250, height: 250, borderWidth: 2, borderColor: "rgba(255, 255, 255, 0.5)", borderRadius: 24, backgroundColor: "transparent" },
  qrFooter: { paddingBottom: 40 },
  qrFooterText: { color: "white", textAlign: "center", fontSize: 15, opacity: 0.8 },
});