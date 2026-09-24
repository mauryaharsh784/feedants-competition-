import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CompetitionDetailsScreen from '../screens/CompetitionDetailsScreen';
import { DEMO_COMPETITION_ID } from '../constants/config';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="CompetitionDetails"
          component={CompetitionDetailsScreen}
          initialParams={{ competitionId: DEMO_COMPETITION_ID }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
