import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const DateInputExample = () => {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // iOS keeps picker open
    if (selectedDate) {
      setDateOfBirth(selectedDate.toISOString().split('T')[0]); // YYYY-MM-DD
    }
  };

  return (
    <View style={{ margin: 20 }}>
      <Text style={{ marginBottom: 8 }}>Date of Birth</Text>
      <TouchableOpacity
        style={styles.dateInput}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: dateOfBirth ? '#000' : '#999' }}>
          {dateOfBirth || 'Select Date'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dateInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

export default DateInputExample;
