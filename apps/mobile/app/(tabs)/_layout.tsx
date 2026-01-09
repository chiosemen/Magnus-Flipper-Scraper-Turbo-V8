import { Tabs } from 'expo-router';

/**
 * Tabs Layout
 *
 * ROUTING STRUCTURE:
 * - index -> index.tsx (home)
 * - deals -> deals/index.tsx (list) and deals/[id].tsx (detail)
 * - monitors -> monitors/index.tsx (list) and monitors/create.tsx (form)
 * - account -> account.tsx (profile + logout)
 */

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          tabBarLabel: 'Deals',
        }}
      />
      <Tabs.Screen
        name="monitors"
        options={{
          title: 'Monitors',
          tabBarLabel: 'Monitors',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarLabel: 'Account',
        }}
      />
    </Tabs>
  );
}
