import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { loadPlaylists, addTracksToMood, removeTrackFromMood } from '../services/musicStorage';

const MOODS = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'night'];
const MOOD_ICONS = { sunny: '☀️', cloudy: '☁️', rainy: '🌧️', stormy: '⛈️', snowy: '❄️', night: '🌙' };
const MOOD_COLORS = {
  sunny: '#FFD54F', cloudy: '#90CAF9', rainy: '#42A5F5',
  stormy: '#EF5350', snowy: '#E3F2FD', night: '#9FA8DA',
};

export default function PlaylistManager({ visible, onClose, onPlaylistChanged }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [playlists, setPlaylists] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) loadData();
  }, [visible]);

  async function loadData() {
    const data = await loadPlaylists();
    setPlaylists(data);
  }

  async function handleAddMusic(mood) {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) { setLoading(false); return; }

      const newTracks = result.assets.map(a => ({
        uri: a.uri,
        name: a.name.replace(/\.[^/.]+$/, ''),
        size: a.size,
      }));

      const updated = await addTracksToMood(mood, newTracks);
      setPlaylists(prev => ({ ...prev, [mood]: updated }));
      if (onPlaylistChanged) onPlaylistChanged(mood, updated);
    } catch (e) {
      Alert.alert('Error', 'Could not add music: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveTrack(mood, uri) {
    Alert.alert('Remove Track', 'Remove this song from the playlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = await removeTrackFromMood(mood, uri);
          setPlaylists(prev => ({ ...prev, [mood]: updated }));
          if (onPlaylistChanged) onPlaylistChanged(mood, updated);
        },
      },
    ]);
  }

  const currentTracks = selectedMood ? (playlists[selectedMood] || []) : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            {selectedMood ? (
              <TouchableOpacity onPress={() => setSelectedMood(null)} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.title}>Music Library</Text>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mood picker */}
          {!selectedMood && (
            <>
              <Text style={styles.subtitle}>Choose a mood to manage its music</Text>
              <View style={styles.moodGrid}>
                {MOODS.map(mood => (
                  <TouchableOpacity
                    key={mood}
                    style={[styles.moodCard, { borderColor: MOOD_COLORS[mood] + '55' }]}
                    onPress={() => setSelectedMood(mood)}
                  >
                    <Text style={styles.moodIcon}>{MOOD_ICONS[mood]}</Text>
                    <Text style={[styles.moodName, { color: MOOD_COLORS[mood] }]}>
                      {mood.toUpperCase()}
                    </Text>
                    <Text style={styles.moodCount}>
                      {(playlists[mood] || []).length} songs
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Track list for selected mood */}
          {selectedMood && (
            <>
              <View style={styles.moodHeader}>
                <Text style={styles.moodIcon}>{MOOD_ICONS[selectedMood]}</Text>
                <Text style={[styles.moodTitle, { color: MOOD_COLORS[selectedMood] }]}>
                  {selectedMood.toUpperCase()} PLAYLIST
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.addBtn, { borderColor: MOOD_COLORS[selectedMood] }]}
                onPress={() => handleAddMusic(selectedMood)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={MOOD_COLORS[selectedMood]} size="small" />
                ) : (
                  <Text style={[styles.addBtnText, { color: MOOD_COLORS[selectedMood] }]}>
                    + Add MP3 Files
                  </Text>
                )}
              </TouchableOpacity>

              {currentTracks.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No songs yet</Text>
                  <Text style={styles.emptyHint}>Tap "Add MP3 Files" to add music</Text>
                </View>
              ) : (
                <FlatList
                  data={currentTracks}
                  keyExtractor={item => item.uri}
                  style={styles.trackList}
                  renderItem={({ item, index }) => (
                    <View style={styles.trackRow}>
                      <View style={styles.trackInfo}>
                        <Text style={styles.trackIndex}>{index + 1}</Text>
                        <Text style={styles.trackName} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveTrack(selectedMood, item.uri)}
                        style={styles.removeBtn}
                      >
                        <Text style={styles.removeText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  backBtn: { padding: 4 },
  backText: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  moodCard: {
    width: '44%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  moodIcon: { fontSize: 28 },
  moodName: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  moodCount: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  moodTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  addBtn: {
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  addBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  emptyHint: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  trackList: { flex: 1 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  trackInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackIndex: { color: 'rgba(255,255,255,0.3)', fontSize: 11, width: 20, textAlign: 'right' },
  trackName: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,83,80,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#EF5350', fontSize: 10, fontWeight: '700' },
});
