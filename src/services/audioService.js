import { Audio, InterruptionModeAndroid } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Notification channel setup ────────────────────────────
export async function setupAudio() {
  await Audio.setAudioModeAsync({
    staysActiveInBackground: true,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
}

// ── Notification setup ────────────────────────────────────
export async function setupNotifications() {
  await Notifications.setNotificationChannelAsync('player', {
    name: 'Atmosify Player',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: null,
    enableVibrate: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: false,
  });

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// ── Show persistent player notification ──────────────────
export async function showPlayerNotification({ songName, mood, isPlaying }) {
  const moodLabel = mood ? mood.toUpperCase() : 'ATMOSIFY';
  const actions = [
    { identifier: 'prev', buttonTitle: '⏮', options: { isDestructive: false } },
    {
      identifier: 'toggle',
      buttonTitle: isPlaying ? '⏸' : '▶',
      options: { isDestructive: false },
    },
    { identifier: 'next', buttonTitle: '⏭', options: { isDestructive: false } },
  ];

  await Notifications.scheduleNotificationAsync({
    identifier: 'atmosify-player',
    content: {
      title: songName || 'Atmosify',
      body: `${moodLabel} mood`,
      sticky: true,
      autoDismiss: false,
      categoryIdentifier: 'player',
      data: { type: 'player' },
    },
    trigger: null,
  });

  await Notifications.setNotificationCategoryAsync('player', actions);
}

// ── Dismiss notification ──────────────────────────────────
export async function dismissPlayerNotification() {
  await Notifications.dismissNotificationAsync('atmosify-player');
}

// ── Player class ──────────────────────────────────────────
export class AtmosifyPlayer {
  constructor() {
    this.sound = null;
    this.playlist = [];
    this.index = 0;
    this.isPlaying = false;
    this.volume = 0.7;
    this.mood = 'cloudy';
    this.onStatusChange = null; // callback
  }

  async loadAndPlay(track) {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        {
          shouldPlay: true,
          volume: this.volume,
          isLooping: false,
        },
        this._onPlaybackStatus.bind(this)
      );

      this.sound = sound;
      this.isPlaying = true;
      this._notifyChange();
      this._updateNotification();
    } catch (e) {
      console.warn('Failed to load track:', track.uri, e);
      this._autoNext();
    }
  }

  _onPlaybackStatus(status) {
    if (status.didJustFinish) {
      this._autoNext();
    }
  }

  _autoNext() {
    if (this.playlist.length === 0) return;
    this.index = (this.index + 1) % this.playlist.length;
    this.loadAndPlay(this.playlist[this.index]);
  }

  async setPlaylist(playlist, mood, autoPlay = true) {
    this.playlist = playlist;
    this.mood = mood;
    this.index = 0;

    if (autoPlay && playlist.length > 0) {
      await this.loadAndPlay(playlist[0]);
    }
  }

  async togglePlay() {
    if (!this.sound) return;
    if (this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    } else {
      await this.sound.playAsync();
      this.isPlaying = true;
    }
    this._notifyChange();
    this._updateNotification();
  }

  async next() {
    if (this.playlist.length === 0) return;
    this.index = (this.index + 1) % this.playlist.length;
    await this.loadAndPlay(this.playlist[this.index]);
  }

  async prev() {
    if (this.playlist.length === 0) return;
    this.index = (this.index - 1 + this.playlist.length) % this.playlist.length;
    await this.loadAndPlay(this.playlist[this.index]);
  }

  async setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.sound) {
      await this.sound.setVolumeAsync(this.volume);
    }
    this._notifyChange();
  }

  async stop() {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
    this.isPlaying = false;
    this._notifyChange();
    await dismissPlayerNotification();
  }

  getCurrentTrack() {
    if (this.playlist.length === 0) return null;
    return this.playlist[this.index];
  }

  getCurrentSongName() {
    const track = this.getCurrentTrack();
    if (!track) return '';
    return track.name || track.uri.split('/').pop().replace(/\.[^/.]+$/, '');
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      songName: this.getCurrentSongName(),
      mood: this.mood,
      volume: this.volume,
      index: this.index,
      total: this.playlist.length,
    };
  }

  _notifyChange() {
    if (this.onStatusChange) {
      this.onStatusChange(this.getState());
    }
  }

  async _updateNotification() {
    if (this.isPlaying || this.getCurrentTrack()) {
      await showPlayerNotification({
        songName: this.getCurrentSongName(),
        mood: this.mood,
        isPlaying: this.isPlaying,
      });
    }
  }
}

export const globalPlayer = new AtmosifyPlayer();
