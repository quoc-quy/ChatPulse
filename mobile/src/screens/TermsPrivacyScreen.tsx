import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionItem = {
  title: string;
  content: ContentNode[];
};

type ContentNode =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph+list"; text: string; items: string[] };

// ─── Data ─────────────────────────────────────────────────────────────────────

const termsSections: SectionItem[] = [
  {
    title: "Điều 1. Khái niệm",
    content: [
      {
        type: "list",
        items: [
          '"ChatPulse" là nền tảng học tập và hỗ trợ trực tuyến do chúng tôi phát triển và vận hành.',
          '"Người dùng" là cá nhân đăng ký tài khoản và sử dụng các khóa học, tài liệu hoặc dịch vụ trên website.',
          '"Dịch vụ" bao gồm khóa học trực tuyến, tài liệu học tập, tính năng AI, bài giảng, luyện tập và các tiện ích liên quan.',
          '"Tài khoản" là thông tin đăng nhập được tạo bởi người dùng để truy cập hệ thống.',
        ],
      },
    ],
  },
  {
    title: "Điều 2. Hiệu lực điều khoản",
    content: [
      {
        type: "paragraph",
        text: "Khi đăng ký tài khoản hoặc sử dụng dịch vụ trên ChatPulse, người dùng đồng ý tuân thủ toàn bộ nội dung của Điều khoản & Điều kiện này.",
      },
      {
        type: "paragraph",
        text: "Chúng tôi có quyền cập nhật hoặc thay đổi nội dung điều khoản nhằm phù hợp với hoạt động vận hành và quy định pháp luật hiện hành.",
      },
    ],
  },
  {
    title: "Điều 3. Tài khoản người dùng",
    content: [
      {
        type: "list",
        items: [
          "Người dùng cần cung cấp thông tin chính xác khi đăng ký tài khoản.",
          "Người dùng chịu trách nhiệm bảo mật tài khoản và mật khẩu của mình.",
          "Không được chia sẻ, cho thuê hoặc mua bán tài khoản dưới bất kỳ hình thức nào.",
          "ChatPulse có quyền khóa hoặc tạm ngưng tài khoản nếu phát hiện hành vi vi phạm điều khoản sử dụng.",
        ],
      },
    ],
  },
  {
    title: "Điều 4. Thanh toán & dịch vụ",
    content: [
      {
        type: "list",
        items: [
          "Giá của các khóa học và dịch vụ sẽ được hiển thị công khai trên website.",
          "Sau khi thanh toán thành công, người dùng sẽ được cấp quyền truy cập khóa học tương ứng.",
          "Các khóa học đã mua không được hoàn trả hoặc chuyển nhượng trừ trường hợp đặc biệt.",
          "Chúng tôi có thể thay đổi giá dịch vụ hoặc chương trình ưu đãi vào từng thời điểm.",
        ],
      },
    ],
  },
  {
    title: "Điều 5. Quyền sở hữu trí tuệ",
    content: [
      {
        type: "paragraph+list",
        text: "Toàn bộ nội dung trên ChatPulse bao gồm bài giảng, hình ảnh, video, tài liệu, giao diện và mã nguồn đều thuộc quyền sở hữu của hệ thống. Nghiêm cấm:",
        items: [
          "Sao chép hoặc phát tán nội dung khi chưa được cho phép.",
          "Ghi hình, tải xuống hoặc chia sẻ trái phép khóa học.",
          "Sử dụng nội dung cho mục đích thương mại.",
        ],
      },
    ],
  },
  {
    title: "Điều 6. Quyền và nghĩa vụ của người dùng",
    content: [
      {
        type: "list",
        items: [
          "Sử dụng dịch vụ đúng mục đích học tập và đúng quy định pháp luật.",
          "Không thực hiện các hành vi gây ảnh hưởng đến hệ thống hoặc người dùng khác.",
          "Chịu trách nhiệm với mọi hoạt động phát sinh từ tài khoản của mình.",
        ],
      },
    ],
  },
  {
    title: "Điều 7. Chính sách bảo mật",
    content: [
      {
        type: "paragraph",
        text: "ChatPulse cam kết bảo vệ thông tin cá nhân của người dùng và chỉ sử dụng dữ liệu nhằm mục đích cung cấp, cải thiện dịch vụ và hỗ trợ khách hàng.",
      },
      {
        type: "paragraph",
        text: "Thông tin cá nhân sẽ không được chia sẻ cho bên thứ ba nếu không có sự đồng ý của người dùng, ngoại trừ trường hợp theo yêu cầu của pháp luật.",
      },
    ],
  },
  {
    title: "Điều 8. Điều khoản chung",
    content: [
      {
        type: "paragraph",
        text: "Nếu có bất kỳ thắc mắc hoặc yêu cầu hỗ trợ, người dùng có thể liên hệ với chúng tôi thông qua email hoặc các kênh hỗ trợ chính thức trên website.",
      },
      {
        type: "paragraph",
        text: "Trong trường hợp một phần của Điều khoản này không còn hiệu lực theo quy định pháp luật, các nội dung còn lại vẫn giữ nguyên giá trị áp dụng.",
      },
    ],
  },
];

const privacySections: SectionItem[] = [
  {
    title: "Điều 1. Định nghĩa",
    content: [
      {
        type: "paragraph",
        text: '"ChatPulse" là nền tảng học tập và hỗ trợ trực tuyến do chúng tôi phát triển và vận hành.',
      },
      {
        type: "paragraph",
        text: '"Người dùng" là cá nhân hoặc tổ chức truy cập, đăng ký tài khoản hoặc sử dụng các sản phẩm, dịch vụ trên website.',
      },
      {
        type: "paragraph",
        text: '"Đối tác" là tổ chức hoặc cá nhân hợp tác với chúng tôi trong quá trình cung cấp dịch vụ.',
      },
      {
        type: "paragraph",
        text: '"Dữ liệu cá nhân" là thông tin giúp xác định danh tính của người dùng như họ tên, email, số điện thoại, địa chỉ IP, lịch sử sử dụng dịch vụ hoặc các dữ liệu liên quan khác.',
      },
    ],
  },
  {
    title: "Điều 2. Dữ liệu chúng tôi thu thập",
    content: [
      {
        type: "list",
        items: [
          "Họ tên, email, số điện thoại.",
          "Thông tin tài khoản đăng nhập.",
          "Lịch sử sử dụng dịch vụ và hoạt động trên website.",
          "Thông tin thiết bị, địa chỉ IP, cookie và trình duyệt.",
          "Nội dung phản hồi, đánh giá hoặc liên hệ hỗ trợ từ người dùng.",
        ],
      },
    ],
  },
  {
    title: "Điều 3. Mục đích sử dụng dữ liệu",
    content: [
      {
        type: "list",
        items: [
          "Cung cấp và vận hành dịch vụ trên website.",
          "Xác minh tài khoản và hỗ trợ đăng nhập.",
          "Hỗ trợ khách hàng và giải quyết khiếu nại.",
          "Nâng cao chất lượng sản phẩm và trải nghiệm người dùng.",
          "Gửi thông báo, cập nhật hoặc chương trình khuyến mãi.",
          "Đảm bảo an toàn, bảo mật và phòng chống gian lận.",
        ],
      },
    ],
  },
  {
    title: "Điều 4. Cách thức lưu trữ và bảo mật dữ liệu",
    content: [
      {
        type: "paragraph",
        text: "Chúng tôi áp dụng các biện pháp kỹ thuật và bảo mật phù hợp nhằm bảo vệ dữ liệu cá nhân khỏi truy cập trái phép, mất mát hoặc rò rỉ thông tin.",
      },
      {
        type: "paragraph",
        text: "Dữ liệu cá nhân được lưu trữ trong phạm vi cần thiết để phục vụ mục đích cung cấp dịch vụ hoặc theo yêu cầu của pháp luật.",
      },
      {
        type: "paragraph",
        text: "Tuy nhiên, không có hệ thống nào đảm bảo an toàn tuyệt đối trên môi trường internet. Người dùng cần chủ động bảo mật tài khoản và thông tin đăng nhập của mình.",
      },
    ],
  },
  {
    title: "Điều 5. Chia sẻ dữ liệu cá nhân",
    content: [
      {
        type: "paragraph+list",
        text: "Chúng tôi cam kết không bán hoặc chia sẻ dữ liệu cá nhân của người dùng cho bên thứ ba, ngoại trừ các trường hợp:",
        items: [
          "Có sự đồng ý của người dùng.",
          "Phục vụ cho việc cung cấp dịch vụ thông qua các đối tác liên quan.",
          "Theo yêu cầu của cơ quan nhà nước có thẩm quyền theo quy định pháp luật.",
          "Đảm bảo quyền lợi, an toàn và bảo mật của hệ thống và người dùng.",
        ],
      },
    ],
  },
  {
    title: "Điều 6. Quyền của người dùng",
    content: [
      {
        type: "list",
        items: [
          "Yêu cầu xem hoặc chỉnh sửa dữ liệu cá nhân.",
          "Yêu cầu xóa tài khoản và dữ liệu cá nhân.",
          "Rút lại sự đồng ý xử lý dữ liệu.",
          "Yêu cầu hạn chế xử lý dữ liệu cá nhân.",
          "Khiếu nại nếu dữ liệu bị sử dụng sai mục đích.",
        ],
      },
    ],
  },
  {
    title: "Điều 7. Cookie và công nghệ theo dõi",
    content: [
      {
        type: "paragraph",
        text: "Website có thể sử dụng cookie hoặc các công nghệ tương tự để cải thiện trải nghiệm người dùng, ghi nhớ thông tin đăng nhập và phân tích hành vi sử dụng dịch vụ.",
      },
      {
        type: "paragraph",
        text: "Người dùng có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng của website có thể không hoạt động chính xác.",
      },
    ],
  },
  {
    title: "Điều 8. Thời gian lưu trữ dữ liệu",
    content: [
      {
        type: "paragraph",
        text: "Dữ liệu cá nhân sẽ được lưu trữ trong thời gian cần thiết để phục vụ mục đích cung cấp dịch vụ hoặc theo quy định pháp luật hiện hành.",
      },
      {
        type: "paragraph",
        text: "Sau khi người dùng yêu cầu xóa dữ liệu hoặc chấm dứt sử dụng dịch vụ, chúng tôi sẽ tiến hành xóa hoặc ẩn danh dữ liệu theo quy trình nội bộ.",
      },
    ],
  },
  {
    title: "Điều 9. Điều khoản chung",
    content: [
      {
        type: "paragraph",
        text: "Chúng tôi có quyền cập nhật hoặc điều chỉnh Chính sách bảo mật này vào bất kỳ thời điểm nào để phù hợp với hoạt động kinh doanh và quy định pháp luật hiện hành.",
      },
      {
        type: "paragraph",
        text: "Phiên bản mới nhất sẽ luôn được công khai trên website. Việc tiếp tục sử dụng dịch vụ đồng nghĩa với việc người dùng đồng ý với các thay đổi được cập nhật.",
      },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionContent({ nodes }: { nodes: ContentNode[] }) {
  return (
    <View style={styles.contentWrapper}>
      {nodes.map((node, i) => {
        if (node.type === "paragraph") {
          return (
            <Text key={i} style={[styles.bodyText, i > 0 && styles.mt8]}>
              {node.text}
            </Text>
          );
        }
        if (node.type === "list") {
          return (
            <View key={i}>
              {node.items.map((item, j) => (
                <View key={j} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (node.type === "paragraph+list") {
          return (
            <View key={i}>
              <Text style={[styles.bodyText, styles.mb8]}>{node.text}</Text>
              {node.items.map((item, j) => (
                <View key={j} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

function SectionCard({
  section,
  index,
}: {
  section: SectionItem;
  index: number;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.numBadge}>
          <Text style={styles.numText}>{index + 1}</Text>
        </View>
        <Text style={styles.cardTitle}>{section.title}</Text>
      </View>
      <SectionContent nodes={section.content} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Tab = "terms" | "privacy";

export default function TermsPrivacyScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("terms");

  const isTerms = activeTab === "terms";
  const sections = isTerms ? termsSections : privacySections;
  const heroBadge = isTerms ? "ChatPulse Terms" : "ChatPulse Privacy Policy";
  const heroTitle = isTerms ? "Điều khoản & Điều kiện" : "Chính sách bảo mật";
  const heroDesc = isTerms
    ? "Bản Điều khoản và Điều kiện này quy định quyền và nghĩa vụ giữa người dùng và hệ thống ChatPulse liên quan đến việc đăng ký tài khoản, sử dụng dịch vụ, thanh toán và bảo mật thông tin."
    : "ChatPulse cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của người dùng khi truy cập và sử dụng nền tảng học tập trực tuyến của chúng tôi.";
  const footerText = isTerms
    ? `© ${new Date().getFullYear()} ChatPulse. Mọi quyền được bảo lưu.`
    : `© ${new Date().getFullYear()} ChatPulse. Cam kết bảo vệ dữ liệu và quyền riêng tư của người dùng.`;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, isTerms && styles.tabActive]}
          onPress={() => setActiveTab("terms")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, isTerms && styles.tabTextActive]}>
            Điều khoản
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !isTerms && styles.tabActive]}
          onPress={() => setActiveTab("privacy")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, !isTerms && styles.tabTextActive]}>
            Chính sách bảo mật
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadgeWrap}>
            <Text style={styles.heroBadgeText}>{heroBadge}</Text>
          </View>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroDesc}>{heroDesc}</Text>
        </View>

        {/* Sections */}
        {sections.map((section, index) => (
          <SectionCard key={index} section={section} index={index} />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerText}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PRIMARY = "#7F77DD";
const PRIMARY_LIGHT = "#EEEDFE";
const TEXT_PRIMARY = "#1a1a1a";
const TEXT_SECONDARY = "#6b7280";
const BORDER = "#e5e7eb";
const BG = "#f9fafb";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: "#ffffff",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: PRIMARY,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_SECONDARY,
  },
  tabTextActive: {
    color: PRIMARY,
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Hero
  hero: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 16,
  },
  heroBadgeWrap: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
    backgroundColor: "#f3f4f6",
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: TEXT_SECONDARY,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 10,
    lineHeight: 32,
  },
  heroDesc: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  numBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  numText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },

  // Content
  contentWrapper: {
    gap: 0,
  },
  bodyText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
  mt8: {
    marginTop: 8,
  },
  mb8: {
    marginBottom: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bullet: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginRight: 8,
    marginTop: 1,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },

  // Footer
  footer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: "center",
  },
});
