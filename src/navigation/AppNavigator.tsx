import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { RoofPlannerScreen } from '../screens/RoofPlannerScreen';
import { SystemBuilderScreen } from '../screens/SystemBuilderScreen';
import { OrderTrackerScreen } from '../screens/OrderTrackerScreen';
import { ELearningScreen } from '../screens/ELearningScreen';
import { CartScreen } from '../screens/CartScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="RoofPlanner" component={RoofPlannerScreen} />
      <Stack.Screen name="SystemBuilder" component={SystemBuilderScreen} />
      <Stack.Screen name="OrderTracker" component={OrderTrackerScreen} />
      <Stack.Screen name="ELearning" component={ELearningScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
    </Stack.Navigator>
  );
};

