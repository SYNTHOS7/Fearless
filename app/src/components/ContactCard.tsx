import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  customMessage?: string;
}

interface ContactCardProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  onTest?: (contact: Contact) => void;
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  Family: '#6C63FF',
  Friend: '#00D9FF',
  Partner: '#FF6B9D',
  Colleague: '#FFB300',
  Other: '#8E8EA0',
};

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onEdit,
  onDelete,
  onTest,
}) => {
  const avatarLetter = contact.name.charAt(0).toUpperCase();
  const relationColor =
    RELATIONSHIP_COLORS[contact.relationship] || RELATIONSHIP_COLORS.Other;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: relationColor }]}>
          <Text style={[styles.avatarText, { color: relationColor }]}>
            {avatarLetter}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.phone}>{contact.phone}</Text>
          <View style={[styles.badge, { backgroundColor: `${relationColor}20` }]}>
            <Text style={[styles.badgeText, { color: relationColor }]}>
              {contact.relationship}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {onTest && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onTest(contact)}
              activeOpacity={0.6}
            >
              <Ionicons name="paper-plane-outline" size={18} color="#00D9FF" />
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onEdit(contact)}
              activeOpacity={0.6}
            >
              <Ionicons name="pencil-outline" size={18} color="#8E8EA0" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onDelete(contact)}
              activeOpacity={0.6}
            >
              <Ionicons name="trash-outline" size={18} color="#FF1744" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 30, 46, 0.8)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  phone: {
    color: '#8E8EA0',
    fontSize: 13,
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(30, 30, 46, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ContactCard;
