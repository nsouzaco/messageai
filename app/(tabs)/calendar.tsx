import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { firestore } from '@/firebaseConfig';
import { SchedulingSuggestion } from '@/services/firebase/ai';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function CalendarScreen() {
  const { user } = useAuth();
  const { conversations } = useChat();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  // Fetch scheduling suggestions
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(firestore, 'schedulingSuggestions'),
      where('participants', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📅 Calendar: Received scheduling suggestions snapshot');
      console.log('📅 Calendar: Document count:', snapshot.size);
      
      const suggestions: SchedulingSuggestion[] = [];
      snapshot.forEach((doc) => {
        console.log('📅 Calendar: Suggestion doc:', doc.id);
        console.log('📅 Calendar: Data:', JSON.stringify(doc.data(), null, 2));
        suggestions.push({ id: doc.id, ...doc.data() } as SchedulingSuggestion);
      });
      
      // Sort by created date (newest first)
      suggestions.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log('📅 Calendar: Total suggestions to display:', suggestions.length);
      setSchedulingSuggestions(suggestions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch accepted events (meetings)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(firestore, 'events'),
      where('participants', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📅 Calendar: Received events snapshot');
      console.log('📅 Calendar: Events count:', snapshot.size);
      
      const eventsList: any[] = [];
      snapshot.forEach((doc) => {
        eventsList.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by scheduled time (earliest first)
      eventsList.sort((a, b) => a.scheduledTime - b.scheduledTime);
      
      console.log('📅 Calendar: Total events:', eventsList.length);
      setEvents(eventsList);
      setLoadingEvents(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcceptMeeting = async (suggestion: SchedulingSuggestion, selectedTime: any) => {
    if (!user) return;

    setAccepting(suggestion.id);
    try {
      // Get the conversation name for the meeting title
      const conversationName = getConversationName(suggestion.conversationId);
      
      // Create event in a simple events collection
      await addDoc(collection(firestore, 'events'), {
        conversationId: suggestion.conversationId,
        title: `Meeting from ${conversationName}`,
        scheduledTime: selectedTime.utcTimestamp,
        localTime: selectedTime.localTime,
        participants: suggestion.participants,
        createdBy: user.id,
        createdAt: Date.now(),
        status: 'accepted',
      });

      // Delete the suggestion after accepting
      await deleteDoc(doc(firestore, 'schedulingSuggestions', suggestion.id));

      Alert.alert('Success', 'Meeting scheduled successfully!');
    } catch (error: any) {
      console.error('Error accepting meeting:', error);
      Alert.alert('Error', 'Failed to schedule meeting. Please try again.');
    } finally {
      setAccepting(null);
    }
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    setDismissing(suggestionId);
    try {
      await deleteDoc(doc(firestore, 'schedulingSuggestions', suggestionId));
      Alert.alert('Dismissed', 'Suggestion removed');
    } catch (error: any) {
      console.error('Error dismissing suggestion:', error);
      Alert.alert('Error', 'Failed to dismiss suggestion. Please try again.');
    } finally {
      setDismissing(null);
    }
  };

  const getConversationName = (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return 'Unknown Chat';
    
    // For 1-on-1 chats, show the other user's name
    if (conv.type === 'one-on-one' && conv.participantDetails) {
      const otherUser = conv.participantDetails.find(p => p.id !== user?.id);
      return otherUser?.displayName || conv.name || 'Unknown User';
    }
    
    return conv.name || 'Unknown Chat';
  };

  // Get current month info
  const currentMonth = selectedDate.toLocaleString('default', { month: 'long' });
  const currentYear = selectedDate.getFullYear();

  // Navigate months
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const days = getDaysInMonth(selectedDate);
  const today = new Date();
  
  const isToday = (day: number | null) => {
    if (!day) return false;
    return (
      day === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  const hasEvent = (day: number | null) => {
    if (!day) return false;
    const dayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    return events.some((event) => {
      const eventDate = new Date(event.scheduledTime);
      return (
        eventDate.getDate() === dayDate.getDate() &&
        eventDate.getMonth() === dayDate.getMonth() &&
        eventDate.getFullYear() === dayDate.getFullYear()
      );
    });
  };

  return (
    <LinearGradient
      colors={['#FFF5F7', '#F5E6FF', '#FFFFFF']}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerWrapper}>
          <BlurView intensity={30} tint="light" style={styles.glassCard}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Ionicons name="calendar" size={32} color="#007AFF" />
                <Text style={styles.headerTitle}>Calendar</Text>
                <Text style={styles.headerSubtitle}>
                  Schedule and manage your events
                </Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Month Navigation */}
        <View style={styles.monthNavWrapper}>
          <BlurView intensity={30} tint="light" style={styles.glassCard}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              
              <View style={styles.monthDisplay}>
                <Text style={styles.monthText}>
                  {currentMonth} {currentYear}
                </Text>
                <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
                  <Text style={styles.todayButtonText}>Today</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarWrapper}>
          <BlurView intensity={30} tint="light" style={styles.glassCard}>
            <View style={styles.calendar}>
              {/* Day labels */}
              <View style={styles.dayLabels}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <View key={day} style={styles.dayLabel}>
                    <Text style={styles.dayLabelText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar days */}
              <View style={styles.daysGrid}>
                {days.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      !day && styles.emptyCell,
                      isToday(day) && styles.todayCell,
                      hasEvent(day) && !isToday(day) && styles.eventCell,
                    ]}
                    disabled={!day}
                  >
                    {day && (
                      <>
                        <Text
                          style={[
                            styles.dayText,
                            isToday(day) && styles.todayText,
                            hasEvent(day) && !isToday(day) && styles.eventText,
                          ]}
                        >
                          {day}
                        </Text>
                        {hasEvent(day) && (
                          <View style={styles.eventDot} />
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </BlurView>
        </View>

        {/* Upcoming Meetings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING MEETINGS</Text>
          
          {loadingEvents ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : events.length === 0 ? (
            <View style={styles.eventCardWrapper}>
              <BlurView intensity={30} tint="light" style={styles.glassCard}>
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-clear-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No upcoming meetings</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Accept an AI suggestion below to schedule a meeting
                  </Text>
                </View>
              </BlurView>
            </View>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.eventCardWrapper}>
                <BlurView intensity={30} tint="light" style={styles.glassCard}>
                  <View style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <Ionicons name="calendar" size={24} color="#34C759" />
                      <Text style={styles.eventTitle}>{event.title}</Text>
                    </View>
                    
                    <View style={styles.eventDetails}>
                      <View style={styles.eventDetailRow}>
                        <Ionicons name="time-outline" size={18} color="#666" />
                        <Text style={styles.eventDetailText}>{event.localTime}</Text>
                      </View>
                      
                      <View style={styles.eventDetailRow}>
                        <Ionicons name="people-outline" size={18} color="#666" />
                        <Text style={styles.eventDetailText}>
                          {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      
                      {event.conversationId && (
                        <TouchableOpacity
                          style={styles.viewChatButton}
                          onPress={() => router.push(`/chat/${event.conversationId}`)}
                        >
                          <Ionicons name="chatbubble-outline" size={16} color="#007AFF" />
                          <Text style={styles.viewChatButtonText}>View Chat</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </BlurView>
              </View>
            ))
          )}
        </View>

        {/* AI Scheduling Suggestions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI SCHEDULING SUGGESTIONS</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : schedulingSuggestions.length === 0 ? (
            <View style={styles.eventCardWrapper}>
              <BlurView intensity={30} tint="light" style={styles.glassCard}>
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No scheduling suggestions</Text>
                  <Text style={styles.emptyStateSubtext}>
                    AI will detect when you mention scheduling meetings in chats
                  </Text>
                </View>
              </BlurView>
            </View>
          ) : (
            schedulingSuggestions.map((suggestion) => (
              <View key={suggestion.id} style={styles.suggestionCardWrapper}>
                <BlurView intensity={30} tint="light" style={styles.glassCard}>
                  <View style={styles.suggestionCard}>
                    {/* Header */}
                    <View style={styles.suggestionHeader}>
                      <View style={styles.suggestionHeaderLeft}>
                        <Ionicons name="sparkles" size={20} color="#FF6B35" />
                        <Text style={styles.suggestionBadge}>AI Detected</Text>
                      </View>
                      <View style={styles.suggestionHeaderRight}>
                        <TouchableOpacity
                          onPress={() => handleDismissSuggestion(suggestion.id)}
                          disabled={dismissing === suggestion.id}
                          style={styles.dismissButton}
                        >
                          {dismissing === suggestion.id ? (
                            <ActivityIndicator size="small" color="#FF3B30" />
                          ) : (
                            <Ionicons name="close-circle" size={24} color="#FF3B30" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => router.push(`/chat/${suggestion.conversationId}`)}
                        >
                          <Ionicons name="arrow-forward-circle-outline" size={24} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Conversation Info */}
                    <Text style={styles.conversationName}>
                      {getConversationName(suggestion.conversationId)}
                    </Text>
                    <Text style={styles.suggestionReason}>{suggestion.reason}</Text>

                    {/* Suggested Times */}
                    <View style={styles.timesSection}>
                      <Text style={styles.timesSectionTitle}>Suggested Times:</Text>
                      {suggestion.suggestedTimes.slice(0, 3).map((time, index) => (
                        <View key={index} style={styles.timeOption}>
                          <View style={styles.timeInfo}>
                            <Ionicons name="time-outline" size={18} color="#007AFF" />
                            <View style={styles.timeTextContainer}>
                              <Text style={styles.timeText}>{time.localTime}</Text>
                              <Text style={styles.timeReason}>{time.reason}</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.acceptButton,
                              accepting === suggestion.id && styles.acceptButtonDisabled
                            ]}
                            onPress={() => handleAcceptMeeting(suggestion, time)}
                            disabled={accepting === suggestion.id}
                          >
                            {accepting === suggestion.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Ionicons name="checkmark" size={16} color="#fff" />
                                <Text style={styles.acceptButtonText}>Accept</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Participants */}
                    <View style={styles.participantsSection}>
                      <Ionicons name="people-outline" size={16} color="#666" />
                      <Text style={styles.participantsText}>
                        {suggestion.participants.length} participant{suggestion.participants.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                </BlurView>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  header: {
    backgroundColor: 'transparent',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
  },
  monthNavWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'transparent',
  },
  navButton: {
    padding: 8,
  },
  monthDisplay: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  todayButton: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  calendar: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  emptyCell: {
    opacity: 0,
  },
  todayCell: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  eventCell: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  dayText: {
    fontSize: 16,
    color: '#000',
  },
  todayText: {
    color: '#fff',
    fontWeight: '600',
  },
  eventText: {
    color: '#34C759',
    fontWeight: '600',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#34C759',
    position: 'absolute',
    bottom: 4,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  eventCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  suggestionCardWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  suggestionCard: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  suggestionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dismissButton: {
    padding: 4,
  },
  suggestionBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  conversationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  suggestionReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  timesSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  timesSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  timeTextContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  timeReason: {
    fontSize: 12,
    color: '#999',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  participantsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  participantsText: {
    fontSize: 13,
    color: '#666',
  },
  eventCard: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  eventDetails: {
    gap: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
  },
  viewChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewChatButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});

