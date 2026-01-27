const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

export type NotificationSoundType = 'none' | 'chime' | 'bell' | 'ding' | 'pop' | 'notification' | 'alert';

interface SoundConfig {
  id: NotificationSoundType;
  name: string;
  description: string;
}

export const NOTIFICATION_SOUNDS: SoundConfig[] = [
  { id: 'none', name: 'Kapalı', description: 'Ses çalmaz' },
  { id: 'chime', name: 'Chime', description: 'Yumuşak zil sesi' },
  { id: 'bell', name: 'Bell', description: 'Klasik çan sesi' },
  { id: 'ding', name: 'Ding', description: 'Kısa ding sesi' },
  { id: 'pop', name: 'Pop', description: 'Pop sesi' },
  { id: 'notification', name: 'Notification', description: 'Standart bildirim' },
  { id: 'alert', name: 'Alert', description: 'Dikkat çekici uyarı' },
];

function createOscillator(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  startTime: number = 0,
  gainValue: number = 0.3
): void {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
  
  gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime + startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
  
  oscillator.start(audioContext.currentTime + startTime);
  oscillator.stop(audioContext.currentTime + startTime + duration);
}

function playChime(): void {
  if (!audioContext) return;
  createOscillator(880, 0.15, 'sine', 0, 0.3);
  createOscillator(1320, 0.2, 'sine', 0.1, 0.25);
  createOscillator(1760, 0.25, 'sine', 0.2, 0.2);
}

function playBell(): void {
  if (!audioContext) return;
  createOscillator(830, 0.4, 'sine', 0, 0.35);
  createOscillator(1245, 0.3, 'sine', 0, 0.15);
  createOscillator(1660, 0.2, 'sine', 0, 0.1);
}

function playDing(): void {
  if (!audioContext) return;
  createOscillator(1200, 0.12, 'sine', 0, 0.4);
}

function playPop(): void {
  if (!audioContext) return;
  createOscillator(400, 0.05, 'sine', 0, 0.5);
  createOscillator(800, 0.08, 'sine', 0.02, 0.3);
}

function playNotification(): void {
  if (!audioContext) return;
  createOscillator(523, 0.1, 'sine', 0, 0.3);
  createOscillator(659, 0.1, 'sine', 0.1, 0.3);
  createOscillator(784, 0.15, 'sine', 0.2, 0.25);
}

function playAlert(): void {
  if (!audioContext) return;
  createOscillator(880, 0.1, 'square', 0, 0.2);
  createOscillator(880, 0.1, 'square', 0.15, 0.2);
  createOscillator(1100, 0.15, 'square', 0.3, 0.25);
}

export async function playNotificationSound(soundType: NotificationSoundType): Promise<void> {
  if (soundType === 'none' || !audioContext) return;
  
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  switch (soundType) {
    case 'chime':
      playChime();
      break;
    case 'bell':
      playBell();
      break;
    case 'ding':
      playDing();
      break;
    case 'pop':
      playPop();
      break;
    case 'notification':
      playNotification();
      break;
    case 'alert':
      playAlert();
      break;
  }
}

const SOUND_SETTINGS_KEY = 'smartur_notification_sound';
const SOUND_ENABLED_KEY = 'smartur_notification_sound_enabled';

export function getNotificationSoundSetting(): NotificationSoundType {
  if (typeof window === 'undefined') return 'notification';
  const saved = localStorage.getItem(SOUND_SETTINGS_KEY);
  if (saved && NOTIFICATION_SOUNDS.some(s => s.id === saved)) {
    return saved as NotificationSoundType;
  }
  return 'notification';
}

export function setNotificationSoundSetting(soundType: NotificationSoundType): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_SETTINGS_KEY, soundType);
}

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(SOUND_ENABLED_KEY);
  return saved !== 'false';
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function playCurrentNotificationSound(): void {
  if (!isNotificationSoundEnabled()) return;
  const soundType = getNotificationSoundSetting();
  playNotificationSound(soundType);
}
