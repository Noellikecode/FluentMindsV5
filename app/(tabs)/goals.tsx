import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Target, TrendingUp, Award, Star, Flame, Calendar, CheckCircle } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface SessionData {
  date: string;
  gameMode: string;
  duration: number;
  completed: boolean;
  cycles?: number;
  pattern?: string;
  conversationCount?: number;
  context?: string;
  accuracy?: number;
  correctWords?: number;
  totalWords?: number;
}

interface GameStats {
  totalTime: number;
  sessionsCount: number;
  averageSession: number;
  lastPlayed: string;
}

interface GoalData {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  gameMode: string;
  type: 'daily' | 'weekly' | 'milestone';
  icon: any;
  gradient: string[];
}

export default function Goals() {
  const [userSessions, setUserSessions] = useState<SessionData[]>([]);
  const [gameStats, setGameStats] = useState<Record<string, GameStats>>({});
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);

  // Animation values
  const progressAnimations = useSharedValue<Record<string, number>>({});

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const sessionsData = await AsyncStorage.getItem('userSessions');
      const sessions: SessionData[] = sessionsData ? JSON.parse(sessionsData) : [];
      
      setUserSessions(sessions);
      
      // Calculate stats for each game mode
      const stats = calculateGameStats(sessions);
      setGameStats(stats);
      
      // Generate dynamic goals based on user progress
      const dynamicGoals = generateDynamicGoals(stats, sessions);
      setGoals(dynamicGoals);
      
      // Animate progress bars
      animateProgress(dynamicGoals);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGameStats = (sessions: SessionData[]): Record<string, GameStats> => {
    const stats: Record<string, GameStats> = {};
    
    // Group sessions by game mode
    const gameModeSessions = sessions.reduce((acc, session) => {
      if (!acc[session.gameMode]) {
        acc[session.gameMode] = [];
      }
      acc[session.gameMode].push(session);
      return acc;
    }, {} as Record<string, SessionData[]>);

    // Calculate stats for each game mode
    Object.entries(gameModeSessions).forEach(([gameMode, gameSessions]) => {
      const totalTime = gameSessions.reduce((sum, session) => sum + session.duration, 0);
      const completedSessions = gameSessions.filter(session => session.completed);
      const lastSession = gameSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      stats[gameMode] = {
        totalTime,
        sessionsCount: completedSessions.length,
        averageSession: completedSessions.length > 0 ? Math.round(totalTime / completedSessions.length) : 0,
        lastPlayed: lastSession?.date || '',
      };
    });

    return stats;
  };

  const generateDynamicGoals = (stats: Record<string, GameStats>, sessions: SessionData[]): GoalData[] => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    // Filter sessions for today and this week
    const todaySessions = sessions.filter(session => 
      new Date(session.date) >= startOfDay
    );
    const weekSessions = sessions.filter(session => 
      new Date(session.date) >= startOfWeek
    );

    const goals: GoalData[] = [];

    // Daily Goals
    const dailyTimeSpent = todaySessions.reduce((sum, session) => sum + session.duration, 0);
    goals.push({
      id: 'daily-practice',
      title: 'Daily Practice',
      description: 'Spend 15 minutes practicing today',
      target: 15 * 60, // 15 minutes in seconds
      current: dailyTimeSpent,
      unit: 'minutes',
      gameMode: 'all',
      type: 'daily',
      icon: Calendar,
      gradient: ['#06FFA5', '#4ECDC4']
    });

    // Weekly Goals
    const weeklyTimeSpent = weekSessions.reduce((sum, session) => sum + session.duration, 0);
    goals.push({
      id: 'weekly-consistency',
      title: 'Weekly Consistency',
      description: 'Practice for 2 hours this week',
      target: 2 * 60 * 60, // 2 hours in seconds
      current: weeklyTimeSpent,
      unit: 'hours',
      gameMode: 'all',
      type: 'weekly',
      icon: TrendingUp,
      gradient: ['#667EEA', '#764BA2']
    });

    // Game-specific goals based on user progress
    if (stats['dialogue-mode']) {
      const dialogueStats = stats['dialogue-mode'];
      goals.push({
        id: 'dialogue-conversations',
        title: 'Conversation Master',
        description: 'Complete 10 dialogue sessions',
        target: 10,
        current: dialogueStats.sessionsCount,
        unit: 'sessions',
        gameMode: 'dialogue-mode',
        type: 'milestone',
        icon: Target,
        gradient: ['#8B5CF6', '#A855F7']
      });

      // Time-based dialogue goal
      goals.push({
        id: 'dialogue-time',
        title: 'Dialogue Expert',
        description: 'Spend 30 minutes in conversations',
        target: 30 * 60,
        current: dialogueStats.totalTime,
        unit: 'minutes',
        gameMode: 'dialogue-mode',
        type: 'milestone',
        icon: Clock,
        gradient: ['#F093FB', '#F5576C']
      });
    }

    if (stats['breath-breakers']) {
      const breathStats = stats['breath-breakers'];
      goals.push({
        id: 'breathing-cycles',
        title: 'Breath Master',
        description: 'Complete 50 breathing cycles',
        target: 50,
        current: sessions
          .filter(s => s.gameMode === 'breath-breakers')
          .reduce((sum, session) => sum + (session.cycles || 0), 0),
        unit: 'cycles',
        gameMode: 'breath-breakers',
        type: 'milestone',
        icon: Star,
        gradient: ['#84FAB0', '#8FD3F4']
      });

      goals.push({
        id: 'breathing-time',
        title: 'Zen Zone',
        description: 'Meditate for 20 minutes total',
        target: 20 * 60,
        current: breathStats.totalTime,
        unit: 'minutes',
        gameMode: 'breath-breakers',
        type: 'milestone',
        icon: Flame,
        gradient: ['#A8EDEA', '#FED6E3']
      });
    }

    if (stats['beat-bridge']) {
      const beatStats = stats['beat-bridge'];
      goals.push({
        id: 'rhythm-practice',
        title: 'Rhythm Keeper',
        description: 'Complete 15 rhythm exercises',
        target: 15,
        current: beatStats.sessionsCount,
        unit: 'exercises',
        gameMode: 'beat-bridge',
        type: 'milestone',
        icon: Award,
        gradient: ['#FF6B6B', '#FF8E53']
      });
    }

    if (stats['storytelling']) {
      const storyStats = stats['storytelling'];
      goals.push({
        id: 'storytelling-sessions',
        title: 'Story Weaver',
        description: 'Complete 8 storytelling sessions',
        target: 8,
        current: storyStats.sessionsCount,
        unit: 'stories',
        gameMode: 'storytelling',
        type: 'milestone',
        icon: CheckCircle,
        gradient: ['#667EEA', '#764BA2']
      });
    }

    return goals;
  };

  const animateProgress = (goals: GoalData[]) => {
    const animations: Record<string, number> = {};
    
    goals.forEach(goal => {
      const progress = Math.min(goal.current / goal.target, 1);
      animations[goal.id] = progress;
    });

    progressAnimations.value = withTiming(animations, { duration: 1500 });
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatValue = (value: number, unit: string): string => {
    switch (unit) {
      case 'minutes':
        return Math.round(value / 60).toString();
      case 'hours':
        return Math.round(value / 3600).toString();
      case 'seconds':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getProgressPercentage = (goal: GoalData): number => {
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  const isGoalCompleted = (goal: GoalData): boolean => {
    return goal.current >= goal.target;
  };

  const GoalCard = ({ goal }: { goal: GoalData }) => {
    const progress = getProgressPercentage(goal);
    const completed = isGoalCompleted(goal);

    const progressStyle = useAnimatedStyle(() => {
      const animatedProgress = progressAnimations.value[goal.id] || 0;
      return {
        width: `${interpolate(animatedProgress, [0, 1], [0, 100])}%`,
      };
    });

    const IconComponent = goal.icon;

    return (
      <View style={styles.goalCard}>
        <LinearGradient
          colors={completed ? ['#10B981', '#059669'] : goal.gradient}
          style={styles.goalGradient}
        >
          <View style={styles.goalHeader}>
            <View style={styles.goalIconContainer}>
              <IconComponent size={24} color="white" strokeWidth={1.5} />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalDescription}>{goal.description}</Text>
            </View>
            <View style={styles.goalProgress}>
              <Text style={styles.goalPercentage}>
                {Math.round(progress)}%
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, progressStyle]} />
            </View>
            <Text style={styles.progressText}>
              {formatValue(goal.current, goal.unit)} / {formatValue(goal.target, goal.unit)} {goal.unit}
            </Text>
          </View>

          {completed && (
            <View style={styles.completedBadge}>
              <CheckCircle size={16} color="white" />
              <Text style={styles.completedText}>Completed!</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const OverviewCard = () => {
    const totalTime = Object.values(gameStats).reduce((sum, stat) => sum + stat.totalTime, 0);
    const totalSessions = Object.values(gameStats).reduce((sum, stat) => sum + stat.sessionsCount, 0);
    const completedGoals = goals.filter(isGoalCompleted).length;

    return (
      <View style={styles.overviewCard}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.15)', 'rgba(59, 130, 246, 0.1)']}
          style={styles.overviewGradient}
        >
          <Text style={styles.overviewTitle}>Your Progress</Text>
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatNumber}>{formatTime(totalTime)}</Text>
              <Text style={styles.overviewStatLabel}>Total Practice</Text>
            </View>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatNumber}>{totalSessions}</Text>
              <Text style={styles.overviewStatLabel}>Sessions</Text>
            </View>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatNumber}>{completedGoals}</Text>
              <Text style={styles.overviewStatLabel}>Goals Hit</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Goals & Progress</Text>
            <Text style={styles.subtitle}>track your mindful journey</Text>
          </View>

          <OverviewCard />

          <View style={styles.goalsSection}>
            <Text style={styles.sectionTitle}>Active Goals</Text>
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    textTransform: 'lowercase',
  },
  overviewCard: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  overviewGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  overviewStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalsSection: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  goalCard: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  goalGradient: {
    padding: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  goalProgress: {
    alignItems: 'center',
  },
  goalPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressSection: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    alignSelf: 'center',
  },
  completedText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
});