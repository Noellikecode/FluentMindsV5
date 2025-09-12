import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Animated,
  Easing,
  Modal,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Mic,
  Plus,
  Minus,
  X,
  HelpCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

const ASSEMBLYAI_API_KEY = Constants.expoConfig?.extra?.assemblyApiKey ?? "3e043ca91e484201a625ca39f5f2f260";

const SAMPLE_SENTENCES = [
  'The quick brown fox jumps over the lazy dog.',
  'She sells seashells by the seashore.',
  'Peter Piper picked a peck of pickled peppers.',
  'How much wood would a woodchuck chuck if a woodchuck could chuck wood?',
  'I scream, you scream, we all scream for ice cream.',
  'Red leather, yellow leather, red leather, yellow leather.',
  'Unique New York, unique New York, you know you need unique New York.',
  "The sixth sick sheik's sixth sheep's sick.",
  'Fuzzy Wuzzy was a bear, Fuzzy Wuzzy had no hair.',
  "Betty Botter bought some butter, but she said the butter's bitter.",
];

const SIMILARITY_THRESHOLD = 0.75;
const MIN_TEMPO = 15;
const MAX_TEMPO = 100;
const TEMPO_ADJUSTMENT_STEP = 5;

const wordsMatch = (spokenWord: string, expectedWord: string): boolean => {
  const spoken = spokenWord.toLowerCase().trim();
  const expected = expectedWord.toLowerCase().trim();

  if (spoken === expected) return true;
  if (spoken.includes(expected) && spoken.length <= expected.length + 2) return true;
  if (expected.includes(spoken) && spoken.length > 2) return true;

  const similarity = calculateSimilarity(spoken, expected);
  return similarity > SIMILARITY_THRESHOLD;
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

const getRandomPhrase = (): string[] => {
  const randomSentence = SAMPLE_SENTENCES[Math.floor(Math.random() * SAMPLE_SENTENCES.length)];
  return randomSentence.replace(/\s+/g, ' ').trim().split(' ');
};

interface SessionData {
  date: string;
  gameMode: string;
  duration: number;
  completed: boolean;
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
  duration: number;
  wordCount: number;
  correctWords: number;
  totalWords: number;
  accuracy: number;
}

export default function BeatBridge() {
  const [words, setWords] = useState<string[]>(() => getRandomPhrase());
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [completedSentences, setCompletedSentences] = useState(0);
  const [tempo, setTempo] = useState(25);
  const [correctWords, setCorrectWords] = useState<boolean[]>([]);
  const [completedWordsIndices, setCompletedWordsIndices] = useState<number[]>([]);
  const [accuracy, setAccuracy] = useState(0);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'playing' | 'analyzing'>('waiting');
  const [isSending, setIsSending] = useState(false);
  const [sendingMessage, setSendingMessage] = useState("Processing your speech...");
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [speechAnalysis, setSpeechAnalysis] = useState<SpeechAnalysis | null>(null);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bridgeGlow = useRef(new Animated.Value(0)).current;
  const wordAnimations = useRef<Animated.Value[]>([]).current;
  const recordingRef = useRef<Audio.Recording | null>(null);
  const wordAdvanceInterval = useRef<number | null>(null);
  const wordCadenceTimeoutRef = useRef<number | null>(null);
  const sendingFadeAnim = useRef(new Animated.Value(0)).current;
  const sendingScaleAnim = useRef(new Animated.Value(0.8)).current;
  const helpIconOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        const sessionsData = await AsyncStorage.getItem('userSessions');
        const sessions: SessionData[] = sessionsData ? JSON.parse(sessionsData) : [];
        
        const completedBeatBridgeSessions = sessions.filter(
          session => session.gameMode === 'beat-bridge' && session.completed
        ).length;

        if (completedBeatBridgeSessions === 0) {
          setIsFirstTimeUser(true);
        }
      } catch (error) {
        console.error("Failed to check session history:", error);
      }
    };

    checkFirstTimeUser();
    generateNewSentence();
    startBridgeGlow();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isFirstTimeUser) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(helpIconOpacity, {
            toValue: 0.3,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(helpIconOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isFirstTimeUser]);

  useEffect(() => {
    if (isPlaying) {
      startBeat();
      startSessionTimer();
    } else {
      stopBeat();
      stopSessionTimer();
    }
  }, [isPlaying, tempo]);

  useEffect(() => {
    wordAnimations.length = 0;
    words.forEach(() => {
      wordAnimations.push(new Animated.Value(0));
    });
    setCorrectWords(new Array(words.length).fill(false));
    setCompletedWordsIndices([]);
  }, [words]);

  useEffect(() => {
    if (isPlaying && currentWordIndex < wordAnimations.length) {
      Animated.sequence([
        Animated.timing(wordAnimations[currentWordIndex], {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(wordAnimations[currentWordIndex], {
          toValue: 0.8,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentWordIndex, isPlaying]);

  useEffect(() => {
    if (isSending) {
      Animated.parallel([
        Animated.timing(sendingFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(sendingScaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sendingFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sendingScaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSending]);

  const cleanup = () => {
    if (wordCadenceTimeoutRef.current) {
      clearTimeout(wordCadenceTimeoutRef.current);
      wordCadenceTimeoutRef.current = null;
    }
    if (wordAdvanceInterval.current) {
      clearInterval(wordAdvanceInterval.current);
      wordAdvanceInterval.current = null;
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync()
        .catch(e => console.error("Error stopping recording:", e))
        .finally(() => {
          recordingRef.current = null;
        });
    }
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
    }).catch(e => console.error("Error resetting audio mode:", e));
  };

  const startBridgeGlow = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bridgeGlow, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bridgeGlow, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const generateNewSentence = () => {
    const newWords = getRandomPhrase();
    setWords(newWords);
    setCurrentWordIndex(0);
    setIsPlaying(false);
    setCorrectWords(new Array(newWords.length).fill(false));
    setCompletedWordsIndices([]);
  };

  const startBeat = () => {
    stopBeat();
    const beatInterval = Math.max(500, 60000 / tempo);
    
    beatIntervalRef.current = setInterval(() => {
      setCurrentWordIndex(prevIndex => {
        if (wordAdvanceInterval.current !== null) {
          return prevIndex;
        }

        const nextIndex = prevIndex + 1;
        if (nextIndex >= words.length) {
          setCompletedSentences(prev => prev + 1);
          setTimeout(generateNewSentence, 1500);
          return 0;
        }
        return nextIndex;
      });
    }, beatInterval);
  };

  const stopBeat = () => {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
  };

  const startSessionTimer = () => {
    stopSessionTimer();
    sessionTimerRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
  };

  const stopSessionTimer = () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  };

  const startWordCadence = () => {
    setCurrentWordIndex(0);
    stopWordCadence();

    const WORD_CADENCE_SPEED = Math.max(800, 60000 / tempo);

    let wordIndex = 0;
    const intervalId = setInterval(() => {
      wordIndex++;
      if (wordIndex < words.length) {
        setCurrentWordIndex(wordIndex);
      } else {
        clearInterval(intervalId);
        setTimeout(() => {
          stopExercise();
        }, 500);
      }
    }, WORD_CADENCE_SPEED);

    wordAdvanceInterval.current = intervalId;
  };

  const stopWordCadence = () => {
    if (wordCadenceTimeoutRef.current) {
      clearTimeout(wordCadenceTimeoutRef.current);
      wordCadenceTimeoutRef.current = null;
    }
    if (wordAdvanceInterval.current) {
      clearInterval(wordAdvanceInterval.current);
      wordAdvanceInterval.current = null;
    }
  };

  const setupAudio = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone permission is required to record audio!');
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
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
    if (!audioReady) {
      setIsRecording(false);
      throw new Error("Audio setup failed.");
    }

    try {
      const recordingConfig: Audio.RecordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        }
      };

      const { recording } = await Audio.Recording.createAsync(recordingConfig);
      recordingRef.current = recording;
      
      await recording.startAsync();
      setIsRecording(true);

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Could not start recording: ' + error.message);
      setIsRecording(false);
      throw error;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    setIsRecording(false);

    if (!recordingRef.current) {
      return null;
    }

    try {
      const status = await recordingRef.current.getStatusAsync();
      if (status.isRecording) {
        if (recordingRef.current) {
          try {
            await recordingRef.current.stopAndUnloadAsync();
          } catch (error) {
            console.error("Error stopping recording:", error);
            throw error;
          }
        }
      }
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      }).catch(e => console.error("Error resetting audio mode:", e));

      return uri;
    } catch (error) {
      console.error("Error stopping or unloading recording:", error);
      recordingRef.current = null;
      return null;
    }
  };
  
  const base64Decode = (input: string): string => {
    if (typeof atob === 'function') {
      return atob(input);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input.replace(/=+$/, '');
    let output = '';
    for (let bc = 0, bs = 0, buffer, i = 0;
      buffer = str.charAt(i++);
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  }

  const pollForTranscription = async (transcriptId: string): Promise<any> => {
    const maxAttempts = 60;
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
            headers: {
              'authorization': ASSEMBLYAI_API_KEY,
            },
          });

          if (!response.ok) {
            reject(new Error(`Polling failed: ${response.status}`));
            return;
          }

          const result = await response.json();

          if (result.status === 'completed') {
            resolve(result);
          } else if (result.status === 'error') {
            reject(new Error(`Transcription failed: ${result.error}`));
          } else {
            setSendingMessage(`Transcribing... (${Math.round(attempts * 5)}s)`);
            setTimeout(poll, 5000);
          }
        } catch (error) {
          reject(error);
        }
      };
      poll();
    });
  };

  const processAudioWithAssemblyAI = async (audioUri: string) => {
    try {
      setSendingMessage("Preparing audio file...");

      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('Recording file is empty or does not exist');
      }

      setSendingMessage("Reading audio file...");
      const audioData = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!audioData || audioData.length === 0) {
        throw new Error('Audio file appears to be empty');
      }

      setSendingMessage("Uploading audio file...");
      const binaryString = base64Decode(audioData);
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

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.upload_url) {
        throw new Error('No upload URL returned from AssemblyAI');
      }

      const audioUrl = uploadResult.upload_url;

      setSendingMessage("Starting transcription...");
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

      if (!transcriptResponse.ok) {
        const errorText = await transcriptResponse.text();
        throw new Error(`Transcription request failed: ${transcriptResponse.status} - ${errorText}`);
      }

      const transcriptResult = await transcriptResponse.json();
      if (!transcriptResult.id) {
        throw new Error('No transcript ID returned from AssemblyAI');
      }

      const transcriptId = transcriptResult.id;
      setSendingMessage("Transcribing your speech...");
      const finalTranscript = await pollForTranscription(transcriptId);
      analyzeTranscriptForMatches(finalTranscript);

    } catch (error: any) {
      console.error('AssemblyAI Error:', error);
      Alert.alert('Speech Processing Error', error.message || 'Failed to process speech. Please try again.');
      setIsSending(false);
    }
  };

  const analyzeTranscriptForMatches = (transcriptResult: any) => {
    const transcript = transcriptResult?.text || '';

    if (!transcript) {
      showGameResults(transcriptResult, 0);
      return;
    }

    const spokenWords = transcript.toLowerCase().split(/\s+/).filter(Boolean);
    let matchedWords = 0;
    const expectedWordsLower = words.map(w => w.toLowerCase().replace(/[^\w]/g, ''));
    
    spokenWords.forEach((spokenWord: string) => {
      const cleanSpokenWord = spokenWord.replace(/[^\w]/g, '');
      expectedWordsLower.forEach((expectedWord) => {
        if (wordsMatch(cleanSpokenWord, expectedWord)) {
          matchedWords++;
        }
      });
    });

    matchedWords = Math.min(matchedWords, words.length);
    showGameResults(transcriptResult, matchedWords);
  };

  const saveSessionData = async (currentAccuracy: number) => {
    if (sessionTime > 0) {
      try {
        const sessionData = {
          date: new Date().toISOString(),
          gameMode: 'beat-bridge',
          duration: sessionTime,
          completed: true,
          completedSentences,
          tempo,
          accuracy: currentAccuracy,
        };

        // Retry logic for more reliable saving
        let retries = 3;
        while (retries > 0) {
          try {
            const existing = await AsyncStorage.getItem('userSessions');
            const sessions = existing ? JSON.parse(existing) : [];
            sessions.push(sessionData);
            await AsyncStorage.setItem('userSessions', JSON.stringify(sessions));
            break;
          } catch (err) {
            retries--;
            if (retries === 0) throw err;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (err) {
        console.error('Error saving session:', err);
        throw err; // Re-throw to handle in the calling function
      }
    }
  };

  const showGameResults = (transcriptResult?: any, matchedWords?: number) => {
    setIsSending(false);

    const totalWords = words.length;
    const wordAccuracyPercentage =
      totalWords > 0 && matchedWords !== undefined
        ? Math.round((matchedWords / totalWords) * 100)
        : 0;

    setAccuracy(wordAccuracyPercentage);
    setGamePhase('waiting');

    saveSessionData(wordAccuracyPercentage);

    if (transcriptResult) {
      const analysis: SpeechAnalysis = {
        transcript: transcriptResult.text || '',
        confidence: transcriptResult.confidence || 0,
        words: transcriptResult.words || [],
        duration: sessionTime,
        wordCount: transcriptResult.text ? transcriptResult.text.split(' ').filter((word: string) => word.length > 0).length : 0,
        correctWords: matchedWords || 0,
        totalWords: totalWords,
        accuracy: wordAccuracyPercentage,
      };

      setSpeechAnalysis(analysis);
      setShowAnalysisModal(true);
    }
  };

  const startExercise = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    setGamePhase('playing');
    setCurrentWordIndex(0);
    setCompletedWordsIndices([]);

    try {
      stopBeat();
      await startRecording();
      startWordCadence();
    } catch (error) {
      console.error('Failed to start exercise:', error);
      Alert.alert("Game Start Error", "Could not start the game. Please try again.");
      setIsPlaying(false);
      setGamePhase('waiting');
    }
  };

  const stopExercise = async () => {
    if (gamePhase === 'analyzing') return;

    setIsPlaying(false);
    setGamePhase('analyzing');
    setIsSending(true);
    setSendingMessage("Processing your speech with AI...");

    stopWordCadence();
    stopBeat();
    const audioUri = await stopRecording();
    if (audioUri) {
      await processAudioWithAssemblyAI(audioUri);
    } else {
      setGamePhase('waiting');
      Alert.alert("Recording Error", "Could not retrieve recording. Please try again.");
      setIsSending(false);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopExercise();
    } else {
      startExercise();
    }
  };

  const resetSession = () => {
    setIsPlaying(false);
    setGamePhase('waiting');
    setCurrentWordIndex(0);
    setSessionTime(0);
    setCompletedSentences(0);
    setIsSending(false);
    cleanup();
    generateNewSentence();
  };

  const adjustTempo = (change: number) => {
    const newTempo = Math.max(MIN_TEMPO, Math.min(MAX_TEMPO, tempo + change));
    setTempo(newTempo);
  };

  const endSession = async () => {
    try {
      cleanup();
      await saveSessionData(accuracy);
      // Ensure the data is saved before navigating
      await new Promise(resolve => setTimeout(resolve, 100));
      router.back();
    } catch (error) {
      console.error('Error saving session data:', error);
      router.back();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const glowOpacity = bridgeGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0B1426', '#1E293B', '#0F172A']}
        style={styles.backgroundGradient}
      />
      
      {isSending && (
        <Animated.View
          style={[
            styles.sendingOverlay,
            {
              opacity: sendingFadeAnim,
              transform: [{ scale: sendingScaleAnim }],
            },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={styles.sendingBlur}>
            <View style={styles.sendingContent}>
              <View style={styles.loadingContainer}>
                <Animated.View
                  style={[
                    styles.loadingSpinner,
                    {
                      transform: [{
                        rotate: bridgeGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      }],
                    },
                  ]}
                />
              </View>
              <Text style={styles.sendingText}>{sendingMessage}</Text>
            </View>
          </BlurView>
        </Animated.View>
      )}

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={endSession} style={styles.headerButton} activeOpacity={0.8}>
            <BlurView intensity={60} tint="dark" style={styles.headerButtonGlass}>
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
            </BlurView>
          </TouchableOpacity>

          <LinearGradient
            colors={['#E8F4FD', '#CBD5E1']}
            style={styles.titleGradient}
          >
            <Text style={styles.title}>BEAT BRIDGE</Text>
          </LinearGradient>

          <Animated.View style={{ opacity: helpIconOpacity }}>
            <TouchableOpacity onPress={() => setIsHelpModalVisible(true)} style={styles.headerButton} activeOpacity={0.8}>
              <BlurView intensity={60} tint="dark" style={styles.headerButtonGlass}>
                <HelpCircle size={20} color="#FFFFFF" strokeWidth={2} />
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.bridgeSection}>
          <BlurView intensity={100} tint="dark" style={styles.bridgeContainer}>
            <Animated.View
              style={[
                styles.rainbowBackground,
                { opacity: glowOpacity },
              ]}
            >
              <LinearGradient
                colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rainbowGradient}
              />
            </Animated.View>

            <View style={styles.wordBubbleContainer}>
              {words.map((word, idx) => {
                const isActive = idx === currentWordIndex && isPlaying;
                const isCompleted = idx < currentWordIndex;
                const isCorrect = correctWords[idx];
                const animation = wordAnimations[idx] || new Animated.Value(0);
                
                const scale = animation.interpolate({
                  inputRange: [0, 0.8, 1],
                  outputRange: [1, 1.3, 1.1],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    key={idx}
                    style={[
                      styles.wordBubble,
                      isActive && styles.activeWordBubble,
                      isCompleted && styles.completedWordBubble,
                      isCorrect && styles.correctWordBubble,
                      isActive && {
                        transform: [{ scale }],
                      },
                    ]}
                  >
                    <BlurView 
                      intensity={isActive ? 80 : 40} 
                      tint="light" 
                      style={styles.wordBubbleGlass}
                    >
                      <LinearGradient
                        colors={
                          isCorrect
                            ? ['#10B981', '#059669']
                            : isActive 
                            ? ['#FF6B6B', '#4ECDC4'] 
                            : isCompleted 
                            ? ['#06FFA5', '#00D4AA']
                            : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                        }
                        style={styles.wordBubbleGradient}
                      >
                        <Text
                          style={[
                            styles.word,
                            isActive && styles.activeWord,
                            isCompleted && styles.completedWord,
                            isCorrect && styles.correctWord,
                          ]}
                        >
                          {word}
                        </Text>
                      </LinearGradient>
                    </BlurView>
                  </Animated.View>
                );
              })}
            </View>

            <View style={styles.bridgePath}>
              <LinearGradient
                colors={['transparent', '#8B5CF6', '#A855F7', '#EC4899', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bridgePathGradient}
              />
            </View>

            {isRecording && (
              <View style={styles.listeningIndicator}>
                <View style={styles.listeningDot} />
                <Text style={styles.listeningText}>Listening...</Text>
              </View>
            )}
          </BlurView>
        </View>

        <View style={styles.tempoSection}>
          <BlurView intensity={60} tint="dark" style={styles.tempoContainer}>
            <View style={styles.tempoContent}>
              <Text style={styles.tempoLabel}>tempo</Text>
              <View style={styles.tempoRow}>
                <TouchableOpacity
                  onPress={() => adjustTempo(-TEMPO_ADJUSTMENT_STEP)}
                  style={styles.tempoButton}
                  activeOpacity={0.8}
                >
                  <BlurView intensity={40} tint="dark" style={styles.tempoButtonGlass}>
                    <Minus size={16} color="#FFFFFF" strokeWidth={2} />
                  </BlurView>
                </TouchableOpacity>
                
                <View style={styles.tempoDisplay}>
                  <Text style={styles.tempoValue}>{tempo}</Text>
                  <Text style={styles.tempoBpm}>bpm</Text>
                </View>
                
                <TouchableOpacity
                  onPress={() => adjustTempo(TEMPO_ADJUSTMENT_STEP)}
                  style={styles.tempoButton}
                  activeOpacity={0.8}
                >
                  <BlurView intensity={40} tint="dark" style={styles.tempoButtonGlass}>
                    <Plus size={16} color="#FFFFFF" strokeWidth={2} />
                  </BlurView>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{completedSentences}</Text>
              <Text style={styles.statLabel}>sequences</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatTime(sessionTime)}</Text>
              <Text style={styles.statLabel}>time</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>accuracy</Text>
            </View>
          </View>
        </View>

        <View style={styles.controlsSection}>
          <TouchableOpacity
            onPress={resetSession}
            style={styles.controlButton}
            activeOpacity={0.8}
          >
            <BlurView intensity={60} tint="dark" style={styles.controlButtonGlass}>
              <RotateCcw size={20} color="#FFFFFF" strokeWidth={1.8} />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlayback}
            style={styles.playButton}
            activeOpacity={0.9}
          >
            <BlurView intensity={80} tint="dark" style={styles.playButtonGlass}>
              <LinearGradient
                colors={isPlaying ? ['#A855F7', '#EC4899'] : ['#6366F1', '#8B5CF6']}
                style={styles.playButtonGradient}
              >
                {isPlaying ? (
                  <Pause size={28} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <Play size={28} color="#FFFFFF" strokeWidth={2} />
                )}
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {}}
            style={styles.controlButton}
            activeOpacity={0.8}
          >
            <BlurView intensity={60} tint="dark" style={styles.controlButtonGlass}>
              <Mic size={20} color="#FFFFFF" strokeWidth={1.8} />
              {isRecording && <View style={styles.recordingDot} />}
            </BlurView>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>beat bridge results</Text>
                  <TouchableOpacity
                    onPress={() => setShowAnalysisModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <X size={16} color="rgba(232, 244, 253, 0.8)" strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>

                {speechAnalysis && (
                  <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.storySection}>
                      <Text style={styles.storySectionTitle}>what you said</Text>
                      <View style={styles.storyContainer}>
                        <Text style={styles.storyText}>
                          {speechAnalysis.transcript || 'No speech detected'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{Math.round(speechAnalysis.confidence * 100)}%</Text>
                        <Text style={styles.statLabel}>clarity</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{speechAnalysis.correctWords}/{speechAnalysis.totalWords}</Text>
                        <Text style={styles.statLabel}>words</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatTime(speechAnalysis.duration)}</Text>
                        <Text style={styles.statLabel}>time</Text>
                      </View>
                    </View>

                    <View style={styles.fluencySection}>
                      <View style={styles.fluencyHeader}>
                        <Text style={styles.fluencyTitle}>word accuracy</Text>
                        <Text style={styles.fluencyScore}>
                          {speechAnalysis.accuracy >= 90 ? 'perfect!' :
                           speechAnalysis.accuracy >= 75 ? 'excellent!' :
                           speechAnalysis.accuracy >= 60 ? 'great job!' :
                           speechAnalysis.accuracy >= 40 ? 'good effort!' :
                           'keep practicing!'}
                        </Text>
                      </View>
                      <View style={styles.fluencyBar}>
                        <View 
                          style={[
                            styles.fluencyBarFill, 
                            { width: `${Math.max(10, speechAnalysis.accuracy)}%` }
                          ]} 
                        />
                      </View>
                      <View style={styles.fluencyStats}>
                        <Text style={styles.fluencyText}>
                          {speechAnalysis.correctWords === speechAnalysis.totalWords 
                            ? 'amazing! you got every word perfectly!' 
                            : speechAnalysis.accuracy >= 80
                            ? 'fantastic rhythm and timing!'
                            : speechAnalysis.accuracy >= 60
                            ? 'wonderful progress with the beat!'
                            : speechAnalysis.accuracy >= 40
                            ? 'good start! keep practicing with the tempo'
                            : 'building great speaking skills step by step!'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.qualitySection}>
                      <View style={styles.qualityHeader}>
                        <Text style={styles.qualityTitle}>speech quality</Text>
                        <Text style={styles.qualityScore}>
                          {speechAnalysis.confidence > 0.8 ? 'crystal clear!' : 
                           speechAnalysis.confidence > 0.6 ? 'very clear!' : 
                           speechAnalysis.confidence > 0.4 ? 'quite clear!' : 'getting clearer!'}
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

                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        onPress={() => {
                          setShowAnalysisModal(false);
                          generateNewSentence();
                        }}
                        style={styles.newStoryButton}
                      >
                        <BlurView intensity={60} tint="dark" style={styles.newStoryButtonBlur}>
                          <LinearGradient
                            colors={['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.2)']}
                            style={styles.newStoryButtonGradient}
                          >
                            <Text style={styles.newStoryButtonText}>try another sequence</Text>
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

      <Modal
        visible={isHelpModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsHelpModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsHelpModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.helpModalContainer}>
                <BlurView intensity={90} tint="dark" style={styles.modalBlur}>
                  <LinearGradient
                    colors={['rgba(15, 23, 42, 0.98)', 'rgba(30, 41, 59, 0.95)']}
                    style={styles.helpModalGradient}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>how to play</Text>
                      <TouchableOpacity
                        onPress={() => setIsHelpModalVisible(false)}
                        style={styles.modalCloseButton}
                      >
                        <X size={16} color="rgba(232, 244, 253, 0.8)" strokeWidth={1.5} />
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={styles.helpStep}>
                        <Text style={styles.helpStepNumber}>1</Text>
                        <Text style={styles.helpStepText}>
                          Press the Play button to start the exercise. The words will light up one by one.
                        </Text>
                      </View>
                      <View style={styles.helpStep}>
                        <Text style={styles.helpStepNumber}>2</Text>
                        <Text style={styles.helpStepText}>
                          As the words light up, speak them aloud clearly. The app is listening!
                        </Text>
                      </View>
                      <View style={styles.helpStep}>
                        <Text style={styles.helpStepNumber}>3</Text>
                        <Text style={styles.helpStepText}>
                          Use the Tempo controls to speed up or slow down the pace of the words.
                        </Text>
                      </View>
                      <View style={styles.helpStep}>
                        <Text style={styles.helpStepNumber}>4</Text>
                        <Text style={styles.helpStepText}>
                          After the sequence is complete, your speech will be analyzed. Review your results for accuracy and clarity.
                        </Text>
                      </View>
                      <View style={styles.helpStep}>
                        <Text style={styles.helpStepNumber}>5</Text>
                        <Text style={styles.helpStepText}>
                          Press the Reset button to start a new sentence at any time.
                        </Text>
                      </View>
                    </ScrollView>

                  </LinearGradient>
                </BlurView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sendingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendingBlur: {
    width: '90%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  sendingContent: {
    padding: 40,
    alignItems: 'center',
  },
  loadingContainer: {
    marginBottom: 24,
  },
  loadingSpinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderTopColor: '#8B5CF6',
  },
  sendingText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  header: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  headerButtonGlass: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '300',
    color: '#0B1426',
    letterSpacing: 3,
    textAlign: 'center',
  },
  bridgeSection: {
    flex: 1,
    marginBottom: 28,
  },
  bridgeContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 260,
    maxHeight: 320,
  },
  rainbowBackground: {
    position: 'absolute',
    top: '15%',
    left: '5%',
    right: '5%',
    height: '70%',
    borderRadius: 50,
  },
  rainbowGradient: {
    flex: 1,
    borderRadius: 50,
  },
  wordBubbleContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 25,
    paddingBottom: 40,
    gap: 8,
    zIndex: 10,
    position: 'absolute',
    top: '15%',
    left: '5%',
    right: '5%',
    height: '70%',
  },
  wordBubble: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 2,
    marginVertical: 3,
    elevation: 5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'relative',
    maxWidth: '45%',
  },
  activeWordBubble: {
    elevation: 15,
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  completedWordBubble: {
    elevation: 8,
    shadowColor: '#06FFA5',
    shadowOpacity: 0.4,
  },
  correctWordBubble: {
    elevation: 12,
    shadowColor: '#10B981',
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  wordBubbleGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  wordBubbleGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  word: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  activeWord: {
    color: '#FFFFFF',
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  completedWord: {
    color: '#0B1426',
    fontWeight: '700',
  },
  correctWord: {
    color: '#FFFFFF',
    fontWeight: '800',
    textShadowColor: 'rgba(16, 185, 129, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bridgePath: {
    position: 'absolute',
    bottom: 10,
    left: '10%',
    right: '10%',
    height: 5,
    zIndex: 5,
  },
  bridgePathGradient: {
    flex: 1,
    borderRadius: 3,
  },
  listeningIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    zIndex: 20,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  listeningText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  tempoSection: {
    marginBottom: 18,
  },
  tempoContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  tempoContent: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  tempoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  tempoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  tempoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  tempoButtonGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempoDisplay: {
    alignItems: 'center',
  },
  tempoValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tempoBpm: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 1,
  },
  statsSection: {
    marginBottom: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  controlButtonGlass: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  playButtonGlass: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  playButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: Math.min(400, width - 40),
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
    color: '#E8F4FD',
    fontWeight: '300',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
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
  buttonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  newStoryButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  newStoryButtonBlur: {
    borderRadius: 12,
  },
  newStoryButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newStoryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  helpModalContainer: {
    width: Math.min(400, width - 40),
    maxHeight: '70%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  helpModalGradient: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  helpStepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginRight: 12,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  helpStepText: {
    flex: 1,
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
});
