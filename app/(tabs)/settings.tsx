import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings as SettingsIcon, Volume2, VolumeX, CircleHelp as HelpCircle, Info } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const SettingItem = ({ 
    title, 
    description, 
    value, 
    onToggle, 
    icon: Icon 
  }: {
    title: string;
    description: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    icon: any;
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Icon size={24} color="#4facfe" strokeWidth={1.5} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#4facfe' }}
        thumbColor={value ? 'white' : 'rgba(255, 255, 255, 0.8)'}
      />
    </View>
  );

  const SupportItem = ({ 
    title, 
    description, 
    onPress, 
    icon: Icon 
  }: {
    title: string;
    description: string;
    onPress: () => void;
    icon: any;
  }) => (
    <TouchableOpacity style={styles.supportItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <Icon size={24} color="#43e97b" strokeWidth={1.5} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#0f0c29', '#16213e', '#1a1a2e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <SettingsIcon size={32} color="#4facfe" strokeWidth={1.5} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Settings</Text>
              <Text style={styles.subtitle}>Customize your experience</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            <View style={styles.settingsContainer}>
              <SettingItem
                title="Sound Effects"
                description="Enable audio feedback and sounds"
                value={settings.soundEffects}
                onToggle={(value) => updateSetting('soundEffects', value)}
                icon={settings.soundEffects ? Volume2 : VolumeX}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <View style={styles.supportContainer}>
              <SupportItem
                title="About the App"
                description="Learn more about FluentMinds.ai"
                onPress={() => {}}
                icon={Info}
              />
              <SupportItem
                title="Help & Resources"
                description="Get help and find useful resources"
                onPress={() => {}}
                icon={HelpCircle}
              />
            </View>
          </View>

          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>About Speech Support</Text>
            <View style={styles.aboutContainer}>
              <Text style={styles.aboutText}>
                This app is designed to provide a safe, supportive environment for children to practice speech fluency through creative exercises and emotional support. Our approach focuses on building confidence and comfort rather than correction.
              </Text>
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
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  headerText: {
    marginLeft: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  settingsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  supportContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  aboutSection: {
    marginBottom: 40,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  aboutContainer: {
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.3)',
  },
  aboutText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
});