import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Send, Mic, Pause, MoreHorizontal } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const CONVERSATION_TOPICS = [
  { id: 'casual', name: 'Casual', emoji: '😊' },
  { id: 'interview', name: 'Interview', emoji: '💼' },
  { id: 'presentation', name: 'Present', emoji: '🎯' },
  { id: 'social', name: 'Social', emoji: '🎉' },
];

const AI_RESPONSES = {
  casual: [
    "That's really interesting! Tell me more about that.",
    "How did that make you feel?",
    "I can relate to that experience. What happened next?",
    "That sounds like quite an adventure!",
    "What's been the highlight of your week so far?"
  ],
  interview: [
    "Can you walk me through your experience with that?",
    "What would you say is your greatest strength?",
    "How do you handle challenging situations?",
    "What motivates you in your work?",
    "Where do you see yourself in the next few years?"
  ],
  presentation: [
    "That's a compelling point. How would you explain that to someone new?",
    "What evidence supports that conclusion?",
    "Can you give us a specific example?",
    "How does this relate to the bigger picture?",
    "What questions might your audience have about this?"
  ],
  social: [
    "This is such a lovely gathering, isn't it?",
    "Have you tried the refreshments? They're delicious!",
    "How do you know the host?",
    "What brings you to this event?",
    "Are you enjoying yourself so far?"
  ]
};

export default function DialogueMode() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('casual');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const micScale = useSharedValue(1);
  const sendScale = useSharedValue(1);

  useEffect(() => {
    startSession();
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const startSession = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: getInitialMessage(),
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);

    sessionTimerRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
  };

  const getInitialMessage = () => {
    const responses = AI_RESPONSES[selectedTopic as keyof typeof AI_RESPONSES];
    return responses[0] || "Hello! I'm here to help you practice conversation. How are you today?";
  };

  const getAIResponse = (userMessage: string) => {
    const responses = AI_RESPONSES[selectedTopic as keyof typeof AI_RESPONSES];
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! It's wonderful to meet you. How has your day been treating you?";
    }
    
    if (lowerMessage.includes('thank you') || lowerMessage.includes('thanks')) {
      return "You're so welcome! I'm really enjoying our conversation. What else would you like to explore?";
    }
    
    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return "It's been such a pleasure talking with you! You did amazing today. Keep practicing!";
    }
    
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex] || "That's fascinating! I'd love to hear more about your perspective on that.";
  };

  const sendMessage = async () => {
    if (inputText.trim() === '' || isPaused) return;

    sendScale.value = withSpring(0.95, { duration: 100 }, () => {
      sendScale.value = withSpring(1, { duration: 200 });
    });

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessageCount(prev => prev + 1);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(inputText),
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1500 + Math.random() * 2000);
  };

  const toggleRecording = () => {
    micScale.value = withSpring(0.9, { duration: 100 }, () => {
      micScale.value = withSpring(1, { duration: 200 });
    });

    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setInputText("This is a voice message transcription...");
        setIsRecording(false);
      }, 3000);
    }
  };

  const changeTopic = (topic: string) => {
    setSelectedTopic(topic);
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: getInitialMessage(),
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const endSession = async () => {
    if (sessionTime > 0) {
      try {
        const sessionData = {
          date: new Date().toISOString(),
          gameMode: 'dialogue-mode',
          duration: sessionTime,
          completed: true,
          messageCount,
          topic: selectedTopic
        };

        const existingSessions = await AsyncStorage.getItem('userSessions');
        const sessions = existingSessions ? JSON.parse(existingSessions) : [];
        sessions.push(sessionData);
        await AsyncStorage.setItem('userSessions', JSON.stringify(sessions));
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }
    router.back();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a2e', '#16213e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={endSession} style={styles.headerButton}>
            <ArrowLeft size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>AI Conversation</Text>
            <Text style={styles.subtitle}>{formatTime(sessionTime)} • {messageCount} messages</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MoreHorizontal size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.topicSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicScrollContainer}>
            {CONVERSATION_TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicChip,
                  selectedTopic === topic.id && styles.topicChipActive
                ]}
                onPress={() => changeTopic(topic.id)}
              >
                <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                <Text style={[
                  styles.topicText,
                  selectedTopic === topic.id && styles.topicTextActive
                ]}>
                  {topic.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((message, index) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessageContainer : styles.aiMessageContainer
                ]}
              >
                <View style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.aiBubble
                ]}>
                  <Text style={[
                    styles.messageText,
                    message.isUser ? styles.userText : styles.aiText
                  ]}>
                    {message.text}
                  </Text>
                </View>
              </View>
            ))}
            
            {isTyping && (
              <View style={styles.typingContainer}>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                  </View>
                </View>
              </View>
            )}

            {isPaused && (
              <View style={styles.pausedIndicator}>
                <Text style={styles.pausedText}>Conversation Paused</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder={isPaused ? "Conversation paused..." : "Share your thoughts..."}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                multiline
                maxLength={500}
                editable={!isPaused}
              />
              <Animated.View style={micAnimatedStyle}>
                <TouchableOpacity
                  style={[styles.micButton, isRecording && styles.micButtonActive]}
                  onPress={toggleRecording}
                  disabled={isPaused}
                >
                  <Mic size={18} color="white" strokeWidth={1.5} />
                </TouchableOpacity>
              </Animated.View>
            </View>
            <Animated.View style={sendAnimatedStyle}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (inputText.trim() === '' || isPaused) && styles.sendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={inputText.trim() === '' || isPaused}
              >
                <LinearGradient
                  colors={inputText.trim() !== '' && !isPaused ? ['#00d4ff', '#0ea5e9'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.sendButtonGradient}
                >
                  <Send size={18} color="white" strokeWidth={1.5} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  topicSelector: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  topicScrollContainer: {
    paddingRight: 24,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topicChipActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: '#00d4ff',
  },
  topicEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  topicText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  topicTextActive: {
    color: '#00d4ff',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: '#00d4ff',
    borderBottomRightRadius: 8,
  },
  aiBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  userText: {
    color: 'white',
  },
  aiText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  typingContainer: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    maxWidth: '85%',
  },
  typingBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 2,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  pausedIndicator: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pausedText: {
    color: '#ec4899',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 4,
    fontWeight: '400',
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micButtonActive: {
    backgroundColor: '#ec4899',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sendButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  sendButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});