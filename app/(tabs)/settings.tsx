import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Settings as SettingsIcon, 
  Volume2, 
  VolumeX, 
  CircleHelp as HelpCircle, 
  Info,
  Bell,
  BellOff,
  Moon,
  Sun,
  Trash2,
  Download,
  Heart,
  Star,
  Shield,
  ChevronRight
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface AppSettings {
  soundEffects: boolean;
  notifications: boolean;
  darkMode: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    soundEffects: true,
    notifications: true,
    darkMode: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await AsyncStorage.getItem('appSettings');
      if (settingsData) {
        setSettings(JSON.parse(settingsData));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key: keyof AppSettings, value: boolean) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const clearUserData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your progress, sessions, and achievements. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['userSessions', 'userProgress', 'achievements']);
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data.');
            }
          }
        }
      ]
    );
  };

  const SettingCard = ({ 
    title, 
    description, 
    value, 
    onToggle, 
    icon: Icon,
    accentColor
  }: {
    title: string;
    description: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    icon: any;
    accentColor: string;
  }) => (
    <View style={styles.settingCard}>
      <View style={styles.settingCardContent}>
        <View style={[styles.settingIconContainer, { backgroundColor: accentColor }]}>
          <Icon size={18} color="white" strokeWidth={1.5} />
        </View>
        
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: 'rgba(148, 163, 184, 0.3)', true: accentColor }}
          thumbColor={value ? 'white' : '#f4f3f4'}
          style={styles.switch}
        />
      </View>
    </View>
  );

  const ActionCard = ({ 
    title, 
    description, 
    onPress, 
    icon: Icon,
    accentColor,
    destructive = false
  }: {
    title: string;
    description: string;
    onPress: () => void;
    icon: any;
    accentColor: string;
    destructive?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.actionCard, destructive && styles.actionCardDestructive]} 
      onPress={onPress} 
      activeOpacity={0.8}
    >
      <View style={styles.actionCardContent}>
        <View style={[styles.actionIconContainer, { backgroundColor: accentColor }]}>
          <Icon size={18} color="white" strokeWidth={1.5} />
        </View>
        
        <View style={styles.actionTextContainer}>
          <Text style={[styles.actionTitle, destructive && styles.destructiveText]}>
            {title}
          </Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
        
        <ChevronRight 
          size={16} 
          color={destructive ? '#EF4444' : 'rgba(148, 163, 184, 0.6)'} 
          strokeWidth={1.5} 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a2e', '#16213e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#00d4ff', '#0099cc']}
              style={styles.titleGradient}
            >
              <Text style={styles.title}>Settings</Text>
            </LinearGradient>
            <Text style={styles.subtitle}>customize your experience</Text>
            <View style={styles.decorativeLine} />
          </View>

          {/* App Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Preferences</Text>
            
            <SettingCard
              title="Sound Effects"
              description="Audio feedback and ambient sounds"
              value={settings.soundEffects}
              onToggle={(value) => updateSetting('soundEffects', value)}
              icon={settings.soundEffects ? Volume2 : VolumeX}
              accentColor="#00d4ff"
            />
            
            <SettingCard
              title="Notifications"
              description="Reminders and practice alerts"
              value={settings.notifications}
              onToggle={(value) => updateSetting('notifications', value)}
              icon={settings.notifications ? Bell : BellOff}
              accentColor="#8B5CF6"
            />
            
            <SettingCard
              title="Dark Mode"
              description="Easy on the eyes, always"
              value={settings.darkMode}
              onToggle={(value) => updateSetting('darkMode', value)}
              icon={settings.darkMode ? Moon : Sun}
              accentColor="#6366F1"
            />
          </View>

          {/* Support & Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support & Information</Text>
            
            <ActionCard
              title="About FluentMinds"
              description="Learn about our mission and approach"
              onPress={() => {}}
              icon={Info}
              accentColor="#00d4ff"
            />
            
            <ActionCard
              title="Help & Resources"
              description="Get support and find useful guides"
              onPress={() => {}}
              icon={HelpCircle}
              accentColor="#8B5CF6"
            />
            
            <ActionCard
              title="Rate Our App"
              description="Share your experience with others"
              onPress={() => {}}
              icon={Star}
              accentColor="#F59E0B"
            />
          </View>

          {/* Data Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Management</Text>
            
            <ActionCard
              title="Export Progress"
              description="Download your practice data and progress"
              onPress={() => {}}
              icon={Download}
              accentColor="#10B981"
            />
            
            <ActionCard
              title="Privacy Policy"
              description="How we protect your information"
              onPress={() => {}}
              icon={Shield}
              accentColor="#6366F1"
            />
            
            <ActionCard
              title="Clear All Data"
              description="Permanently delete all progress and sessions"
              onPress={clearUserData}
              icon={Trash2}
              accentColor="#EF4444"
              destructive={true}
            />
          </View>

          {/* About Section */}
          <View style={styles.aboutSection}>
            <View style={styles.aboutCard}>
              <View style={styles.aboutHeader}>
                <View style={styles.aboutIcon}>
                  <Heart size={18} color="#00d4ff" strokeWidth={1.5} />
                </View>
                <Text style={styles.aboutTitle}>About Speech Support</Text>
              </View>
              
              <Text style={styles.aboutText}>
                FluentMinds creates a safe, nurturing environment for children to develop speech confidence through creative exercises and emotional support. Our approach emphasizes building comfort and self-expression rather than correction.
              </Text>
              
              <View style={styles.aboutFooter}>
                <Text style={styles.aboutFooterText}>Made with ❤️ for confident communication</Text>
              </View>
            </View>
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
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 40,
  },
  titleGradient: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#0B1426',
    letterSpacing: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    marginBottom: 16,
  },
  decorativeLine: {
    width: 60,
    height: 2,
    backgroundColor: '#00d4ff',
    borderRadius: 1,
    opacity: 0.8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  settingCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  settingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    opacity: 0.95,
  },
  settingDescription: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.8)',
    lineHeight: 18,
  },
  switch: {
    marginLeft: 12,
    transform: [{ scale: 0.9 }],
  },
  actionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  actionCardDestructive: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    opacity: 0.95,
  },
  actionDescription: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.8)',
    lineHeight: 18,
  },
  destructiveText: {
    color: '#EF4444',
  },
  aboutSection: {
    marginBottom: 40,
  },
  aboutCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: 20,
    padding: 24,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.95,
  },
  aboutText: {
    fontSize: 15,
    color: 'rgba(203, 213, 225, 0.85)',
    lineHeight: 22,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  aboutFooter: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 212, 255, 0.1)',
  },
  aboutFooterText: {
    fontSize: 13,
    color: 'rgba(0, 212, 255, 0.8)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});