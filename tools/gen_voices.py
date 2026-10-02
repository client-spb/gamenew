# -*- coding: utf-8 -*-
"""
Генерация русской озвучки мультфильма.

Требуется: RHVoice (+ rhvoice-russian), sox, lame, numpy.
    sudo apt install rhvoice rhvoice-russian sox lame
    pip install numpy

Запуск из корня проекта:  python3 tools/gen_voices.py
Результат:
    js/voice-meta.js  — тексты, длительности и огибающие для липсинка
    audio/voices.js   — сами реплики (mp3 в base64), чтобы мультфильм
                         работал даже при открытии index.html двойным кликом
"""
import base64
import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from lines import LINES, SPEAKERS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 25  # кадров огибающей в секунду


def run(cmd, **kw):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, **kw)


def synth(lid, spk, text, tmp):
    voice, rate, pitch, fx = SPEAKERS[spk]
    txt = os.path.join(tmp, lid + '.txt')
    raw = os.path.join(tmp, lid + '_raw.wav')
    out = os.path.join(tmp, lid + '.wav')
    with open(txt, 'w', encoding='utf-8') as f:
        f.write(text)
    run(['RHVoice-test', '-p', voice, '-r', str(rate), '-t', str(pitch), '-i', txt, '-o', raw])
    # обрезаем тишину, накладываем характер голоса, нормализуем
    run(['sox', raw, '-r', '24000', out,
         'silence', '1', '0.02', '0.4%', 'reverse', 'silence', '1', '0.02', '0.4%', 'reverse',
         *fx, 'norm', '-1.5', 'pad', '0.03', '0.06'])
    return out


def envelope(path):
    with wave.open(path) as w:
        sr = w.getframerate()
        n = w.getnframes()
        data = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() > 1:
            data = data.reshape(-1, w.getnchannels()).mean(axis=1)
    hop = sr // FPS
    frames = max(1, len(data) // hop)
    rms = np.array([np.sqrt(np.mean(data[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(frames)])
    peak = np.percentile(rms, 95) or 1.0
    lv = np.clip(rms / peak, 0, 1)
    lv = np.where(lv < 0.12, 0, lv)
    return ''.join(str(int(round(v * 9))) for v in lv), len(data) / sr


def main():
    meta = {}
    data = {}
    with tempfile.TemporaryDirectory() as tmp:
        for item in LINES:
            lid, spk, tts = item[0], item[1], item[2]
            sub = item[3] if len(item) > 3 else tts.replace('+', '')
            wav = synth(lid, spk, tts, tmp)
            env, dur = envelope(wav)
            mp3 = os.path.join(tmp, lid + '.mp3')
            run(['lame', '--silent', '-m', 'm', '-b', '48', '--resample', '24', wav, mp3])
            with open(mp3, 'rb') as f:
                data[lid] = base64.b64encode(f.read()).decode('ascii')
            meta[lid] = {'s': spk, 't': sub, 'd': round(dur, 3), 'e': env}
            print(f'{lid:10s} {spk} {dur:5.2f}s  {sub}')

    with open(os.path.join(ROOT, 'js', 'voice-meta.js'), 'w', encoding='utf-8') as f:
        f.write('// Сгенерировано tools/gen_voices.py — не редактировать вручную.\n')
        f.write('// s — говорящий, t — субтитр, d — длительность (с), e — огибающая громкости 25 к/с (0-9) для липсинка.\n')
        f.write('window.VOICE_META = {\n')
        for lid, m in meta.items():
            f.write('  ' + json.dumps(lid) + ': ' + json.dumps(m, ensure_ascii=False) + ',\n')
        f.write('};\n')

    with open(os.path.join(ROOT, 'audio', 'voices.js'), 'w', encoding='utf-8') as f:
        f.write('// Сгенерировано tools/gen_voices.py: реплики персонажей (mp3, base64).\n')
        f.write('window.VOICE_DATA = {\n')
        for lid, b in data.items():
            f.write('  ' + json.dumps(lid) + ': "' + b + '",\n')
        f.write('};\n')
        f.write('if (window.onVoiceData) window.onVoiceData();\n')

    total = sum(m['d'] for m in meta.values())
    print(f'Всего реплик: {len(meta)}, общая длительность {total:.1f} c')


if __name__ == '__main__':
    main()
