/**
 * Sound Design Procédural en Temps Réel (Web Audio API)
 * Synthèse sonore pure par code sans aucun fichier audio externe.
 *
 * Sons procéduraux calibrés :
 * 1. glide : Bruit rose feutré filtré passe-bande à 520 Hz (froissement de papier lisse).
 * 2. card_open : Onde sinusoïdale pure (587 Hz -> 659 Hz) avec atténuation douce en 160 ms.
 * 3. key_tap : Micro-clics carrés de 15 ms à 820 Hz (clavier mécanique feutré).
 * 4. validate_click : Bruit sec filtré passe-haut descendant de 1400 Hz à 110 Hz en 28 ms (sans écho).
 * 5. sync_chime : Accord harmonique double onde (440 Hz & 659 Hz).
 */

export type SoundEvent = 'glide' | 'card_open' | 'key_tap' | 'validate_click' | 'sync_chime';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.8;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Initialisation paresseuse pour respecter les politiques d'autoplay des navigateurs
  }

  private initContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return false;

      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.generatePinkNoiseBuffer();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Génère un buffer de bruit rose procédural (filtre Kellet) pour le froissement de papier feutré.
   */
  private generatePinkNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.4; // 400ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.pinkNoiseBuffer = buffer;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * 1. Glissement de calendrier (glide)
   * Bruit rose feutré filtré passe-bande à 520 Hz simulant un froissement de papier lisse.
   */
  public playGlide() {
    if (this.muted || !this.initContext() || !this.ctx || !this.masterGain || !this.pinkNoiseBuffer) return;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.pinkNoiseBuffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(520, t);
    bandpass.Q.setValueAtTime(1.8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.masterGain);

    source.start(t);
    source.stop(t + 0.23);
  }

  /**
   * 2. Ouverture de carte (card_open)
   * Onde sinusoïdale pure (587 Hz -> 659 Hz) avec atténuation exponentielle douce en 160 ms.
   */
  public playCardOpen() {
    if (this.muted || !this.initContext() || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // 587.33 Hz (D5) -> 659.25 Hz (E5)
    osc.frequency.setValueAtTime(587.33, t);
    osc.frequency.exponentialRampToValueAtTime(659.25, t + 0.16);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.165);
  }

  /**
   * 3. Frappe de texte (key_tap)
   * Micro-clics carrés de 15 ms à 820 Hz simulant un clavier mécanique feutré.
   */
  public playKeyTap() {
    if (this.muted || !this.initContext() || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    // Variation microscopique de pitch pour naturel (+/- 15Hz)
    const pitchOffset = (Math.random() - 0.5) * 25;
    osc.frequency.setValueAtTime(820 + pitchOffset, t);

    // Filtre passe-bas à 2200 Hz pour rendre le clic feutré et non agressif
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.016);
  }

  /**
   * 4. Validation chirurgicale (validate_click)
   * Bruit sec filtré passe-haut descendant de 1400 Hz à 110 Hz en 28 ms (aucun écho traînant).
   */
  public playValidateClick() {
    if (this.muted || !this.initContext() || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Oscillateur rapide sweep descendant 1400 Hz -> 110 Hz
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.028);

    // Filtre passe-haut pour éliminer la boue sonore
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(320, t);

    // Enveloppe d'amplitude chirurgicale de 28 ms strictement
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);

    osc.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.029);
  }

  /**
   * 5. Synchronisation (sync_chime)
   * Accord harmonique double onde (440 Hz & 659 Hz) feutré.
   */
  public playSyncChime() {
    if (this.muted || !this.initContext() || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Deux sinusoïdes harmoniques (A4 + E5 = quinte pure)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, t);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, t);

    const duration = 0.42;
    gain1.gain.setValueAtTime(0.001, t);
    gain1.gain.linearRampToValueAtTime(0.12, t + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    gain2.gain.setValueAtTime(0.001, t);
    gain2.gain.linearRampToValueAtTime(0.10, t + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + duration);
    osc2.stop(t + duration);
  }

  /**
   * Déclenche un son par son nom d'événement
   */
  public playEvent(event: SoundEvent | null | undefined) {
    if (!event) return;
    switch (event) {
      case 'glide':
        this.playGlide();
        break;
      case 'card_open':
        this.playCardOpen();
        break;
      case 'key_tap':
        this.playKeyTap();
        break;
      case 'validate_click':
        this.playValidateClick();
        break;
      case 'sync_chime':
        this.playSyncChime();
        break;
    }
  }
}

/** Singleton partagé pour toute l'application */
export const soundEngine = new SoundEngine();
