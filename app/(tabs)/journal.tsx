import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Plus, Calendar, Mic, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  timestamp: Date;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadJournalEntries();
  }, []);

  const loadJournalEntries = async () => {
    try {
      const entriesData = await AsyncStorage.getItem('journalEntries');
      if (entriesData) {
        const parsedEntries = JSON.parse(entriesData);
        setEntries(parsedEntries.sort((a: JournalEntry, b: JournalEntry) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  };

  const saveJournalEntry = async () => {
    if (newEntryTitle.trim() === '' || newEntryContent.trim() === '') return;

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      title: newEntryTitle.trim(),
      content: newEntryContent.trim(),
      date: new Date().toLocaleDateString(),
      timestamp: new Date(),
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);

    try {
      await AsyncStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
    } catch (error) {
      console.error('Error saving journal entry:', error);
    }

    setNewEntryTitle('');
    setNewEntryContent('');
    setIsModalVisible(false);
  };

  const toggleRecording = () => {
    // In a real implementation, this would handle speech-to-text
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate voice transcription
      setTimeout(() => {
        setNewEntryContent(prev => 
          prev + (prev ? ' ' : '') + 'This is a voice transcription of your thoughts...'
        );
        setIsRecording(false);
      }, 3000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const JournalEntryCard = ({ entry }: { entry: JournalEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryTitle}>{entry.title}</Text>
        <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
      </View>
      <Text style={styles.entryContent} numberOfLines={3}>
        {entry.content}
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#0f0c29', '#16213e', '#1a1a2e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BookOpen size={32} color="#4facfe" strokeWidth={1.5} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Voice Journal</Text>
            <Text style={styles.subtitle}>Capture your thoughts and emotions</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={24} color="white" strokeWidth={2} />
          <Text style={styles.addButtonText}>New Entry</Text>
        </TouchableOpacity>

        <ScrollView style={styles.entriesContainer} showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={48} color="rgba(255, 255, 255, 0.3)" strokeWidth={1} />
              <Text style={styles.emptyStateTitle}>No entries yet</Text>
              <Text style={styles.emptyStateText}>
                Start your journey by creating your first journal entry
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <JournalEntryCard key={entry.id} entry={entry} />
            ))
          )}
        </ScrollView>

        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <LinearGradient
            colors={['#0f0c29', '#16213e', '#1a1a2e']}
            style={styles.modalContainer}
          >
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Journal Entry</Text>
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Entry title..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newEntryTitle}
                  onChangeText={setNewEntryTitle}
                />

                <View style={styles.contentInputContainer}>
                  <TextInput
                    style={styles.contentInput}
                    placeholder="Share your thoughts..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={newEntryContent}
                    onChangeText={setNewEntryContent}
                    multiline
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
                    onPress={toggleRecording}
                  >
                    <Mic size={20} color="white" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveJournalEntry}
                  disabled={newEntryTitle.trim() === '' || newEntryContent.trim() === ''}
                >
                  <Text style={styles.saveButtonText}>Save Entry</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  headerText: {
    marginLeft: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4facfe',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 30,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  entriesContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },
  entryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  entryDate: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  entryContent: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
  },
  modalSafeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  titleInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: 'white',
    marginBottom: 20,
  },
  contentInputContainer: {
    flex: 1,
    position: 'relative',
  },
  contentInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    flex: 1,
    marginBottom: 20,
  },
  voiceButton: {
    position: 'absolute',
    bottom: 30,
    right: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#f5576c',
  },
  saveButton: {
    backgroundColor: '#4facfe',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});