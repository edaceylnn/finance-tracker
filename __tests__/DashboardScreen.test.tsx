import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import DashboardScreen from '../src/screens/DashboardScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../src/services/api', () => ({
  getRecords: jest.fn().mockResolvedValue([]),
  processRecurringRecords: jest.fn().mockResolvedValue({}),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test', email: 'test@example.com' } }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('../src/services/widgetDataService', () => ({
  refreshWidgetData: jest.fn().mockResolvedValue(null),
}));

test('DashboardScreen renders without crashing', async () => {
  const nav = { navigate: jest.fn(), goBack: jest.fn() };
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<DashboardScreen navigation={nav} />);
  });
});
