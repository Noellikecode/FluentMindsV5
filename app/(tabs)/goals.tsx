import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Animated as RNAnimated, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Trophy, Target, TrendingUp, Award, Check, Plus, Trash2, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useSharedValue, 
  withTiming,
  useAnimatedProps
} from 'react-native-reanimated';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import * as ReactNativeSvg from 'react-native-svg';
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
    { id: '1', title: 'Chat with AI friends', completed: false },
    { id: '2', title: 'Practice calm breathing', completed: false },
    { id: '3', title: 'Tell Creative Stories', completed: false },
    { id: '4', title: 'Complete a dialogue mode', completed: false },
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

  const [isNewGoalModalVisible, setIsNewGoalModalVisible] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const createNewGoal = async () => {
    setNewGoalTitle('');
    setIsNewGoalModalVisible(true);
  };

  const handleSaveNewGoal = async () => {
    if (newGoalTitle.trim()) {
      const newGoal: Goal = {
        id: Date.now().toString(),
        title: newGoalTitle.trim(),
        completed: false,
      };
      const updatedGoals = [...goals, newGoal];
      setGoals(updatedGoals);
      try {
        await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
      } catch (error) {
        console.error('Error saving new goal:', error);
      }
      setIsNewGoalModalVisible(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    setGoals(updatedGoals);
    try {
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
    } catch (error) {
      console.error('Error saving goals after deletion:', error);
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
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circum = radius * 2 * Math.PI;

    const AnimatedCircle = Animated.createAnimatedComponent(ReactNativeSvg.Circle);
    
    const animatedProps = useAnimatedProps(() => {
      const progress = progressValue.value / 100;
      return {
        strokeDashoffset: withTiming(circum * (1 - progress), { duration: 10 }),
      };
    });

    return (
      <View style={styles.progressContainer}>
        <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
          <ReactNativeSvg.Svg width={size} height={size}>
            <ReactNativeSvg.Circle
              stroke="rgba(255, 255, 255, 0.1)"
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            <AnimatedCircle
              stroke="#4facfe"
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circum} ${circum}`}
              animatedProps={animatedProps}
              strokeLinecap="round"
            />
          </ReactNativeSvg.Svg>
        </View>
        <View style={styles.progressInner}>
          <Text style={styles.progressText}>{`${Math.round(percentage)}%`}</Text>
        </View>
      </View>
    );
  };
  
  const StatCard = ({ icon: Icon, title, value, subtitle, colors }: any) => (
    <LinearGradient
      colors={colors}
      style={styles.statCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Icon size={24} color="white" strokeWidth={1.5} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </LinearGradient>
  );

  const GoalItem = ({ goal }: { goal: Goal }) => {
    const renderRightActions = (progress: any, dragX: any) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [0, 80],
        extrapolate: 'clamp',
      });
      return (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            swipeableRefs.current[goal.id]?.close();
            deleteGoal(goal.id);
          }}
        >
          <RNAnimated.View style={{ transform: [{ translateX: trans }] }}>
            <Trash2 size={24} color="white" />
          </RNAnimated.View>
        </TouchableOpacity>
      );
    };

    return (
      <Swipeable
        ref={(ref) => setSwipeableRef(goal.id, ref)}
        renderRightActions={renderRightActions}
        overshootRight={false}
      >
        <TouchableOpacity
          style={styles.goalItem}
          onPress={() => toggleGoal(goal.id)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.goalCheckbox,
            goal.completed && styles.goalCheckboxCompleted
          ]}>
            {goal.completed && <Check size={16} color="white" strokeWidth={2} />}
          </View>
          <Text style={[
            styles.goalText,
            goal.completed && styles.goalTextCompleted
          ]}>
            {goal.title}
          </Text>
          {goal.completed && (
            <Text style={styles.completedLabel}>Completed</Text>
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const GameModeCard = ({ title, count, color }: { title: string; count: number; color: string }) => (
    <View style={[styles.gameModeCard, { borderLeftColor: color }]}>
      <Text style={styles.gameModeCount}>{count}</Text>
      <Text style={styles.gameModeTitle}>{title}</Text>
    </View>
  );

  const completedGoals = goals.filter(goal => goal.completed).length;
  const totalGoals = goals.length;
  const progressPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0f0c29', '#16213e', '#1a1a2e']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Goals</Text>
              <Text style={styles.subtitle}>Track your progress and achievements</Text>
            </View>

            <CircularProgress percentage={progressPercentage} />

            <View style={styles.journeySection}>
              <Text style={styles.journeyTitle}>Your Journey</Text>
              <Text style={styles.journeyStats}>
                {completedGoals} of {goals.length} goals achieved
              </Text>
              <Text style={styles.journeyDetails}>
                {completedGoals} completed, {goals.length - completedGoals} in progress
              </Text>
            </View>

            <View style={styles.goalsSection}>
              <Text style={styles.sectionTitle}>Active Goals</Text>
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
                <Plus size={20} color="#4facfe" strokeWidth={2} />
                <View style={styles.createGoalText}>
                  <Text style={styles.createGoalTitle}>Create New Goal</Text>
                  <Text style={styles.createGoalSubtitle}>Set your next challenge</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                icon={Trophy}
                title="Total Sessions"
                value={stats.totalSessions}
                colors={['#667eea', '#764ba2']}
              />
              <StatCard
                icon={Clock}
                title="Time Practiced"
                value={`${stats.totalTimeSpent}m`}
                colors={['#f093fb', '#f5576c']}
              />
              <StatCard
                icon={Target}
                title="Current Streak"
                value={stats.currentStreak}
                subtitle="days"
                colors={['#4facfe', '#00f2fe']}
              />
              <StatCard
                icon={TrendingUp}
                title="This Week"
                value={stats.sessionsThisWeek}
                subtitle="sessions"
                colors={['#43e97b', '#38f9d7']}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Game Mode Progress</Text>
              <View style={styles.gameModesContainer}>
                <GameModeCard
                  title="Breath Breakers"
                  count={stats.breathBreakersCount}
                  color="#667eea"
                />
                <GameModeCard
                  title="Beat Bridge"
                  count={stats.beatBridgeCount}
                  color="#f093fb"
                />
                <GameModeCard
                  title="Dialogue Mode"
                  count={stats.dialogueModeCount}
                  color="#4facfe"
                />
                <GameModeCard
                  title="Storytelling"
                  count={stats.storytellingCount}
                  color="#43e97b"
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.achievementCard}>
                <Award size={32} color="#ffd700" strokeWidth={1.5} />
                <Text style={styles.achievementTitle}>Keep Going!</Text>
                <Text style={styles.achievementText}>
                  {stats.currentStreak > 0
                    ? `You're on a ${stats.currentStreak} day streak! 🔥`
                    : 'Start a new practice session to begin your streak!'}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={isNewGoalModalVisible}
          onRequestClose={() => setIsNewGoalModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Goal</Text>
                <TouchableOpacity
                  onPress={() => setIsNewGoalModalVisible(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter goal title"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
                autoFocus={true}
                onSubmitEditing={handleSaveNewGoal}
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveNewGoal}
              >
                <Text style={styles.saveButtonText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: '30%',
    },
    modalContent: {
      width: '85%',
      backgroundColor: '#1a1a2e',
      borderRadius: 20,
      padding: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    closeButton: {
      padding: 4,
    },
    input: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 10,
      padding: 15,
      color: '#ffffff',
      fontSize: 16,
      marginBottom: 20,
    },
    saveButton: {
      backgroundColor: '#4facfe',
      borderRadius: 10,
      padding: 15,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    safeArea: {
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
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: '#a0a0a0',
      textAlign: 'center',
    },
    progressContainer: {
      alignItems: 'center',
      marginBottom: 30,
      justifyContent: 'center',
      position: 'relative',
    },
    progressInner: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    journeySection: {
      alignItems: 'center',
      marginBottom: 40,
    },
    journeyTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: 8,
    },
    journeyStats: {
      fontSize: 18,
      color: '#4facfe',
      fontWeight: '600',
      marginBottom: 4,
    },
    journeyDetails: {
      fontSize: 14,
      color: '#a0a0a0',
    },
    goalsSection: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: 20,
    },
    goalsList: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 16,
      overflow: 'hidden',
    },
    goalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    goalCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      marginRight: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    goalCheckboxCompleted: {
      backgroundColor: '#43e97b',
      borderColor: '#43e97b',
    },
    goalText: {
      fontSize: 16,
      color: '#ffffff',
      flex: 1,
    },
    goalTextCompleted: {
      textDecorationLine: 'line-through',
      color: '#a0a0a0',
    },
    completedLabel: {
      fontSize: 12,
      color: '#43e97b',
      fontWeight: '600',
      backgroundColor: 'rgba(67, 233, 123, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    deleteButton: {
      backgroundColor: '#e74c3c',
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: '100%',
    },
    createGoalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(79, 172, 254, 0.1)',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(79, 172, 254, 0.3)',
      borderStyle: 'dashed',
      marginTop: 20,
    },
    createGoalText: {
      marginLeft: 15,
    },
    createGoalTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#4facfe',
      marginBottom: 2,
    },
    createGoalSubtitle: {
      fontSize: 14,
      color: 'rgba(79, 172, 254, 0.7)',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 30,
    },
    statCard: {
      width: '48%',
      height: 120,
      borderRadius: 16,
      padding: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
      marginTop: 8,
    },
    statTitle: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
      marginTop: 4,
    },
    statSubtitle: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.6)',
      textAlign: 'center',
    },
    section: {
      marginBottom: 30,
    },
    gameModesContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 16,
      padding: 20,
    },
    gameModeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderLeftWidth: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderRadius: 8,
      marginBottom: 10,
    },
    gameModeCount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#ffffff',
      marginRight: 15,
      minWidth: 30,
    },
    gameModeTitle: {
      fontSize: 16,
      color: '#a0a0a0',
      flex: 1,
    },
    achievementCard: {
      backgroundColor: 'rgba(255, 215, 0, 0.1)',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    achievementTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#ffd700',
      marginTop: 12,
      marginBottom: 8,
    },
    achievementText: {
      fontSize: 14,
      color: '#a0a0a0',
      textAlign: 'center',
      lineHeight: 20,
    },
  });