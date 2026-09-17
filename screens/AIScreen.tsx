import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {
  sendChatMessage,
  generateImage,
  completeText,
  ChatMessage as OpenAIChatMessage,
} from '../services/openai';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'chat' | 'image' | 'completion';

interface UIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ─── Tab Configuration ────────────────────────────────────────────────────────

const TABS: {id: TabId; label: string; emoji: string; color: string}[] = [
  {id: 'chat', label: 'AI Chat', emoji: '🤖', color: '#0A84FF'},
  {id: 'image', label: 'Image Gen', emoji: '🎨', color: '#BF5AF2'},
  {id: 'completion', label: 'Completion', emoji: '✍️', color: '#30D158'},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const AIScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 10}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>✨ AI Studio</Text>
          <Text style={styles.headerSubtitle}>Powered by OpenAI</Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && {
                ...styles.tabActive,
                borderBottomColor: tab.color,
              },
            ]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}>
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && {color: tab.color},
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'image' && <ImageTab insets={insets} />}
        {activeTab === 'completion' && <CompletionTab insets={insets} />}
      </View>
    </View>
  );
};

// ─── Chat Tab ────────────────────────────────────────────────────────────────

const ChatTab: React.FC = () => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<UIChatMessage[]>([]);
  const [history, setHistory] = useState<OpenAIChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || loading) {
      return;
    }

    const userMsg: UIChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    const updatedHistory: OpenAIChatMessage[] = [
      ...history,
      {role: 'user', content: text},
    ];

    try {
      const reply = await sendChatMessage(updatedHistory);
      const assistantMsg: UIChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setHistory([...updatedHistory, {role: 'assistant', content: reply}]);
    } catch (err: any) {
      const errMsg: UIChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `⚠️ ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [inputText, loading, history]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setHistory([]);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.tabContent}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        style={styles.chatList}
        contentContainerStyle={[
          styles.chatListContent,
          {paddingBottom: insets.bottom + 8},
        ]}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({animated: true})
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🤖</Text>
            <Text style={styles.emptyTitle}>AI Chat</Text>
            <Text style={styles.emptySubtitle}>
              Ask me anything — I remember the conversation!
            </Text>
          </View>
        }
        renderItem={({item}) => (
          <View
            style={[
              styles.chatBubble,
              item.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}>
            {item.role === 'assistant' && (
              <Text style={styles.bubbleRoleLabel}>🤖 GPT</Text>
            )}
            <Text
              style={[
                styles.bubbleText,
                item.role === 'user' && styles.userBubbleText,
              ]}>
              {item.content}
            </Text>
            <Text style={styles.bubbleTime}>{formatTime(item.timestamp)}</Text>
          </View>
        )}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#0A84FF" />
          <Text style={styles.typingText}>GPT is thinking...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.chatInputBar}>
        {messages.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.chatInput}
          placeholder="Message AI..."
          placeholderTextColor="#636366"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || loading) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.7}>
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ─── Image Generation Tab ─────────────────────────────────────────────────────

const ImageTab: React.FC<{insets: any}> = ({insets}) => {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setRevisedPrompt(null);

    try {
      const result = await generateImage(text);
      setImageUrl(result.url);
      setRevisedPrompt(result.revisedPrompt ?? null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [prompt, loading]);

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={[
        styles.scrollContent,
        {paddingBottom: insets.bottom + 20},
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {/* Prompt input */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>🎨</Text>
          <Text style={styles.cardTitle}>DALL·E 3 Image Generator</Text>
        </View>
        <Text style={styles.cardDescription}>
          Describe any image and AI will create it for you.
        </Text>

        <TextInput
          style={styles.multilineInput}
          placeholder="A futuristic city at sunset with flying cars and neon lights..."
          placeholderTextColor="#636366"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={4}
          maxLength={1000}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.purpleButton,
            (!prompt.trim() || loading) && styles.actionButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!prompt.trim() || loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>🎨 Generate Image</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Loading placeholder */}
      {loading && (
        <View style={styles.imagePlaceholder}>
          <ActivityIndicator size="large" color="#BF5AF2" />
          <Text style={styles.loadingImageText}>
            Generating your image...{'\n'}This may take ~10 seconds
          </Text>
        </View>
      )}

      {/* Generated image */}
      {imageUrl && !loading && (
        <View style={styles.imageResultCard}>
          <Image
            source={{uri: imageUrl}}
            style={styles.generatedImage}
            resizeMode="contain"
          />
          {revisedPrompt && (
            <View style={styles.revisedPromptBox}>
              <Text style={styles.revisedPromptLabel}>Revised prompt:</Text>
              <Text style={styles.revisedPromptText}>{revisedPrompt}</Text>
            </View>
          )}
        </View>
      )}

      {/* Empty state */}
      {!imageUrl && !loading && !error && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🖼️</Text>
          <Text style={styles.emptyTitle}>No Image Yet</Text>
          <Text style={styles.emptySubtitle}>
            Enter a prompt above and tap Generate
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// ─── Text Completion Tab ──────────────────────────────────────────────────────

const CompletionTab: React.FC<{insets: any}> = ({insets}) => {
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant. Be concise and clear.',
  );
  const [result, setResult] = useState<string | null>(null);
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setTokensUsed(null);

    try {
      const res = await completeText(text, systemPrompt.trim() || undefined);
      setResult(res.text);
      setTokensUsed(res.tokensUsed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [prompt, systemPrompt, loading]);

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={[
        styles.scrollContent,
        {paddingBottom: insets.bottom + 20},
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {/* Input card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>✍️</Text>
          <Text style={styles.cardTitle}>Text Completion</Text>
        </View>
        <Text style={styles.cardDescription}>
          Summarize, explain, rewrite, or complete any text.
        </Text>

        {/* System prompt */}
        <Text style={styles.inputLabel}>System Instructions</Text>
        <TextInput
          style={styles.systemInput}
          placeholder="You are a helpful assistant..."
          placeholderTextColor="#636366"
          value={systemPrompt}
          onChangeText={setSystemPrompt}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        {/* User prompt */}
        <Text style={styles.inputLabel}>Your Prompt</Text>
        <TextInput
          style={styles.multilineInput}
          placeholder="Summarize this text in 3 bullet points..."
          placeholderTextColor="#636366"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={5}
          maxLength={4000}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.greenButton,
            (!prompt.trim() || loading) && styles.actionButtonDisabled,
          ]}
          onPress={handleComplete}
          disabled={!prompt.trim() || loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>✨ Complete Text</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Result */}
      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>AI Response</Text>
            {tokensUsed !== null && (
              <View style={styles.tokenBadge}>
                <Text style={styles.tokenBadgeText}>{tokensUsed} tokens</Text>
              </View>
            )}
          </View>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>✍️</Text>
          <Text style={styles.emptyTitle}>Ready to Complete</Text>
          <Text style={styles.emptySubtitle}>
            Enter your prompt and AI will generate a response
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0D0D0F',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#636366',
    fontSize: 11,
    marginTop: 2,
  },
  headerRight: {
    minWidth: 70,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0F',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabEmoji: {
    fontSize: 18,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636366',
    letterSpacing: 0.2,
  },

  // Content
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Chat
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  chatBubble: {
    maxWidth: '82%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#0A84FF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1C1C1E',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleRoleLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '600',
  },
  bubbleText: {
    fontSize: 15,
    color: '#EBEBF5',
    lineHeight: 21,
  },
  userBubbleText: {
    color: '#FFFFFF',
  },
  bubbleTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    color: '#636366',
    fontSize: 13,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#0D0D0F',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
  },
  clearButtonText: {
    color: '#FF453A',
    fontSize: 13,
    fontWeight: '500',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#2C2C2E',
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

  // Cards
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },

  // Inputs
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  multilineInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  systemInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#EBEBF5',
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },

  // Buttons
  actionButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  purpleButton: {
    backgroundColor: '#BF5AF2',
  },
  greenButton: {
    backgroundColor: '#30D158',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Error
  errorCard: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    lineHeight: 20,
  },

  // Image result
  imagePlaceholder: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  loadingImageText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  imageResultCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  generatedImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#0D0D0F',
  },
  revisedPromptBox: {
    padding: 14,
    gap: 4,
  },
  revisedPromptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636366',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  revisedPromptText: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },

  // Text completion result
  resultCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#30D158',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30D158',
  },
  tokenBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tokenBadgeText: {
    fontSize: 11,
    color: '#30D158',
    fontWeight: '600',
  },
  resultText: {
    fontSize: 15,
    color: '#EBEBF5',
    lineHeight: 23,
  },

  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 52,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#636366',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 220,
  },
});
