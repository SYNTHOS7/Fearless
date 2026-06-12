import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import GraphsScreen from '../screens/GraphsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0A0A0F' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#0A0A0F', borderTopColor: '#222' },
        tabBarActiveTintColor: '#FF453A',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'History') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Graphs') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Feedback') iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Graphs" component={GraphsScreen} />
      <Tab.Screen name="Feedback" component={FeedbackScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  // Logic to determine if onboarding is needed would go here.
  // For simplicity, we just stack it.
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
