#!/usr/bin/env python3
"""Render captured demo output. Requires Pillow; fonts stay on the local machine."""
import argparse
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--input', default='docs/assets/jev-demo.json')
parser.add_argument('--output', default='docs/assets/jev-demo.gif')
args = parser.parse_args()
record = json.loads(Path(args.input).read_text())
if record.get('mode') != 'local-simulated-provider':
    raise SystemExit('Expected an explicitly labeled simulated-provider recording.')

def font(name, size):
    resolved = subprocess.check_output(['fc-match', '-f', '%{file}', name], text=True)
    return ImageFont.truetype(resolved, size)

sans = font('sans-serif', 20)
small = font('sans-serif', 15)
heading = font('sans-serif', 34)
mono = font('monospace', 20)
label = font('sans-serif', 17)
W, H = 1120, 760
bg = '#0b111b'
muted = '#91a1b5'
ink = '#e6edf5'
mint = '#78e5bd'
amber = '#f2c879'
scenes = record['scenes']


def frame(index, visible, cursor=False):
    im = Image.new('RGB', (W, H), bg)
    draw = ImageDraw.Draw(im)
    draw.text((46, 29), 'jev in codex', font=heading, fill=ink)
    draw.rounded_rectangle((824, 36, 1074, 73), radius=18, fill='#302b20')
    draw.text((841, 43), 'SIMULATED TYPESAFE', font=label, fill=amber)
    draw.text((48, 82), 'Find the next useful tool, file, and log excerpt.', font=sans, fill=muted)
    tabs = [('01  SELECT A TOOL', 48, 357), ('02  FIND CODE', 369, 700), ('03  TRIAGE OUTPUT', 712, 1074)]
    for step, (text, left, right) in enumerate(tabs, 1):
        active = index == step
        draw.rounded_rectangle((left, 130, right, 177), radius=10,
                               fill='#173b33' if active else '#141e2c',
                               outline=mint if active else '#263447')
        draw.text((left + 18, 141), text, font=label, fill=mint if active else muted)
    draw.rounded_rectangle((48, 203, 1074, 674), radius=15, fill='#101a27', outline='#304054', width=1)
    draw.line((49, 251, 1072, 251), fill='#304054')
    for x, color in [(69, '#ec7777'), (89, '#f2c879'), (109, '#78e5bd')]:
        draw.ellipse((x, 223, x + 10, 233), fill=color)
    draw.text((143, 215), scenes[index]['title'], font=sans, fill=ink)
    draw.text((1000, 217), f'{index + 1:02d}/05', font=small, fill=muted)
    for row, text in enumerate(scenes[index]['lines'][:visible]):
        color = ink
        if text.startswith(('$', '>')):
            color = mint
        elif text.startswith(('Recommended:', 'Top match:', 'Top excerpt:', 'Relevance score:')):
            color = mint
        elif text.startswith(('FAIL', 'Error:', 'Expected', 'Received:')):
            color = amber
        elif text.startswith(('Synthetic', 'The caller', 'Original', 'Example shortlist:')):
            color = muted
        if draw.textbbox((0, 0), text, font=mono)[2] > 971:
            raise ValueError(f'Line does not fit: {text}')
        draw.text((74, 274 + row * 35), text, font=mono, fill=color)
    if cursor and visible < len(scenes[index]['lines']):
        draw.rectangle((74, 281 + visible * 35, 84, 302 + visible * 35), fill=mint)
    draw.text((48, 701), 'REAL MCP CALLS  /  SYNTHETIC DATA  /  PACED REPLAY', font=small, fill=muted)
    draw.text((820, 701), 'github.com/teempai/jev-in-codex', font=small, fill=muted)
    return im

frames, durations = [], []
for index, scene in enumerate(scenes):
    for visible in range(len(scene['lines']) + 1):
        image = frame(index, visible, cursor=True)
        frames.append(image.quantize(colors=96))
        durations.append(180 if visible else 300)
    frames.append(frame(index, len(scene['lines'])).quantize(colors=96))
    durations.append(3800 if index == len(scenes) - 1 else 3000)
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(output, save_all=True, append_images=frames[1:], duration=durations,
               loop=0, optimize=True, disposal=1)
poster = output.with_suffix('.png')
frame(3, len(scenes[3]['lines'])).save(poster, optimize=True)
print(f'{output}: {len(frames)} frames, {sum(durations)/1000:.1f}s, {output.stat().st_size:,} bytes')
print(f'{poster}: static preview')
