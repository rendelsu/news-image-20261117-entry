#!/usr/bin/env python3
"""THE WORLD IN PICTURES - one day's world news as nine pictures.

Draws a 1024x1024 newspaper front page for Tuesday 17 November 2026:
a masthead, a ticker strip, and nine illustrated panels, each a drawn
scene (not a wall of text) with a short headline and a one-line caption.
Writes exactly one PNG to $MAKEFUN_OUTPUT_DIR/entry.png (or /output).
Deterministic: fixed coordinates, no randomness, no network.
"""

import math
import os

from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 1024
PAPER = (251, 246, 236)
INK = (22, 22, 22)
RED = (200, 16, 46)
NAVY = (18, 28, 52)
GREY = (92, 86, 76)

FONT_DIRS = (
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/truetype/liberation",
)


def load_font(names, size):
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    pass
    return ImageFont.load_default()


def sans(size, bold=True):
    names = ["DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"] if bold else \
        ["DejaVuSans.ttf", "LiberationSans-Regular.ttf"]
    return load_font(names, size)


def serif(size, bold=True):
    names = ["DejaVuSerif-Bold.ttf", "LiberationSerif-Bold.ttf"] if bold else \
        ["DejaVuSerif.ttf", "LiberationSerif-Regular.ttf"]
    return load_font(names, size)


def text_w(d, s, font):
    return d.textlength(s, font=font)


def fit_font(d, make, s, size, maxw):
    while size > 8:
        f = make(size)
        if text_w(d, s, f) <= maxw:
            return f
        size -= 1
    return make(8)


def ctext(d, cx, y, s, font, fill):
    d.text((cx - text_w(d, s, font) / 2, y), s, font=font, fill=fill)


def middle_text(d, box, s, font, fill):
    x0, y0, x1, y1 = box
    bb = d.textbbox((0, 0), s, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text((x0 + (x1 - x0 - tw) / 2 - bb[0], y0 + (y1 - y0 - th) / 2 - bb[1]),
           s, font=font, fill=fill)


def vgrad(d, box, top, bottom):
    x0, y0, x1, y1 = box
    h = max(1, y1 - y0)
    for i in range(h):
        t = i / h
        c = tuple(int(top[k] + (bottom[k] - top[k]) * t) for k in range(3))
        d.line([(x0, y0 + i), (x1, y0 + i)], fill=c)


def vgrad3(d, box, top, mid, bottom):
    x0, y0, x1, y1 = box
    ym = (y0 + y1) // 2
    vgrad(d, (x0, y0, x1, ym), top, mid)
    vgrad(d, (x0, ym, x1, y1), mid, bottom)


def wave(d, y0, amp, phase, color, width, x1=324):
    pts = [(x, y0 + amp * math.sin(x / 18.0 + phase)) for x in range(0, x1 + 1, 8)]
    d.line(pts, fill=color, width=width)


# ---------------------------------------------------------------- scenes
# Each scene draws inside a 324x182 box, coordinates local to the box.

def sc_globe(img, d, w, h):
    vgrad(d, (0, 0, w, h), (125, 200, 247), (220, 240, 255))
    d.ellipse([52, 28, 272, 154], outline=(255, 255, 255), width=2)
    d.ellipse([92, 19, 232, 159], fill=(43, 124, 211),
              outline=(26, 79, 138), width=3)
    land = (74, 160, 90)
    d.ellipse([118, 50, 162, 84], fill=land)
    d.ellipse([168, 72, 212, 112], fill=land)
    d.ellipse([122, 104, 158, 140], fill=land)
    d.ellipse([168, 120, 196, 144], fill=land)
    d.ellipse([140, 86, 166, 104], fill=land)
    d.arc([105, 38, 152, 68], 200, 320, fill=(255, 255, 255), width=4)
    d.arc([170, 100, 214, 130], 200, 320, fill=(255, 255, 255), width=4)
    d.arc([104, 30, 176, 92], 200, 300, fill=(255, 255, 255), width=3)


def sc_rocket(img, d, w, h):
    vgrad3(d, (0, 0, w, h), (43, 27, 77), (179, 74, 110), (255, 154, 86))
    for i in range(18):
        x = (i * 53 + 17) % 300 + 12
        y = (i * 29 + 7) % 66 + 8
        r = 3 if i % 3 == 0 else 2
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255))
    d.ellipse([268, 16, 292, 40], fill=(255, 240, 200))
    d.polygon([(0, h), (0, 160), (110, 150), (220, 150), (w, 160), (w, h)],
              fill=(30, 20, 40))
    smoke = (216, 216, 216)
    for cx, cy, r in ((110, 150, 16), (135, 158, 20), (190, 158, 20),
                      (215, 150, 16), (162, 165, 22)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=smoke)
    d.polygon([(150, 124), (174, 124), (162, 168)], fill=(255, 122, 26))
    d.polygon([(154, 124), (170, 124), (162, 152)], fill=(255, 215, 64))
    d.polygon([(147, 100), (130, 126), (147, 126)], fill=(214, 48, 49))
    d.polygon([(177, 100), (194, 126), (177, 126)], fill=(214, 48, 49))
    d.rounded_rectangle([147, 52, 177, 126], radius=12, fill=(250, 250, 250),
                        outline=(30, 30, 40), width=2)
    d.polygon([(147, 56), (177, 56), (162, 22)], fill=(214, 48, 49),
              outline=(30, 30, 40))
    d.ellipse([153, 74, 171, 92], fill=(140, 210, 245),
              outline=(30, 30, 40), width=2)
    d.rectangle([147, 108, 177, 116], fill=(214, 48, 49))


def sc_stadium(img, d, w, h):
    d.rectangle([0, 0, w, h], fill=(13, 27, 62))
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for x in (48, 118, 206, 276):
        od.polygon([(x, 34), (x - 38, 150), (x + 38, 150)],
                   fill=(255, 249, 196, 85))
    img.paste(Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB"),
              (0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([16, 66, 308, 148], fill=(58, 74, 122))
    d.ellipse([38, 80, 286, 138], fill=(42, 58, 102))
    palette = [(255, 90, 90), (255, 210, 80), (90, 180, 255),
               (255, 255, 255), (120, 220, 120)]
    for ring, (rx, ry) in enumerate(((128, 32), (108, 24))):
        for k in range(46):
            t = k / 46.0 * 2 * math.pi
            x = 162 + int(rx * math.cos(t))
            y = 107 + int(ry * math.sin(t))
            c = palette[(k + ring * 2) % len(palette)]
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=c)
    d.ellipse([66, 102, 258, 156], fill=(47, 174, 78),
              outline=(255, 255, 255), width=2)
    d.line([(162, 104), (162, 154)], fill=(255, 255, 255), width=2)
    d.ellipse([150, 120, 174, 140], outline=(255, 255, 255), width=2)
    for x in (48, 118, 206, 276):
        d.line([(x, 30), (x, 70)], fill=(200, 200, 210), width=3)
        d.rectangle([x - 8, 22, x + 8, 32], fill=(255, 244, 180),
                    outline=(20, 20, 30))


def sc_storm(img, d, w, h):
    vgrad(d, (0, 0, w, h), (107, 122, 143), (159, 176, 195))
    cloud = (61, 74, 92)
    for box in ((10, 8, 110, 44), (70, 2, 180, 40), (150, 10, 250, 46),
                (220, 4, 320, 38), (40, 26, 150, 58), (180, 28, 290, 60)):
        d.ellipse(box, fill=cloud)
    for i in range(26):
        x = (i * 37 + 9) % 310 + 6
        y0 = 62 + (i * 13) % 40
        d.line([(x, y0), (x - 8, y0 + 16)], fill=(220, 232, 245), width=2)
    d.rectangle([0, 138, w, h], fill=(31, 78, 121))
    for row, y0 in enumerate((146, 158, 170)):
        wave(d, y0, 3, row * 1.3, (255, 255, 255), 2)
    d.polygon([(216, 52), (196, 96), (212, 96), (186, 142), (232, 88),
               (214, 88), (234, 52)], fill=(255, 216, 61),
              outline=(230, 180, 20))
    d.polygon([(0, h), (0, 118), (64, 118), (48, h)], fill=(52, 58, 66))
    d.rectangle([12, 92, 44, 120], fill=(240, 235, 220), outline=INK)
    d.polygon([(8, 94), (28, 78), (48, 94)], fill=(150, 40, 40))
    d.rectangle([24, 102, 34, 112], fill=(255, 220, 90))


def sc_markets(img, d, w, h):
    d.rectangle([0, 0, w, h], fill=(255, 255, 255))
    for x in range(20, 310, 40):
        d.line([(x, 8), (x, 168)], fill=(232, 232, 232), width=1)
    for y in range(20, 175, 30):
        d.line([(8, y), (316, y)], fill=(232, 232, 232), width=1)
    d.line([(36, 150), (286, 42)], fill=(31, 170, 83), width=4)
    d.polygon([(286, 42), (260, 44), (280, 66)], fill=(31, 170, 83))
    data = [(30, 140, 120), (68, 128, 104), (106, 116, 132), (144, 104, 84),
            (182, 92, 72), (220, 80, 96), (258, 68, 50)]
    for x, o, c in data:
        up = c < o
        col = (31, 170, 83) if up else (224, 69, 58)
        d.line([(x + 10, min(o, c) - 10), (x + 10, max(o, c) + 10)],
               fill=col, width=2)
        d.rectangle([x, min(o, c), x + 20, max(o, c)], fill=col)
    d.line([(40, 130), (78, 116), (116, 124), (154, 94), (192, 82),
            (230, 88), (268, 59)], fill=(30, 60, 140), width=3)
    d.line([(8, 168), (316, 168)], fill=INK, width=2)
    f = sans(30, bold=True)
    label = "+1.8%"
    d.text((310 - text_w(d, label, f), 6), label, font=f, fill=(31, 170, 83))


def sc_city(img, d, w, h):
    vgrad3(d, (0, 0, w, h), (74, 42, 110), (232, 93, 117), (255, 179, 71))
    d.ellipse([214, 94, 262, 142], fill=(255, 242, 176))
    for box in ((0, 90, 44, 182), (52, 70, 96, 182), (150, 80, 196, 182),
                (250, 66, 292, 182)):
        d.rectangle(box, fill=(58, 44, 86))
    for bx0, by0, bx1 in ((20, 110, 70), (80, 96, 130), (140, 120, 190),
                          (200, 100, 250), (262, 116, 310)):
        d.rectangle([bx0, by0, bx1, 182], fill=(33, 26, 52))
        for j, wy in enumerate(range(by0 + 10, 162, 14)):
            for i, wx in enumerate(range(bx0 + 6, bx1 - 8, 12)):
                lit = (i + j) % 3 == 0
                d.rectangle([wx, wy, wx + 6, wy + 8],
                            fill=(255, 214, 90) if lit else (52, 44, 80))
    d.rectangle([0, 168, w, h], fill=(20, 16, 32))
    for i, x in enumerate(range(8, 316, 26)):
        col = (255, 255, 220) if i % 2 == 0 else (255, 80, 80)
        d.rectangle([x, 172, x + 8, 176], fill=col)
    for pts in (((60, 40), (66, 44), (72, 40)), ((84, 30), (90, 34), (96, 30))):
        d.line(pts, fill=(30, 20, 40), width=2)


def sc_ship(img, d, w, h):
    vgrad(d, (0, 0, w, h), (207, 238, 247), (240, 250, 252))
    d.ellipse([266, 10, 298, 42], fill=(255, 236, 160))
    for pts in (((40, 30), (46, 34), (52, 30)), ((64, 22), (70, 26), (76, 22)),
                ((88, 34), (94, 38), (100, 34))):
        d.line(pts, fill=(60, 70, 80), width=2)
    d.rectangle([0, 112, w, h], fill=(47, 127, 196))
    for row, y0 in enumerate((124, 140, 158, 172)):
        wave(d, y0, 3, row * 1.1, (255, 255, 255), 2)
    for cx, cy, r in ((214, 50, 8), (206, 42, 10), (196, 34, 12)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(220, 220, 220))
    d.rectangle([208, 60, 226, 100], fill=(220, 60, 50))
    d.rectangle([208, 60, 226, 68], fill=(30, 30, 30))
    boxes = [(52, 100, 92, 126, (214, 48, 49)), (96, 100, 136, 126, (41, 98, 168)),
             (140, 100, 180, 126, (63, 160, 80)), (184, 100, 224, 126, (232, 180, 40)),
             (76, 74, 116, 98, (232, 120, 40)), (120, 74, 160, 98, (120, 80, 180)),
             (164, 74, 204, 98, (50, 170, 170))]
    for x0, y0, x1, y1, col in boxes:
        d.rectangle([x0, y0, x1, y1], fill=col, outline=(25, 25, 25))
    d.rectangle([232, 64, 276, 126], fill=(245, 245, 245), outline=INK)
    d.rectangle([236, 72, 272, 84], fill=(40, 60, 90))
    d.line([(254, 64), (254, 50)], fill=INK, width=2)
    d.ellipse([250, 46, 258, 54], outline=INK, width=2)
    d.polygon([(36, 128), (288, 128), (264, 160), (58, 160)],
              fill=(34, 54, 79))
    d.polygon([(52, 148), (270, 148), (264, 160), (58, 160)],
              fill=(180, 50, 45))
    d.line([(36, 160), (288, 160)], fill=(255, 255, 255), width=2)


def sc_mountains(img, d, w, h):
    vgrad(d, (0, 0, w, h), (174, 226, 255), (232, 247, 255))
    d.ellipse([38, 16, 74, 52], fill=(255, 240, 170))
    d.polygon([(70, 152), (170, 30), (272, 152)], fill=(122, 147, 184))
    d.polygon([(170, 30), (148, 64), (160, 58), (170, 70), (180, 58),
               (192, 64)], fill=(255, 255, 255))
    d.polygon([(0, 152), (76, 58), (152, 152)], fill=(93, 123, 166))
    d.polygon([(76, 58), (58, 84), (68, 79), (76, 88), (84, 79), (94, 84)],
              fill=(255, 255, 255))
    d.polygon([(168, 152), (252, 66), (324, 152)], fill=(109, 138, 181))
    d.polygon([(252, 66), (236, 90), (246, 85), (254, 94), (262, 85),
               (270, 90)], fill=(255, 255, 255))
    d.rectangle([0, 150, w, h], fill=(245, 250, 255))
    d.ellipse([120, 158, 220, 176], fill=(170, 215, 245),
              outline=(140, 190, 225))
    for x, s in ((30, 1.0), (58, 0.8), (248, 1.0), (282, 0.8), (300, 0.6)):
        cx, base = x, 170
        d.rectangle([cx - 2, base - 10, cx + 2, base], fill=(110, 70, 40))
        d.polygon([(cx - 10 * s, base - 8), (cx, base - 30 * s),
                   (cx + 10 * s, base - 8)], fill=(34, 110, 60))
        d.polygon([(cx - 8 * s, base - 20), (cx, base - 38 * s),
                   (cx + 8 * s, base - 20)], fill=(40, 130, 70))


def sc_aurora(img, d, w, h):
    d.rectangle([0, 0, w, h], fill=(6, 18, 43))
    for i in range(24):
        x = (i * 47 + 11) % 310 + 7
        y = (i * 23 + 5) % 110 + 6
        r = 2 if i % 4 == 0 else 1
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255))
    d.ellipse([258, 16, 286, 44], fill=(240, 240, 220))
    d.ellipse([264, 12, 292, 40], fill=(6, 18, 43))
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for color, yb, amp, ph in (((57, 255, 136), 30, 10, 0.0),
                               ((53, 224, 200), 62, 12, 1.2),
                               ((168, 107, 255), 92, 8, 2.4)):
        top = [(x, yb + amp * math.sin(x / 55.0 + ph))
               for x in range(0, w + 1, 8)]
        bot = [(x, yb + 34 + amp * math.sin(x / 55.0 + ph + 0.6))
               for x in range(w, -1, -8)]
        od.polygon(top + bot, fill=color + (170,))
    img.paste(Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB"),
              (0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(0, h), (0, 152), (w, 146), (w, h)], fill=(220, 232, 245))
    for x, s in ((24, 1.0), (52, 0.75), (268, 1.0), (296, 0.7)):
        cx, base = x, 164
        d.polygon([(cx - 10 * s, base), (cx, base - 30 * s),
                   (cx + 10 * s, base)], fill=(16, 42, 32))
        d.polygon([(cx - 8 * s, base - 12), (cx, base - 38 * s),
                   (cx + 8 * s, base - 12)], fill=(16, 42, 32))
    d.rectangle([140, 128, 176, 152], fill=(90, 60, 40))
    d.polygon([(134, 130), (158, 114), (182, 130)], fill=(50, 30, 25))
    d.rectangle([152, 136, 164, 146], fill=(255, 210, 90))


PANELS = [
    (sc_globe, "WORLD", "ONE WORLD, ONE DAY", "Every continent, one shared day."),
    (sc_rocket, "SPACE", "LIFTOFF AT DAWN", "A new crew rides to orbit."),
    (sc_stadium, "SPORT", "UNDER THE LIGHTS", "A roaring night of football."),
    (sc_storm, "WEATHER", "STORM OVER THE COAST", "Rain and wind lash the shore."),
    (sc_markets, "MARKETS", "MARKETS CLIMB", "Shares end the day higher."),
    (sc_city, "CITIES", "CITY AT DUSK", "Lights come on at rush hour."),
    (sc_ship, "TRADE", "ACROSS THE SEA", "Cargo keeps the world moving."),
    (sc_mountains, "CLIMATE", "FIRST SNOW", "Winter arrives in the high peaks."),
    (sc_aurora, "NORTH", "SKY ON FIRE", "Northern lights dance till dawn."),
]


def draw_chip(d, label):
    f = sans(14, bold=True)
    tw = text_w(d, label, f)
    d.rectangle([8, 8, 8 + tw + 14, 30], fill=RED)
    d.text((15, 10), label, font=f, fill=(255, 255, 255))


def main():
    page = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(page)

    # Masthead
    name = "THE WORLD IN PICTURES"
    f_name = fit_font(d, lambda s: serif(s, bold=True), name, 62, 990)
    ctext(d, W // 2, 14, name, f_name, INK)
    d.rectangle([16, 92, 1008, 96], fill=INK)
    d.rectangle([16, 99, 1008, 100], fill=INK)

    # Dateline row
    f_small = sans(16, bold=True)
    d.text((16, 108), "TUESDAY EDITION", font=f_small, fill=INK)
    right = "ONE DAY  •  ONE PLANET"
    d.text((1008 - text_w(d, right, f_small), 108), right, font=f_small,
           fill=INK)
    f_date = sans(24, bold=True)
    ctext(d, W // 2, 106, "Tuesday, 17 November 2026", f_date, RED)

    # Ticker strip
    d.rectangle([16, 138, 1008, 168], fill=NAVY)
    ticker = ("MARKETS RISE  •  ROCKET LIFTS OFF  •  STORM WARNING ON THE "
              "COAST  •  FIRST SNOW IN THE ALPS  •  AURORA OVER THE NORTH")
    f_tick = fit_font(d, lambda s: sans(s, bold=True), ticker, 17, 960)
    middle_text(d, (16, 138, 1008, 168), ticker, f_tick, (255, 255, 255))

    # Panel grid: 3 x 3
    pw, ph, gut, top, left = 324, 256, 10, 178, 16
    scene_h = 182
    for i, (scene, chip, head, cap) in enumerate(PANELS):
        x = left + (i % 3) * (pw + gut)
        y = top + (i // 3) * (ph + gut)
        d.rectangle([x, y, x + pw, y + ph], fill=(255, 255, 255))
        layer = Image.new("RGB", (pw, scene_h))
        ld = ImageDraw.Draw(layer)
        scene(layer, ld, pw, scene_h)
        draw_chip(ImageDraw.Draw(layer), chip)
        page.paste(layer, (x, y))
        d.rectangle([x, y, x + pw, y + ph], outline=INK, width=2)
        f_head = fit_font(d, lambda s: sans(s, bold=True), head, 23, pw - 16)
        ctext(d, x + pw // 2, y + 190, head, f_head, INK)
        f_cap = sans(15, bold=False)
        ctext(d, x + pw // 2, y + 219, cap, f_cap, GREY)

    # Footer
    d.rectangle([16, 976, 1008, 977], fill=INK)
    f_foot = sans(15, bold=False)
    ctext(d, W // 2, 986,
          "Nine pictures from one day — drawn from the day's news as reported "
          "around the world.", f_foot, GREY)

    outdir = os.environ.get("MAKEFUN_OUTPUT_DIR") or "/output"
    os.makedirs(outdir, exist_ok=True)
    page.save(os.path.join(outdir, "entry.png"), "PNG", optimize=True)


if __name__ == "__main__":
    main()
