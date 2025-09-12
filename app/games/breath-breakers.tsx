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
  HOLD_IN: 'HOLD_IN',
  EXHALE: 'EXHALE',
  HOLD_OUT: 'HOLD_OUT',
  REST: 'REST'
};

export default function BreathBreakers() {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(BREATHING_PHASES.INHALE);
  const [cycleCount, setCycleCount] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [selectedPattern, setSelectedPattern] = useState('calm');

  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.8);
  const rotation = useSharedValue(0);
  const colorProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const breathingPatterns = {
    calm: {
      name: 'Calm',
      description: 'Deep relaxation & stress relief',
      inhale: 4,
      holdIn: 7,
      exhale: 8,
      holdOut: 0,
      rest: 2,
      colors: ['#667EEA', '#764BA2', '#8B5A9D', '#667EEA'],
      animationSpeed: 'slow',
      pulseIntensity: 1.03,
      instructions: {
        [BREATHING_PHASES.INHALE]: 'Breathe In Deeply',
        [BREATHING_PHASES.HOLD_IN]: 'Hold & Feel Calm',
        [BREATHING_PHASES.EXHALE]: 'Release All Tension',
        [BREATHING_PHASES.REST]: 'Rest in Peace'
      }
    },
    focus: {
      name: 'Focus',
      description: 'Mental clarity & concentration',
      inhale: 4,
      holdIn: 4,
      exhale: 6,
      holdOut: 2,
      rest: 1,
      colors: ['#06FFA5', '#4ECDC4', '#45B7D1', '#96DED1'],
      animationSpeed: 'medium',
      pulseIntensity: 1.05,
      instructions: {
        [BREATHING_PHASES.INHALE]: 'Sharp Inhale',
        [BREATHING_PHASES.HOLD_IN]: 'Focus Energy',
        [BREATHING_PHASES.EXHALE]: 'Controlled Release',
        [BREATHING_PHASES.HOLD_OUT]: 'Mental Clarity',
        [BREATHING_PHASES.REST]: 'Reset & Repeat'
      }
    },
    energy: {
      name: 'Energy',
      description: 'Invigoration & alertness',
      inhale: 3,
      holdIn: 2,
      exhale: 4,
      holdOut: 1,
      rest: 0,
      colors: ['#FF6B6B', '#FF8E53', '#FF6B9D', '#C44569'],
      animationSpeed: 'fast',
      pulseIntensity: 1.08,
      instructions: {
        [BREATHING_PHASES.INHALE]: 'Quick Energizing Breath',
        [BREATHING_PHASES.HOLD_IN]: 'Charge Up',
        [BREATHING_PHASES.EXHALE]: 'Power Release',
        [BREATHING_PHASES.HOLD_OUT]: 'Brief Pause',
        [BREATHING_PHASES.REST]: 'Continuous Flow'
      }
    }
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
    // Dynamic pulse animation based on pattern
    const getDuration = () => {
      switch (currentPattern.animationSpeed) {
        case 'fast': return 1200;
        case 'medium': return 1800;
        case 'slow': return 2500;
        default: return 2000;
      }
    };

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(currentPattern.pulseIntensity, { 
          duration: getDuration(),
          easing: Easing.inOut(Easing.ease) 
        }),
        withTiming(1, { 
          duration: getDuration(),
          easing: Easing.inOut(Easing.ease) 
        })
      ),
      -1,
      false
    );
  }, [selectedPattern]);

  const startBreathingCycle = () => {
    executePhase(BREATHING_PHASES.INHALE);
  };

  const executePhase = (phase: string) => {
    setCurrentPhase(phase);
    setPhaseTime(0);

    let duration = 0;
    let targetScale = 0.3;
    let targetColor = 0;

    // Get phase duration from current pattern
    switch (phase) {
      case BREATHING_PHASES.INHALE:
        duration = currentPattern.inhale;
        targetScale = 0.8;
        targetColor = 0;
        break;
      case BREATHING_PHASES.HOLD_IN:
        duration = currentPattern.holdIn;
        targetScale = 0.8;
        targetColor = 0.25;
        break;
      case BREATHING_PHASES.EXHALE:
        duration = currentPattern.exhale;
        targetScale = 0.3;
        targetColor = 0.5;
        break;
      case BREATHING_PHASES.HOLD_OUT:
        duration = currentPattern.holdOut;
        targetScale = 0.3;
        targetColor = 0.75;
        break;
      case BREATHING_PHASES.REST:
        duration = currentPattern.rest;
        targetScale = 0.3;
        targetColor = 1;
        break;
    }

    // Skip phases with 0 duration
    if (duration === 0) {
      moveToNextPhase(phase);
      return;
    }

    // Dynamic animation timing based on pattern speed
    const animationDuration = duration * 1000;
    const easingFunction = currentPattern.animationSpeed === 'fast' 
      ? Easing.out(Easing.exp)
      : currentPattern.animationSpeed === 'medium'
      ? Easing.inOut(Easing.quad)
      : Easing.inOut(Easing.ease);

    scale.value = withTiming(targetScale, {
      duration: animationDuration,
      easing: easingFunction,
    });

    colorProgress.value = withTiming(targetColor, {
      duration: animationDuration,
      easing: easingFunction,
    });

    // Dynamic rotation based on pattern
    const rotationAmount = currentPattern.animationSpeed === 'fast' ? 45 : 
                          currentPattern.animationSpeed === 'medium' ? 60 : 90;
    
    rotation.value = withTiming(rotation.value + rotationAmount, {
      duration: animationDuration,
      easing: easingFunction,
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
        if (currentPattern.holdIn > 0) {
          executePhase(BREATHING_PHASES.HOLD_IN);
        } else {
          executePhase(BREATHING_PHASES.EXHALE);
        }
        break;
      case BREATHING_PHASES.HOLD_IN:
        executePhase(BREATHING_PHASES.EXHALE);
        break;
      case BREATHING_PHASES.EXHALE:
        if (currentPattern.holdOut > 0) {
          executePhase(BREATHING_PHASES.HOLD_OUT);
        } else if (currentPattern.rest > 0) {
          executePhase(BREATHING_PHASES.REST);
        } else {
          setCycleCount(prev => prev + 1);
          executePhase(BREATHING_PHASES.INHALE);
        }
        break;
      case BREATHING_PHASES.HOLD_OUT:
        if (currentPattern.rest > 0) {
          executePhase(BREATHING_PHASES.REST);
        } else {
          setCycleCount(prev => prev + 1);
          executePhase(BREATHING_PHASES.INHALE);
        }
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
      [0, 0.25, 0.5, 0.75, 1],
      currentPattern.colors
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
    return currentPattern.instructions[currentPhase as keyof typeof currentPattern.instructions] || 'Ready to Begin';
  };

  const getCurrentPhaseDuration = () => {
    switch (currentPhase) {
      case BREATHING_PHASES.INHALE:
        return currentPattern.inhale;
      case BREATHING_PHASES.HOLD_IN:
        return currentPattern.holdIn;
      case BREATHING_PHASES.EXHALE:
        return currentPattern.exhale;
      case BREATHING_PHASES.HOLD_OUT:
        return currentPattern.holdOut;
      case BREATHING_PHASES.REST:
        return currentPattern.rest;
      default:
        return 4;
    }
  };

  const getPatternPreview = (pattern: string) => {
    const p = breathingPatterns[pattern as keyof typeof breathingPatterns];
    const phases = [];
    if (p.inhale > 0) phases.push(p.inhale);
    if (p.holdIn > 0) phases.push(p.holdIn);
    if (p.exhale > 0) phases.push(p.exhale);
    if (p.holdOut > 0) phases.push(p.holdOut);
    return phases.join('·');
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
            <Text style={styles.subtitle}>{currentPattern.description}</Text>
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
                {getPatternPreview(pattern)}
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
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{currentPattern.name}</Text>
            <Text style={styles.statLabel}>Mode</Text>
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
              colors={isActive ? ['#ec4899', '#be185d'] : currentPattern.colors.slice(0, 2)}
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
    textAlign: 'center',
  },
  patternSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 60,
  },
  patternChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    minWidth: 80,
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
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  breathingCircle: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
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
    borderRadius: width * 0.45,
  },
  ring1: {
    width: width * 0.7,
    height: width * 0.7,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ring2: {
    width: width * 0.8,
    height: width * 0.8,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ring3: {
    width: width * 0.9,
    height: width * 0.9,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  instructionContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseText: {
    fontSize: 16,
    fontWeight: '300',
    color: 'white',
    marginBottom: 50, // Increased from 12 to 20
    letterSpacing: 1,
    textAlign: 'center',
    opacity: 0.9,
  },
  countdownContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: '200',
    color: 'white',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 48,
    marginBottom: 45, // Increased from 4 to 8
  },
  countdownLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: 85,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '300',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  secondaryButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  primaryButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
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
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});