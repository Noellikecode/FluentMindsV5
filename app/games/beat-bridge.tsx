import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Play, Pause, RotateCcw, Mic } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAMPLE_SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "She sells seashells by the seashore.",
  "Peter Piper picked a peck of pickled peppers.",
  "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
  "I scream, you scream, we all scream for ice cream.",
  "Red leather, yellow leather, red leather, yellow leather.",
  "Unique New York, unique New York, you know you need unique New York.",
  "The sixth sick sheik's sixth sheep's sick.",
  "Fuzzy Wuzzy was a bear, Fuzzy Wuzzy had no hair.",
  "Betty Botter bought some butter, but she said the butter's bitter."
];

export default function BeatBridge() {
  const [currentSentence, setCurrentSentence] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [completedSentences, setCompletedSentences] = useState(0);
  const [tempo, setTempo] = useState(120); // BPM

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    generateNewSentence();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startBeat();
      startSessionTimer();
    } else {
      stopBeat();
      stopSessionTimer();
    }

    return () => {
      stopBeat();
      stopSessionTimer();
    };
  }, [isPlaying, tempo]);

  const generateNewSentence = () => {
    const randomSentence = SAMPLE_SENTENCES[Math.floor(Math.random() * SAMPLE_SENTENCES.length)];
    setCurrentSentence(randomSentence);
    setWords(randomSentence.split(' '));
    setCurrentWordIndex(0);
    setIsPlaying(false);
  };

  const startBeat = () => {
    const beatInterval = 60000 / tempo; // Convert BPM to milliseconds
    
    beatIntervalRef.current = setInterval(() => {
      setCurrentWordIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= words.length) {
          // Sentence completed
          setCompletedSentences(prev => prev + 1);
          setTimeout(() => {
            generateNewSentence();
          }, 2000);
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

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetSession = () => {
    setIsPlaying(false);
    setCurrentWordIndex(0);
    setSessionTime(0);
    setCompletedSentences(0);
    generateNewSentence();
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording logic would go here
      setIsRecording(false);
      Alert.alert('Recording Stopped', 'Your speech has been recorded for analysis.');
    } else {
      // Start recording logic would go here
      setIsRecording(true);
      Alert.alert('Recording Started', 'Speak along with the highlighted words.');
    }
  };

  const adjustTempo = (change: number) => {
    const newTempo = Math.max(60, Math.min(180, tempo + change));
    setTempo(newTempo);
  };

  const endSession = async () => {
    if (sessionTime > 0) {
      try {
        const sessionData = {
          date: new Date().toISOString(),
          gameMode: 'beat-bridge',
          duration: sessionTime,
          completed: true,
          completedSentences,
          tempo
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
          <Text style={styles.title}>Beat Bridge</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.tempoControl}>
          <Text style={styles.tempoLabel}>Tempo: {tempo} BPM</Text>
          <View style={styles.tempoButtons}>
            <TouchableOpacity
              style={styles.tempoButton}
              onPress={() => adjustTempo(-10)}
              disabled={isPlaying}
            >
              <Text style={styles.tempoButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tempoButton}
              onPress={() => adjustTempo(10)}
              disabled={isPlaying}
            >
              <Text style={styles.tempoButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sentenceContainer}>
          <View style={styles.sentence}>
            {words.map((word, index) => (
              <Text
                key={index}
                style={[
                  styles.word,
                  index === currentWordIndex && isPlaying && styles.activeWord,
                  index < currentWordIndex && styles.completedWord
                ]}
              >
                {word}{' '}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {isPlaying 
              ? 'Speak along with the highlighted words' 
              : 'Press play to start the rhythm guide'}
          </Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedSentences}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatTime(sessionTime)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={resetSession}
          >
            <RotateCcw size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.pauseButton]}
            onPress={togglePlayback}
          >
            {isPlaying ? (
              <Pause size={32} color="white" />
            ) : (
              <Play size={32} color="white" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              isRecording && styles.recordingActive
            ]}
            onPress={toggleRecording}
          >
            <Mic size={24} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.newSentenceButton}
          onPress={generateNewSentence}
          disabled={isPlaying}
        >
          <Text style={styles.newSentenceText}>New Sentence</Text>
        </TouchableOpacity>
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
  tempoControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  tempoLabel: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  tempoButtons: {
    flexDirection: 'row',
  },
  tempoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  tempoButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sentenceContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sentence: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  word: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.6)',
    marginVertical: 4,
    lineHeight: 36,
  },
  activeWord: {
    color: '#f093fb',
    fontWeight: 'bold',
    backgroundColor: 'rgba(240, 147, 251, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  completedWord: {
    color: '#43e97b',
  },
  instructions: {
    alignItems: 'center',
    marginVertical: 30,
  },
  instructionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 30,
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
    marginBottom: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingActive: {
    backgroundColor: '#f5576c',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f093fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#667eea',
  },
  newSentenceButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 30,
  },
  newSentenceText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});