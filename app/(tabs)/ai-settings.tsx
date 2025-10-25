import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AISettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // AI feature toggles (in production, these would be stored in Firestore user preferences)
  const [aiEnabled, setAiEnabled] = useState(true);
  const [threadSummaries, setThreadSummaries] = useState(true);
  const [actionItems, setActionItems] = useState(true);
  const [priorityDetection, setPriorityDetection] = useState(true);
  const [smartSearch, setSmartSearch] = useState(true);
  const [decisionTracking, setDecisionTracking] = useState(true);
  const [schedulingAssistant, setSchedulingAssistant] = useState(true);

  const handleMasterToggle = (value: boolean) => {
    setAiEnabled(value);
    if (!value) {
      // Disable all features when master switch is off
      setThreadSummaries(false);
      setActionItems(false);
      setPriorityDetection(false);
      setSmartSearch(false);
      setDecisionTracking(false);
      setSchedulingAssistant(false);
    } else {
      // Enable all features when master switch is on
      setThreadSummaries(true);
      setActionItems(true);
      setPriorityDetection(true);
      setSmartSearch(true);
      setDecisionTracking(true);
      setSchedulingAssistant(true);
    }
  };

  const handleSave = () => {
    // In production: save to Firestore user preferences
    Alert.alert('Settings Saved', 'Your AI preferences have been updated.');
  };

  const renderFeatureToggle = (
    title: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={24} color={value ? '#007AFF' : '#999'} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={!aiEnabled}
        trackColor={{ false: '#E0E0E0', true: '#007AFF40' }}
        thumbColor={value ? '#007AFF' : '#F4F4F4'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="sparkles" size={48} color="#007AFF" />
        <Text style={styles.headerTitle}>AI Features</Text>
        <Text style={styles.headerSubtitle}>
          Enhance your team collaboration with AI-powered productivity tools
        </Text>
      </View>

      {/* Master Toggle */}
      <View style={styles.section}>
        <View style={styles.masterToggle}>
          <View style={styles.masterToggleContent}>
            <Text style={styles.masterToggleTitle}>Enable AI Features</Text>
            <Text style={styles.masterToggleDescription}>
              Turn off to disable all AI features
            </Text>
          </View>
          <Switch
            value={aiEnabled}
            onValueChange={handleMasterToggle}
            trackColor={{ false: '#E0E0E0', true: '#007AFF40' }}
            thumbColor={aiEnabled ? '#007AFF' : '#F4F4F4'}
          />
        </View>
      </View>

      {/* Individual Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Individual Features</Text>

        {renderFeatureToggle(
          'Thread Summarization',
          'AI-powered summaries of long thread conversations',
          threadSummaries,
          setThreadSummaries,
          'document-text-outline'
        )}

        {renderFeatureToggle(
          'Action Item Extraction',
          'Automatically detect tasks from messages',
          actionItems,
          setActionItems,
          'checkbox-outline'
        )}

        {renderFeatureToggle(
          'Priority Detection',
          'Auto-flag high priority messages',
          priorityDetection,
          setPriorityDetection,
          'alert-circle-outline'
        )}

        {renderFeatureToggle(
          'Smart Search',
          'Semantic search across all messages',
          smartSearch,
          setSmartSearch,
          'search-outline'
        )}

        {renderFeatureToggle(
          'Decision Tracking',
          'Automatically log team decisions',
          decisionTracking,
          setDecisionTracking,
          'bulb-outline'
        )}

        {renderFeatureToggle(
          'Scheduling Assistant',
          'Get meeting time suggestions across time zones',
          schedulingAssistant,
          setSchedulingAssistant,
          'calendar-outline'
        )}
      </View>

      {/* Privacy & Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Data</Text>
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={20} color="#34C759" />
          <Text style={styles.infoText}>
            Your conversations are processed securely. No personal information is
            shared with third parties.
          </Text>
        </View>
      </View>

      {/* Cost Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About AI Features</Text>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>
              AI features use OpenAI GPT models to analyze and enhance your
              conversations. Features like priority detection run automatically in
              the background.
            </Text>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Preferences</Text>
      </TouchableOpacity>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  masterToggleContent: {
    flex: 1,
  },
  masterToggleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  masterToggleDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  featureIcon: {
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacer: {
    height: 32,
  },
});

