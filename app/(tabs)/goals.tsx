import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Animated as RNAnimated, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Calendar, Clock, Trophy, Target, TrendingUp, Award, Check, Plus, Zap, Brain, Pen, Atom } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useSharedValue, 
  withTiming,
  useAnimatedProps,
  useAnimatedStyle
} from 'react-native-reanimated';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';

interface SessionData {
  date: string;
  gameMode: string;
  duration: number;
  completed: boolean;
}

interface UserStats {
  totalSessions: number;
  totalTimeSpent: number;
  currentStreak: number;
  sessionsThisWeek: number;
  breathBreakersCount: number;
  beatBridgeCount: number;
  dialogueModeCount: number;
  storytellingCount: number;
}

interface Goal {
  id: string;
  title: string;
  completed: boolean;
}

export default function GoalsPage() {
  const [stats, setStats] = useState<UserStats>({
    totalSessions: 0,
    totalTimeSpent: 0,
    currentStreak: 0,
    sessionsThisWeek: 0,
    breathBreakersCount: 0,
    beatBridgeCount: 0,
    dialogueModeCount: 0,
    storytellingCount: 0,
  });
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', title: 'chat with ai friends', completed: false },
    { id: '2', title: 'practice calm breathing', completed: false },
    { id: '3', title: 'tell creative stories', completed: false },
    { id: '4', title: 'complete a dialogue mode', completed: false },
  ]);

  const progressValue = useSharedValue(0);
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  
  const setSwipeableRef = useCallback((id: string, ref: Swipeable | null) => {
    if (ref) {
      swipeableRefs.current[id] = ref;
    }
  }, []);

  useEffect(() => {
    loadUserStats();
    loadGoals();
  }, []);

  useEffect(() => {
    const completedGoals = goals.filter(goal => goal.completed).length;
    const totalGoals = goals.length;
    const progressPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
    progressValue.value = withTiming(progressPercentage, { duration: 1000 });
  }, [goals]);

  const loadUserStats = async () => {
    try {
      const sessionsData = await AsyncStorage.getItem('userSessions');
      if (sessionsData) {
        const sessions: SessionData[] = JSON.parse(sessionsData);
        calculateStats(sessions);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const goalsData = await AsyncStorage.getItem('userGoals');
      if (goalsData) {
        setGoals(JSON.parse(goalsData));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const toggleGoal = async (goalId: string) => {
    const updatedGoals = goals.map(goal =>
      goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
    );
    setGoals(updatedGoals);
    
    try {
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const createNewGoal = async () => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: 'new practice goal',
      completed: false,
    };
    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    try {
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
    } catch (error) {
      console.error('Error saving goals after creation:', error);
    }
  };

  const calculateStats = (sessions: SessionData[]) => {
    const totalSessions = sessions.length;
    const totalTimeSpent = sessions.reduce((total, session) => total + session.duration, 0);
    
    const sortedSessions = sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let currentStreak = 0;
    let currentDate = new Date();
    
    for (const session of sortedSessions) {
      const sessionDate = new Date(session.date);
      const diffTime = currentDate.getTime() - sessionDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        currentStreak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sessionsThisWeek = sessions.filter(session => 
      new Date(session.date) > oneWeekAgo
    ).length;

    const breathBreakersCount = sessions.filter(s => s.gameMode === 'breath-breakers').length;
    const beatBridgeCount = sessions.filter(s => s.gameMode === 'beat-bridge').length;
    const dialogueModeCount = sessions.filter(s => s.gameMode === 'dialogue-mode').length;
    const storytellingCount = sessions.filter(s => s.gameMode === 'storytelling').length;

    setStats({
      totalSessions,
      totalTimeSpent: Math.round(totalTimeSpent / 60),
      currentStreak,
      sessionsThisWeek,
      breathBreakersCount,
      beatBridgeCount,
      dialogueModeCount,
      storytellingCount,
    });
  };

  const CircularProgress = ({ percentage }: { percentage: number }) => {
    const animatedStyle = useAnimatedStyle(() => {
      const rotation = (progressValue.value / 100) * 360;
      return {
        transform: [{ rotate: `${rotation}deg` }],
      };
    });

    return (
      <View style={styles.progressContainer}>
        <BlurView intensity={80} tint="dark" style={styles.progressCircle}>
          <LinearGradient
            colors={['#8B5CF6', '#A855F7']}
            style={styles.progressFill}
          />
          <Animated.View style={[styles.progressRing, animatedStyle]} />
          <View style={styles.progressInner}>
            <Text style={styles.progressText}>{Math.round(percentage)}%</Text>
            <Text style={styles.progressLabel}>complete</Text>
          </View>
        </BlurView>
      </View>
    );
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, gradient }: any) => (
    <TouchableOpacity style={styles.statCard} activeOpacity={0.9}>
      <BlurView intensity={80} tint="dark" style={styles.statGlass}>
        <LinearGradient
          colors={[`${gradient[0]}40`, `${gradient[1]}20`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statGradientOverlay}
        />
        <LinearGradient
          colors={gradient}
          style={styles.statAccentBorder}
        />
        <View style={styles.statIconContainer}>
          <LinearGradient
            colors={gradient}
            style={styles.statIconGradient}
          >
            <Icon size={22} color="#FFFFFF" strokeWidth={1.8} />
          </LinearGradient>
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </BlurView>
    </TouchableOpacity>
  );

  const GoalItem = ({ goal }: { goal: Goal }) => (
    <TouchableOpacity
      style={styles.goalItem}
      onPress={() => toggleGoal(goal.id)}
      activeOpacity={0.8}
    >
      <BlurView intensity={60} tint="dark" style={styles.goalGlass}>
        <LinearGradient
          colors={goal.completed ? ['#06FFA5', '#4ECDC4'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
          style={styles.goalAccent}
        />
        <View style={styles.goalContent}>
          <View style={[
            styles.goalCheckbox,
            goal.completed && styles.goalCheckboxCompleted
          ]}>
            {goal.completed && <Check size={16} color="white" strokeWidth={2.5} />}
          </View>
          <Text style={[
            styles.goalText,
            goal.completed && styles.goalTextCompleted
          ]}>
            {goal.title}
          </Text>
          {goal.completed && (
            <LinearGradient
              colors={['#06FFA5', '#4ECDC4']}
              style={styles.completedBadge}
            >
              <Text style={styles.completedLabel}>done</Text>
            </LinearGradient>
          )}
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const GameModeCard = ({ title, count, gradient, icon: Icon }: { title: string; count: number; gradient: string[]; icon: any }) => (
    <TouchableOpacity style={styles.gameModeCard} activeOpacity={0.9}>
      <BlurView intensity={60} tint="dark" style={styles.gameModeGlass}>
        <LinearGradient
          colors={[`${gradient[0]}30`, `${gradient[1]}15`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gameModeOverlay}
        />
        <LinearGradient
          colors={gradient}
          style={styles.gameModeAccent}
        />
        <View style={styles.gameModeContent}>
          <View style={styles.gameModeIconContainer}>
            <LinearGradient
              colors={gradient}
              style={styles.gameModeIconGradient}
            >
              <Icon size={20} color="#FFFFFF" strokeWidth={1.8} />
            </LinearGradient>
          </View>
          <View style={styles.gameModeTextContainer}>
            <Text style={styles.gameModeCount}>{count}</Text>
            <Text style={styles.gameModeTitle}>{title}</Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const completedGoals = goals.filter(goal => goal.completed).length;
  const totalGoals = goals.length;
  const progressPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0B1426', '#1E293B', '#0F172A']}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <LinearGradient
              colors={['#E8F4FD', '#CBD5E1', '#E8F4FD']}
              style={styles.titleGradient}
            >
              <Text style={styles.title}>TARGETS</Text>
            </LinearGradient>
            <Text style={styles.subtitle}>track progress and achievements</Text>
            <View style={styles.decorativeLine} />
          </View>

          <CircularProgress percentage={progressPercentage} />

          <View style={styles.journeySection}>
            <Text style={styles.journeyTitle}>Neural Progress</Text>
            <Text style={styles.journeyStats}>
              {completedGoals} of {goals.length} targets achieved
            </Text>
            <Text style={styles.journeyDetails}>
              {completedGoals} completed, {goals.length - completedGoals} in progress
            </Text>
          </View>

          <View style={styles.goalsSection}>
            <Text style={styles.sectionTitle}>Active Targets</Text>
            <View style={styles.goalsList}>
              {goals.map((goal) => (
                <GoalItem key={goal.id} goal={goal} />
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.createGoalButton}
              onPress={createNewGoal}
              activeOpacity={0.8}
            >
              <BlurView intensity={60} tint="dark" style={styles.createGoalGlass}>
                <LinearGradient
                  colors={['#8B5CF630', '#A855F715']}
                  style={styles.createGoalOverlay}
                />
                <View style={styles.createGoalContent}>
                  <View style={styles.createGoalIcon}>
                    <Plus size={20} color="#8B5CF6" strokeWidth={2} />
                  </View>
                  <View style={styles.createGoalText}>
                    <Text style={styles.createGoalTitle}>create new target</Text>
                    <Text style={styles.createGoalSubtitle}>set your next challenge</Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon={Trophy}
              title="total sessions"
              value={stats.totalSessions}
              gradient={['#8B5CF6', '#A855F7']}
            />
            <StatCard
              icon={Clock}
              title="time practiced"
              value={`${stats.totalTimeSpent}m`}
              gradient={['#6366F1', '#8B5CF6']}
            />
            <StatCard
              icon={Target}
              title="current streak"
              value={stats.currentStreak}
              subtitle="days"
              gradient={['#A855F7', '#EC4899']}
            />
            <StatCard
              icon={TrendingUp}
              title="this week"
              value={stats.sessionsThisWeek}
              subtitle="sessions"
              gradient={['#7C3AED', '#6366F1']}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flow Mode Progress</Text>
            <View style={styles.gameModesContainer}>
              <GameModeCard
                title="quantum breath"
                count={stats.breathBreakersCount}
                gradient={['#7C3AED', '#6366F1']}
                icon={Atom}
              />
              <GameModeCard
                title="flow state"
                count={stats.beatBridgeCount}
                gradient={['#6366F1', '#8B5CF6']}
                icon={Zap}
              />
              <GameModeCard
                title="neural sync"
                count={stats.dialogueModeCount}
                gradient={['#8B5CF6', '#A855F7']}
                icon={Brain}
              />
              <GameModeCard
                title="reality forge"
                count={stats.storytellingCount}
                gradient={['#A855F7', '#EC4899']}
                icon={Pen}
              />
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.achievementCard} activeOpacity={0.9}>
              <BlurView intensity={80} tint="dark" style={styles.achievementGlass}>
                <LinearGradient
                  colors={['#FFD70030', '#FFA50015']}
                  style={styles.achievementOverlay}
                />
                <View style={styles.achievementIconContainer}>
                  <Award size={36} color="#FFD700" strokeWidth={1.5} />
                </View>
                <Text style={styles.achievementTitle}>Neural Achievement</Text>
                <Text style={styles.achievementText}>
                  {stats.currentStreak > 0
                    ? `maintaining ${stats.currentStreak} day flow streak 🔥`
                    : 'initiate practice session to begin flow sequence'}
                </Text>
              </BlurView>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
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
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 56,
  },
  titleGradient: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '300',
    color: '#0B1426',
    letterSpacing: 12,
    fontFamily: 'System',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    fontFamily: 'System',
    marginBottom: 16,
  },
  decorativeLine: {
    width: 60,
    height: 2,
    backgroundColor: '#8B5CF6',
    borderRadius: 1,
    opacity: 0.6,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  progressCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  progressRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: '#8B5CF6',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  progressInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'lowercase',
    marginTop: 4,
  },
  journeySection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  journeyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  journeyStats: {
    fontSize: 18,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 8,
  },
  journeyDetails: {
    fontSize: 14,
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  goalsSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  goalsList: {
    marginBottom: 24,
    gap: 16,
  },
  goalItem: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  goalGlass: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  goalAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  goalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  goalCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalCheckboxCompleted: {
    backgroundColor: '#06FFA5',
    borderColor: '#06FFA5',
  },
  goalText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.4,
    textTransform: 'lowercase',
  },
  goalTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  completedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  createGoalButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  createGoalGlass: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'hidden',
  },
  createGoalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },
  createGoalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  createGoalIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  createGoalText: {
    flex: 1,
  },
  createGoalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 4,
    letterSpacing: 0.4,
    textTransform: 'lowercase',
  },
  createGoalSubtitle: {
    fontSize: 14,
    color: 'rgba(139, 92, 246, 0.7)',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 16,
  },
  statCard: {
    width: '47%',
    height: 120,
    borderRadius: 24,
    overflow: 'hidden',
  },
  statGlass: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  statGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  statAccentBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  statIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 24,
    marginLeft: 20,
  },
  statTitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 20,
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  statSubtitle: {
    fontSize: 10,
    color: 'rgba(148, 163, 184, 0.7)',
    marginLeft: 20,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  section: {
    marginBottom: 40,
  },
  gameModesContainer: {
    gap: 16,
  },
  gameModeCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gameModeGlass: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  gameModeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  gameModeAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  gameModeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  gameModeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginRight: 20,
    overflow: 'hidden',
  },
  gameModeIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameModeTextContainer: {
    flex: 1,
  },
  gameModeCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  gameModeTitle: {
    fontSize: 14,
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  achievementCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  achievementGlass: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  achievementOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  achievementIconContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  achievementTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  achievementText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
});