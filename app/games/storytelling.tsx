import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions, Alert, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { ArrowLeft, Mic, MicOff, Sparkles, Shuffle, Square, Save, RotateCcw, X, CheckCircle } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

// IMPORTANT: FOR PRODUCTION APPS, NEVER EMBED API KEYS DIRECTLY IN CLIENT-SIDE CODE
const ASSEMBLYAI_API_KEY = "3e043ca91e484201a625ca39f5f2f260";

interface StutterAnalysis {
  stutterCount: number;
  stutterPercentage: number;
  fluencyScore: number;
  stutterTypes: {
    repetitions: number;
    prolongations: number;
    blocks: number;
  };
  fluencyRating: 'excellent' | 'good' | 'fair' | 'needs improvement';
}

interface StorySession {
  id: string;
  prompt: string;
  transcript: string;
  confidence: number;
  wordCount: number;
  duration: number;
  timestamp: Date;
  stutterAnalysis?: StutterAnalysis;
}

interface SpeechAnalysis {
  transcript: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  sentiment?: string;
  summary?: string;
  duration: number;
  wordCount: number;
  stutterAnalysis: StutterAnalysis;
}

// Advanced Stutter Detection Algorithm
class StutterDetector {
  private static REPETITION_PATTERNS = [
    /\b(\w+)\s+\1\b/gi,                    // Word repetitions: "the the"
    /\b(\w)\1{2,}\b/gi,                    // Sound repetitions: "b-b-book"
    /\b(\w+)-\1\b/gi,                      // Hyphenated repetitions: "I-I"
  ];

  private static PROLONGATION_PATTERNS = [
    /\b\w*[aeiou]{3,}\w*\b/gi,            // Vowel prolongations: "sooooo"
    /\b\w*[bcdfghjklmnpqrstvwxyz]{3,}\w*\b/gi, // Consonant prolongations: "ssssso"
    /\b\w+[-_]{2,}\w*\b/gi,               // Dash prolongations: "I---am"
  ];

  private static BLOCK_INDICATORS = [
    /\b(uh|um|er|ah|eh)\b/gi,             // Filler words
    /\.\.\.|…/g,                          // Ellipsis indicating pauses
    /\b\w{1,2}\b(?:\s+\b\w{1,2}\b){2,}/gi, // Short fragmented words
  ];

  private static FLUENCY_KEYWORDS = [
    'smooth', 'clear', 'fluent', 'natural', 'flowing'
  ];

  static analyzeStutter(transcript: string, words: any[], duration: number): StutterAnalysis {
    const cleanTranscript = transcript.toLowerCase().trim();
    const wordCount = words.length || cleanTranscript.split(/\s+/).filter(w => w.length > 0).length;
    
    // Detect different types of stutters
    const repetitions = this.detectRepetitions(cleanTranscript);
    const prolongations = this.detectProlongations(cleanTranscript);
    const blocks = this.detectBlocks(cleanTranscript);
    
    // Calculate word-level timing analysis if available
    const timingStutters = words.length > 0 ? this.analyzeWordTiming(words) : 0;
    
    // Total stutter count
    const totalStutters = repetitions + prolongations + blocks + timingStutters;
    
    // Calculate fluency metrics
    const stutterPercentage = wordCount > 0 ? Math.min(100, (totalStutters / wordCount) * 100) : 0;
    const fluencyScore = Math.max(0, 100 - (stutterPercentage * 2)); // Penalize stutters
    
    // Determine fluency rating
    const fluencyRating = this.getFluencyRating(fluencyScore);
    
    return {
      stutterCount: totalStutters,
      stutterPercentage: Math.round(stutterPercentage * 10) / 10,
      fluencyScore: Math.round(fluencyScore),
      stutterTypes: {
        repetitions,
        prolongations,
        blocks: blocks + timingStutters
      },
      fluencyRating
    };
  }

  private static detectRepetitions(text: string): number {
    let count = 0;
    
    this.REPETITION_PATTERNS.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });
    
    // Advanced: Detect partial word repetitions
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const current = words[i].replace(/[^\w]/g, '');
      const next = words[i + 1].replace(/[^\w]/g, '');
      
      // Check if words start the same but one is incomplete
      if (current.length >= 2 && next.length >= 2) {
        if (current.length < next.length && next.startsWith(current)) {
          count++;
        }
      }
    }
    
    return count;
  }

  private static detectProlongations(text: string): number {
    let count = 0;
    
    this.PROLONGATION_PATTERNS.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });
    
    return count;
  }

  private static detectBlocks(text: string): number {
    let count = 0;
    
    this.BLOCK_INDICATORS.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });
    
    // Detect unusual pauses in text (multiple spaces, punctuation clusters)
    const pausePatterns = [
      /\s{2,}/g,                           // Multiple spaces
      /[.!?]{2,}/g,                        // Multiple punctuation
      /,\s*,/g,                            // Repeated commas
    ];
    
    pausePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });
    
    return count;
  }

  private static analyzeWordTiming(words: any[]): number {
    let stutterCount = 0;
    
    for (let i = 0; i < words.length - 1; i++) {
      const currentWord = words[i];
      const nextWord = words[i + 1];
      
      if (currentWord.start !== undefined && currentWord.end !== undefined &&
          nextWord.start !== undefined && nextWord.end !== undefined) {
        
        // Calculate gap between words
        const gap = nextWord.start - currentWord.end;
        
        // Calculate word duration
        const wordDuration = currentWord.end - currentWord.start;
        
        // Detect unusually long pauses (potential blocks)
        if (gap > 0.5 && gap > wordDuration * 2) {
          stutterCount++;
        }
        
        // Detect unusually long word duration (potential prolongations)
        if (wordDuration > 1.0 && currentWord.text.length <= 4) {
          stutterCount++;
        }
      }
    }
    
    return stutterCount;
  }

  private static getFluencyRating(fluencyScore: number): 'excellent' | 'good' | 'fair' | 'developing' {
    if (fluencyScore >= 90) return 'excellent';
    if (fluencyScore >= 75) return 'good';
    if (fluencyScore >= 60) return 'fair';
    return 'developing'; // Changed from 'needs improvement' to 'developing'
  }
}

// ...existing code for STORY_PROMPTS and component setup...

const STORY_PROMPTS = [
  "You find a magical door in your backyard. What's behind it?",
  "Your pet can suddenly talk for one day. What do they tell you?",
  "You wake up and you're the size of a mouse. What happens next?",
  "A friendly dragon moves into your neighborhood. How do you become friends?",
  "You discover your teacher is actually a superhero. What's their secret power?",
  "Your drawings come to life when you're not looking. Tell me about one of them.",
  "You can turn invisible for one hour. Where do you go and what do you do?",
  "A spaceship lands in your school playground. Who comes out?",
  "You find a treasure map in your attic. Where does it lead?",
  "Your shadow starts doing different things than you. What is it up to?",
  "You can talk to any animal for a day. Which one do you choose and why?",
  "Your favorite toy becomes your best friend and goes on adventures with you.",
  "You discover a secret room in your house. What's inside?",
  "A wizard gives you three wishes, but they have to help other people.",
  "You become the principal of your school for a week. What changes do you make?"
];

export default function Storytelling() {
  const [storyHistory, setStoryHistory] = useState<StorySession[]>([]);
  const [currentStory, setCurrentStory] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [speechAnalysis, setSpeechAnalysis] = useState<SpeechAnalysis | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Animation values
  const recordPulse = useSharedValue(1);
  const promptSlide = useSharedValue(0);

  // Helper functions
  const cleanup = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync();
    }
  };

  const generateNewPrompt = () => {
    const randomIndex = Math.floor(Math.random() * STORY_PROMPTS.length);
    const newPrompt = STORY_PROMPTS[randomIndex];
    setCurrentPrompt(newPrompt);
    
    // Animate prompt change
    promptSlide.value = withSequence(
      withTiming(-10, { duration: 150 }),
      withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) })
    );
  };

  const useCustomPrompt = () => {
    if (customPrompt.trim()) {
      setCurrentPrompt(customPrompt.trim());
      setCustomPrompt('');
      setShowPromptInput(false);
      
      // Animate prompt change
      promptSlide.value = withSequence(
        withTiming(-10, { duration: 150 }),
        withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) })
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalWords = () => {
    return storyHistory.reduce((total, story) => total + story.wordCount, 0);
  };

  const saveSession = async () => {
    try {
      if (storyHistory.length === 0) {
        Alert.alert('No Stories', 'There are no stories to save in this session.');
        return;
      }

      const sessionData = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        stories: storyHistory,
        totalWords: getTotalWords(),
        totalStories: storyHistory.length,
        sessionDuration: sessionTime,
      };

      // Get existing saved sessions
      const existingSessions = await AsyncStorage.getItem('storytelling_sessions');
      const sessions = existingSessions ? JSON.parse(existingSessions) : [];
      
      // Add new session
      sessions.unshift(sessionData);
      
      // Keep only last 20 sessions to prevent storage overflow
      const limitedSessions = sessions.slice(0, 20);
      
      // Save back to storage
      await AsyncStorage.setItem('storytelling_sessions', JSON.stringify(limitedSessions));
      
      Alert.alert(
        'Session Saved', 
        `Successfully saved ${storyHistory.length} stories with ${getTotalWords()} total words.`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error saving session:', error);
      Alert.alert('Save Error', 'Failed to save session. Please try again.');
    }
  };

  const resetSession = () => {
    Alert.alert(
      'Reset Session',
      'Are you sure you want to clear all stories in this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setStoryHistory([]);
            setSessionTime(0);
            generateNewPrompt();
          },
        },
      ]
    );
  };

  // Animation styles
  const recordButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: recordPulse.value }],
    };
  });

  const promptStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: promptSlide.value }],
    };
  });

  // Timer functions
  const startRecordingTimer = () => {
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Animation functions
  const startRecordingAnimations = () => {
    recordPulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  };

  const stopRecordingAnimations = () => {
    recordPulse.value = withTiming(1, { duration: 300 });
  };

  // Recording functions
  const handleRecordPress = async () => {
    if (isProcessing) return;

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record stories.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16_BIT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      recordingRef.current = recording;
      await recording.startAsync();
      setIsRecording(true);

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        await processRecording(uri);
      }

    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.');
    }
  };

  // AssemblyAI functions
  const uploadAudioToAssemblyAI = async (audioUri: string): Promise<string> => {
    const audioData = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/octet-stream',
      },
      body: Uint8Array.from(atob(audioData), c => c.charCodeAt(0)),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.upload_url;
  };

  const transcribeWithAssemblyAI = async (audioUrl: string): Promise<any> => {
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        sentiment_analysis: true,
        auto_highlights: true,
        word_boost: ['story', 'adventure', 'character', 'magic', 'journey'],
        boost_param: 'high',
      }),
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Transcription request failed: ${transcriptResponse.statusText}`);
    }

    const transcriptData = await transcriptResponse.json();
    const transcriptId = transcriptData.id;

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
        },
      });

      if (!pollingResponse.ok) {
        throw new Error(`Polling failed: ${pollingResponse.statusText}`);
      }

      const pollingData = await pollingResponse.json();

      if (pollingData.status === 'completed') {
        return pollingData;
      } else if (pollingData.status === 'error') {
        throw new Error(`Transcription failed: ${pollingData.error}`);
      }

      attempts++;
    }

    throw new Error('Transcription timeout');
  };

  const processRecording = async (audioUri: string) => {
    try {
      setIsProcessing(true);
      console.log('Processing recording...');

      // Upload audio
      const audioUrl = await uploadAudioToAssemblyAI(audioUri);

      // Transcribe audio
      const transcript = await transcribeWithAssemblyAI(audioUrl);

      if (transcript.text && transcript.text.trim()) {
        const wordCount = transcript.text.split(' ').filter((word: string) => word.length > 0).length;
        
        // Perform stutter analysis
        const stutterAnalysis = StutterDetector.analyzeStutter(
          transcript.text.trim(),
          transcript.words || [],
          recordingTime
        );

        // Create story session
        const storySession: StorySession = {
          id: Date.now().toString(),
          prompt: currentPrompt,
          transcript: transcript.text.trim(),
          confidence: transcript.confidence || 0,
          wordCount: wordCount,
          duration: recordingTime,
          timestamp: new Date(),
          stutterAnalysis,
        };

        // Add to history
        setStoryHistory(prev => [...prev, storySession]);

        // Prepare analysis data
        const analysis: SpeechAnalysis = {
          transcript: transcript.text.trim(),
          confidence: transcript.confidence || 0,
          words: transcript.words || [],
          sentiment: transcript.sentiment_analysis_results?.[0]?.sentiment || 'neutral',
          summary: transcript.auto_highlights_result?.results?.[0]?.text || '',
          duration: recordingTime,
          wordCount: wordCount,
          stutterAnalysis,
        };

        setSpeechAnalysis(analysis);
        setShowAnalysisModal(true);

        // Generate new prompt automatically
        setTimeout(() => {
          generateNewPrompt();
        }, 1000);

      } else {
        Alert.alert('No Speech Detected', 'Please try recording again with clearer speech.');
      }

    } catch (error: any) {
      console.error('Processing error:', error);
      Alert.alert('Processing Error', error.message || 'Failed to process your recording. Please try again.');
    } finally {
      setIsProcessing(false);
      setRecordingTime(0);
    }
  };

  useEffect(() => {
    generateNewPrompt();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (isRecording) {
      startRecordingTimer();
      startRecordingAnimations();
    } else {
      stopRecordingTimer();
      stopRecordingAnimations();
    }
  }, [isRecording]);

  useEffect(() => {
    if (storyHistory.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [storyHistory]);

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#000814', '#001D3D', '#003566', '#001122']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerSection}>
          <BlurView intensity={40} tint="dark" style={styles.headerCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)']}
              style={styles.headerContent}
            >
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <ArrowLeft size={18} color="rgba(232, 244, 253, 0.8)" strokeWidth={1.5} />
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>storytelling</Text>
                <Text style={styles.headerSubtitle}>
                  {storyHistory.length > 0 ? `${storyHistory.length} stories • ${getTotalWords()} words` : 'neural voice interface'}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity onPress={saveSession} style={styles.headerButton}>
                  <Save size={16} color="rgba(232, 244, 253, 0.6)" strokeWidth={1.5} />
                </TouchableOpacity>
                <TouchableOpacity onPress={resetSession} style={[styles.headerButton, { marginLeft: 8 }]}>
                  <RotateCcw size={16} color="rgba(232, 244, 253, 0.6)" strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Left Panel - Prompt Generator */}
          <View style={styles.leftPanel}>
            <BlurView intensity={40} tint="dark" style={styles.promptCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)']}
                style={styles.promptCardContent}
              >
                <View style={styles.promptHeader}>
                  <View style={styles.promptIcon}>
                    <Sparkles size={18} color="rgba(232, 244, 253, 0.8)" strokeWidth={1.5} />
                  </View>
                  <Text style={styles.promptTitle}>story starter</Text>
                  <TouchableOpacity onPress={generateNewPrompt} style={styles.shuffleButton}>
                    <Shuffle size={16} color="rgba(139, 92, 246, 0.8)" strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>

                <Animated.View style={[styles.promptTextContainer, promptStyle]}>
                  <Text style={styles.promptText}>{currentPrompt}</Text>
                </Animated.View>

                <View style={styles.promptActions}>
                  <TouchableOpacity 
                    onPress={() => setShowPromptInput(!showPromptInput)} 
                    style={styles.customPromptButton}
                  >
                    <Text style={styles.customPromptText}>create your own prompt</Text>
                  </TouchableOpacity>
                </View>

                {showPromptInput && (
                  <View style={styles.customPromptSection}>
                    <TextInput
                      style={styles.customPromptInput}
                      placeholder="write your own story idea here..."
                      placeholderTextColor="rgba(139, 92, 246, 0.4)"
                      value={customPrompt}
                      onChangeText={setCustomPrompt}
                      multiline
                    />
                    <TouchableOpacity onPress={useCustomPrompt} style={styles.usePromptButton}>
                      <Text style={styles.usePromptText}>use this prompt</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </LinearGradient>
            </BlurView>
          </View>

          {/* Right Panel - Story History & Recording */}
          <View style={styles.rightPanel}>
            {/* Story History */}
            <View style={styles.storySection}>
              <BlurView intensity={40} tint="dark" style={styles.storyCard}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)']}
                  style={styles.storyCardContent}
                >
                  <ScrollView 
                    ref={scrollViewRef}
                    style={styles.storyContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {storyHistory.length === 0 ? (
                      <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                          <View style={styles.emptyDot} />
                        </View>
                        <Text style={styles.emptyText}>your stories will appear here</Text>
                      </View>
                    ) : (
                      storyHistory.map((story, index) => (
                        <View key={story.id} style={styles.storyContainer}>
                          <BlurView intensity={30} tint="dark" style={styles.storyItemCard}>
                            <LinearGradient
                              colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)']}
                              style={styles.storyItemContent}
                            >
                              <View style={styles.storyHeader}>
                                <View style={styles.storyHeaderLeft}>
                                  <CheckCircle size={14} color="#10B981" strokeWidth={2} />
                                  <Text style={styles.storyNumber}>story {index + 1}</Text>
                                </View>
                                <Text style={styles.storyMeta}>
                                  {story.wordCount} words • {Math.round(story.confidence * 100)}%
                                </Text>
                              </View>
                              <Text style={styles.storyPrompt}>{story.prompt}</Text>
                              <Text style={styles.storyTranscript}>{story.transcript}</Text>
                            </LinearGradient>
                          </BlurView>
                        </View>
                      ))
                    )}

                    {isProcessing && (
                      <View style={styles.processingContainer}>
                        <BlurView intensity={50} tint="dark" style={styles.processingCard}>
                          <LinearGradient
                            colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']}
                            style={styles.processingContent}
                          >
                            <View style={styles.processingIndicator} />
                            <Text style={styles.processingText}>processing your story</Text>
                          </LinearGradient>
                        </BlurView>
                      </View>
                    )}
                  </ScrollView>
                </LinearGradient>
              </BlurView>
            </View>

            {/* Recording Interface */}
            <View style={styles.recordingSection}>
              <BlurView intensity={70} tint="dark" style={styles.recordingCard}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
                  style={styles.recordingContent}
                >
                  {/* Status Bar */}
                  <View style={styles.statusBar}>
                    <View style={styles.statusLeft}>
                      <View style={[styles.statusDot, { 
                        backgroundColor: isRecording ? '#EF4444' : isProcessing ? '#F59E0B' : '#10B981',
                        shadowColor: isRecording ? '#EF4444' : isProcessing ? '#F59E0B' : '#10B981',
                      }]} />
                      <Text style={styles.statusText}>
                        {isRecording ? 'recording' : isProcessing ? 'processing' : 'ready'}
                      </Text>
                    </View>
                    
                    {isRecording && (
                      <Text style={styles.sessionTime}>{formatTime(recordingTime)}</Text>
                    )}
                  </View>

                  {/* Main Recording Interface */}
                  <View style={styles.recordingInterface}>
                    <Animated.View style={[styles.recordButtonWrapper, recordButtonStyle]}>
                      <TouchableOpacity
                        style={styles.recordButton}
                        onPress={handleRecordPress}
                        disabled={isProcessing}
                      >
                        <BlurView intensity={100} style={styles.recordButtonBlur}>
                          <LinearGradient
                            colors={isRecording 
                              ? ['#EF4444', '#DC2626', '#B91C1C']
                              : isProcessing 
                              ? ['#6B7280', '#4B5563', '#374151']
                              : ['#8B5CF6', '#7C3AED', '#6D28D9']
                            }
                            style={styles.recordButtonGradient}
                          >
                            {isProcessing ? (
                              <View style={styles.processingSpinner} />
                            ) : isRecording ? (
                              <Square size={36} color="white" fill="white" />
                            ) : (
                              <Mic size={40} color="white" strokeWidth={2} />
                            )}
                          </LinearGradient>
                        </BlurView>
                      </TouchableOpacity>
                    </Animated.View>

                    <Text style={styles.recordingInstruction}>
                      {isRecording ? 'tap to finish story' : 
                       isProcessing ? 'analyzing your story' :
                       'tap to start recording'}
                    </Text>
                  </View>

                  {/* Session Stats */}
                  {storyHistory.length > 0 && (
                    <View style={styles.sessionStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{storyHistory.length}</Text>
                        <Text style={styles.statLabel}>stories</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{getTotalWords()}</Text>
                        <Text style={styles.statLabel}>total words</Text>
                      </View>
                    </View>
                  )}
                </LinearGradient>
              </BlurView>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Speech Analysis Modal */}
      <Modal
        visible={showAnalysisModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAnalysisModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <BlurView intensity={80} tint="dark" style={styles.modalBlur}>
              <LinearGradient
                colors={['rgba(0, 8, 20, 0.95)', 'rgba(0, 29, 61, 0.9)']}
                style={styles.modalGradient}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>story insights</Text>
                  <TouchableOpacity
                    onPress={() => setShowAnalysisModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <X size={16} color="rgba(232, 244, 253, 0.8)" strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>

                {/* Analysis Content */}
                {speechAnalysis && (
                  <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    {/* Your Story */}
                    <View style={styles.storySection}>
                      <Text style={styles.storySectionTitle}>your story</Text>
                      <View style={styles.storyContainer}>
                        <Text style={styles.storyText}>{speechAnalysis.transcript}</Text>
                      </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{Math.round(speechAnalysis.confidence * 100)}%</Text>
                        <Text style={styles.statLabel}>clarity</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{speechAnalysis.wordCount}</Text>
                        <Text style={styles.statLabel}>words</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatTime(speechAnalysis.duration)}</Text>
                        <Text style={styles.statLabel}>time</Text>
                      </View>
                    </View>

                    {/* Fluency Analysis */}
                    <View style={styles.fluencySection}>
                      <View style={styles.fluencyHeader}>
                        <Text style={styles.fluencyTitle}>speech fluency</Text>
                        <Text style={styles.fluencyScore}>
                          {speechAnalysis.stutterAnalysis.fluencyRating === 'excellent' ? 'amazing!' :
                           speechAnalysis.stutterAnalysis.fluencyRating === 'good' ? 'great work!' :
                           speechAnalysis.stutterAnalysis.fluencyRating === 'fair' ? 'well done!' :
                           'growing strong!'}
                        </Text>
                      </View>
                      <View style={styles.fluencyBar}>
                        <View 
                          style={[
                            styles.fluencyBarFill, 
                            { width: `${Math.max(30, speechAnalysis.stutterAnalysis.fluencyScore)}%` }
                          ]} 
                        />
                      </View>
                      <View style={styles.fluencyStats}>
                        <Text style={styles.fluencyText}>
                          {speechAnalysis.stutterAnalysis.stutterCount === 0 
                            ? 'fantastic flow and confidence!' 
                            : speechAnalysis.stutterAnalysis.stutterCount === 1 
                            ? 'excellent storytelling with natural rhythm'
                            : speechAnalysis.stutterAnalysis.stutterCount <= 3
                            ? 'wonderful progress in your speaking journey'
                            : 'building amazing storytelling skills!'}
                        </Text>
                      </View>
                    </View>

                    {/* Quality */}
                    <View style={styles.qualitySection}>
                      <View style={styles.qualityHeader}>
                        <Text style={styles.qualityTitle}>speaking quality</Text>
                        <Text style={styles.qualityScore}>
                          {speechAnalysis.confidence > 0.8 ? 'outstanding!' : 
                           speechAnalysis.confidence > 0.6 ? 'fantastic!' : 
                           speechAnalysis.confidence > 0.4 ? 'wonderful!' : 'impressive!'}
                        </Text>
                      </View>
                      <View style={styles.qualityBar}>
                        <View 
                          style={[
                            styles.qualityBarFill, 
                            { width: `${Math.max(25, speechAnalysis.confidence * 100)}%` }
                          ]} 
                        />
                      </View>
                    </View>

                    {/* Action Button */}
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        onPress={() => setShowAnalysisModal(false)}
                        style={styles.newStoryButton}
                      >
                        <BlurView intensity={60} tint="dark" style={styles.newStoryButtonBlur}>
                          <LinearGradient
                            colors={['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.2)']}
                            style={styles.newStoryButtonGradient}
                          >
                            <Text style={styles.newStoryButtonText}>tell another story</Text>
                          </LinearGradient>
                        </BlurView>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                )}
              </LinearGradient>
            </BlurView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Header Styles
  headerSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  headerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#E8F4FD',
    letterSpacing: 4,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 10,
    color: 'rgba(139, 92, 246, 0.7)',
    marginTop: 6,
    letterSpacing: 1,
    fontWeight: '200',
    fontFamily: 'System',
    textTransform: 'lowercase',
  },
  headerActions: {
    flexDirection: 'row',
  },

  // Main Content Layout
  mainContent: {
    flex: 1,
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 16,
  },
  leftPanel: {
    width: width > 768 ? 350 : '100%',
    marginBottom: width > 768 ? 0 : 16,
  },
  rightPanel: {
    flex: 1,
    gap: 16,
  },

  // Enhanced Prompt Card
  promptCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  promptCardContent: {
    padding: 28,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  promptIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  promptTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#E8F4FD',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  shuffleButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  promptTextContainer: {
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    minHeight: 120,
  },
  promptText: {
    fontSize: 18,
    lineHeight: 28,
    color: 'rgba(232, 244, 253, 0.95)',
    fontWeight: '400',
    fontFamily: 'System',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  promptActions: {
    alignItems: 'center',
  },
  customPromptButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  customPromptText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#A855F7',
    letterSpacing: 0.8,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  customPromptSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.15)',
  },
  customPromptInput: {
    minHeight: 100,
    padding: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    color: '#E8F4FD',
    fontSize: 16,
    textAlignVertical: 'top',
    fontFamily: 'System',
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  usePromptButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  usePromptText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#E8F4FD',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },

  // Story History Section
  storySection: {
    flex: 1,
  },
  storyCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  storyCardContent: {
    flex: 1,
    padding: 20,
  },
  storyContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    marginBottom: 16,
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.6)',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(139, 92, 246, 0.7)',
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },

  // Story Items
  storyContainer: {
    marginBottom: 16,
  },
  storyItemCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.12)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  storyItemContent: {
    padding: 16,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyNumber: {
    fontSize: 12,
    fontWeight: '300',
    color: '#10B981',
    letterSpacing: 1,
    fontFamily: 'System',
    marginLeft: 8,
    textTransform: 'lowercase',
  },
  storyMeta: {
    fontSize: 10,
    color: 'rgba(139, 92, 246, 0.7)',
    fontWeight: '200',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  storyPrompt: {
    fontSize: 12,
    color: 'rgba(139, 92, 246, 0.8)',
    fontWeight: '300',
    fontFamily: 'System',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  storyTranscript: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(232, 244, 253, 0.95)',
    fontWeight: '300',
    fontFamily: 'System',
    letterSpacing: 0.2,
  },

  // Processing
  processingContainer: {
    marginBottom: 16,
  },
  processingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  processingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#A855F7',
    marginRight: 12,
  },
  processingText: {
    fontSize: 12,
    color: 'rgba(232, 244, 253, 0.9)',
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },

  // Recording Section
  recordingSection: {
    height: 280,
  },
  recordingCard: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
  },
  recordingContent: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#E8F4FD',
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  sessionTime: {
    fontSize: 14,
    color: 'rgba(139, 92, 246, 0.8)',
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    fontFamily: 'System',
  },
  recordingInterface: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  recordButtonWrapper: {
    marginBottom: 24,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  recordButtonBlur: {
    flex: 1,
    borderRadius: 60,
  },
  recordButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingSpinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
  },
  recordingInstruction: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(139, 92, 246, 0.8)',
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '200',
    color: '#E8F4FD',
    letterSpacing: 1,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(139, 92, 246, 0.7)',
    fontWeight: '200',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 40, // Side margins for centering
  },
  modalContainer: {
    width: Math.min(320, width - 80), // Max 320px width, with 40px margins
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalBlur: {
    borderRadius: 20,
  },
  modalGradient: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#E8F4FD',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  modalCloseButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    gap: 16,
  },

  // Compact Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '200',
    color: '#8B5CF6',
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(139, 92, 246, 0.7)',
    fontWeight: '200',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
    fontFamily: 'System',
    marginTop: 2,
  },

  // Quality Section
  qualitySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    marginBottom: 12,
  },
  qualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qualityTitle: {
    fontSize: 11,
    color: '#E8F4FD',
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  qualityScore: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '400',
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  qualityBar: {
    height: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  qualityBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },

  // Story Section - Fixed Text Visibility
  storySection: {
    marginBottom: 16,
  },
  storySectionTitle: {
    fontSize: 12,
    color: '#E8F4FD',
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
    marginBottom: 8,
  },
  storyContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    minHeight: 80,
  },
  storyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#E8F4FD', // Changed from rgba to solid white-blue for visibility
    fontWeight: '300',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },

  // Enhanced Fluency Section with Positive Messaging
  fluencySection: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    marginBottom: 12,
  },
  fluencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fluencyTitle: {
    fontSize: 11,
    color: '#E8F4FD',
    fontWeight: '300',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  fluencyScore: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '400',
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
  fluencyBar: {
    height: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fluencyBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  fluencyStats: {
    alignItems: 'center',
  },
  fluencyText: {
    fontSize: 11,
    color: 'rgba(16, 185, 129, 0.9)',
    fontWeight: '300',
    fontFamily: 'System',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Fixed Button Container and Styling
  buttonContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  newStoryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  newStoryButtonBlur: {
    borderRadius: 16,
  },
  newStoryButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  newStoryButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#E8F4FD',
    letterSpacing: 1,
    textTransform: 'lowercase',
    fontFamily: 'System',
  },
});