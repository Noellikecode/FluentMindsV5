import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Send, Mic, Pause } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const CONVERSATION_TOPICS = [
  'Job Interview',
  'Casual Chat',
  'Presentation Practice',
  'Phone Conversation',
  'Meeting Discussion',
  'Social Gathering'
];

const AI_RESPONSES = {
  'job-interview': [
    "Tell me about yourself and your background.",
    "What are your greatest strengths?",
    "Why are you interested in this position?",
    "Where do you see yourself in five years?",
    "Do you have any questions for me?"
  ],
  'casual-chat': [
    "How's your day going so far?",
    "What are you up to this weekend?",
    "Have you seen any good movies lately?",
    "What's your favorite hobby?",
    "Tell me about something interesting that happened recently."
  ],
  'presentation': [
    "What's the main topic of your presentation?",
    "Who is your target audience?",
    "What key points do you want to emphasize?",
    "How do you plan to engage your audience?",
    "What questions might people ask?"
  ],
  'phone': [
    "Hello, how can I help you today?",
    "Could you please speak a bit louder?",
    "I'm having trouble hearing you clearly.",
    "Could you repeat that, please?",
    "Thank you for calling. Is there anything else I can help with?"
  ],
  'meeting': [
    "Let's start with the agenda items.",
    "What are your thoughts on this proposal?",
    "Do you have any concerns we should address?",
    "How should we move forward with this?",
    "Let's schedule a follow-up meeting."
  ],
  'social': [
    "It's nice to meet you! What brings you here?",
    "This is a lovely event, isn't it?",
    "Have you tried the food? It's delicious!",
    "Do you know many people here?",
    "What do you do for work?"
  ]
};

export default function DialogueMode() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('casual-chat');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startSession();
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const startSession = () => {
    // Send initial AI message
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: getInitialMessage(),
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);

    // Start session timer
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
    
    // Simple keyword-based response selection
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! It's great to meet you. How can we get started?";
    }
    
    if (lowerMessage.includes('thank you') || lowerMessage.includes('thanks')) {
      return "You're welcome! Is there anything else you'd like to practice?";
    }
    
    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return "Goodbye! Great job practicing today. Keep up the good work!";
    }
    
    // Return a random response from the topic category
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex] || "That's interesting! Could you tell me more about that?";
  };

  const sendMessage = async () => {
    if (inputText.trim() === '' || isPaused) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessageCount(prev => prev + 1);
    setInputText('');

    // Generate AI response after a short delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(inputText),
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000 + Math.random() * 2000); // 1-3 second delay for realism
  };

  const toggleRecording = () => {
    // In a real implementation, this would handle speech-to-text
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate voice input
      setTimeout(() => {
        setInputText("This is a voice message transcription...");
        setIsRecording(false);
      }, 3000);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      // Resume session timer
      sessionTimerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    } else {
      // Pause session timer
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }
  };

  const changeTopic = (topic: string) => {
    setSelectedTopic(topic);
    // Clear messages and restart with new topic
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

  return (
    <LinearGradient
      colors={['#0f0c29', '#16213e', '#1a1a2e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={endSession} style={styles.backButton}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Dialogue Mode</Text>
          <TouchableOpacity onPress={togglePause} style={styles.pauseButton}>
            <Pause size={24} color={isPaused ? '#f093fb' : 'white'} />
          </TouchableOpacity>
        </View>

        <View style={styles.topicSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CONVERSATION_TOPICS.map((topic, index) => (
              <TouchableOpacity
                key={topic}
                style={[
                  styles.topicButton,
                  selectedTopic === topic.toLowerCase().replace(' ', '-') && styles.topicButtonActive
                ]}
                onPress={() => changeTopic(topic.toLowerCase().replace(' ', '-'))}
              >
                <Text style={[
                  styles.topicText,
                  selectedTopic === topic.toLowerCase().replace(' ', '-') && styles.topicTextActive
                ]}>
                  {topic}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.statsBar}>
          <Text style={styles.statText}>Time: {formatTime(sessionTime)}</Text>
          <Text style={styles.statText}>Messages: {messageCount}</Text>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.aiMessage
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
            {isPaused && (
              <View style={styles.pausedIndicator}>
                <Text style={styles.pausedText}>Conversation Paused</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isPaused ? "Conversation paused" : "Type your message..."}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              editable={!isPaused}
            />
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonActive]}
              onPress={toggleRecording}
              disabled={isPaused}
            >
              <Mic size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
              disabled={inputText.trim() === '' || isPaused}
            >
              <Send size={20} color="white" />
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  pauseButton: {
    padding: 8,
  },
  topicSelector: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  topicButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  topicButtonActive: {
    backgroundColor: '#4facfe',
  },
  topicText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  topicTextActive: {
    color: 'white',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#4facfe',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  aiText: {
    color: 'white',
  },
  pausedIndicator: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pausedText: {
    color: '#f093fb',
    fontSize: 16,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
    maxHeight: 100,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micButtonActive: {
    backgroundColor: '#f5576c',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4facfe',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});