#!/usr/bin/env python3
"""Zero Tampas · trilha original sintetizada (sem direitos de terceiros) + efeitos nos tempos da cena.
Uso: python3 ferramentas/trilha.py <sfx.json> <saida.wav> [semente]
"""
import json, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 44100


def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.exp(-t / r)
    return e


def nota(f):
    return 440.0 * 2 ** ((f - 69) / 12)


def lowpass(x, fc):
    b, a = butter(2, fc / (SR / 2))
    return lfilter(b, a, x)


def main():
    cfg = json.load(open(sys.argv[1]))
    dur = cfg["dur"]
    seed = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    mix = np.zeros(n)
    bpm = 104
    beat = 60 / bpm
    # progressão alegre: C  G  Am  F  (midi das fundamentais) — transposta pela semente
    tr = [0, 2, -3][seed % 3]
    prog = [[60, 64, 67], [55, 59, 62, 67], [57, 60, 64], [53, 57, 60, 65]]
    bar = beat * 4
    # pad suave
    for i in range(int(dur / bar) + 1):
        ch = prog[i % 4]
        s = int(i * bar * SR); e = min(n, int((i + 1) * bar * SR))
        if s >= n: break
        t = np.arange(e - s) / SR
        pad = sum(np.sign(np.sin(2 * np.pi * nota(m + tr) * t)) * 0.5 + np.sin(2 * np.pi * nota(m + tr) * 1.003 * t) for m in ch)
        pad = lowpass(pad, 1200) * 0.035
        fade = np.minimum(1, np.minimum(t / 0.05, (t[-1] - t + 1e-3) / 0.08))
        mix[s:e] += pad * fade
    # arpejo "pluck" em colcheias
    k = 0
    tt = 0.0
    while tt < dur:
        ch = prog[int(tt / bar) % 4]
        m = ch[k % len(ch)] + 12 + tr
        s = int(tt * SR); L = int(0.35 * SR)
        t = np.arange(L) / SR
        tone = (np.sin(2 * np.pi * nota(m) * t) + 0.3 * np.sin(2 * np.pi * nota(m) * 2 * t)) * env(L, 0.002, 0.12)
        e = min(n, s + L); mix[s:e] += tone[: e - s] * 0.12
        k += 1; tt += beat / 2
    # bateria leve: bombo nos tempos 1 e 3, palma no 2 e 4, chimbal nas colcheias
    tt = 0.0; b = 0
    while tt < dur:
        s = int(tt * SR)
        if b % 2 == 0:  # bombo
            L = int(0.25 * SR); t = np.arange(L) / SR
            f = 50 + 90 * np.exp(-t * 30)
            kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
            e = min(n, s + L); mix[s:e] += kick[: e - s] * 0.55
        else:  # palma
            L = int(0.18 * SR)
            clap = lowpass(rng.standard_normal(L), 3500) * env(L, 0.001, 0.05)
            e = min(n, s + L); mix[s:e] += clap[: e - s] * 0.22
        for off in (0, beat / 2):  # chimbal
            s2 = int((tt + off) * SR); L = int(0.05 * SR)
            hat = np.diff(rng.standard_normal(L + 1)) * env(L, 0.001, 0.015)
            e = min(n, s2 + L)
            if s2 < n: mix[s2:e] += hat[: e - s2] * 0.05
        b += 1; tt += beat
    # efeitos: 1 = pop (balão), 2 = ding, 3 = whoosh (final)
    for t0, kind in cfg["sfx"]:
        s = int(t0 * SR)
        if s >= n: continue
        if kind == 1:
            L = int(0.12 * SR); t = np.arange(L) / SR
            f = 900 - 500 * t / t[-1]
            fx = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(L, 0.001, 0.04) * 0.5
        elif kind == 2:
            L = int(0.6 * SR); t = np.arange(L) / SR
            fx = (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 1976 * t)) * env(L, 0.002, 0.25) * 0.25
        else:
            L = int(0.7 * SR); t = np.arange(L) / SR
            fx = lowpass(rng.standard_normal(L), 2500) * np.sin(np.pi * t / t[-1]) * 0.35
        e = min(n, s + L); mix[s:e] += fx[: e - s]
    # final: fade-out de 0,6 s e normalização a -1 dBFS
    fo = int(0.6 * SR); mix[-fo:] *= np.linspace(1, 0, fo)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
    wavfile.write(sys.argv[2], SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
    print("✓", sys.argv[2], f"{dur}s")


if __name__ == "__main__":
    main()
