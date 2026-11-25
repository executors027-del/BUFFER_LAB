/* Buffer Lab's independent, deterministic simulation engine. */
(function (global) {
  "use strict";
  const STATES = Object.freeze({ READY:"READY", PLAYING:"PLAYING", BUFFERING:"BUFFERING", PAUSED:"PAUSED", COMPLETED:"COMPLETED" });
  const VIDEO_DURATION = 90;
  const RESUME_THRESHOLD = 2;
  const MAX_STEP = 0.1;

  class BufferSimulation {
    constructor(options = {}) {
      this.config = {
        downloadMbps: options.downloadMbps ?? 2,
        bitrateMbps: options.bitrateMbps ?? 5,
        capacitySeconds: options.capacitySeconds ?? 30,
        stability: options.stability ?? 90
      };
      this.reset();
    }
    reset() {
      this.buffer = 0;
      this.playbackTime = 0;
      this.elapsedTime = 0;
      this.bufferingEvents = 0;
      this.bufferingDuration = 0;
      this.state = STATES.READY;
      this.playRequested = false;
      this.outageRemaining = 0;
      this.outageElapsed = 0;
      this.currentDownloadMbps = this.config.downloadMbps;
      this.history = [{ time: 0, buffer: 0, speed: this.currentDownloadMbps }];
      this._randomState = 417;
      this._wasBuffering = false;
      this._lastSample = 0;
    }
    configure(next) {
      const oldCapacity = this.config.capacitySeconds;
      Object.assign(this.config, next);
      this.config.downloadMbps = Math.max(0, Number(this.config.downloadMbps));
      this.config.bitrateMbps = Math.max(0.01, Number(this.config.bitrateMbps));
      this.config.capacitySeconds = Math.max(1, Number(this.config.capacitySeconds));
      this.config.stability = Math.min(100, Math.max(0, Number(this.config.stability)));
      this.buffer = Math.min(this.buffer, this.config.capacitySeconds);
      if (oldCapacity !== this.config.capacitySeconds) this._record(true);
    }
    play() {
      if (this.state === STATES.COMPLETED) return;
      this.playRequested = true;
      if (this.buffer >= RESUME_THRESHOLD || this.buffer >= this.config.capacitySeconds) this.state = STATES.PLAYING;
      else {
        if (this.state !== STATES.BUFFERING) this.bufferingEvents++;
        this.state = STATES.BUFFERING;
      }
    }
    pause() {
      if (this.state === STATES.COMPLETED) return;
      this.playRequested = false;
      this.state = STATES.PAUSED;
    }
    triggerOutage(seconds = 8) {
      this.outageRemaining = Math.max(this.outageRemaining, seconds);
      this.outageElapsed = 0;
    }
    _random() {
      // Mulberry32-style deterministic generator; reset repeats the same fluctuations.
      let t = this._randomState += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    _networkSpeed() {
      if (this.outageRemaining > 0) return 0;
      const intensity = (100 - this.config.stability) / 100;
      const variation = (this._random() * 2 - 1) * intensity;
      return Math.max(0, this.config.downloadMbps * (1 + variation));
    }
    step(dt) {
      // Split large frame gaps into small steps; discard tab-suspension gaps above MAX_STEP at caller.
      let remaining = Math.min(Math.max(0, dt), 1);
      while (remaining > 1e-8) {
        const h = Math.min(MAX_STEP, remaining);
        this._stepSmall(h);
        remaining -= h;
      }
      return this.snapshot();
    }
    _stepSmall(dt) {
      this.elapsedTime += dt;
      const speed = this._networkSpeed();
      this.currentDownloadMbps = speed;
      const incomingVideoSeconds = (speed / this.config.bitrateMbps) * dt;
      const freeCapacity = Math.max(0, this.config.capacitySeconds - this.buffer);
      const accepted = Math.min(incomingVideoSeconds, freeCapacity);
      this.buffer = Math.min(this.config.capacitySeconds, Math.max(0, this.buffer + accepted));
      if (this.outageRemaining > 0) {
        this.outageRemaining = Math.max(0, this.outageRemaining - dt);
        this.outageElapsed += dt;
      }

      if (this.playRequested && this.state !== STATES.COMPLETED) {
        if (this.state === STATES.BUFFERING) {
          if (this.buffer >= Math.min(RESUME_THRESHOLD, this.config.capacitySeconds)) this.state = STATES.PLAYING;
          else this.bufferingDuration += dt;
        }
        if (this.state === STATES.PLAYING) {
          const consumed = Math.min(dt, this.buffer);
          this.buffer = Math.max(0, this.buffer - consumed);
          this.playbackTime = Math.min(VIDEO_DURATION, this.playbackTime + consumed);
          if (this.buffer <= 1e-7 && this.playbackTime < VIDEO_DURATION) {
            this.buffer = 0;
            this.state = STATES.BUFFERING;
            this.bufferingEvents++;
          }
          if (this.playbackTime >= VIDEO_DURATION - 1e-7) {
            this.playbackTime = VIDEO_DURATION;
            this.state = STATES.COMPLETED;
            this.playRequested = false;
          }
        }
      }
      this.buffer = Math.min(this.config.capacitySeconds, Math.max(0, this.buffer));
      if (this.elapsedTime - this._lastSample >= 0.2 || this.elapsedTime === 0) this._record();
    }
    _record(force = false) {
      const last = this.history[this.history.length - 1];
      if (force || !last || this.elapsedTime - this._lastSample >= 0.2) {
        this.history.push({ time:this.elapsedTime, buffer:this.buffer, speed:this.currentDownloadMbps });
        this._lastSample = this.elapsedTime;
        if (this.history.length > 450) this.history.splice(0, this.history.length - 450);
      }
    }
    snapshot() {
      const ratio = this.currentDownloadMbps / this.config.bitrateMbps;
      const draining = this.playRequested && this.state === STATES.PLAYING && ratio < 1;
      return {
        ...this.config, buffer:this.buffer, state:this.state, playbackTime:this.playbackTime,
        elapsedTime:this.elapsedTime, bufferingEvents:this.bufferingEvents,
        bufferingDuration:this.bufferingDuration, currentDownloadMbps:this.currentDownloadMbps,
        ratio, outageRemaining:this.outageRemaining, history:this.history.slice(),
        timeToEmpty:draining ? this.buffer / (1 - ratio) : null,
        playRequested:this.playRequested, videoDuration:VIDEO_DURATION
      };
    }
  }
  global.BufferLabSimulation = { BufferSimulation, STATES, VIDEO_DURATION, RESUME_THRESHOLD };
})(window);
