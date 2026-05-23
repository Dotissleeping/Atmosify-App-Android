import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ImageBackground, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Dimensions, StatusBar, Animated, Modal,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Polygon, Rect } from 'react-native-svg';

import LightRays from '../components/LightRays';
import VolumeKnob from '../components/VolumeKnob';
import PlaylistManager from '../components/PlaylistManager';

import { fetchWeather, THEMES, BACKGROUNDS } from '../services/weatherService';
import { loadPlaylists, shufflePlaylist, saveLastCity, loadLastCity } from '../services/musicStorage';
import { setupAudio, setupNotifications, globalPlayer } from '../services/audioService';

const { width: SW } = Dimensions.get('window');

const MOODS = ['sunny','cloudy','rainy','stormy','snowy','night'];
const MOOD_ICONS = { sunny:'☀️', cloudy:'☁️', rainy:'🌧️', stormy:'⛈️', snowy:'❄️', night:'🌙' };

// ── Play icon (triangle) ──────────────────────────────────
function PlayIcon({ color = '#1a2a3a', size = 18 }) {
  const h = size;
  const w = size * 0.85;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Polygon
        points={`0,0 ${w},${h/2} 0,${h}`}
        fill={color}
      />
    </Svg>
  );
}

// ── Pause icon (two bars) ─────────────────────────────────
function PauseIcon({ color = '#1a2a3a', size = 18 }) {
  const barW = size * 0.28;
  const barH = size;
  const gap = size * 0.32;
  const total = barW * 2 + gap;
  return (
    <Svg width={total} height={barH} viewBox={`0 0 ${total} ${barH}`}>
      <Rect x={0} y={0} width={barW} height={barH} rx={barW * 0.3} fill={color} />
      <Rect x={barW + gap} y={0} width={barW} height={barH} rx={barW * 0.3} fill={color} />
    </Svg>
  );
}

// ── Skip prev icon ────────────────────────────────────────
function PrevIcon({ color = 'rgba(255,255,255,0.88)', size = 14 }) {
  const h = size;
  const w = size * 0.7;
  const barW = size * 0.22;
  return (
    <Svg width={barW + w + 2} height={h} viewBox={`0 0 ${barW + w + 2} ${h}`}>
      <Rect x={0} y={0} width={barW} height={h} rx={1} fill={color} />
      <Polygon points={`${barW+2},0 ${barW+w+2},${h/2} ${barW+2},${h}`} fill={color} transform={`rotate(180, ${barW+2+w/2}, ${h/2})`} />
    </Svg>
  );
}

// ── Skip next icon ────────────────────────────────────────
function NextIcon({ color = 'rgba(255,255,255,0.88)', size = 14 }) {
  const h = size;
  const w = size * 0.7;
  const barW = size * 0.22;
  return (
    <Svg width={barW + w + 2} height={h} viewBox={`0 0 ${barW + w + 2} ${h}`}>
      <Polygon points={`0,0 ${w},${h/2} 0,${h}`} fill={color} />
      <Rect x={w+2} y={0} width={barW} height={h} rx={1} fill={color} />
    </Svg>
  );
}

// ── Loading logo ──────────────────────────────────────────
function AtmosifyLogo({ size = 72 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', bottom: size*0.15, left: size*0.08, width: size*0.84, height: size*0.4, backgroundColor: 'white', borderRadius: size*0.12, opacity: 0.9 }} />
        <View style={{ position: 'absolute', bottom: size*0.3, left: size*0.18, width: size*0.38, height: size*0.38, backgroundColor: 'white', borderRadius: size*0.19, opacity: 0.9 }} />
        <View style={{ position: 'absolute', bottom: size*0.24, left: size*0.36, width: size*0.44, height: size*0.4, backgroundColor: 'white', borderRadius: size*0.2, opacity: 0.9 }} />
        <View style={{ position: 'absolute', top: size*0.15, right: size*0.13, width: size*0.12, height: size*0.12, backgroundColor: 'rgba(107,143,163,0.9)', borderRadius: size*0.06 }} />
        <View style={{ position: 'absolute', top: size*0.05, right: size*0.09, width: size*0.06, height: size*0.25, backgroundColor: 'rgba(107,143,163,0.9)', borderRadius: 2 }} />
      </View>
    </Animated.View>
  );
}

export default function MainScreen() {
  const [loading, setLoading] = useState(true);
  const [loadingOpacity] = useState(new Animated.Value(1));
  const [mood, setMood] = useState('cloudy');
  const [weatherData, setWeatherData] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [fetching, setFetching] = useState(false);
  const [playerState, setPlayerState] = useState({ isPlaying: false, songName: '', volume: 0.7, total: 0 });
  const [showLibrary, setShowLibrary] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  const theme = THEMES[mood] || THEMES.cloudy;
  const bg = BACKGROUNDS[mood] || BACKGROUNDS.cloudy;

  useEffect(() => {
    (async () => {
      await setupAudio();
      await setupNotifications();

      const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
        const action = response.actionIdentifier;
        if (action === 'prev') await globalPlayer.prev();
        else if (action === 'toggle') await globalPlayer.togglePlay();
        else if (action === 'next') await globalPlayer.next();
        setPlayerState({ ...globalPlayer.getState() });
      });

      globalPlayer.onStatusChange = (state) => setPlayerState({ ...state });

      const lastCity = await loadLastCity();
      if (lastCity) setCityInput(lastCity);

      setTimeout(() => {
        Animated.timing(loadingOpacity, { toValue: 0, duration: 700, useNativeDriver: true })
          .start(() => setLoading(false));
      }, 1800);

      return () => sub.remove();
    })();
  }, []);

  async function handleSearch() {
    const city = cityInput.trim();
    if (!city) return;
    setFetching(true);
    setStatusMsg('fetching...');
    try {
      const data = await fetchWeather(city);
      setWeatherData(data);
      setMood(data.mood);
      setSearchOpen(false);
      setStatusMsg('');
      await saveLastCity(city);
      const playlists = await loadPlaylists();
      const tracks = shufflePlaylist(playlists[data.mood] || []);
      if (tracks.length > 0) {
        await globalPlayer.setPlaylist(tracks, data.mood, true);
      } else {
        setStatusMsg(`no music for ${data.mood} mood — add some in the library`);
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      setStatusMsg(e.message || 'error fetching weather');
    } finally {
      setFetching(false);
    }
  }

  async function handleSelectMood(m) {
    setMood(m);
    setShowMoodPicker(false);
    const playlists = await loadPlaylists();
    const tracks = shufflePlaylist(playlists[m] || []);
    if (tracks.length > 0) {
      await globalPlayer.setPlaylist(tracks, m, true);
      setStatusMsg('');
    } else {
      setStatusMsg(`no music for ${m} mood — add some in the library`);
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleTogglePlay() {
    if (playerState.total === 0) { setStatusMsg('add music in the library first'); return; }
    await globalPlayer.togglePlay();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleVolumeChange(delta) {
    const newVol = Math.max(0, Math.min(1, playerState.volume + delta));
    await globalPlayer.setVolume(newVol);
  }

  async function handlePlaylistChanged(changedMood, tracks) {
    if (changedMood === mood && !playerState.isPlaying && tracks.length > 0) {
      await globalPlayer.setPlaylist(shufflePlaylist(tracks), mood, false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(0,0,0,0.2)','rgba(0,0,0,0.05)','rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} locations={[0,0.4,1]} />
      <LightRays rayColor={theme.rayColor + '0.25)'} />

      <SafeAreaView style={styles.safe} edges={['top','bottom']}>
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* Top bar */}
          <View style={styles.topbar}>
            <Text style={styles.appName}>atmosify</Text>
            <View style={styles.topRight}>
              <TouchableOpacity onPress={() => setSearchOpen(v => !v)} style={styles.topBtn}>
                <Text style={styles.topBtnText}>search</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMoodPicker(true)} style={styles.topBtn}>
                <Text style={styles.topBtnText}>mood</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowLibrary(true)} style={styles.libBtn}>
                <Text style={styles.libBtnText}>♪</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search bar */}
          {searchOpen && (
            <View style={styles.searchBar}>
              <TextInput
                style={styles.cityInput}
                placeholder="enter city name..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={cityInput}
                onChangeText={setCityInput}
                onSubmitEditing={handleSearch}
                returnKeyType="go"
                autoFocus
              />
              <TouchableOpacity style={styles.goBtn} onPress={handleSearch} disabled={fetching}>
                <Text style={styles.goBtnText}>{fetching ? '...' : 'go'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Weather section */}
          <View style={styles.weatherSection}>
            <Text style={styles.weatherLabel}>{theme.label}</Text>
            {weatherData ? (
              <>
                <Text style={styles.cityName}>{weatherData.city}</Text>
                <Text style={styles.tempDisplay}>{weatherData.temp}°</Text>
                <Text style={styles.weatherDesc}>{weatherData.description}  •  feels like {weatherData.feelsLike}°C</Text>
                <View style={styles.weatherExtras}>
                  <Text style={styles.weatherExtra}>humidity {weatherData.humidity}%</Text>
                  <Text style={styles.weatherExtra}>wind {weatherData.wind} m/s</Text>
                </View>
              </>
            ) : (
              <Text style={styles.cityName}>where are you?</Text>
            )}
          </View>

          {/* Music section */}
          <View style={styles.musicSection}>
            <Text style={styles.songName} numberOfLines={1}>
              {playerState.songName || 'search a city to start'}
            </Text>
            <View style={styles.musicMain}>
              <View style={{ width: 80 }} />
              <View style={styles.controls}>
                <TouchableOpacity style={styles.ctrlBtn} onPress={() => globalPlayer.prev()}>
                  <PrevIcon />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ctrlBtn, styles.playBtn]} onPress={handleTogglePlay}>
                  {playerState.isPlaying
                    ? <PauseIcon color="#1a2a3a" size={18} />
                    : <PlayIcon color="#1a2a3a" size={18} />
                  }
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctrlBtn} onPress={() => globalPlayer.next()}>
                  <NextIcon />
                </TouchableOpacity>
              </View>
              <VolumeKnob volume={playerState.volume} accentColor={theme.accent} onVolumeChange={handleVolumeChange} size={76} />
            </View>
            <View style={styles.bottomRow}>
              <Text style={styles.moodTag}>{mood} mood</Text>
              {statusMsg ? <Text style={styles.statusMsg}>{statusMsg}</Text> : null}
            </View>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Loading screen */}
      {loading && (
        <Animated.View style={[styles.loadingScreen, { opacity: loadingOpacity }]}>
          <AtmosifyLogo size={80} />
          <Text style={styles.loadingTitle}>atmosify</Text>
          <Text style={styles.loadingSub}>loading your vibe</Text>
        </Animated.View>
      )}

      {/* Mood picker modal */}
      <Modal visible={showMoodPicker} transparent animationType="slide" onRequestClose={() => setShowMoodPicker(false)}>
        <View style={styles.moodOverlay}>
          <View style={styles.moodSheet}>
            <Text style={styles.moodSheetTitle}>Choose Mood</Text>
            <Text style={styles.moodSheetSub}>OVERRIDE WEATHER · PLAY OFFLINE</Text>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.moodRow, mood === m && styles.moodRowActive]}
                onPress={() => handleSelectMood(m)}
              >
                <Text style={styles.moodRowIcon}>{MOOD_ICONS[m]}</Text>
                <Text style={styles.moodRowName}>{m.toUpperCase()}</Text>
                {mood === m && <Text style={styles.moodCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowMoodPicker(false)} style={styles.moodCancelBtn}>
              <Text style={styles.moodCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Playlist manager */}
      <PlaylistManager visible={showLibrary} onClose={() => setShowLibrary(false)} onPlaylistChanged={handlePlaylistChanged} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a2a3a' },
  safe: { flex: 1 },

  loadingScreen: { ...StyleSheet.absoluteFillObject, backgroundColor: '#6B8FA3', alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 100 },
  loadingTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 5, color: 'rgba(255,255,255,0.85)' },
  loadingSub: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' },

  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
  appName: { fontSize: 10, fontWeight: '700', letterSpacing: 3, color: 'rgba(255,255,255,0.65)' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBtn: { padding: 4 },
  topBtnText: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500', letterSpacing: 1 },
  libBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  libBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },

  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', gap: 10 },
  cityInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, color: '#fff', fontSize: 12, paddingHorizontal: 16, paddingVertical: 8, textAlign: 'center' },
  goBtn: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 8 },
  goBtnText: { color: '#1a2a3a', fontWeight: '700', fontSize: 11, letterSpacing: 1 },

  weatherSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 8, gap: 4 },
  weatherLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 },
  cityName: { fontSize: 30, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12, textAlign: 'center' },
  tempDisplay: { fontSize: 72, fontWeight: '200', color: '#fff', letterSpacing: -3, lineHeight: 80, textAlign: 'center' },
  weatherDesc: { fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 2, textAlign: 'center' },
  weatherExtras: { flexDirection: 'row', gap: 24, marginTop: 6, justifyContent: 'center' },
  weatherExtra: { fontSize: 10, color: 'rgba(255,255,255,0.58)' },

  musicSection: { backgroundColor: 'rgba(0,0,0,0.38)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 10, alignItems: 'center' },
  songName: { fontSize: 11, fontStyle: 'italic', color: 'rgba(255,255,255,0.68)', maxWidth: SW - 60, textAlign: 'center' },
  musicMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctrlBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 0 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
  moodTag: { fontSize: 9, letterSpacing: 2.5, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: '600' },
  statusMsg: { fontSize: 9, color: 'rgba(255,255,255,0.38)', textAlign: 'center' },

  moodOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  moodSheet: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 4 },
  moodSheetTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  moodSheetSub: { color: 'rgba(255,255,255,0.35)', fontSize: 9, textAlign: 'center', letterSpacing: 1.5, marginBottom: 10 },
  moodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 14 },
  moodRowActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  moodRowIcon: { fontSize: 22 },
  moodRowName: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  moodCheck: { color: '#90CAF9', fontSize: 16, fontWeight: '700' },
  moodCancelBtn: { marginTop: 8, alignItems: 'center', padding: 12 },
  moodCancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
});
