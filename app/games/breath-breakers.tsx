import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BREATHING_PHASES = {
  INHALE: 'INHALE',
  HOLD: 'HOLD',
  EXHALE: 'EXHALE',
  REST: 'REST'
};

export default function BreathBreakers() {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(BREATHING_PHASES.INHALE);
  const [cycleCount, setCycleCount] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [selectedPattern, setSelectedPattern] = useState('478'); // 4-7-8 breathing

  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.7);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const breathingPatterns = {
    '478': { inhale: 4, hold: 7, exhale: 8, rest: 2 },
    '466': { inhale: 4, hold: 6, exhale: 6, rest: 2 },
    '444': { inhale: 4, hold: 4, exhale: 4, rest: 2 }
  };

  const currentPattern = breathingPatterns[selectedPattern as keyof typeof breathingPatterns];

  useEffect(() => {
    if (isActive) {
      startBreathingCycle();
      const timer = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
      intervalRef.current = timer;
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (phaseIntervalRef.current) {
        clearInterval(phaseIntervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    };
  }, [isActive]);

  const startBreathingCycle = () => {
    executePhase(BREATHING_PHASES.INHALE);
  };

  const executePhase = (phase: string) => {
    setCurrentPhase(phase);
    setPhaseTime(0);

    let duration = 0;
    let targetScale = 0.5;

    switch (phase) {
      case BREATHING_PHASES.INHALE:
        duration = currentPattern.inhale;
        targetScale = 1;
        break;
      case BREATHING_PHASES.HOLD:
        duration = currentPattern.hold;
        targetScale = 1;
        break;
      case BREATHING_PHASES.EXHALE:
        duration = currentPattern.exhale;
        targetScale = 0.5;
        break;
      case BREATHING_PHASES.REST:
        duration = currentPattern.rest;
        targetScale = 0.5;
        break;
    }

    // Animate the breathing guide
    scale.value = withTiming(targetScale, {
      duration: duration * 1000,
      easing: Easing.inOut(Easing.ease),
    });

    // Phase timer
    const phaseTimer = setInterval(() => {
      setPhaseTime(prev => {
        const newTime = prev + 1;
        if (newTime >= duration) {
          clearInterval(phaseTimer);
          moveToNextPhase(phase);
        }
        return newTime;
      });
    }, 1000);

    phaseIntervalRef.current = phaseTimer;
  };

  const moveToNextPhase = (currentPhase: string) => {
    if (!isActive) return;

    switch (currentPhase) {
      case BREATHING_PHASES.INHALE:
        executePhase(BREATHING_PHASES.HOLD);
        break;
      case BREATHING_PHASES.HOLD:
        executePhase(BREATHING_PHASES.EXHALE);
        break;
      case BREATHING_PHASES.EXHALE:
        executePhase(BREATHING_PHASES.REST);
        break;
      case BREATHING_PHASES.REST:
        setCycleCount(prev => prev + 1);
        executePhase(BREATHING_PHASES.INHALE);
        break;
    }
  };

  const toggleSession = () => {
    setIsActive(!isActive);
  };

  const resetSession = () => {
    setIsActive(false);
    setCycleCount(0);
    setSessionTime(0);
    setPhaseTime(0);
    setCurrentPhase(BREATHING_PHASES.INHALE);
    scale.value = withTiming(0.5, { duration: 500 });
  };

  const endSession = async () => {
    if (sessionTime > 0) {
      try {
        const sessionData = {
          date: new Date().toISOString(),
          gameMode: 'breath-breakers',
          duration: sessionTime,
          completed: true,
          cycles: cycleCount,
          pattern: selectedPattern
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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const getPhaseInstruction = () => {
    switch (currentPhase) {
      case BREATHING_PHASES.INHALE:
        return 'Breathe In';
      case BREATHING_PHASES.HOLD:
        return 'Hold';
      case BREATHING_PHASES.EXHALE:
        return 'Breathe Out';
      case BREATHING_PHASES.REST:
        return 'Rest';
      default:
        return 'Ready';
    }
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case BREATHING_PHASES.INHALE:
        return '#4facfe';
      case BREATHING_PHASES.HOLD:
        return '#43e97b';
      case BREATHING_PHASES.EXHALE:
        return '#667eea';
      case BREATHING_PHASES.REST:
        return '#f093fb';
      default:
        return '#4facfe';
    }
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
          <Text style={styles.title}>Breath Breakers</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.patternSelector}>
          {Object.keys(breathingPatterns).map((pattern) => (
            <TouchableOpacity
              key={pattern}
              style={[
                styles.patternButton,
                selectedPattern === pattern && styles.patternButtonActive
              ]}
              onPress={() => setSelectedPattern(pattern)}
              disabled={isActive}
            >
              <Text style={[
                styles.patternText,
                selectedPattern === pattern && styles.patternTextActive
              ]}>
                {pattern.split('').join('-')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.breathingContainer}>
          <Animated.View
            style={[
              styles.breathingCircle,
              animatedStyle,
              { backgroundColor: getPhaseColor() }
            ]}
          />
          <View style={styles.breathingInstructions}>
            <Text style={styles.phaseText}>{getPhaseInstruction()}</Text>
            <Text style={styles.countdownText}>
              {Math.max(0, getCurrentPhaseDuration() - phaseTime)}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{cycleCount}</Text>
            <Text style={styles.statLabel}>Cycles</Text>
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
            style={[styles.playButton, isActive && styles.pauseButton]}
            onPress={toggleSession}
          >
            {isActive ? (
              <Pause size={32} color="white" />
            ) : (
              <Play size={32} color="white" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={endSession}
          >
            <Text style={styles.endText}>End</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  function getCurrentPhaseDuration() {
    switch (currentPhase) {
      case BREATHING_PHASES.INHALE:
        return currentPattern.inhale;
      case BREATHING_PHASES.HOLD:
        return currentPattern.hold;
      case BREATHING_PHASES.EXHALE:
        return currentPattern.exhale;
      case BREATHING_PHASES.REST:
        return currentPattern.rest;
      default:
        return 4;
    }
  }
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
  patternSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  patternButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  patternButtonActive: {
    backgroundColor: '#4facfe',
  },
  patternText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  patternTextActive: {
    color: 'white',
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.8,
  },
  breathingInstructions: {
    position: 'absolute',
    alignItems: 'center',
  },
  phaseText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 40,
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
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4facfe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#f093fb',
  },
  endText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});