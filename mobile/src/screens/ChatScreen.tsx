import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SearchComponent from '../components/ui/SearchComponent';

const ChatScreen = () => {

  const navigation = useNavigation<any>();

  const [conversations] = useState([
    {
      id: '1',
      name: 'Sarah Chen',
      message: 'That sounds perfect! Let’s meet at 3pm.',
      time: '2m',
      unread: 2
    },
    {
      id: '2',
      name: 'Design Team',
      message: 'Alex: Uploaded the new mockups',
      time: '15m',
      unread: 5
    },
    {
      id: '3',
      name: 'Marcus Williams',
      message: 'Thanks for the update!',
      time: '1h',
      unread: 0
    },
    {
      id: '4',
      name: 'Emily Park',
      message: 'Voice message (0:42)',
      time: '3h',
      unread: 0
    },
    {
      id: '5',
      name: 'Project Alpha',
      message: 'You: I’ll send the docs tonight',
      time: '5h',
      unread: 0
    }
  ]);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('MessageScreen', { id: item.id })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0)}
        </Text>
      </View>

      <View style={styles.chatContent}>

        <View style={styles.chatHeader}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={styles.time}>
            {item.time}
          </Text>
        </View>

        <View style={styles.chatFooter}>

          <Text
            style={[
              styles.message,
              item.unread > 0 && styles.unreadMessage
            ]}
            numberOfLines={1}
          >
            {item.message}
          </Text>

          {item.unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unread}
              </Text>
            </View>
          )}

        </View>

      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <Text style={styles.title}>Chats</Text>

      {/* Search */}
      <SearchComponent />

      {/* Chat List */}
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />

    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#0F172A"
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#A855F7",
    paddingHorizontal: 20,
    marginBottom: 10
  },

  chatItem: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center"
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14
  },

  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold"
  },

  chatContent: {
    flex: 1
  },

  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },

  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8
  },

  time: {
    color: "#94A3B8",
    fontSize: 12
  },

  chatFooter: {
    flexDirection: "row",
    alignItems: "center"
  },

  message: {
    color: "#94A3B8",
    fontSize: 14,
    flex: 1,
    marginRight: 10
  },

  unreadMessage: {
    color: "#fff",
    fontWeight: "600"
  },

  badge: {
    backgroundColor: "#A855F7",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6
  },

  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold"
  }

});