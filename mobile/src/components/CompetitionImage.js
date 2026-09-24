import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export default function CompetitionImage({ uri }) {
  return (
    <View style={styles.wrapper}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', height: 220, backgroundColor: colors.border },
  image: { width: '100%', height: '100%' },
});
