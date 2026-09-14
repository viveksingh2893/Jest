import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export interface ChatBubbleProps {
  username?: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  isSystem: boolean;
}

/**
 * A single chat message bubble.
 * - Sent messages: aligned right with a blue gradient-style background
 * - Received messages: aligned left with a dark surface background
 * - System messages: centered with muted italic text
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({
  username,
  text,
  timestamp,
  isSent,
  isSystem,
}) => {
  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{text}</Text>
      </View>
    );
  }

  const formattedTime = formatTime(timestamp);

  return (
    <View
      style={[
        styles.bubbleRow,
        isSent ? styles.bubbleRowSent : styles.bubbleRowReceived,
      ]}>
      <View
        style={[
          styles.bubble,
          isSent ? styles.bubbleSent : styles.bubbleReceived,
        ]}>
        {!isSent && username && (
          <Text style={styles.username}>{username}</Text>
        )}
        <Text style={[styles.messageText, isSent && styles.messageTextSent]}>
          {text}
        </Text>
        <Text style={[styles.timestamp, isSent && styles.timestampSent]}>
          {formattedTime}
        </Text>
      </View>
    </View>
  );
};

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  // System messages
  systemContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  systemText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#8E8E93',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Bubble rows
  bubbleRow: {
    marginVertical: 3,
    paddingHorizontal: 12,
  },
  bubbleRowSent: {
    alignItems: 'flex-end',
  },
  bubbleRowReceived: {
    alignItems: 'flex-start',
  },

  // Bubbles
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleSent: {
    backgroundColor: '#0A84FF',
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: '#2C2C2E',
    borderBottomLeftRadius: 4,
  },

  // Text
  username: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64D2FF',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#E5E5EA',
    lineHeight: 21,
  },
  messageTextSent: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(229, 229, 234, 0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampSent: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
