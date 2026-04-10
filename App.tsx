import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import DashboardScreen         from './src/screens/DashboardScreen';
import AnalysisScreen          from './src/screens/AnalysisScreen';
import AddExpenseScreen        from './src/screens/AddExpenseScreen';
import WalletScreen            from './src/screens/WalletScreen';
import ProfileScreen           from './src/screens/ProfileScreen';
import RecordDetailScreen      from './src/screens/RecordDetailScreen';
import RecurringRecordsScreen  from './src/screens/RecurringRecordsScreen';
import LoginScreen             from './src/screens/LoginScreen';
import RegisterScreen          from './src/screens/RegisterScreen';

const Tab       = createBottomTabNavigator();
const Stack     = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Stats: 'bar-chart',
  Wallet: 'trending-up',
  Profile: 'person',
};

function TabNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const name = TAB_ICONS[route.name] ?? 'ellipse';
          return <Ionicons name={name} size={size} color={color} />;
        },
        tabBarActiveTintColor:   theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor:  theme.surface,
          borderTopColor:   theme.border,
          paddingBottom: 8,
          paddingTop:    8,
          height:        64,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="Home"    component={DashboardScreen} options={{ tabBarLabel: 'Ana Sayfa' }} />
      <Tab.Screen name="Stats"   component={AnalysisScreen}  options={{ tabBarLabel: 'Analiz'    }} />
      <Tab.Screen name="Wallet"  component={WalletScreen}    options={{ tabBarLabel: 'Yatırım'   }} />
      <Tab.Screen name="Profile" component={ProfileScreen}   options={{ tabBarLabel: 'Profil'    }} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"              component={TabNavigator}            />
      <Stack.Screen name="AddExpense"        component={AddExpenseScreen}        options={{ presentation: 'modal' }} />
      <Stack.Screen name="RecordDetail"      component={RecordDetailScreen}      />
      <Stack.Screen name="RecurringRecords"  component={RecurringRecordsScreen}  />
    </Stack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login"    component={LoginScreen}    />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const { token, loading } = useAuth();
  const theme = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return token ? <MainNavigator /> : <AuthNavigator />;
}

function AppNavigationContainer() {
  const theme = useTheme();
  const navTheme = theme.dark
    ? { ...DarkTheme,    colors: { ...DarkTheme.colors,    background: theme.bg, card: theme.surface, border: theme.border, text: theme.text } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.bg, card: theme.surface, border: theme.border, text: theme.text } };

  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigationContainer />
      </AuthProvider>
    </ThemeProvider>
  );
}
