import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { batchGenerateEmbeddings, detectPriority, extractActionItems } from '@/services/firebase/ai';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, getFirestore, limit, orderBy, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TestEmbeddingsScreen() {
  const { user } = useAuth();
  const { conversations } = useChat();
  const [generating, setGenerating] = useState<string | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [detectingPriority, setDetectingPriority] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [actionResults, setActionResults] = useState<Record<string, any>>({});
  const [priorityResults, setPriorityResults] = useState<Record<string, any>>({});
  const [pineconeTest, setPineconeTest] = useState<any>(null);
  const [testingPinecone, setTestingPinecone] = useState(false);

  const handleTestPinecone = async () => {
    setTestingPinecone(true);
    try {
      const functions = getFunctions();
      const testPineconeFn = httpsCallable(functions, 'testPinecone');
      const result = await testPineconeFn({});
      setPineconeTest(result.data);
      Alert.alert(
        result.data.success ? 'Success' : 'Error',
        result.data.message
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to test Pinecone');
    } finally {
      setTestingPinecone(false);
    }
  };

  const handleGenerateEmbeddings = async (conversationId: string) => {
    setGenerating(conversationId);
    try {
      const result = await batchGenerateEmbeddings(conversationId, 50);
      setResults(prev => ({ ...prev, [conversationId]: result }));
      Alert.alert('Success', result.message);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate embeddings');
    } finally {
      setGenerating(null);
    }
  };

  const handleExtractActionItems = async (conversationId: string) => {
    setExtracting(conversationId);
    try {
      const result = await extractActionItems(conversationId);
      setActionResults(prev => ({ ...prev, [conversationId]: result }));
      const count = result.count || 0;
      Alert.alert(
        count > 0 ? 'Success' : 'No Results',
        count > 0 
          ? `Found ${count} action item${count === 1 ? '' : 's'}!`
          : 'No action items found in this conversation'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to extract action items');
    } finally {
      setExtracting(null);
    }
  };

  const handleDetectPriority = async (conversationId: string) => {
    setDetectingPriority(conversationId);
    try {
      // Get last 5 messages from conversation
      const db = getFirestore();
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const messagesQuery = query(
        messagesRef,
        where('threadId', '==', null),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      if (messagesSnapshot.empty) {
        Alert.alert('No Messages', 'No messages found in this conversation');
        return;
      }

      // Detect priority for each message
      const priorityPromises = messagesSnapshot.docs.map(doc => 
        detectPriority(doc.id, conversationId).catch(err => null)
      );
      
      const priorities = await Promise.all(priorityPromises);
      const successCount = priorities.filter(p => p !== null).length;
      
      // Count by priority level
      const highCount = priorities.filter(p => p?.priority === 'high').length;
      const mediumCount = priorities.filter(p => p?.priority === 'medium').length;
      const lowCount = priorities.filter(p => p?.priority === 'low').length;
      
      setPriorityResults(prev => ({ 
        ...prev, 
        [conversationId]: { 
          total: successCount, 
          high: highCount,
          medium: mediumCount,
          low: lowCount
        } 
      }));
      
      Alert.alert(
        'Priority Detection Complete',
        `Analyzed ${successCount} message${successCount === 1 ? '' : 's'}:\n\n` +
        `🔴 High: ${highCount}\n` +
        `🟠 Medium: ${mediumCount}\n` +
        `🟢 Low: ${lowCount}\n\n` +
        `Check messages for priority badges!`
      );
    } catch (error: any) {
      console.error('Priority detection error:', error);
      Alert.alert('Error', error.message || 'Failed to detect priority');
    } finally {
      setDetectingPriority(null);
    }
  };

  const renderConversation = ({ item }: { item: any }) => {
    const result = results[item.id];
    const actionResult = actionResults[item.id];
    const priorityResult = priorityResults[item.id];
    const isGenerating = generating === item.id;
    const isExtracting = extracting === item.id;
    const isDetectingPriority = detectingPriority === item.id;

    return (
      <View style={styles.conversationCard}>
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.name || 'Chat'}
          </Text>
          {result && (
            <Text style={styles.resultText}>
              ✅ Generated {result.processed} embeddings
              {result.failed > 0 && ` (${result.failed} failed)`}
            </Text>
          )}
          {actionResult && (
            <Text style={styles.resultText}>
              📋 {actionResult.count > 0 
                ? `Found ${actionResult.count} action item${actionResult.count === 1 ? '' : 's'}`
                : 'No action items found'}
            </Text>
          )}
          {priorityResult && (
            <Text style={styles.resultText}>
              🎯 Priorities: 🔴{priorityResult.high} 🟠{priorityResult.medium} 🟢{priorityResult.low}
            </Text>
          )}
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.embedButton, isGenerating && styles.buttonDisabled]}
            onPress={() => handleGenerateEmbeddings(item.id)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={14} color="#fff" />
                <Text style={styles.buttonText}>Embed</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.actionButton, isExtracting && styles.buttonDisabled]}
            onPress={() => handleExtractActionItems(item.id)}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkbox" size={14} color="#fff" />
                <Text style={styles.buttonText}>Tasks</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.priorityButton, isDetectingPriority && styles.buttonDisabled]}
            onPress={() => handleDetectPriority(item.id)}
            disabled={isDetectingPriority}
          >
            {isDetectingPriority ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="alert-circle" size={14} color="#fff" />
                <Text style={styles.buttonText}>Priority</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Testing</Text>
        <Text style={styles.headerSubtitle}>
          Test embeddings, action items, and priority detection
        </Text>
      </View>

      <View style={styles.info}>
        <Ionicons name="information-circle" size={20} color="#007AFF" />
        <Text style={styles.infoText}>
          Use "Embed" for semantic search, "Tasks" to extract action items, and "Priority" to detect message importance. Priority badges will appear on messages in the chat.
        </Text>
      </View>

      <View style={styles.testSection}>
        <TouchableOpacity
          style={[styles.testButton, testingPinecone && styles.buttonDisabled]}
          onPress={handleTestPinecone}
          disabled={testingPinecone}
        >
          {testingPinecone ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="hardware-chip" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Test Pinecone Connection</Text>
            </>
          )}
        </TouchableOpacity>
        {pineconeTest && (
          <View style={[styles.testResult, pineconeTest.success ? styles.testSuccess : styles.testError]}>
            <Ionicons 
              name={pineconeTest.success ? "checkmark-circle" : "close-circle"} 
              size={16} 
              color={pineconeTest.success ? "#34C759" : "#FF3B30"} 
            />
            <Text style={styles.testResultText}>
              {pineconeTest.success 
                ? `✅ Connected! ${pineconeTest.totalVectors || 0} vectors in index`
                : `❌ ${pineconeTest.error || 'Connection failed'}`
              }
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  info: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 18,
  },
  list: {
    padding: 16,
  },
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  conversationInfo: {
    flex: 1,
    marginRight: 12,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 13,
    color: '#34C759',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  embedButton: {
    backgroundColor: '#007AFF',
  },
  actionButton: {
    backgroundColor: '#34C759',
  },
  priorityButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  testSection: {
    padding: 16,
    paddingTop: 0,
  },
  testButton: {
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  testResult: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testSuccess: {
    backgroundColor: '#E8F5E9',
  },
  testError: {
    backgroundColor: '#FFEBEE',
  },
  testResultText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
});

