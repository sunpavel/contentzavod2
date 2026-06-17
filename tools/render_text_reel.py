#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Рендер текстового вертикального рилса (9:16) без внешних API — $0.
Формат "читается без звука": боль -> НАДОЕЛО -> мок экрана приложения -> выгода -> save -> CTA.
Звук/трендовое аудио добавляется на площадке при заливке.
Использование: python3 tools/render_text_reel.py
"""
import os, subprocess
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

W, H = 1080, 1920
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT_DIR, exist_ok=True)
HANDLE = "@foodgenius_ai_bot"

# палитра
DARK   = (18, 18, 22)
MUTED  = (40, 40, 48)
RED    = (214, 58, 48)
GREEN  = (29, 165, 92)
WARM   = (240, 158, 38)
WHITE  = (245, 245, 245)
INK    = (24, 24, 28)

def font(path, size):
    return ImageFont.truetype(path, size)

def line_w(draw, text, f):
    b = draw.textbbox((0, 0), text, font=f)
    return b[2] - b[0], b[3] - b[1]

def fit_font(draw, lines, max_w, max_h, max_size, path=BOLD, min_size=40):
    size = max_size
    while size > min_size:
        f = font(path, size)
        widths = [line_w(draw, ln, f)[0] for ln in lines]
        lh = f.size * 1.25
        total_h = lh * len(lines)
        if max(widths) <= max_w and total_h <= max_h:
            return f, lh
        size -= 4
    return font(path, min_size), font(path, min_size).size * 1.25

def fit_line(draw, text, max_w, max_size, path=BOLD, min_size=24):
    size = max_size
    while size > min_size:
        f = font(path, size)
        if line_w(draw, text, f)[0] <= max_w:
            return f
        size -= 2
    return font(path, min_size)

def draw_block(draw, lines, color, cy, max_w=900, max_h=900, max_size=150, path=BOLD, shadow=True):
    f, lh = fit_font(draw, lines, max_w, max_h, max_size, path)
    total_h = lh * len(lines)
    y = cy - total_h / 2
    for ln in lines:
        w, _ = line_w(draw, ln, f)
        x = (W - w) / 2
        if shadow:
            draw.text((x + 4, y + 4), ln, font=f, fill=(0, 0, 0))
        draw.text((x, y), ln, font=f, fill=color)
        y += lh

def footer(draw):
    f = font(REG, 34)
    w, _ = line_w(draw, HANDLE, f)
    draw.text(((W - w) / 2, 1815), HANDLE, font=f, fill=(150, 150, 155))

def top_label(draw, text, color=WHITE):
    f = font(BOLD, 48)
    w, _ = line_w(draw, text, f)
    draw.text(((W - w) / 2, 300), text.upper(), font=f, fill=color)

def base(bg):
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)

# ---------- сцены ----------
def scene_pain(day, line2):
    img, d = base(MUTED)
    top_label(d, day, (170, 170, 178))
    draw_block(d, [line2], WHITE, H/2, max_size=170)
    footer(d)
    return img

def scene_slam():
    img, d = base(RED)
    draw_block(d, ["НАДОЕЛО?"], WHITE, H/2, max_size=200)
    return img

def scene_demo():
    img, d = base(GREEN)
    top_label(d, "Открываешь — и вот меню:")
    # мок телефона
    px0, py0, px1, py1 = 230, 470, 850, 1560
    d.rounded_rectangle([px0, py0, px1, py1], radius=60, fill=WHITE)
    d.rounded_rectangle([px0, py0, px1, py1], radius=60, outline=(20, 20, 20), width=6)
    # шапка приложения
    hf = font(BOLD, 46); sf = font(BOLD, 34)
    d.text((px0 + 50, py0 + 45), "FoodGenius", font=hf, fill=INK)
    d.text((px0 + 50, py0 + 110), "Меню на неделю", font=sf, fill=GREEN)
    d.line([px0 + 50, py0 + 165, px1 - 50, py0 + 165], fill=(225, 225, 225), width=3)
    dishes = [
        ("Паста с курицей", "15 мин · 180 ₽"),
        ("Боул с нутом", "12 мин · 140 ₽"),
        ("Том-ям", "20 мин · 260 ₽"),
        ("Шакшука", "10 мин · 120 ₽"),
        ("Лосось терияки", "18 мин · 290 ₽"),
        ("Грибное ризотто", "22 мин · 170 ₽"),
    ]
    rsf = font(REG, 30)
    name_max_w = (px1 - 35) - (px0 + 140)
    ry = py0 + 200
    for i, (name, sub) in enumerate(dishes):
        if i % 2 == 0:
            d.rounded_rectangle([px0 + 35, ry, px1 - 35, ry + 130], radius=24, fill=(244, 248, 245))
        d.ellipse([px0 + 55, ry + 35, px0 + 115, ry + 95], fill=(210, 236, 220))
        rf = fit_line(d, name, name_max_w, 40)
        d.text((px0 + 140, ry + 28), name, font=rf, fill=INK)
        d.text((px0 + 140, ry + 82), sub, font=rsf, fill=(120, 120, 125))
        ry += 150
    return img

def scene_benefit():
    img, d = base(GREEN)
    draw_block(d, ["Готовые рецепты", "15 минут", "≈ 150 ₽ порция"], WHITE, H/2, max_size=120)
    footer(d)
    return img

def scene_save():
    img, d = base(DARK)
    # иконка-закладка
    bx, by = W/2 - 55, 560
    d.polygon([(bx, by), (bx + 110, by), (bx + 110, by + 150), (bx + 55, by + 110), (bx, by + 150)], fill=WARM)
    draw_block(d, ["Сохрани,", "чтобы не есть", "одно и то же"], WHITE, H/2 + 120, max_size=120)
    footer(d)
    return img

def scene_cta():
    img, d = base(GREEN)
    draw_block(d, ["AI соберёт твой", "план питания", "и список покупок"], WHITE, 760, max_size=110)
    # плашка с ботом
    bf = font(BOLD, 60)
    w, _ = line_w(d, HANDLE, bf)
    d.rounded_rectangle([(W - w)/2 - 50, 1230, (W + w)/2 + 50, 1360], radius=40, fill=WHITE)
    d.text(((W - w)/2, 1255), HANDLE, font=bf, fill=GREEN)
    f2 = font(REG, 42)
    t = "бесплатно, в Telegram"
    w2, _ = line_w(d, t, f2)
    d.text(((W - w2)/2, 1410), t, font=f2, fill=WHITE)
    return img

# (image, seconds)
SCENES = [
    (scene_pain("Понедельник", "Гречка."), 0.9),
    (scene_pain("Вторник", "Гречка."), 0.9),
    (scene_pain("Среда", "Опять гречка."), 1.2),
    (scene_slam(), 1.3),
    (scene_demo(), 4.2),
    (scene_benefit(), 3.0),
    (scene_save(), 2.3),
    (scene_cta(), 2.8),
]

frames = []
concat_lines = []
for i, (img, dur) in enumerate(SCENES):
    p = os.path.join(OUT_DIR, f"_f{i:02d}.png")
    img.save(p)
    frames.append((p, dur))
    concat_lines.append(f"file '{os.path.abspath(p)}'")
    concat_lines.append(f"duration {dur}")
# повторить последний кадр (требование concat-демуксера)
concat_lines.append(f"file '{os.path.abspath(frames[-1][0])}'")

list_path = os.path.join(OUT_DIR, "_concat.txt")
open(list_path, "w").write("\n".join(concat_lines))

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
out = os.path.abspath(os.path.join(OUT_DIR, "foodgenius_grechka_v1.mp4"))

def run(codec_args):
    cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", list_path,
           "-vf", "fps=30,format=yuv420p", *codec_args,
           "-movflags", "+faststart", out]
    return subprocess.run(cmd, capture_output=True, text=True)

r = run(["-c:v", "libx264", "-preset", "medium", "-crf", "20"])
if r.returncode != 0:
    print("libx264 недоступен, fallback mpeg4...\n", r.stderr[-600:])
    r = run(["-c:v", "mpeg4", "-q:v", "3"])

# чистим временные кадры
for p, _ in frames:
    try: os.remove(p)
    except: pass
try: os.remove(list_path)
except: pass

total = sum(d for _, d in SCENES)
print("RC:", r.returncode)
if r.returncode != 0:
    print(r.stderr[-800:])
else:
    sz = os.path.getsize(out)
    print(f"OK -> {out}  ({sz//1024} KB, ~{total:.1f}s, {len(SCENES)} сцен)")
