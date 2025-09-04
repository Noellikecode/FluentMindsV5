import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Play, Pause, Square, RotateCcw, Mic, Sparkles, RefreshCw } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  withSequence,
  Easing,
  interpolateColor
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const STORY_PROMPTS = [
  "Tell me about a moment when you felt truly proud of yourself.",
  "Describe a place that feels like home to you and why it's special.",
  "Share a story about a time when kindness made a difference.",
  "Tell me about a dream or goal that excites you.",
  "Describe a person who has inspired you and how they've influenced your life.",
  "Share a memory from childhood that still brings you joy.",
  "Tell me about a challenge you overcame and what you learned.",
  "Describe your perfect day from start to finish.",
  "Share a story about a time when you helped someone else.",
  "Tell me about a book, movie, or song that changed your perspective.",
  "Describe a tradition or ritual that's meaningful to you.",
  "Share a story about a time when you stepped outside your comfort zone.",
  "Tell me about something you're grateful for and why.",
  "Describe a skill or talent you'd love to develop.",
  "Share a story about a moment that made you laugh until you cried."
];

export default function StorytellingMode() {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [completedPrompts, setCompletedPrompts] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const recordingScale = useSharedValue(1);
  const recordingOpacity = useSharedValue(1);
  const promptScale = useSharedValue(1);
  const sparkleRotation = useSharedValue(0);

  useEffect(() => {
    generateNewPrompt();
    startSessionTimer();
    
    // Continuous sparkle animation
    sparkleRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
    
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Recording pulse animation
      recordingScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      recordingScale.value = withTiming(1, { duration: 300 });
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const startSessionTimer = () => {
    sessionTimerRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
  };

  const generateNewPrompt = () => {
    const randomPrompt = STORY_PROMPTS[Math.floor(Math.random() * STORY_PROMPTS.length)];
    setCurrentPrompt(randomPrompt);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    
    // Animate prompt change
    promptScale.value = withSequence(
      withTiming(0.95, { duration: 200 }),
      withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
    );
  };

  const startRecording = () => {
    if (!sessionStarted) {
      setSessionStarted(true);
    }
    setIsRecording(true);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    setIsPaused(true);
  };

  const resumeRecording = () => {
    setIsPaused(false);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    
    if (recordingTime > 30) {
      setCompletedPrompts(prev => prev + 1);
    }
  };

  const resetSession = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setCompletedPrompts(0);
    setSessionStarted(false);
    generateNewPrompt();
  };

  const endSession = async () => {
    if (sessionTime > 0) {
      try {
        const sessionData = {
          date: new Date().toISOString(),
          gameMode: 'storytelling',
          duration: sessionTime,
          completed: true,
          completedPrompts,
          totalRecordingTime: recordingTime
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

  const getRecordingStatus = () => {
    if (isRecording && !isPaused) return 'Recording your story...';
    if (isRecording && isPaused) return 'Paused';
    return 'Ready to begin';
  };

  const getInstructions = () => {
    if (!sessionStarted) {
      return 'Take a moment to think about the prompt, then press record when you\'re ready to share.';
    }
    if (isRecording && !isPaused) {
      return 'Speak naturally and let your story flow. Take your time.';
    }
    if (isPaused) {
      return 'Take a breath. Press resume when you\'re ready to continue.';
    }
    return 'Great job! Press record to continue or get a new prompt to explore.';
  };

  const recordingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingScale.value }],
  }));

  const promptAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: promptScale.value }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotation.value}deg` }],
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
            <Text style={styles.title}>Creative Stories</Text>
            <Text style={styles.subtitle}>{formatTime(sessionTime)}</Text>
          </View>
          <TouchableOpacity onPress={generateNewPrompt} style={styles.headerButton} disabled={isRecording}>
            <RefreshCw size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.promptContainer, promptAnimatedStyle]}>
            <View style={styles.promptHeader}>
              <Animated.View style={sparkleAnimatedStyle}>
                <Sparkles size={24} color="#fbbf24" strokeWidth={1.5} />
              </Animated.View>
              <Text style={styles.promptTitle}>Your Story Prompt</Text>
            </View>
            <Text style={styles.promptText}>{currentPrompt}</Text>
          </Animated.View>

          <Animated.View style={[styles.statusContainer, recordingAnimatedStyle]}>
            <View style={[
              styles.recordingIndicator,
              isRecording && !isPaused && styles.recordingActive,
              isPaused && styles.recordingPaused
            ]}>
              <View style={styles.statusIcon}>
                <Mic size={20} color="white" strokeWidth={1.5} />
              </View>
              <Text style={styles.statusText}>{getRecordingStatus()}</Text>
            </View>
            
            {isRecording && (
              <View style={styles.timeDisplay}>
                <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
                <View style={styles.recordingDots}>
                  <View style={[styles.recordingDot, styles.recordingDot1]} />
                  <View style={[styles.recordingDot, styles.recordingDot2]} />
                  <View style={[styles.recordingDot, styles.recordingDot3]} />
                </View>
              </View>
            )}
          </Animated.View>

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>{getInstructions()}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{completedPrompts}</Text>
              <Text style={styles.statLabel}>Stories</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatTime(sessionTime)}</Text>
              <Text style={styles.statLabel}>Session</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={resetSession}
          >
            <RotateCcw size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
          </TouchableOpacity>
          
          <View style={styles.primaryControls}>
            {!isRecording ? (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={startRecording}
              >
                <LinearGradient
                  colors={['#ec4899', '#be185d']}
                  style={styles.buttonGradient}
                >
                  <Play size={28} color="white" strokeWidth={1.5} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.recordingControls}>
                {!isPaused ? (
                  <TouchableOpacity
                    style={styles.pauseButton}
                    onPress={pauseRecording}
                  >
                    <LinearGradient
                      colors={['#f59e0b', '#d97706']}
                      style={styles.smallButtonGradient}
                    >
                      <Pause size={20} color="white" strokeWidth={1.5} />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.resumeButton}
                    onPress={resumeRecording}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      style={styles.smallButtonGradient}
                    >
                      <Play size={20} color="white" strokeWidth={1.5} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopRecording}
                >
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    style={styles.smallButtonGradient}
                  >
                    <Square size={20} color="white" strokeWidth={1.5} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={generateNewPrompt}
            disabled={isRecording}
          >
            <Text style={styles.newPromptText}>New</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
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
  content: {
    flex: 1,
  },
  promptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 28,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fbbf24',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 26,
    fontWeight: '400',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 30,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  recordingActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: '#ec4899',
  },
  recordingPaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  timeDisplay: {
    alignItems: 'center',
  },
  recordingTime: {
    fontSize: 32,
    fontWeight: '200',
    color: '#ec4899',
    marginBottom: 8,
  },
  recordingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ec4899',
    marginHorizontal: 3,
  },
  recordingDot1: {
    opacity: 0.4,
  },
  recordingDot2: {
    opacity: 0.7,
  },
  recordingDot3: {
    opacity: 1,
  },
  instructions: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 50,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '300',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  primaryControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginRight: 16,
    elevation: 4,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resumeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginRight: 16,
    elevation: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newPromptText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});