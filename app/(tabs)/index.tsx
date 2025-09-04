import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Wind, Activity, MessageCircle, BookOpen } from 'lucide-react-native';

const gameModesData = [
  {
    id: 'breath-breakers',
    title: 'Breath Breakers',
    subtitle: 'Master breathing techniques',
    icon: Wind,
    colors: ['#667eea', '#764ba2'],
    route: '/games/breath-breakers',
  },
  {
    id: 'beat-bridge',
    title: 'Beat Bridge',
    subtitle: 'Improve speech rhythm',
    icon: Activity,
    colors: ['#f093fb', '#f5576c'],
    route: '/games/beat-bridge',
  },
  {
    id: 'dialogue-mode',
    title: 'Dialogue Mode',
    subtitle: 'Practice conversations',
    icon: MessageCircle,
    colors: ['#4facfe', '#00f2fe'],
    route: '/games/dialogue-mode',
  },
  {
    id: 'storytelling',
    title: 'Storytelling',
    subtitle: 'Express your thoughts',
    icon: BookOpen,
    colors: ['#43e97b', '#38f9d7'],
    route: '/games/storytelling',
  },
];

export default function MainPage() {
  const navigateToGame = (route: string) => {
    router.push(route);
  };

  return (
    <LinearGradient
      colors={['#0f0c29', '#16213e', '#1a1a2e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>FluentMinds.ai</Text>
          <Text style={styles.subtitle}>Choose your practice mode</Text>
        </View>

        <View style={styles.gameGrid}>
          {gameModesData.map((mode, index) => (
            <TouchableOpacity
              key={mode.id}
              style={[styles.gameButton, { marginTop: index < 2 ? 0 : 20 }]}
              onPress={() => navigateToGame(mode.route)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={mode.colors}
                style={styles.gameButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <mode.icon size={32} color="white" strokeWidth={1.5} />
                <Text style={styles.gameButtonTitle}>{mode.title}</Text>
                <Text style={styles.gameButtonSubtitle}>{mode.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Start your journey to better speech fluency
          </Text>
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
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
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
  gameGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gameButton: {
    width: '48%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gameButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 12,
  },
  gameButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
  },
});