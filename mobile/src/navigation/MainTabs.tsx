import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Users, User } from 'lucide-react-native'; // Dùng thư viện icon bạn đã cài

// Import các màn hình của bạn
import ChatScreen from '../screens/ChatScreen';
import FriendsScreen from '../screens/FriendsScreen';
// Nếu chưa tạo ProfileScreen, bạn có thể tạo 1 file tạm hoặc comment dòng này lại
// import ProfileScreen from '../screens/ProfileScreen'; 

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Cấu hình Icon cho từng Tab
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent = MessageCircle; // Set default icon

          if (route.name === 'Chat') {
            IconComponent = MessageCircle;
          } else if (route.name === 'Friends') {
            IconComponent = Users;
          } else if (route.name === 'Profile') {
            IconComponent = User;
          }

          // Trả về Icon tương ứng (có thể phóng to một chút nếu đang được focus)
          return <IconComponent size={focused ? 28 : 24} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6', // Màu xanh dương khi tab được chọn
        tabBarInactiveTintColor: '#9CA3AF', // Màu xám khi tab không được chọn
        headerShown: false, // Ẩn cái tiêu đề mặc định của React Navigation ở trên cùng (Vì các trang của bạn tự vẽ Header riêng rồi)
        tabBarStyle: {
          height: 65, // Tăng chiều cao thanh tab lên một chút cho dễ bấm
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6', // Đường viền mỏng ngăn cách với nội dung
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        }
      })}
    >
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ tabBarLabel: 'Tin nhắn' }} 
      />
      <Tab.Screen 
        name="Friends" 
        component={FriendsScreen} 
        options={{ tabBarLabel: 'Bạn bè' }} 
      />
    </Tab.Navigator>
  );
};

export default MainTabs;