import React, {useCallback, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ChatBubble} from './ChatBubble';
import {ChatMessage, useWebSocket} from '../../hooks/useWebSocket';

// Update this to your machine's IP for physical device testing
const WS_URL = Platform.select({
  android: 'ws://10.0.2.2:8080', // Android emulator -> host machine
  default: 'ws://localhost:8080', // iOS simulator / desktop
});

/**
 * Full chat screen with username entry, message list, and input bar.
 */
export const ChatScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [inputText, setInputText] = useState('');

  const {
    messages,
    sendMessage,
    joinChat,
    disconnect,
    connectionStatus,
    isConnected,
    onlineUsers,
    error,
  } = useWebSocket({url: WS_URL!});

  const handleJoin = useCallback(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      return;
    }
    joinChat(trimmed);
    setHasJoined(true);
  }, [username, joinChat]);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      return;
    }
    sendMessage(trimmed);
    setInputText('');
  }, [inputText, sendMessage]);

  const handleLeave = useCallback(() => {
    disconnect();
    setHasJoined(false);
    setUsername('');
  }, [disconnect]);

  const renderMessage = useCallback(
    ({item}: {item: ChatMessage}) => {
      const isSystem = item.type === 'system';
      const isSent = item.type === 'message' && item.username === username;

      return (
        <ChatBubble
          username={item.username}
          text={item.text || ''}
          timestamp={item.timestamp}
          isSent={isSent}
          isSystem={isSystem}
        />
      );
    },
    [username],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // ─── Username Entry Screen ────────────────────────────────────
  if (!hasJoined) {
    return (
      <View style={[styles.joinScreen, {paddingTop: insets.top + 20}]}>
        <StatusBar barStyle="light-content" />

        {/* Logo / Title */}
        <View style={styles.joinHeader}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>💬</Text>
          </View>
          <Text style={styles.joinTitle}>Join the Chat</Text>
          <Text style={styles.joinSubtitle}>
            Enter your name to start chatting in real-time
          </Text>
        </View>

        {/* Input */}
        <View style={styles.joinInputContainer}>
          <TextInput
            style={styles.joinInput}
            placeholder="Your name"
            placeholderTextColor="#636366"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={20}
            onSubmitEditing={handleJoin}
            returnKeyType="go"
          />
          <TouchableOpacity
            style={[
              styles.joinButton,
              !username.trim() && styles.joinButtonDisabled,
            ]}
            onPress={handleJoin}
            disabled={!username.trim()}
            activeOpacity={0.7}>
            <Text style={styles.joinButtonText}>Enter Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Connection status */}
        {connectionStatus === 'connecting' && (
          <Text style={styles.connectingText}>Connecting...</Text>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  // ─── Chat Screen ──────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 10}]}>
        <TouchableOpacity onPress={handleLeave} style={styles.backButton}>
          <Text style={styles.backText}>← Leave</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chat Room</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: isConnected ? '#30D158' : '#FF453A'},
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected
                ? `${onlineUsers.length} online`
                : connectionStatus === 'reconnecting'
                ? 'Reconnecting...'
                : 'Disconnected'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({animated: true})
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={styles.emptyText}>
              No messages yet. Say hello!
            </Text>
          </View>
        }
      />

      {/* Input Bar */}
      <View style={[styles.inputBar, {paddingBottom: insets.bottom + 8}]}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor="#636366"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || !isConnected) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || !isConnected}
          activeOpacity={0.7}>
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // ─── Container ──────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ─── Join Screen ────────────────────────────────────────────
  joinScreen: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  joinHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 36,
  },
  joinTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  joinSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 21,
  },
  joinInputContainer: {
    gap: 14,
  },
  joinInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  joinButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#1C1C1E',
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  connectingText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#8E8E93',
    fontSize: 14,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 12,
    color: '#FF453A',
    fontSize: 14,
  },

  // ─── Header ───────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 12,
    minWidth: 70,
  },
  backText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  statusText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  headerRight: {
    minWidth: 70,
  },

  // ─── Error Banner ─────────────────────────────────────────
  errorBanner: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  errorBannerText: {
    color: '#FF453A',
    fontSize: 13,
    textAlign: 'center',
  },

  // ─── Messages ─────────────────────────────────────────────
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#636366',
    fontSize: 15,
  },

  // ─── Input Bar ────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#1C1C1E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#38383A',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
