import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MessageCircle, Activity, BookOpen, Wind } from 'lucide-react-native';

const activitiesData = [
  {
    id: 'ai-conversations',
    title: 'AI Conversations',
    description: 'Engage in meaningful dialogue with intelligent companions',
    icon: MessageCircle,
    colors: ['#667eea', '#764ba2'],
    route: '/games/dialogue-mode',
  },
  {
    id: 'rhythm-speech',
    title: 'Rhythm & Speech',
    description: 'Express yourself through rhythm and vocal patterns',
    icon: Activity,
    colors: ['#f093fb', '#f5576c'],
    route: '/games/beat-bridge',
  },
  {
    id: 'creative-stories',
    title: 'Creative Stories',
    description: 'Craft immersive narratives and explore imagination',
    icon: BookOpen,
    colors: ['#4facfe', '#00f2fe'],
    route: '/games/storytelling',
  },
  {
    id: 'mindful-moments',
    title: 'Mindful Moments',
    description: 'Find balance through guided breathing and reflection',
    icon: Wind,
    colors: ['#43e97b', '#38f9d7'],
    route: '/games/breath-breakers',
  },
];

export default function ActivitiesPage() {
  const navigateToActivity = (route: string) => {
    router.push(route);
  };

  return (
    <LinearGradient
      colors={['#0f0c29', '#16213e', '#1a1a2e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Activities</Text>
            <Text style={styles.subtitle}>Choose your practice journey</Text>
          </View>

          <View style={styles.activitiesContainer}>
            {activitiesData.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityButton}
                onPress={() => navigateToActivity(activity.route)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={activity.colors}
                  style={styles.activityGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.activityContent}>
                    <activity.icon size={32} color="white" strokeWidth={1.5} />
                    <View style={styles.activityTextContainer}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  activitiesContainer: {
    paddingBottom: 20,
  },
  activityButton: {
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  activityGradient: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTextContainer: {
    flex: 1,
    marginLeft: 20,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
});