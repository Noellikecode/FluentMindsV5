import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Play, Pause, RotateCcw, Settings } from 'lucide-react-native';
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

const { width, height } = Dimensions.get('window');

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
  const [selectedPattern, setSelectedPattern] = useState('478');

  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.8);
  const rotation = useSharedValue(0);
  const colorProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const breathingPatterns = {
    '478': { inhale: 4, hold: 7, exhale: 8, rest: 2, name: 'Calm' },
    '466': { inhale: 4, hold: 6, exhale: 6, rest: 2, name: 'Focus' },
    '444': { inhale: 4, hold: 4, exhale: 4, rest: 2, name: 'Energy' }
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
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    };
  }, [isActive, selectedPattern]);

  useEffect(() => {
    // Continuous gentle pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const startBreathingCycle = () => {
    executePhase(BREATHING_PHASES.INHALE);
  };

  const executePhase = (phase: string) => {
    setCurrentPhase(phase);
    setPhaseTime(0);

    let duration = 0;
    let targetScale = 0.3;
    let targetColor = 0;

    switch (phase) {
      case BREATHING_PHASES.INHALE:
        duration = currentPattern.inhale;
        targetScale = 0.8;
        targetColor = 0;
        break;
      case BREATHING_PHASES.HOLD:
        duration = currentPattern.hold;
        targetScale = 0.8;
        targetColor = 0.33;
        break;
      case BREATHING_PHASES.EXHALE:
        duration = currentPattern.exhale;
        targetScale = 0.3;
        targetColor = 0.66;
        break;
      case BREATHING_PHASES.REST:
        duration = currentPattern.rest;
        targetScale = 0.3;
        targetColor = 1;
        break;
    }

    scale.value = withTiming(targetScale, {
      duration: duration * 1000,
      easing: Easing.inOut(Easing.ease),
    });

    colorProgress.value = withTiming(targetColor, {
      duration: duration * 1000,
      easing: Easing.inOut(Easing.ease),
    });

    rotation.value = withTiming(rotation.value + 90, {
      duration: duration * 1000,
      easing: Easing.inOut(Easing.ease),
    });

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
    scale.value = withTiming(0.3, { duration: 500 });
    colorProgress.value = withTiming(0, { duration: 500 });
    rotation.value = 0;
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
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 0.33, 0.66, 1],
      ['#00d4ff', '#7c3aed', '#ec4899', '#06b6d4']
    );

    return {
      transform: [
        { scale: scale.value * pulseScale.value },
        { rotate: `${rotation.value}deg` }
      ],
      backgroundColor,
      shadowColor: backgroundColor,
    };
  });

  const getPhaseInstruction = () => {
    switch (currentPhase) {
      case BREATHING_PHASES.INHALE:
        return 'Breathe In Slowly';
      case BREATHING_PHASES.HOLD:
        return 'Hold Gently';
      case BREATHING_PHASES.EXHALE:
        return 'Release Slowly';
      case BREATHING_PHASES.REST:
        return 'Rest & Reset';
      default:
        return 'Ready to Begin';
    }
  };

  const getCurrentPhaseDuration = () => {
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
  };

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
            <Text style={styles.title}>Mindful Breathing</Text>
            <Text style={styles.subtitle}>{currentPattern.name} Pattern</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <Settings size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.patternSelector}>
          {Object.entries(breathingPatterns).map(([pattern, config]) => (
            <TouchableOpacity
              key={pattern}
              style={[
                styles.patternChip,
                selectedPattern === pattern && styles.patternChipActive
              ]}
              onPress={() => setSelectedPattern(pattern)}
              disabled={isActive}
            >
              <Text style={[
                styles.patternText,
                selectedPattern === pattern && styles.patternTextActive
              ]}>
                {config.name}
              </Text>
              <Text style={[
                styles.patternNumbers,
                selectedPattern === pattern && styles.patternNumbersActive
              ]}>
                {pattern.split('').join('·')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.breathingContainer}>
          <View style={styles.breathingGuide}>
            <Animated.View style={[styles.breathingCircle, animatedStyle]} />
            <View style={styles.breathingRings}>
              <View style={[styles.ring, styles.ring1]} />
              <View style={[styles.ring, styles.ring2]} />
              <View style={[styles.ring, styles.ring3]} />
            </View>
          </View>
          
          <View style={styles.instructionContainer}>
            <Text style={styles.phaseText}>{getPhaseInstruction()}</Text>
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>
                {Math.max(0, getCurrentPhaseDuration() - phaseTime)}
              </Text>
              <Text style={styles.countdownLabel}>seconds</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{cycleCount}</Text>
            <Text style={styles.statLabel}>Cycles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{formatTime(sessionTime)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={resetSession}
          >
            <RotateCcw size={20} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.primaryButton, isActive && styles.primaryButtonActive]}
            onPress={toggleSession}
          >
            <LinearGradient
              colors={isActive ? ['#ec4899', '#be185d'] : ['#00d4ff', '#0ea5e9']}
              style={styles.buttonGradient}
            >
              {isActive ? (
                <Pause size={28} color="white" strokeWidth={1.5} />
              ) : (
                <Play size={28} color="white" strokeWidth={1.5} />
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={endSession}
          >
            <Text style={styles.endButtonText}>End</Text>
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
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  patternSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 60,
  },
  patternChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  patternChipActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: '#00d4ff',
  },
  patternText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  patternTextActive: {
    color: '#00d4ff',
  },
  patternNumbers: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '400',
  },
  patternNumbersActive: {
    color: 'rgba(0, 212, 255, 0.8)',
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  breathingGuide: {
    width: width * 0.7,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  breathingCircle: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  breathingRings: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: width * 0.4,
  },
  ring1: {
    width: width * 0.6,
    height: width * 0.6,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ring2: {
    width: width * 0.7,
    height: width * 0.7,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ring3: {
    width: width * 0.8,
    height: width * 0.8,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  instructionContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  phaseText: {
    fontSize: 20,
    fontWeight: '300',
    color: 'white',
    marginBottom: 12,
    letterSpacing: 1,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: '200',
    color: 'white',
    lineHeight: 52,
  },
  countdownLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statsContainer: {
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
  primaryButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  primaryButtonActive: {
    shadowColor: '#ec4899',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});