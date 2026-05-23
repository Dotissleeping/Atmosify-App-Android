import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'atmosify_playlists';

// ── Load all playlists ────────────────────────────────────
export async function loadPlaylists() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    sunny: [],
    cloudy: [],
    rainy: [],
    stormy: [],
    snowy: [],
    night: [],
  };
}

// ── Save all playlists ────────────────────────────────────
export async function savePlaylists(playlists) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch (e) {
    console.warn('Failed to save playlists:', e);
  }
}

// ── Add tracks to a mood ──────────────────────────────────
export async function addTracksToMood(mood, newTracks) {
  const playlists = await loadPlaylists();
  const existing = playlists[mood] || [];

  // Deduplicate by uri
  const existingUris = new Set(existing.map(t => t.uri));
  const filtered = newTracks.filter(t => !existingUris.has(t.uri));

  playlists[mood] = [...existing, ...filtered];
  await savePlaylists(playlists);
  return playlists[mood];
}

// ── Remove a track from a mood ────────────────────────────
export async function removeTrackFromMood(mood, uri) {
  const playlists = await loadPlaylists();
  playlists[mood] = (playlists[mood] || []).filter(t => t.uri !== uri);
  await savePlaylists(playlists);
  return playlists[mood];
}

// ── Get shuffled playlist for a mood ─────────────────────
export function shufflePlaylist(tracks) {
  const arr = [...tracks];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Save last city ────────────────────────────────────────
export async function saveLastCity(city) {
  try {
    await AsyncStorage.setItem('atmosify_last_city', city);
  } catch {}
}

export async function loadLastCity() {
  try {
    return await AsyncStorage.getItem('atmosify_last_city');
  } catch {}
  return null;
}
