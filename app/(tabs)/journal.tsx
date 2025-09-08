import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BookOpen, Plus, Calendar, Mic, X, Pen, Heart, Star } from 'lucide-react-native';
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
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setNewEntryContent(prev => 
          prev + (prev ? ' ' : '') + 'neural patterns processing voice input...'
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
    <TouchableOpacity style={styles.entryCard} activeOpacity={0.9}>
      <BlurView intensity={80} tint="dark" style={styles.entryGlass}>
        <LinearGradient
          colors={['#8B5CF630', '#A855F715']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.entryOverlay}
        />
        <LinearGradient
          colors={['#8B5CF6', '#A855F7']}
          style={styles.entryAccent}
        />
        <View style={styles.entryContent}>
          <View style={styles.entryHeader}>
            <View style={styles.entryIconContainer}>
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.entryIconGradient}
              >
                <Pen size={18} color="#FFFFFF" strokeWidth={1.8} />
              </LinearGradient>
            </View>
            <View style={styles.entryHeaderText}>
              <Text style={styles.entryTitle}>{entry.title}</Text>
              <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
            </View>
            <View style={styles.entryStatusContainer}>
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.entryStatusDot}
              />
            </View>
          </View>
          <Text style={styles.entryPreview} numberOfLines={3}>
            {entry.content}
          </Text>
          <View style={styles.entryFooter}>
            <Text style={styles.entryWordCount}>
              {entry.content.split(' ').length} words
            </Text>
            <View style={styles.entryMoodIndicator}>
              <Heart size={14} color="#EC4899" strokeWidth={1.5} />
            </View>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0B1426', '#1E293B', '#0F172A']}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <LinearGradient
              colors={['#E8F4FD', '#CBD5E1', '#E8F4FD']}
              style={styles.titleGradient}
            >
              <Text style={styles.title}>MIND</Text>
            </LinearGradient>
            <Text style={styles.subtitle}>capture neural patterns and thoughts</Text>
            <View style={styles.decorativeLine} />
          </View>

          <View style={styles.statsSection}>
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statCard} activeOpacity={0.9}>
                <BlurView intensity={60} tint="dark" style={styles.statGlass}>
                  <LinearGradient
                    colors={['#8B5CF630', '#A855F715']}
                    style={styles.statOverlay}
                  />
                  <View style={styles.statContent}>
                    <View style={styles.statIconContainer}>
                      <LinearGradient
                        colors={['#8B5CF6', '#A855F7']}
                        style={styles.statIconGradient}
                      >
                        <BookOpen size={20} color="#FFFFFF" strokeWidth={1.8} />
                      </LinearGradient>
                    </View>
                    <Text style={styles.statValue}>{entries.length}</Text>
                    <Text style={styles.statLabel}>total entries</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statCard} activeOpacity={0.9}>
                <BlurView intensity={60} tint="dark" style={styles.statGlass}>
                  <LinearGradient
                    colors={['#6366F130', '#8B5CF615']}
                    style={styles.statOverlay}
                  />
                  <View style={styles.statContent}>
                    <View style={styles.statIconContainer}>
                      <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        style={styles.statIconGradient}
                      >
                        <Calendar size={20} color="#FFFFFF" strokeWidth={1.8} />
                      </LinearGradient>
                    </View>
                    <Text style={styles.statValue}>
                      {entries.filter(e => 
                        new Date(e.timestamp).toDateString() === new Date().toDateString()
                      ).length}
                    </Text>
                    <Text style={styles.statLabel}>today</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.85}
          >
            <BlurView intensity={80} tint="dark" style={styles.addButtonGlass}>
              <LinearGradient
                colors={['#8B5CF640', '#A855F720']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addButtonOverlay}
              />
              <View style={styles.addButtonContent}>
                <View style={styles.addButtonIconContainer}>
                  <LinearGradient
                    colors={['#8B5CF6', '#A855F7']}
                    style={styles.addButtonIconGradient}
                  >
                    <Plus size={24} color="#FFFFFF" strokeWidth={2} />
                  </LinearGradient>
                </View>
                <View style={styles.addButtonText}>
                  <Text style={styles.addButtonTitle}>create neural entry</Text>
                  <Text style={styles.addButtonSubtitle}>capture your consciousness flow</Text>
                </View>
              </View>
            </BlurView>
          </TouchableOpacity>

          <View style={styles.entriesSection}>
            <Text style={styles.sectionTitle}>Mind Patterns</Text>
            {entries.length === 0 ? (
              <View style={styles.emptyState}>
                <BlurView intensity={40} tint="dark" style={styles.emptyStateGlass}>
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.05)']}
                    style={styles.emptyStateOverlay}
                  />
                  <View style={styles.emptyStateContent}>
                    <View style={styles.emptyStateIconContainer}>
                      <BookOpen size={48} color="rgba(139, 92, 246, 0.5)" strokeWidth={1} />
                    </View>
                    <Text style={styles.emptyStateTitle}>neural patterns not detected</Text>
                    <Text style={styles.emptyStateText}>
                      initiate consciousness recording to begin mind mapping
                    </Text>
                  </View>
                </BlurView>
              </View>
            ) : (
              <View style={styles.entriesList}>
                {entries.map((entry) => (
                  <JournalEntryCard key={entry.id} entry={entry} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#0B1426', '#1E293B', '#0F172A']}
              style={styles.modalBackground}
            />
            <SafeAreaView style={styles.modalSafeArea}>
              <BlurView intensity={100} tint="dark" style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <LinearGradient
                    colors={['#8B5CF6', '#A855F7']}
                    style={styles.modalTitleContainer}
                  >
                    <Text style={styles.modalTitle}>neural entry</Text>
                  </LinearGradient>
                  <TouchableOpacity
                    onPress={() => setIsModalVisible(false)}
                    style={styles.closeButton}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={60} tint="dark" style={styles.closeButtonGlass}>
                      <X size={20} color="#FFFFFF" strokeWidth={2} />
                    </BlurView>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputSection}>
                  <View style={styles.inputContainer}>
                    <BlurView intensity={40} tint="dark" style={styles.inputGlass}>
                      <TextInput
                        style={styles.titleInput}
                        placeholder="consciousness pattern title..."
                        placeholderTextColor="rgba(203, 213, 225, 0.5)"
                        value={newEntryTitle}
                        onChangeText={setNewEntryTitle}
                      />
                    </BlurView>
                  </View>

                  <View style={styles.contentInputContainer}>
                    <BlurView intensity={40} tint="dark" style={styles.contentInputGlass}>
                      <TextInput
                        style={styles.contentInput}
                        placeholder="stream neural patterns and consciousness flow..."
                        placeholderTextColor="rgba(203, 213, 225, 0.5)"
                        value={newEntryContent}
                        onChangeText={setNewEntryContent}
                        multiline
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
                        onPress={toggleRecording}
                        activeOpacity={0.8}
                      >
                        <BlurView intensity={80} tint="dark" style={styles.voiceButtonGlass}>
                          <LinearGradient
                            colors={isRecording ? ['#EF4444', '#DC2626'] : ['#8B5CF6', '#A855F7']}
                            style={styles.voiceButtonGradient}
                          >
                            <Mic size={18} color="#FFFFFF" strokeWidth={2} />
                          </LinearGradient>
                        </BlurView>
                      </TouchableOpacity>
                    </BlurView>
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveJournalEntry}
                    disabled={newEntryTitle.trim() === '' || newEntryContent.trim() === ''}
                    activeOpacity={0.85}
                  >
                    <BlurView intensity={80} tint="dark" style={styles.saveButtonGlass}>
                      <LinearGradient
                        colors={['#8B5CF6', '#A855F7']}
                        style={styles.saveButtonGradient}
                      >
                        <Text style={styles.saveButtonText}>archive neural pattern</Text>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 56,
  },
  titleGradient: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '300',
    color: '#0B1426',
    letterSpacing: 12,
    fontFamily: 'System',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    fontFamily: 'System',
    marginBottom: 16,
  },
  decorativeLine: {
    width: 60,
    height: 2,
    backgroundColor: '#8B5CF6',
    borderRadius: 1,
    opacity: 0.6,
  },
  statsSection: {
    marginBottom: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statGlass: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    position: 'relative',
  },
  statOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  statContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  statIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  addButton: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 40,
    elevation: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  addButtonGlass: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    position: 'relative',
  },
  addButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  addButtonIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginRight: 24,
    overflow: 'hidden',
  },
  addButtonIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    flex: 1,
  },
  addButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  addButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(203, 213, 225, 0.8)',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  entriesSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  entriesList: {
    gap: 20,
  },
  entryCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  entryGlass: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    position: 'relative',
  },
  entryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  entryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  entryContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  entryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
  },
  entryIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryHeaderText: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  entryDate: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  entryStatusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  entryPreview: {
    fontSize: 14,
    color: 'rgba(203, 213, 225, 0.85)',
    lineHeight: 20,
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryWordCount: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.7)',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  entryMoodIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyStateGlass: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    position: 'relative',
  },
  emptyStateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emptyStateContent: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateIconContainer: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(148, 163, 184, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  modalContainer: {
    flex: 1,
    position: 'relative',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    margin: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  modalTitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#0B1426',
    letterSpacing: 4,
    textTransform: 'lowercase',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  closeButtonGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleInput: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  contentInputContainer: {
    flex: 1,
    position: 'relative',
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  contentInputGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  contentInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingRight: 70,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400',
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  voiceButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  voiceButtonActive: {
    transform: [{ scale: 1.1 }],
  },
  voiceButtonGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  voiceButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonGlass: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
});