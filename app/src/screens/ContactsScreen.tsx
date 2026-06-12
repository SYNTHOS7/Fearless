import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppContext } from '../context/AppContext';
import GlassCard from '../components/GlassCard';
import ContactCard from '../components/ContactCard';
import smsService from '../services/SmsService';
import locationService from '../services/LocationService';
import { COLORS } from '../utils/constants';
import type { Contact } from '../types';

const ContactsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { contacts, addContact, updateContact, removeContact } = useAppContext();

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Partner');
  const [customMessage, setCustomMessage] = useState('');

  const RELATIONSHIPS = ['Partner', 'Mom', 'Dad', 'Sibling', 'Friend', 'Other'];

  // Open modal for adding a new contact
  const handleAddNew = () => {
    if (contacts.length >= 5) {
      Alert.alert('Limit Reached', 'You can add a maximum of 5 emergency contacts.');
      return;
    }
    setEditingContact(null);
    setName('');
    setPhone('');
    setRelationship('Partner');
    setCustomMessage('');
    setModalVisible(true);
  };

  // Open modal for editing an existing contact
  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhone(contact.phone);
    setRelationship(contact.relationship);
    setCustomMessage(contact.customMessage ?? '');
    setModalVisible(true);
  };

  // Validate and save contact form
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a name.');
      return;
    }
    
    // Simple phone format check (+ or digit, at least 7 chars)
    const phoneRegex = /^\+?[0-9\s-]{7,15}$/;
    if (!phone.trim() || !phoneRegex.test(phone.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid phone number.');
      return;
    }

    try {
      if (editingContact) {
        // Edit mode
        await updateContact({
          ...editingContact,
          name: name.trim(),
          phone: phone.trim(),
          relationship,
          customMessage: customMessage.trim() || undefined,
        });
      } else {
        // Create mode
        await addContact({
          name: name.trim(),
          phone: phone.trim(),
          relationship,
          customMessage: customMessage.trim() || undefined,
        });
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'An error occurred while saving.');
    }
  };

  const handleDelete = (contactId: string) => {
    Alert.alert(
      'Remove Contact',
      'Are you sure you want to remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeContact(contactId);
          },
        },
      ]
    );
  };

  const handleTestSms = async (contact: Contact) => {
    Alert.alert(
      'Send Test SMS',
      `This will open the SMS composer pre-filled with a safety test message to ${contact.name}. Open composer now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Test',
          onPress: async () => {
            const mockLocation = 'https://maps.google.com/?q=37.7749,-122.4194'; // SF coords
            const location = await locationService.getCurrentLocation();
            const mapsUrl = location ? location.mapsUrl : mockLocation;
            
            const res = await smsService.sendToContact(contact, mapsUrl);
            if (!res.success) {
              Alert.alert('Test Failed', res.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Emergency Contacts</Text>
          <Text style={styles.subtitle}>Trusted people who will receive alerts</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddNew}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {contacts.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Contacts Configured</Text>
            <Text style={styles.emptyText}>
              Add up to 5 emergency contacts who will be notified with your location during a struggle or manual SOS trigger.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={handleAddNew}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyAddButtonText}>Add First Contact</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.limitText}>
              {contacts.length} / 5 Contacts Added
            </Text>
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={() => handleEdit(contact)}
                onDelete={() => handleDelete(contact.id)}
                onTest={() => handleTestSms(contact)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Dialog Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingContact ? 'Edit Contact' : 'New Contact'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Jane Doe"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCorrect={false}
                />
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +1234567890"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Relationship Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Relationship</Text>
                <View style={styles.relationshipGrid}>
                  {RELATIONSHIPS.map((rel) => {
                    const isSelected = relationship === rel;
                    return (
                      <TouchableOpacity
                        key={rel}
                        style={[
                          styles.relationshipChip,
                          isSelected && styles.relationshipChipActive,
                        ]}
                        onPress={() => setRelationship(rel)}
                      >
                        <Text
                          style={[
                            styles.relationshipChipText,
                            isSelected && styles.relationshipChipTextActive,
                          ]}
                        >
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Custom Message Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Personal Note (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. I have a history of asthma, please hurry."
                  placeholderTextColor={COLORS.textMuted}
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Text style={styles.helperText}>
                  This is appended to the standard emergency SMS text.
                </Text>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>Save Contact</Text>
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  listContainer: {
    gap: 12,
  },
  limitText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyAddButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyAddButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // Modal Dialog Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalForm: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.white,
  },
  textArea: {
    height: 80,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  relationshipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  relationshipChipActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderColor: COLORS.primary,
  },
  relationshipChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  relationshipChipTextActive: {
    color: COLORS.primaryLight,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ContactsScreen;
