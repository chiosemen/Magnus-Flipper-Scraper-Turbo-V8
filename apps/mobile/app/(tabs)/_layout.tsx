import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="monitors"
        options={{
          title: 'Monitors',
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
