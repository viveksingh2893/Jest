import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';

export type TButton = {
  text: 'CONTINUE' | 'SUBMIT' | 'NEXT' | 'DONE';
  onPress: () => void;
};

export const Button = ({ text, onPress }: TButton) => (
  <TouchableOpacity style={styles.container} onPress={onPress}>
    <Text style={{ fontSize: 30 }}> {text} </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
