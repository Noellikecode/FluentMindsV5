import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX, Pause, Play, RotateCcw, Zap, X, Settings, MessageCircle } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withRepeat,
  interpolate,
  Extrapolate,
  withSequence,
  withDelay
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

// IMPORTANT: FOR PRODUCTION APPS, NEVER EMBED API KEYS DIRECTLY IN CLIENT-SIDE CODE
const ASSEMBLYAI_API_KEY = "3e043ca91e484201a625ca39f5f2f260";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioLevel?: number;
}

const CONVERSATION_CONTEXTS = [
  { id: 'casual', name: 'Casual Chat', emoji: '😊', gradient: ['#667EEA', '#764BA2'] },
  { id: 'interview', name: 'Job Interview', emoji: '💼', gradient: ['#8B5CF6', '#A855F7'] },
  { id: 'presentation', name: 'Public Speaking', emoji: '🎯', gradient: ['#06FFA5', '#4ECDC4'] },
  { id: 'social', name: 'Social Event', emoji: '🎉', gradient: ['#F093FB', '#F5576C'] },
];

const AI_PERSONALITY_RESPONSES = {
  casual: {
    greeting: "Hey there! I'm really excited to chat with you today. What's been the highlight of your week so far?",
    responses: [
      "That's absolutely fascinating! I love hearing about that kind of experience.",
      "Wow, that sounds incredible! How did that make you feel in the moment?",
      "I can totally relate to that! What was going through your mind when that happened?",
      "That's such an interesting perspective! I'd love to hear more about your thoughts on that.",
      "Amazing! You have such a unique way of looking at things. Tell me more!"
    ]
  },
  interview: {
    greeting: "Hello! Thank you for taking the time to speak with me today. I'm looking forward to learning more about you and your background.",
    responses: [
      "That's an excellent example. Can you walk me through your thought process during that situation?",
      "Very impressive! What would you say has been your most significant professional achievement?",
      "I appreciate that insight. How do you typically handle challenging situations or setbacks?",
      "That demonstrates great leadership. What motivates you most in your professional work?",
      "Wonderful! Where do you see yourself developing further in the next few years?"
    ]
  },
  presentation: {
    greeting: "Welcome everyone! I'm delighted to be here with you today. Please, share with us what you'd like to present.",
    responses: [
      "That's a compelling point! Could you elaborate on that concept for our audience?",
      "Excellent presentation! What evidence or data supports that conclusion?",
      "Very insightful! Can you provide a specific example to illustrate that principle?",
      "That's thought-provoking! How does this connect to the broader implications?",
      "Outstanding! What questions do you anticipate your audience might have about this topic?"
    ]
  },
  social: {
    greeting: "What a lovely gathering this is! I'm so glad we have the chance to meet and chat. How are you enjoying the event so far?",
    responses: [
      "Oh, this is such a wonderful event, isn't it? The atmosphere is just perfect!",
      "I absolutely agree! Have you had a chance to try any of the refreshments? They're delicious!",
      "That's so interesting! How did you come to be involved with this group?",
      "What a delightful story! I love meeting people with such fascinating backgrounds.",
      "This has been such an enjoyable conversation! You have such engaging stories to share."
    ]
  }
};

// Polyfill for atob (Base64 decoding) for React Native/Hermes
function atob(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';

  if (str.length % 4 == 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }

  for (let bc = 0, bs = 0, buffer, i = 0;
    buffer = str.charAt(i++);
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
      bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    buffer = chars.indexOf(buffer);
  }

  return output;
}

export default function DialogueMode() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContext, setSelectedContext] = useState('casual');
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Animation values
  const micScale = useSharedValue(1);
  const micGlow = useSharedValue(0);
  const waveAnimation = useSharedValue(0);
  const processingRotation = useSharedValue(0);
  
  // Audio visualization dots
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);
  const dot4 = useSharedValue(0.3);
  
  // Holographic effects
  const holoGlow = useSharedValue(0);
  const borderGlow = useSharedValue(0);
  const floatingY = useSharedValue(0);
  
  // Particle animations
  const particles = useRef(Array.from({ length: 20 }, () => ({
    x: useSharedValue(0),
    y: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0)
  }))).current;

  useEffect(() => {
    initializeSession();
    initializeAnimations();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (isListening) {
      startAudioVisualization();
    } else {
      stopAudioVisualization();
    }
  }, [isListening]);

  const initializeAnimations = () => {
    // Floating animation
    floatingY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 3000 }),
        withTiming(10, { duration: 3000 })
      ),
      -1,
      true
    );

    // Holographic glow
    holoGlow.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      true
    );

    // Border glow
    borderGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  };

  const startAudioVisualization = () => {
    const animateDot = (dot: Animated.SharedValue<number>, delay: number) => {
      dot.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.2, { duration: 300 })
          ),
          -1,
          false
        )
      );
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
    animateDot(dot4, 450);
  };

  const stopAudioVisualization = () => {
    dot1.value = withTiming(0.3);
    dot2.value = withTiming(0.3);
    dot3.value = withTiming(0.3);
    dot4.value = withTiming(0.3);
  };

  const triggerParticleExplosion = () => {
    particles.forEach((particle, index) => {
      const angle = (index / particles.length) * Math.PI * 2;
      const radius = 120 + Math.random() * 80;
      
      particle.x.value = withTiming(Math.cos(angle) * radius, { duration: 1200 });
      particle.y.value = withTiming(Math.sin(angle) * radius, { duration: 1200 });
      particle.opacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 900 })
      );
      particle.scale.value = withSequence(
        withTiming(2, { duration: 300 }),
        withTiming(0, { duration: 900 })
      );
      
      setTimeout(() => {
        particle.x.value = 0;
        particle.y.value = 0;
        particle.opacity.value = 0;
        particle.scale.value = 0;
      }, 1500);
    });
  };

  const cleanup = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(console.error);
    }
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(console.error);
    }
  };

  const initializeSession = () => {
    const context = AI_PERSONALITY_RESPONSES[selectedContext as keyof typeof AI_PERSONALITY_RESPONSES];
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: context.greeting,
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const startSessionTimer = () => {
    if (!sessionTimerRef.current) {
      sessionTimerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  };

  const setupAudio = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone permission is required!');
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      return true;
    } catch (err: any) {
      console.error('Audio setup failed:', err);
      Alert.alert('Audio Setup Error', 'Could not configure audio: ' + err.message);
      return false;
    }
  };

  const startRecording = async (): Promise<void> => {
    if (isRecording) return;

    const audioReady = await setupAudio();
    if (!audioReady) return;

    try {
      const recordingConfig: Audio.RecordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: 'aac',
          audioQuality: 0.5,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/aac',
          bitsPerSecond: 128000,
        }
      };

      const { recording } = await Audio.Recording.createAsync(recordingConfig);
      recordingRef.current = recording;
      
      await recording.startAsync();
      setIsRecording(true);
      setIsListening(true);

      triggerParticleExplosion();

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Could not start recording: ' + error.message);
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    setIsRecording(false);
    setIsListening(false);

    if (!recordingRef.current) return null;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      return uri;
    } catch (error) {
      console.error("Error stopping recording:", error);
      return null;
    }
  };

  const processAudioWithAssemblyAI = async (audioUri: string) => {
    try {
      setIsProcessing(true);
      processingRotation.value = withRepeat(withTiming(360, { duration: 2000 }), -1, false);

      const audioData = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream',
        },
        body: bytes,
      });

      const uploadResult = await uploadResponse.json();
      const audioUrl = uploadResult.upload_url;

      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          speech_model: 'best',
          punctuate: true,
          format_text: true,
          language_code: 'en',
        }),
      });

      const transcriptResult = await transcriptResponse.json();
      const finalTranscript = await pollForTranscription(transcriptResult.id);
      
      if (finalTranscript.text && finalTranscript.text.trim()) {
        handleUserSpeech(finalTranscript.text.trim());
      } else {
        setTimeout(startListening, 1000);
      }

    } catch (error: any) {
      console.error('Speech processing error:', error);
      setTimeout(startListening, 2000);
    } finally {
      setIsProcessing(false);
      processingRotation.value = withTiming(0);
    }
  };

  const pollForTranscription = async (transcriptId: string): Promise<any> => {
    const maxAttempts = 30;
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        attempts++;
        if (attempts > maxAttempts) {
          reject(new Error('Transcription timed out'));
          return;
        }

        try {
          const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: { 'authorization': ASSEMBLYAI_API_KEY },
          });

          const result = await response.json();

          if (result.status === 'completed') {
            resolve(result);
          } else if (result.status === 'error') {
            reject(new Error(`Transcription failed: ${result.error}`));
          } else {
            setTimeout(poll, 2000);
          }
        } catch (error) {
          reject(error);
        }
      };
      poll();
    });
  };

  const handleUserSpeech = (transcript: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: transcript,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setConversationCount(prev => prev + 1);

    setTimeout(() => {
      generateAIResponse(transcript);
    }, 1000 + Math.random() * 2000);
  };

  const generateAIResponse = (userInput: string) => {
    const context = AI_PERSONALITY_RESPONSES[selectedContext as keyof typeof AI_PERSONALITY_RESPONSES];
    let responseText = "";

    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
      responseText = "Hello! It's wonderful to hear your voice! How has your day been treating you?";
    } else if (lowerInput.includes('thank you') || lowerInput.includes('thanks')) {
      responseText = "You're so welcome! I'm really enjoying our conversation. Your thoughts are fascinating!";
    } else if (lowerInput.includes('bye') || lowerInput.includes('goodbye')) {
      responseText = "It's been such a pleasure talking with you! You did amazing today. Keep practicing - you're doing great!";
    } else {
      const randomIndex = Math.floor(Math.random() * context.responses.length);
      responseText = context.responses[randomIndex];
    }

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: responseText,
      isUser: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMessage]);

    setTimeout(() => {
      if (isSessionActive) {
        startListening();
      }
    }, 3000);
  };

  const startListening = async () => {
    if (!isSessionActive) return;
    
    micScale.value = withSpring(1.1);
    await startRecording();
    
    setTimeout(async () => {
      if (isRecording) {
        const audioUri = await stopRecording();
        if (audioUri) {
          await processAudioWithAssemblyAI(audioUri);
        }
      }
    }, 8000);
  };

  const handleMicPress = async () => {
    if (!isSessionActive) {
      setIsSessionActive(true);
      startSessionTimer();
      micScale.value = withSpring(1.2);
      setTimeout(startListening, 500);
    } else if (isListening) {
      const audioUri = await stopRecording();
      if (audioUri) {
        await processAudioWithAssemblyAI(audioUri);
      }
    } else {
      startListening();
    }
  };

  const endSession = async () => {
    if (sessionTime > 0) {
      try {
        const sessionData = {
          date: new Date().toISOString(),
          gameMode: 'dialogue-mode',
          duration: sessionTime,
          completed: true,
          conversationCount,
          context: selectedContext
        };

        const existingSessions = await AsyncStorage.getItem('userSessions');
        const sessions = existingSessions ? JSON.parse(existingSessions) : [];
        sessions.push(sessionData);
        await AsyncStorage.setItem('userSessions', JSON.stringify(sessions));
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }
    cleanup();
    router.back();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Animated styles
  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1.value,
    transform: [{ scale: dot1.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2.value,
    transform: [{ scale: dot2.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3.value,
    transform: [{ scale: dot3.value }],
  }));

  const dot4Style = useAnimatedStyle(() => ({
    opacity: dot4.value,
    transform: [{ scale: dot4.value }],
  }));

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: micScale.value },
      { translateY: floatingY.value }
    ],
  }));

  const holoStyle = useAnimatedStyle(() => ({
    opacity: holoGlow.value * 0.6,
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderGlow.value,
  }));

  return (
    <View style={styles.container}>
      {/* Multi-layer background */}
      <LinearGradient
        colors={['#000814', '#001D3D', '#003566', '#0077B6']}
        style={styles.backgroundGradient}
      />
      
      {/* Animated holographic overlay */}
      <Animated.View style={[styles.holoOverlay, holoStyle]}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.08)', 'rgba(59, 130, 246, 0.06)', 'rgba(16, 185, 129, 0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      
      <SafeAreaView style={styles.safeArea}>
        {/* Glassmorphic Header */}
        <BlurView intensity={100} tint="dark" style={styles.header}>
          <Animated.View style={[styles.headerBorder, borderStyle]} />
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={endSession} style={styles.backButton}>
              <BlurView intensity={80} tint="light" style={styles.buttonGlass}>
                <ArrowLeft size={22} color="rgba(255, 255, 255, 0.9)" strokeWidth={1.5} />
              </BlurView>
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={styles.contextName}>
                {CONVERSATION_CONTEXTS.find(c => c.id === selectedContext)?.name || 'Neural Dialogue'}
              </Text>
              <Text style={styles.alphaLabel}>quantum • alpha</Text>
              {sessionTime > 0 && (
                <Text style={styles.sessionTime}>{formatTime(sessionTime)} • {conversationCount} exchanges</Text>
              )}
            </View>

            <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.settingsButton}>
              <BlurView intensity={80} tint="light" style={styles.buttonGlass}>
                <Settings size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
              </BlurView>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>

        {/* Messages Display */}
        {messages.length > 1 && (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.slice(1).map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessageContainer : styles.aiMessageContainer
                ]}
              >
                <BlurView intensity={80} tint={message.isUser ? "light" : "dark"} style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.aiBubble
                ]}>
                  <LinearGradient
                    colors={message.isUser 
                      ? ['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.2)'] 
                      : ['rgba(59, 130, 246, 0.4)', 'rgba(59, 130, 246, 0.2)']
                    }
                    style={styles.messageGradient}
                  >
                    <Text style={[
                      styles.messageText,
                      message.isUser ? styles.userText : styles.aiText
                    ]}>
                      {message.text}
                    </Text>
                  </LinearGradient>
                </BlurView>
              </View>
            ))}
            
            {isProcessing && (
              <View style={styles.processingContainer}>
                <BlurView intensity={80} tint="dark" style={styles.processingBubble}>
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.15)']}
                    style={styles.processingGradient}
                  >
                    <Animated.View style={useAnimatedStyle(() => ({
                      transform: [{ rotate: `${processingRotation.value}deg` }]
                    }))}>
                      <Zap size={18} color="#667EEA" strokeWidth={1.5} />
                    </Animated.View>
                    <Text style={styles.processingText}>Neural processing...</Text>
                  </LinearGradient>
                </BlurView>
              </View>
            )}
          </ScrollView>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Particle System */}
          <View style={styles.particleContainer}>
            {particles.map((particle, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  useAnimatedStyle(() => ({
                    transform: [
                      { translateX: particle.x.value },
                      { translateY: particle.y.value },
                      { scale: particle.scale.value }
                    ],
                    opacity: particle.opacity.value,
                  }))
                ]}
              />
            ))}
          </View>

          {/* Center Audio Visualization */}
          <Animated.View style={[styles.centerVisualization, micAnimatedStyle]}>
            {/* Holographic rings */}
            <View style={styles.holoRings}>
              <Animated.View style={[styles.holoRing, styles.holoRing1, borderStyle]} />
              <Animated.View style={[styles.holoRing, styles.holoRing2, borderStyle]} />
              <Animated.View style={[styles.holoRing, styles.holoRing3, borderStyle]} />
            </View>

            {/* Audio Dots */}
            <View style={styles.audioDotsContainer}>
              <Animated.View style={[styles.audioDot, dot1Style]} />
              <Animated.View style={[styles.audioDot, dot2Style]} />
              <Animated.View style={[styles.audioDot, dot3Style]} />
              <Animated.View style={[styles.audioDot, dot4Style]} />
            </View>

            {/* Status Text */}
            <Text style={styles.statusText}>
              {isListening ? "◉ ACTIVE NEURAL LINK" : 
               isProcessing ? "⟡ PROCESSING QUANTUM DATA" :
               isSessionActive ? "⟡ READY FOR INPUT" : 
               "◉ TAP TO INITIALIZE"}
            </Text>
          </Animated.View>
        </View>

        {/* Futuristic Bottom Controls */}
        <View style={styles.bottomControls}>
          <BlurView intensity={100} tint="dark" style={styles.controlPanel}>
            <Animated.View style={[styles.controlBorder, borderStyle]} />
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(59, 130, 246, 0.1)', 'rgba(16, 185, 129, 0.05)']}
              style={styles.controlGradient}
            >
              {/* Microphone Button */}
              <TouchableOpacity
                style={styles.micButton}
                onPress={handleMicPress}
                activeOpacity={0.8}
              >
                <BlurView intensity={120} tint="light" style={styles.micButtonGlass}>
                  <Animated.View style={micAnimatedStyle}>
                    <LinearGradient
                      colors={isListening 
                        ? ['#EF4444', '#DC2626', '#B91C1C'] 
                        : isSessionActive 
                        ? ['#8B5CF6', '#7C3AED', '#6D28D9']
                        : ['#3B82F6', '#2563EB', '#1D4ED8']
                      }
                      style={styles.micButtonGradient}
                    >
                      {isListening ? (
                        <MicOff size={32} color="white" strokeWidth={2} />
                      ) : isSessionActive ? (
                        <Mic size={32} color="white" strokeWidth={2} />
                      ) : (
                        <Play size={48} color="white" fill="white" strokeWidth={0} />
                      )}
                    </LinearGradient>
                  </Animated.View>
                </BlurView>
              </TouchableOpacity>

              {/* Action Label */}
              <Text style={styles.actionLabel}>
                {isListening ? "TAP TO STOP" : 
                 isSessionActive ? "TAP TO SPEAK" : 
                 "TAP TO START"}
              </Text>

              {/* Stop Button */}
              <TouchableOpacity
                style={styles.stopButton}
                onPress={endSession}
                activeOpacity={0.8}
              >
                <BlurView intensity={100} tint="light" style={styles.stopButtonGlass}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626', '#B91C1C']}
                    style={styles.stopButtonGradient}
                  >
                    <X size={20} color="white" strokeWidth={2} />
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>
            </LinearGradient>
          </BlurView>
        </View>

        {/* Futuristic Settings Modal */}
        {showSettings && (
          <BlurView intensity={120} tint="dark" style={styles.settingsOverlay}>
            <View style={styles.settingsModal}>
              <BlurView intensity={100} tint="dark" style={styles.settingsGlass}>
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.2)', 'rgba(59, 130, 246, 0.15)', 'rgba(0, 8, 20, 0.9)']}
                  style={styles.settingsGradient}
                >
                  <Text style={styles.settingsTitle}>◉ SELECT NEURAL CONTEXT</Text>
                  {CONVERSATION_CONTEXTS.map((context) => (
                    <TouchableOpacity
                      key={context.id}
                      style={[
                        styles.contextOption,
                        selectedContext === context.id && styles.contextOptionActive
                      ]}
                      onPress={() => {
                        setSelectedContext(context.id);
                        setShowSettings(false);
                        setMessages([]);
                        initializeSession();
                      }}
                    >
                      <BlurView intensity={60} tint="light" style={styles.contextOptionGlass}>
                        <LinearGradient
                          colors={selectedContext === context.id 
                            ? ['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.2)']
                            : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)']
                          }
                          style={styles.contextOptionGradient}
                        >
                          <Text style={styles.contextEmoji}>{context.emoji}</Text>
                          <Text style={[
                            styles.contextOptionText,
                            selectedContext === context.id && styles.contextOptionTextActive
                          ]}>
                            {context.name}
                          </Text>
                        </LinearGradient>
                      </BlurView>
                    </TouchableOpacity>
                  ))}
                </LinearGradient>
              </BlurView>
            </View>
          </BlurView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000814',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  holoOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    position: 'relative',
  },
  headerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGlass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  headerCenter: {
    alignItems: 'center',
  },
  contextName: {
    fontSize: 18,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 2,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  alphaLabel: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '300',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  sessionTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    letterSpacing: 1,
    fontFamily: 'System',
    fontWeight: '300',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  userBubble: {
    borderBottomRightRadius: 4,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  messageGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#FFFFFF',
  },
  processingContainer: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    maxWidth: '85%',
  },
  processingBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  processingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '400',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    minHeight: 200,
  },
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 8,
  },
  centerVisualization: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  holoRings: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holoRing: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 100,
  },
  holoRing1: {
    width: 140,
    height: 140,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  holoRing2: {
    width: 180,
    height: 180,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  holoRing3: {
    width: 220,
    height: 220,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  audioDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  audioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
    marginHorizontal: 5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
  },
  statusText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'System',
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  controlPanel: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    position: 'relative',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  controlBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.7)',
  },
  controlGradient: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 30,
  },
  micButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  micButtonGlass: {
    flex: 1,
    borderRadius: 70,
  },
  micButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 70,
  },
  actionLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 15,
    fontFamily: 'System',
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  stopButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stopButtonGlass: {
    flex: 1,
    borderRadius: 25,
  },
  stopButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  settingsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 8, 20, 0.95)',
  },
  settingsModal: {
    width: width * 0.9,
    maxWidth: 350,
  },
  settingsGlass: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.6)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  settingsGradient: {
    padding: 28,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'System',
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  contextOption: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  contextOptionActive: {
    transform: [{ scale: 1.03 }],
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  contextOptionGlass: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contextOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  contextEmoji: {
    fontSize: 20,
    marginRight: 14,
  },
  contextOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  contextOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});