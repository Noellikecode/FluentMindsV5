import { Tabs } from 'expo-router';
import { Activity, Target, BookOpen, Settings } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(5, 15, 25, 0.2)',
          backdropFilter: 'blur(30px)',
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(0, 255, 180, 0.08)',
          borderLeftWidth: 0.5,
          borderLeftColor: 'rgba(0, 255, 180, 0.08)',
          borderRightWidth: 0.5,
          borderRightColor: 'rgba(0, 255, 180, 0.08)',
          height: 85,
          paddingBottom: 15,
          paddingTop: 12,
          borderRadius: 42,
          marginHorizontal: 12,
          marginBottom: 28,
          elevation: 0,
          shadowColor: 'rgba(0, 180, 120, 0.4)',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 32,
          overflow: 'hidden',
        },
        tabBarBackground: () => (
          <BlurView
            intensity={120}
            tint="systemUltraThinMaterialDark"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(2, 12, 20, 0.85)',
            }}
          />
        ),
        tabBarActiveTintColor: '#00FFB4',
        tabBarInactiveTintColor: 'rgba(100, 140, 160, 0.45)',
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '300',
          letterSpacing: 1.2,
          marginTop: 4,
          fontFamily: 'System',
          textTransform: 'uppercase',
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Flow',
          tabBarIcon: ({ size, color, focused }) => (
            <Activity
              size={18}
              color={focused ? '#00FFB4' : color}
              strokeWidth={focused ? 1.2 : 0.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Targets',
          tabBarIcon: ({ size, color, focused }) => (
            <Target
              size={18}
              color={focused ? '#00FFB4' : color}
              strokeWidth={focused ? 1.2 : 0.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Mind',
          tabBarIcon: ({ size, color, focused }) => (
            <BookOpen
              size={18}
              color={focused ? '#00FFB4' : color}
              strokeWidth={focused ? 1.2 : 0.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Core',
          tabBarIcon: ({ size, color, focused }) => (
            <Settings
              size={18}
              color={focused ? '#00FFB4' : color}
              strokeWidth={focused ? 1.2 : 0.8}
            />
          ),
        }}
      />
    </Tabs>
  );
}