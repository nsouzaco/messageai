import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type FeatureCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  onPress: () => void;
  badge?: string;
};

function FeatureCard({ icon, iconColor, iconBg, title, description, onPress, badge }: FeatureCardProps) {
  return (
    <View style={styles.featureCardWrapper}>
      <BlurView intensity={30} tint="light" style={styles.glassCard}>
        <TouchableOpacity style={styles.featureCard} onPress={onPress} activeOpacity={0.7}>
          <View style={[styles.featureIconContainer, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={28} color={iconColor} />
          </View>
          <View style={styles.featureCardContent}>
            <View style={styles.featureCardHeader}>
              <Text style={styles.featureCardTitle}>{title}</Text>
              {badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.featureCardDescription}>{description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

export default function AIHubScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);


  if (showSettings) {
    // Settings view (for future implementation)
    return (
      <LinearGradient
        colors={['#FFF5F7', '#F5E6FF', '#FFFFFF']}
        style={styles.container}
      >
        <ScrollView>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => setShowSettings(false)} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>AI Settings</Text>
          </View>
          <View style={styles.settingsPlaceholder}>
            <Text style={styles.placeholderText}>AI Settings Coming Soon</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFF5F7', '#F5E6FF', '#FFFFFF']}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.sparkleIcon}>
            <Ionicons name="sparkles" size={32} color="#007AFF" />
          </View>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>
            Powered by OpenAI • Smart features for your team
          </Text>
        </View>
      </View>

      {/* Main Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PRODUCTIVITY TOOLS</Text>
        
        <FeatureCard
          icon="checkbox-outline"
          iconColor="#34C759"
          iconBg="#E8F5E9"
          title="Tasks"
          description="AI-extracted action items from your conversations"
          onPress={() => router.push('/action-items')}
        />

        <FeatureCard
          icon="bulb-outline"
          iconColor="#FF9500"
          iconBg="#FFF3E0"
          title="Decisions"
          description="Track important decisions made by your team"
          onPress={() => router.push('/decisions')}
        />

        <FeatureCard
          icon="search-outline"
          iconColor="#007AFF"
          iconBg="#E3F2FD"
          title="Smart Search"
          description="Find messages using natural language queries"
          onPress={() => router.push('/search')}
        />
      </View>

      {/* Active AI Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVE AI FEATURES</Text>
        
        <View style={styles.aiFeatureWrapper}>
          <BlurView intensity={30} tint="light" style={styles.glassCard}>
            <View style={styles.aiFeaturesList}>
          <View style={styles.aiFeatureItem}>
            <View style={styles.aiFeatureIcon}>
              <Ionicons name="alert-circle" size={18} color="#FF3B30" />
            </View>
            <View style={styles.aiFeatureContent}>
              <Text style={styles.aiFeatureTitle}>Priority Detection</Text>
              <Text style={styles.aiFeatureDesc}>Auto-flags urgent messages</Text>
            </View>
            <View style={styles.aiFeatureStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <View style={styles.aiFeatureItem}>
            <View style={styles.aiFeatureIcon}>
              <Ionicons name="document-text" size={18} color="#5856D6" />
            </View>
            <View style={styles.aiFeatureContent}>
              <Text style={styles.aiFeatureTitle}>Thread Summaries</Text>
              <Text style={styles.aiFeatureDesc}>Summarize long conversations</Text>
            </View>
            <View style={styles.aiFeatureStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <View style={styles.aiFeatureItem}>
            <View style={styles.aiFeatureIcon}>
              <Ionicons name="analytics" size={18} color="#32ADE6" />
            </View>
            <View style={styles.aiFeatureContent}>
              <Text style={styles.aiFeatureTitle}>Smart Analysis</Text>
              <Text style={styles.aiFeatureDesc}>Background task extraction</Text>
            </View>
            <View style={styles.aiFeatureStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
            </View>
          </BlurView>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <View style={styles.infoCardWrapper}>
          <BlurView intensity={30} tint="light" style={styles.glassCard}>
            <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.infoTitle}>How it works</Text>
          </View>
          <Text style={styles.infoText}>
            AI features run automatically in the background using OpenAI GPT models to enhance your conversations. All data is processed securely and never shared with third parties.
          </Text>
            </View>
          </BlurView>
        </View>
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
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    alignItems: 'center',
  },
  sparkleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  featureCardWrapper: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 16,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureCardContent: {
    flex: 1,
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  featureCardDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  badge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  aiFeatureWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  aiFeaturesList: {
    backgroundColor: 'transparent',
  },
  aiFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  aiFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiFeatureContent: {
    flex: 1,
  },
  aiFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  aiFeatureDesc: {
    fontSize: 13,
    color: '#8E8E93',
  },
  aiFeatureStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#34C759',
  },
  infoCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoCard: {
    backgroundColor: 'transparent',
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 22,
  },
  backButton: {
    padding: 4,
    marginBottom: 12,
  },
  settingsPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  bottomSpacer: {
    height: 40,
  },
});

