import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Play, Pause, Square, RotateCcw, Mic } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORY_PROMPTS = [
  "Tell me about a time when you overcame a difficult challenge.",
  "Describe your ideal vacation destination and what you would do there.",
  "Share a childhood memory that still makes you smile.",
  "If you could have dinner with any historical figure, who would it be and why?",
  "Describe a skill you would love to learn and how it would change your life.",
  "Tell me about a book or movie that deeply impacted you.",
  "Share your thoughts on how technology has changed our daily lives.",
  "Describe a tradition from your family or culture that's important to you.",
  "Tell me about a person who has been a positive influence in your life.",
  "If you could solve one world problem, what would it be and how?",
  "Describe your dream home and the perfect neighborhood around it.",
  "Tell me about a hobby or interest that you're passionate about.",
  "Share a funny story or embarrassing moment that you can laugh about now.",
  "Describe what you think makes a person truly successful.",
  "Tell me about a place you've visited that left a lasting impression."
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

  useEffect(() => {
    generateNewPrompt();
    startSessionTimer();
    
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
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
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
  };

  const startRecording = () => {
    if (!sessionStarted) {
      setSessionStarted(true);
    }
    setIsRecording(true);
    setIsPaused(false);
    Alert.alert('Recording Started', 'Speak naturally and tell your story!');
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
    
    if (recordingTime > 30) { // Only count as completed if they spoke for at least 30 seconds
      setCompletedPrompts(prev => prev + 1);
      Alert.alert(
        'Recording Complete!', 
        `Great job! You spoke for ${formatTime(recordingTime)}. Your fluency and expression are improving!`,
        [
          { text: 'New Prompt', onPress: generateNewPrompt },
          { text: 'Continue', style: 'default' }
        ]
      );
    } else {
      Alert.alert('Recording Stopped', 'Try to speak for at least 30 seconds to get meaningful practice.');
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
    if (isRecording && !isPaused) return 'Recording...';
    if (isRecording && isPaused) return 'Paused';
    return 'Ready to Record';
  };

  const getInstructions = () => {
    if (!sessionStarted) {
      return 'Read the prompt above and press the record button when you\'re ready to share your story.';
    }
    if (isRecording && !isPaused) {
      return 'Speak naturally and take your time. You\'re doing great!';
    }
    if (isPaused) {
      return 'Recording paused. Press resume when you\'re ready to continue.';
    }
    return 'Press record to start telling your story, or get a new prompt if you prefer.';
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
          <Text style={styles.title}>Storytelling</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.promptContainer}>
            <Text style={styles.promptTitle}>Your Story Prompt:</Text>
            <Text style={styles.promptText}>{currentPrompt}</Text>
          </View>

          <View style={styles.statusContainer}>
            <View style={[
              styles.recordingIndicator,
              isRecording && !isPaused && styles.recordingActive,
              isPaused && styles.recordingPaused
            ]}>
              <Mic size={24} color="white" />
              <Text style={styles.statusText}>{getRecordingStatus()}</Text>
            </View>
            
            {isRecording && (
              <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
            )}
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>{getInstructions()}</Text>
          </View>

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedPrompts}</Text>
              <Text style={styles.statLabel}>Stories Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatTime(sessionTime)}</Text>
              <Text style={styles.statLabel}>Session Time</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={resetSession}
          >
            <RotateCcw size={24} color="white" />
          </TouchableOpacity>
          
          {!isRecording ? (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={startRecording}
            >
              <Play size={32} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={styles.recordingControls}>
              {!isPaused ? (
                <TouchableOpacity
                  style={styles.pauseButton}
                  onPress={pauseRecording}
                >
                  <Pause size={28} color="white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.resumeButton}
                  onPress={resumeRecording}
                >
                  <Play size={28} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopRecording}
              >
                <Square size={28} color="white" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.controlButton}
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
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  promptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#43e97b',
    marginBottom: 12,
  },
  promptText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 24,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    marginBottom: 8,
  },
  recordingActive: {
    backgroundColor: '#f5576c',
  },
  recordingPaused: {
    backgroundColor: '#f093fb',
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recordingTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#43e97b',
  },
  instructions: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#43e97b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingControls: {
    flexDirection: 'row',
  },
  pauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f093fb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resumeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#43e97b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5576c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newPromptText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});