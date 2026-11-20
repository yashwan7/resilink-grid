// WebAudio Repeating Siren & Vibration API for F9 High/Critical Alerts

class EmergencyAlarmService {
  private audioCtx: AudioContext | null = null;
  private isBeeping: boolean = false;
  private intervalId: any = null;

  public startAlarm() {
    if (this.isBeeping) return;
    this.isBeeping = true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // WebAudio pulsating emergency two-tone siren
      const playTone = () => {
        if (!this.isBeeping || !this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now); // A5 tone
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.35); // drop to A4

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.38);

        osc.start(now);
        osc.stop(now + 0.4);

        // Device vibration API if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([300, 100, 300]);
        }
      };

      playTone();
      this.intervalId = setInterval(playTone, 800);
    } catch (err) {
      console.warn("Audio Context playback error:", err);
    }
  }

  public stopAlarm() {
    this.isBeeping = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  public isPlaying(): boolean {
    return this.isBeeping;
  }
}

export const AlarmService = new EmergencyAlarmService();
