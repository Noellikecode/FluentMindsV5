import { Stack } from 'expo-router/stack';

export default function GamesLayout() {
  return (
    <Stack>
      <Stack.Screen name="breath-breakers" options={{ headerShown: false }} />
      <Stack.Screen name="beat-bridge" options={{ headerShown: false }} />
      <Stack.Screen name="dialogue-mode" options={{ headerShown: false }} />
      <Stack.Screen name="storytelling" options={{ headerShown: false }} />
    </Stack>
  );
}