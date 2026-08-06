from __future__ import annotations

import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data" / "lectures.json"
OUTPUT = ROOT / "public" / "images" / "lectures"
FONT = ROOT / "public" / "fonts" / "fz-qingke-benyuesong.ttf"

WIDTH, HEIGHT = 720, 960
PALETTES = {
    "maths": ("#eef3f0", "#203a39", "#6f8f86", "#b49255"),
    "physics": ("#f2efed", "#372d32", "#8a4054", "#b49559"),
}
SUPPORTED_STEMS = {
    "Stu_AA", "Stu_DG-Manifold", "Stu_GRT", "Stu_LA", "Lec_ODE", "Lec_PS",
    "Rev_LA", "Rev_MP-Method", "Aux_AA", "Aux_ODE", "Stu_CM", "Stu_QM",
    "Stu_SR", "Lec_AP", "Lec_ED", "Lec_OP", "Rev_AP", "Rev_CM", "Rev_ED",
    "Rev_EM", "Rev_TH", "Aux_AP", "Aux_ED", "Aux_SCH", "Aux_CS", "Aux_QHO",
    "Aux_TR", "Aux_IP", "Aux_CO", "Aux_SQ", "Aux_IDP", "Aux_PI", "Aux_BCH",
    "Aux_RQM_ds", "Aux_RQM_qwen", "Aux_RQM", "Aux_PBSG", "Aux_AMT",
    "Aux_TRM", "Aux_AMR", "Aux_MLA", "Aux_MLA_Dist", "Aux_FRO", "Aux_FRO_Dist",
}


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size=size)


def display_text(text: str) -> str:
    return text.replace("ö", "o").replace("Ö", "O")


def wrap_text(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    tokens = re.findall(r"[A-Za-z0-9&:+.-]+|\s+|.", display_text(text))
    lines: list[str] = []
    current = ""
    for token in tokens:
        candidate = f"{current}{token}"
        if current and draw.textlength(candidate, font=face) > max_width:
            lines.append(current.rstrip())
            current = token.lstrip()
        else:
            current = candidate
    if current.strip():
        lines.append(current.rstrip())
    return lines


def topic_point(x: float, y: float) -> tuple[int, int]:
    return (int(132 + x * 472), int(182 + y * 390))


def polyline(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[float, float]],
    fill: str,
    width: int = 3,
) -> None:
    draw.line([topic_point(x, y) for x, y in points], fill=fill, width=width, joint="curve")


def arrow(
    draw: ImageDraw.ImageDraw,
    start: tuple[float, float],
    end: tuple[float, float],
    fill: str,
    width: int = 3,
) -> None:
    x1, y1 = topic_point(*start)
    x2, y2 = topic_point(*end)
    draw.line((x1, y1, x2, y2), fill=fill, width=width)
    angle = math.atan2(y2 - y1, x2 - x1)
    size = 13
    head = [
        (x2, y2),
        (x2 - size * math.cos(angle - 0.55), y2 - size * math.sin(angle - 0.55)),
        (x2 - size * math.cos(angle + 0.55), y2 - size * math.sin(angle + 0.55)),
    ]
    draw.polygon(head, fill=fill)


def node(draw: ImageDraw.ImageDraw, x: float, y: float, radius: int, fill: str, outline: str) -> None:
    px, py = topic_point(x, y)
    draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=fill, outline=outline, width=3)


def axes(draw: ImageDraw.ImageDraw, ink: str, x: float = 0.5, y: float = 0.5) -> None:
    arrow(draw, (0.08, y), (0.94, y), ink, 2)
    arrow(draw, (x, 0.92), (x, 0.08), ink, 2)


def draw_topic_pattern(draw: ImageDraw.ImageDraw, stem: str, colors: tuple[str, ...]) -> None:
    background, ink, accent, brass = colors

    if stem == "rynotes_v2-usage":
        for row, width in enumerate((0.72, 0.58, 0.66, 0.46, 0.61)):
            y = 0.16 + row * 0.16
            px1, py1 = topic_point(0.17, y)
            px2, py2 = topic_point(0.17 + width, y + 0.1)
            draw.rounded_rectangle((px1, py1, px2, py2), radius=8, outline=accent if row % 2 else ink, width=3)
            node(draw, 0.12, y + 0.05, 8, brass, ink)
    elif stem == "rynotes_v2-demo":
        px1, py1 = topic_point(0.15, 0.12)
        px2, py2 = topic_point(0.85, 0.88)
        draw.rectangle((px1, py1, px2, py2), outline=ink, width=3)
        draw.line((*topic_point(0.15, 0.3), *topic_point(0.85, 0.3)), fill=brass, width=3)
        for index, y in enumerate((0.42, 0.57, 0.72)):
            left, top = topic_point(0.24, y)
            right, bottom = topic_point(0.76, y + 0.09)
            draw.rounded_rectangle((left, top, right, bottom), radius=9, outline=accent if index != 1 else brass, width=3)
    elif stem == "Stu_AA":
        points = [(0.5 + 0.34 * math.cos(i * math.pi / 3), 0.5 + 0.38 * math.sin(i * math.pi / 3)) for i in range(6)]
        for index, point in enumerate(points):
            polyline(draw, [point, points[(index + 1) % 6], points[(index + 3) % 6]], accent if index % 2 else ink, 2)
            node(draw, *point, 9, background, brass)
        node(draw, 0.5, 0.5, 15, brass, ink)
    elif stem == "Stu_DG-Manifold":
        for index in range(7):
            t = index / 6
            polyline(draw, [(s, t + 0.08 * math.sin(s * math.pi * 2 + t * 3)) for s in [i / 24 for i in range(25)]], accent, 2)
            polyline(draw, [(t + 0.08 * math.sin(s * math.pi * 2 + t * 3), s) for s in [i / 24 for i in range(25)]], ink, 2)
        arrow(draw, (0.44, 0.58), (0.68, 0.29), brass, 4)
    elif stem == "Stu_GRT":
        node(draw, 0.5, 0.5, 24, background, ink)
        for index in range(8):
            angle = index * math.pi / 4
            point = (0.5 + 0.36 * math.cos(angle), 0.5 + 0.4 * math.sin(angle))
            polyline(draw, [(0.5, 0.5), point], accent, 2)
            node(draw, *point, 8 + (index % 3) * 2, brass if index % 2 else background, ink)
        draw.arc((*topic_point(0.18, 0.13), *topic_point(0.82, 0.87)), 20, 315, fill=brass, width=4)
    elif stem == "Stu_LA":
        axes(draw, ink, 0.25, 0.72)
        arrow(draw, (0.25, 0.72), (0.76, 0.23), accent, 5)
        arrow(draw, (0.25, 0.72), (0.84, 0.61), brass, 4)
        for row in range(3):
            for column in range(3):
                node(draw, 0.62 + column * 0.1, 0.72 + row * 0.08, 4, ink if row == column else accent, ink)
    elif stem == "Lec_ODE":
        axes(draw, ink)
        for row in range(1, 9):
            for column in range(1, 10):
                x, y = column / 10, row / 10
                slope = 0.08 * math.sin((x + y) * math.pi)
                polyline(draw, [(x - 0.025, y + slope), (x + 0.025, y - slope)], brass, 2)
        polyline(draw, [(x, 0.78 - 0.5 * x + 0.12 * math.sin(x * math.pi * 2)) for x in [i / 30 for i in range(31)]], accent, 5)
    elif stem == "Lec_PS":
        axes(draw, ink, 0.1, 0.82)
        curve = [(x, 0.82 - 0.68 * math.exp(-((x - 0.5) ** 2) / 0.035)) for x in [i / 40 for i in range(41)]]
        polyline(draw, curve, accent, 5)
        for index, height in enumerate([0.13, 0.26, 0.46, 0.65, 0.48, 0.28, 0.14]):
            x = 0.2 + index * 0.1
            px1, py1 = topic_point(x - 0.035, 0.82 - height)
            px2, py2 = topic_point(x + 0.035, 0.82)
            draw.rectangle((px1, py1, px2, py2), outline=brass, width=2)
    elif stem == "Rev_LA":
        axes(draw, ink)
        arrow(draw, (0.5, 0.5), (0.86, 0.18), brass, 5)
        arrow(draw, (0.5, 0.5), (0.18, 0.25), accent, 5)
        draw.arc((*topic_point(0.23, 0.2), *topic_point(0.78, 0.78)), 25, 335, fill=accent, width=3)
        draw.text(topic_point(0.73, 0.1), "lambda", fill=ink, font=font(20))
    elif stem == "Rev_MP-Method":
        axes(draw, ink)
        draw.arc((*topic_point(0.24, 0.22), *topic_point(0.78, 0.79)), 35, 325, fill=accent, width=5)
        polyline(draw, [(x, 0.5 + 0.12 * math.sin(x * math.pi * 8)) for x in [i / 40 for i in range(41)]], brass, 3)
        node(draw, 0.68, 0.29, 8, background, ink)
    elif stem == "Aux_AA":
        levels = [[(0.5, 0.12)], [(0.3, 0.4), (0.7, 0.4)], [(0.18, 0.76), (0.5, 0.76), (0.82, 0.76)]]
        for upper, lower in zip(levels, levels[1:]):
            for a in upper:
                for b in lower:
                    if abs(a[0] - b[0]) < 0.42:
                        polyline(draw, [a, b], accent, 3)
        for level in levels:
            for x, y in level:
                node(draw, x, y, 13, background, brass)
    elif stem == "Aux_ODE":
        axes(draw, ink)
        spiral = []
        for index in range(90):
            angle = index * 0.28
            radius = 0.42 * (1 - index / 100)
            spiral.append((0.5 + radius * math.cos(angle), 0.5 + radius * math.sin(angle)))
        polyline(draw, spiral, accent, 5)
        arrow(draw, spiral[22], spiral[28], brass, 3)
    elif stem == "Stu_CM":
        draw.ellipse((*topic_point(0.12, 0.27), *topic_point(0.88, 0.75)), outline=accent, width=4)
        node(draw, 0.5, 0.51, 22, brass, ink)
        node(draw, 0.81, 0.39, 12, background, ink)
        arrow(draw, (0.81, 0.39), (0.71, 0.18), ink, 3)
        polyline(draw, [(0.5, 0.51), (0.81, 0.39)], brass, 2)
    elif stem == "Stu_QM":
        axes(draw, ink, 0.1, 0.56)
        wave = [(x, 0.56 - 0.3 * math.sin(x * math.pi * 7) * math.exp(-((x - 0.5) ** 2) / 0.15)) for x in [i / 60 for i in range(61)]]
        polyline(draw, wave, accent, 5)
        for x in [0.28, 0.4, 0.49, 0.57, 0.68]:
            node(draw, x, 0.82, int(5 + 10 * (1 - abs(x - 0.5) * 2)), brass, brass)
    elif stem == "Stu_SR":
        axes(draw, ink)
        polyline(draw, [(0.5, 0.5), (0.12, 0.9)], brass, 5)
        polyline(draw, [(0.5, 0.5), (0.88, 0.9)], brass, 5)
        polyline(draw, [(0.5, 0.5), (0.12, 0.1)], accent, 5)
        polyline(draw, [(0.5, 0.5), (0.88, 0.1)], accent, 5)
        draw.arc((*topic_point(0.22, 0.28), *topic_point(0.78, 0.72)), 10, 170, fill=ink, width=3)
        draw.arc((*topic_point(0.22, 0.28), *topic_point(0.78, 0.72)), 190, 350, fill=ink, width=3)
    elif stem == "Lec_AP":
        node(draw, 0.5, 0.5, 18, brass, ink)
        for width, height, angle in [(0.68, 0.26, 0), (0.35, 0.72, 0), (0.62, 0.55, 0)]:
            x1, y1 = topic_point(0.5 - width / 2, 0.5 - height / 2)
            x2, y2 = topic_point(0.5 + width / 2, 0.5 + height / 2)
            draw.ellipse((x1, y1, x2, y2), outline=accent, width=3)
        node(draw, 0.84, 0.5, 9, background, brass)
        node(draw, 0.5, 0.14, 9, background, brass)
    elif stem == "Lec_ED":
        node(draw, 0.3, 0.5, 16, brass, ink)
        node(draw, 0.7, 0.5, 16, background, accent)
        for offset in [-0.34, -0.22, -0.1, 0.1, 0.22, 0.34]:
            curve = []
            for index in range(24):
                x = 0.31 + index * 0.016
                y = 0.5 + offset * math.sin(index / 23 * math.pi)
                curve.append((x, y))
            polyline(draw, curve, accent if offset > 0 else ink, 3)
    elif stem == "Lec_OP":
        x1, y1 = topic_point(0.5, 0.16)
        x2, y2 = topic_point(0.5, 0.84)
        draw.arc((x1 - 40, y1, x2 + 40, y2), 90, 270, fill=accent, width=5)
        draw.arc((x1 - 40, y1, x2 + 40, y2), 270, 90, fill=accent, width=5)
        for y in [0.28, 0.42, 0.58, 0.72]:
            polyline(draw, [(0.08, y), (0.5, y), (0.88, 0.5)], brass, 3)
        node(draw, 0.88, 0.5, 7, ink, ink)
    elif stem == "Rev_AP":
        for index, y in enumerate([0.78, 0.63, 0.47, 0.28]):
            polyline(draw, [(0.18, y), (0.82 - index * 0.06, y)], ink if index % 2 else accent, 4)
        arrow(draw, (0.34, 0.75), (0.34, 0.31), brass, 4)
        arrow(draw, (0.66, 0.31), (0.66, 0.6), brass, 4)
    elif stem == "Rev_CM":
        axes(draw, ink)
        draw.ellipse((*topic_point(0.18, 0.28), *topic_point(0.82, 0.72)), outline=accent, width=5)
        node(draw, 0.74, 0.36, 10, brass, ink)
        arrow(draw, (0.74, 0.36), (0.63, 0.22), brass, 3)
    elif stem == "Rev_ED":
        axes(draw, ink, 0.08, 0.5)
        electric = [(x, 0.5 - 0.25 * math.sin(x * math.pi * 5)) for x in [i / 50 for i in range(51)]]
        magnetic = [(x, 0.5 - 0.18 * math.cos(x * math.pi * 5)) for x in [i / 50 for i in range(51)]]
        polyline(draw, electric, accent, 5)
        polyline(draw, magnetic, brass, 3)
    elif stem == "Rev_EM":
        node(draw, 0.5, 0.34, 14, brass, ink)
        node(draw, 0.5, 0.66, 14, background, accent)
        for side in [-1, 1]:
            for index in range(4):
                span = 0.14 + index * 0.09
                points = [(0.5, 0.35), (0.5 + side * span, 0.42), (0.5 + side * span, 0.58), (0.5, 0.65)]
                polyline(draw, points, accent if index % 2 else ink, 2)
    elif stem == "Rev_TH":
        axes(draw, ink, 0.08, 0.84)
        curve = [(x, 0.84 - 0.72 * (x / 0.32) ** 2 * math.exp(-(x / 0.32) ** 2)) for x in [i / 45 for i in range(46)]]
        polyline(draw, curve, accent, 5)
        for index in range(17):
            x = 0.16 + (index * 0.173) % 0.72
            y = 0.18 + (index * 0.287) % 0.48
            node(draw, x, y, 4 + index % 3, brass, brass)
    elif stem == "Aux_AP":
        levels = [0.8, 0.68, 0.55, 0.39, 0.2]
        for index, y in enumerate(levels):
            polyline(draw, [(0.17 + index * 0.025, y), (0.83 - index * 0.025, y)], accent, 3)
        for x, start, end in [(0.3, 0.78, 0.42), (0.5, 0.66, 0.23), (0.7, 0.22, 0.53)]:
            arrow(draw, (x, start), (x, end), brass, 4)
    elif stem == "Aux_ED":
        polyline(draw, [(0.25, 0.14), (0.25, 0.86)], ink, 6)
        polyline(draw, [(0.75, 0.14), (0.75, 0.86)], ink, 6)
        for y in [0.23, 0.36, 0.5, 0.64, 0.77]:
            arrow(draw, (0.29, y), (0.71, y), accent, 3)
        draw.arc((*topic_point(0.35, 0.3), *topic_point(0.65, 0.7)), 15, 335, fill=brass, width=4)
    elif stem == "Aux_SCH":
        axes(draw, ink, 0.08, 0.72)
        for offset, alpha in [(0.0, accent), (0.13, brass)]:
            wave = [(x, 0.58 - offset - 0.16 * math.sin(x * math.pi * 6) * math.exp(-((x - 0.5 - offset) ** 2) / 0.12)) for x in [i / 48 for i in range(49)]]
            polyline(draw, wave, alpha, 4)
        arrow(draw, (0.32, 0.22), (0.72, 0.22), ink, 3)
        draw.text(topic_point(0.46, 0.1), "t", fill=ink, font=font(24))
    elif stem == "Aux_CS":
        node(draw, 0.5, 0.5, 13, brass, ink)
        draw.ellipse((*topic_point(0.2, 0.14), *topic_point(0.8, 0.86)), outline=accent, width=4)
        for index in range(8):
            angle = index * math.pi / 4
            x, y = 0.5 + 0.3 * math.cos(angle), 0.5 + 0.36 * math.sin(angle)
            tx, ty = x - 0.12 * math.sin(angle), y + 0.12 * math.cos(angle)
            arrow(draw, (x, y), (tx, ty), brass if index % 2 else ink, 2)
    elif stem == "Aux_QHO":
        axes(draw, ink, 0.5, 0.86)
        parabola = [(x, 0.84 - 2.7 * (x - 0.5) ** 2) for x in [i / 40 for i in range(41)]]
        polyline(draw, parabola, accent, 5)
        for index, y in enumerate([0.72, 0.56, 0.4, 0.24]):
            half = 0.15 + index * 0.055
            polyline(draw, [(0.5 - half, y), (0.5 + half, y)], brass, 3)
        wave = [(x, 0.7 - 0.05 * math.sin((x - 0.25) * math.pi * 12)) for x in [0.35 + i / 100 for i in range(31)]]
        polyline(draw, wave, ink, 2)
    elif stem == "Aux_TR":
        polyline(draw, [(0.5, 0.1), (0.5, 0.9)], brass, 3)
        left = [(x, 0.5 - 0.22 * math.sin(x * math.pi * 7)) for x in [i / 40 for i in range(21)]]
        right = [(1 - x, y) for x, y in reversed(left)]
        polyline(draw, left, accent, 4)
        polyline(draw, right, ink, 4)
        arrow(draw, (0.42, 0.18), (0.2, 0.18), accent, 3)
        arrow(draw, (0.58, 0.82), (0.8, 0.82), ink, 3)
    elif stem == "Aux_IP":
        node(draw, 0.17, 0.5, 16, background, ink)
        node(draw, 0.5, 0.22, 16, brass, ink)
        node(draw, 0.83, 0.5, 16, background, accent)
        node(draw, 0.5, 0.78, 16, background, brass)
        arrow(draw, (0.2, 0.48), (0.47, 0.24), accent, 4)
        arrow(draw, (0.53, 0.24), (0.8, 0.48), accent, 4)
        arrow(draw, (0.8, 0.54), (0.53, 0.76), brass, 4)
        arrow(draw, (0.47, 0.76), (0.2, 0.54), brass, 4)
    elif stem == "Aux_CO":
        axes(draw, ink)
        draw.ellipse((*topic_point(0.18, 0.27), *topic_point(0.66, 0.76)), outline=accent, width=4)
        draw.ellipse((*topic_point(0.34, 0.27), *topic_point(0.82, 0.76)), outline=brass, width=4)
        node(draw, 0.5, 0.5, 9, ink, ink)
        draw.text(topic_point(0.37, 0.12), "[A,B]=0", fill=ink, font=font(24))
    elif stem == "Aux_SQ":
        draw.ellipse((*topic_point(0.23, 0.12), *topic_point(0.77, 0.88)), outline=accent, width=4)
        draw.ellipse((*topic_point(0.23, 0.42), *topic_point(0.77, 0.58)), outline=brass, width=3)
        axes(draw, ink)
        arrow(draw, (0.5, 0.5), (0.7, 0.2), brass, 5)
        for index, (x, y) in enumerate([(0.2, 0.2), (0.82, 0.34), (0.72, 0.82)], start=1):
            node(draw, x, y, 15, background, ink)
            draw.text((topic_point(x, y)[0] - 5, topic_point(x, y)[1] - 12), str(index), fill=ink, font=font(20))
    elif stem == "Aux_IDP":
        left = [(0.28 + 0.44 * t, 0.12 + 0.76 * t) for t in [i / 30 for i in range(31)]]
        right = [(0.72 - 0.44 * t, 0.12 + 0.76 * t) for t in [i / 30 for i in range(31)]]
        polyline(draw, left, accent, 5)
        polyline(draw, right, brass, 5)
        for x in [0.28, 0.72]:
            node(draw, x, 0.12, 13, background, ink)
        for x in [0.28, 0.72]:
            node(draw, x, 0.88, 13, background, ink)
        arrow(draw, (0.39, 0.5), (0.61, 0.5), ink, 3)
    elif stem == "Aux_PI":
        start, end = (0.16, 0.12), (0.84, 0.88)
        node(draw, *start, 12, background, ink)
        node(draw, *end, 12, background, ink)
        def fan(f):
            return [(start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t + f(t)) for t in [i / 40 for i in range(41)]]
        polyline(draw, fan(lambda t: 0.05 * math.sin(t * math.pi)), accent, 6)
        for idx, (amp, k) in enumerate([(0.26, 3), (-0.28, 2), (0.2, 5), (-0.22, 4)]):
            polyline(draw, fan(lambda t, amp=amp, k=k: amp * math.sin(t * math.pi * k)), brass if idx % 2 else ink, 3)
    elif stem == "Aux_BCH":
        # e^A and e^B compose into the BCH product e^C
        node(draw, 0.15, 0.22, 11, background, ink)
        node(draw, 0.15, 0.78, 11, background, ink)
        node(draw, 0.46, 0.5, 15, brass, ink)
        arrow(draw, (0.23, 0.24), (0.4, 0.44), accent, 4)
        arrow(draw, (0.23, 0.76), (0.4, 0.56), brass, 4)
        # nested commutator brackets: the BCH correction terms [A,[A,B]], [B,[A,B]]
        draw.line((*topic_point(0.6, 0.12), *topic_point(0.6, 0.88)), fill=ink, width=3)
        draw.line((*topic_point(0.6, 0.12), *topic_point(0.68, 0.12)), fill=ink, width=3)
        draw.line((*topic_point(0.6, 0.88), *topic_point(0.68, 0.88)), fill=ink, width=3)
        draw.line((*topic_point(0.68, 0.28), *topic_point(0.68, 0.72)), fill=accent, width=3)
        draw.line((*topic_point(0.68, 0.28), *topic_point(0.75, 0.28)), fill=accent, width=3)
        draw.line((*topic_point(0.68, 0.72), *topic_point(0.75, 0.72)), fill=accent, width=3)
        node(draw, 0.68, 0.5, 7, background, accent)
    elif stem == "Aux_RQM_ds":
        # Relativistic dispersion E^2 = c^2 p^2 + m^2 c^4: light-cone asymptotes
        # with the positive- and negative-energy hyperbola branches, plus the
        # non-relativistic parabola emerging from the upper branch (Schrodinger limit)
        polyline(draw, [(0.08, 0.92), (0.92, 0.08)], brass, 2)
        polyline(draw, [(0.08, 0.08), (0.92, 0.92)], brass, 2)
        polyline(draw, [(0.08, 0.5), (0.9, 0.5)], ink, 2)
        arrow(draw, (0.9, 0.5), (0.96, 0.5), ink, 2)
        upper = [(x, 0.5 - 0.2 * math.sqrt(1 + ((x - 0.5) / 0.2) ** 2)) for x in [i / 60 for i in range(6, 55)]]
        lower = [(x, 0.5 + 0.2 * math.sqrt(1 + ((x - 0.5) / 0.2) ** 2)) for x in [i / 60 for i in range(6, 55)]]
        polyline(draw, upper, accent, 6)
        polyline(draw, lower, ink, 6)
        parabola = [(x, 0.3 - 0.18 * ((x - 0.5) / 0.22) ** 2) for x in [i / 200 for i in range(105, 149)]]
        polyline(draw, parabola, brass, 3)
        node(draw, 0.5, 0.3, 7, background, brass)
        node(draw, 0.5, 0.7, 7, background, brass)
        draw.text(topic_point(0.56, 0.06), "E", fill=ink, font=font(24))
        draw.text(topic_point(0.88, 0.53), "p", fill=ink, font=font(24))
    elif stem == "Aux_RQM_qwen":
        # Dirac spinor double-cover: a twisted band, the belt-trick picture of
        # a spinor returning after a 720-degree rotation
        polyline(draw, [(0.2, 0.32), (0.8, 0.32)], ink, 4)
        polyline(draw, [(0.2, 0.68), (0.8, 0.68)], ink, 4)
        polyline(draw, [(0.2, 0.32), (0.2, 0.68)], ink, 4)
        polyline(draw, [(0.8, 0.32), (0.8, 0.68)], ink, 4)
        polyline(draw, [(0.2, 0.32), (0.8, 0.68)], accent, 3)
        polyline(draw, [(0.2, 0.68), (0.8, 0.32)], brass, 3)
        arrow(draw, (0.3, 0.2), (0.3, 0.08), accent, 3)
        arrow(draw, (0.7, 0.8), (0.7, 0.92), ink, 3)
        node(draw, 0.5, 0.5, 8, background, brass)
    elif stem == "Aux_RQM":
        # Pauli 方程: 自旋 S 在磁场 B 中进动, 即磁矩 mu=(q/m)S 与 g=2 的图像.
        # B 场方向竖直向上, 自旋矢量沿进动锥面倾斜.
        arrow(draw, (0.5, 0.88), (0.5, 0.12), ink, 4)
        draw.text(topic_point(0.45, 0.06), "B", fill=ink, font=font(26))
        # 进动锥: 基底椭圆 + 两侧母线
        x1, y1 = topic_point(0.5 - 0.24, 0.68 - 0.07)
        x2, y2 = topic_point(0.5 + 0.24, 0.68 + 0.07)
        draw.ellipse((x1, y1, x2, y2), outline=accent, width=3)
        polyline(draw, [(0.26, 0.68), (0.5, 0.22)], accent, 3)
        polyline(draw, [(0.74, 0.68), (0.5, 0.22)], accent, 3)
        # 自旋矢量 S 沿锥面母线
        arrow(draw, (0.5, 0.24), (0.67, 0.63), brass, 5)
        node(draw, 0.67, 0.63, 8, background, brass)
        draw.text(topic_point(0.74, 0.60), "S", fill=ink, font=font(24))
        # 磁场上下各加一条短场线
        draw.line((*topic_point(0.42, 0.30), *topic_point(0.58, 0.30)), fill=ink, width=2)
        draw.line((*topic_point(0.42, 0.72), *topic_point(0.58, 0.72)), fill=ink, width=2)
    elif stem == "Aux_PBSG":
        # Bloch 球: 单位球面(圆), 赤道椭圆与南北极, 球心指向球面的 Bloch 矢量
        # 及其在赤道面的投影. 对应任意方向 Pauli 算符 -> 二能级纯态 -> SG 方向测量.
        cx, cy = 0.5, 0.5
        draw.ellipse((*topic_point(0.203, 0.141), *topic_point(0.797, 0.859)), outline=ink, width=4)
        draw.ellipse((*topic_point(0.203, 0.387), *topic_point(0.797, 0.613)), outline=accent, width=3)
        draw.line((*topic_point(cx, 0.141), *topic_point(cx, 0.859)), fill=brass, width=3)
        node(draw, cx, 0.141, 8, background, brass)
        node(draw, cx, 0.859, 8, background, brass)
        tip = (0.720, 0.740)
        arrow(draw, (cx, cy), tip, accent, 5)
        node(draw, *tip, 7, background, accent)
        draw.line((*topic_point(tip[0], cy), *topic_point(*tip)), fill=ink, width=2)
        draw.text((topic_point(tip[0], tip[1])[0] + 12, topic_point(tip[0], tip[1])[1] - 14), "n", fill=ink, font=font(24))
    elif stem == "Aux_AMT":
        # 角动量阶梯: 从 m=j 到 m=-j 的 2j+1 个状态点, 一侧 J+ 逐级上升,
        # 另一侧 J- 逐级下降, 右侧括号标出状态总数
        ys = [0.14, 0.29, 0.44, 0.59, 0.74, 0.89]
        for y in ys:
            node(draw, 0.42, y, 7, background, ink)
        for i in range(5):
            arrow(draw, (0.28, ys[i]), (0.28, ys[i + 1]), brass, 3)
            arrow(draw, (0.56, ys[i + 1]), (0.56, ys[i]), accent, 3)
        top = topic_point(0.70, ys[0])
        bottom = topic_point(0.70, ys[5])
        draw.line((top, bottom), fill=ink, width=2)
        draw.line((*topic_point(0.64, ys[0]), *topic_point(0.76, ys[0])), fill=ink, width=2)
        draw.line((*topic_point(0.64, ys[5]), *topic_point(0.76, ys[5])), fill=ink, width=2)
        draw.text((topic_point(0.84, 0.5)[0], topic_point(0.84, 0.5)[1] - 12), "2j+1", fill=ink, font=font(20))
    elif stem == "Aux_TRM":
        # 空间平移: 虚线(点)波包整体平移到实线波包, 峰值连线标出位移
        dotted = [
            (x, 0.5 - 0.34 * math.exp(-((x - 0.30) ** 2) / 0.018))
            for x in [i / 100 for i in range(8, 53)]
        ]
        for (px, py) in dotted:
            node(draw, px, py, 3, ink, ink)
        solid = [
            (x, 0.5 - 0.34 * math.exp(-((x - 0.68) ** 2) / 0.018))
            for x in [i / 100 for i in range(44, 89)]
        ]
        polyline(draw, solid, accent, 4)
        arrow(draw, (0.30, 0.5 - 0.34), (0.68, 0.5 - 0.34), brass, 3)
    elif stem == "Aux_AMR":
        # 空间转动: 半径向量绕中心转过夹角, 弧线标出转角
        cx, cy = 0.5, 0.5
        node(draw, cx, cy, 8, background, ink)
        arrow(draw, (cx, cy), (cx + 0.34, cy), ink, 4)
        angle = 60
        tip = (cx + 0.34 * math.cos(math.radians(angle)), cy + 0.34 * math.sin(math.radians(angle)))
        arrow(draw, (cx, cy), tip, accent, 4)
        radius = 0.20
        x1, y1 = topic_point(cx - radius, cy - radius)
        x2, y2 = topic_point(cx + radius, cy + radius)
        draw.arc((x1, y1, x2, y2), 0, angle, fill=brass, width=3)
    elif stem == "Aux_MLA":
        # 张量积特征性质交换图: 双线性映射 A 经唯一线性映射 psi 分解为 A = psi∘sigma
        node(draw, 0.20, 0.18, 6, background, ink)
        node(draw, 0.72, 0.18, 6, background, ink)
        node(draw, 0.46, 0.74, 6, background, ink)
        draw.text(topic_point(0.13, 0.03), "V", fill=ink, font=font(24))
        draw.text(topic_point(0.26, 0.03), "×", fill=ink, font=font(20))
        draw.text(topic_point(0.32, 0.03), "U", fill=ink, font=font(24))
        face = font(24)
        px, py = topic_point(0.56, 0.03)
        width_v = draw.textlength("V", font=face)
        draw.text((px, py), "V", fill=ink, font=face)
        radius = 7
        cx = int(px + width_v + radius + 3)
        cy = int(py + 15)
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=ink, width=2)
        draw.line((cx - radius, cy - radius, cx + radius, cy + radius), fill=ink, width=2)
        draw.line((cx - radius, cy + radius, cx + radius, cy - radius), fill=ink, width=2)
        draw.text((cx + radius + 3, py), "U", fill=ink, font=face)
        draw.text(topic_point(0.42, 0.80), "W", fill=ink, font=font(24))
        arrow(draw, (0.26, 0.21), (0.66, 0.21), brass, 3)
        arrow(draw, (0.24, 0.23), (0.42, 0.68), ink, 3)
        arrow(draw, (0.68, 0.23), (0.52, 0.68), accent, 3)
        draw.text(topic_point(0.43, 0.10), "σ", fill=brass, font=font(20))
        draw.text(topic_point(0.03, 0.40), "A", fill=ink, font=font(22))
        draw.text(topic_point(0.72, 0.40), "ψ", fill=accent, font=font(22))
    elif stem == "Aux_MLA_Dist":
        # 外积 alpha∧beta: 两个矢量的楔积给出有向平行四边形
        origin = (0.20, 0.62)
        v = (0.50, 0.26)
        w = (0.68, 0.52)
        corner = (v[0] + w[0] - origin[0], v[1] + w[1] - origin[1])
        draw.polygon(
            [topic_point(x, y) for x, y in (origin, v, corner, w)],
            fill="#c3d5cf",
            outline=brass,
            width=3,
        )
        arrow(draw, origin, v, accent, 4)
        arrow(draw, origin, w, ink, 4)
        node(draw, *origin, 7, background, ink)
        draw.text(topic_point(0.53, 0.08), "α", fill=accent, font=font(26))
        draw.text(topic_point(0.78, 0.46), "β", fill=ink, font=font(26))
        draw.text(topic_point(0.30, 0.80), "α ∧ β", fill=brass, font=font(22))
    elif stem == "Aux_FRO":
        # 可积分布 = 叶状结构: 一族"叶子"(积分流形) 叠成流形, 每片叶上有
        # 切向基矢 (e1, e2), 中央一条竖直箭头表示 flow 方向. 对应矢量表述:
        # 分布可积当且仅当矢量场对易子仍属于该分布.
        for index, y in enumerate([0.20, 0.38, 0.56, 0.74]):
            leaf = [
                (x, y + 0.055 * math.sin((x - 0.16) * math.pi * 2.6))
                for x in [i / 48 for i in range(49)]
            ]
            polyline(draw, leaf, accent if index % 2 else ink, 4)
        for y in [0.20, 0.38, 0.56, 0.74]:
            tangent = 0.055 * math.pi * 2.6 * math.cos((0.24 - 0.16) * math.pi * 2.6)
            arrow(draw, (0.20, y), (0.20 + 0.13, y + tangent * 0.13), brass, 3)
            arrow(draw, (0.62, y), (0.62 + 0.10, y - tangent * 0.10), brass, 3)
        arrow(draw, (0.84, 0.86), (0.84, 0.14), ink, 4)
        node(draw, 0.84, 0.5, 7, background, ink)
    elif stem == "Aux_FRO_Dist":
        # flow 坐标化: 对易基矢场 X1, X2 经 flow 拼装成坐标网格 (引理:
        # 对易矢量场可局部坐标化), 网格即积分切片. 对应蒸馏版补全的充分性证明.
        origin = (0.24, 0.62)
        v = (0.15, -0.14)
        w = (0.12, 0.12)
        for j in range(3):
            p = (origin[0] + j * w[0], origin[1] + j * w[1])
            polyline(draw, [p, (p[0] + 2 * v[0], p[1] + 2 * v[1])], brass, 3)
        for i in range(3):
            p = (origin[0] + i * v[0], origin[1] + i * v[1])
            polyline(draw, [p, (p[0] + 2 * w[0], p[1] + 2 * w[1])], accent, 3)
        arrow(draw, origin, (origin[0] + v[0], origin[1] + v[1]), ink, 5)
        arrow(draw, origin, (origin[0] + w[0], origin[1] + w[1]), brass, 5)
        node(draw, *origin, 7, background, ink)
        draw.text(topic_point(0.46, 0.42), "X1", fill=ink, font=font(22))
        draw.text(topic_point(0.34, 0.80), "X2", fill=brass, font=font(22))
    else:
        raise ValueError(f"No topic-specific cover motif for {stem}")


def generate(lecture: dict[str, object]) -> None:
    subject = str(lecture["subject"])
    background, ink, accent, brass = PALETTES[subject]
    stem = Path(str(lecture["fileName"])).stem
    image = Image.new("RGB", (WIDTH, HEIGHT), background)
    draw = ImageDraw.Draw(image)

    draw.rectangle((0, 0, 20, HEIGHT), fill=accent)
    draw.line((76, 76, 644, 76), fill=ink, width=2)
    draw.text((76, 98), "RONGYU'S NOTES", fill=ink, font=font(26))
    draw.text((76, 142), f"{subject.upper()} / {lecture['kind']}", fill=accent, font=font(22))
    draw.text((570, 98), f"{int(lecture['pages']):03d} P", fill=brass, font=font(22))

    draw_topic_pattern(draw, stem, PALETTES[subject])
    draw.line((76, 630, 644, 630), fill=ink, width=2)

    title_text = str(lecture["titleZh"])
    title_size = 58
    title_lines = wrap_text(draw, title_text, font(title_size), 568)
    if len(title_lines) > 2:
        title_size = 48
        title_lines = wrap_text(draw, title_text, font(title_size), 568)
    for index, line in enumerate(title_lines[:3]):
        draw.text((76, 664 + index * (title_size + 10)), line, fill=ink, font=font(title_size))

    english_y = 842 if len(title_lines) <= 2 else 875
    english = display_text(str(lecture["titleEn"]))
    if len(english) > 47:
        english = english[:44].rstrip() + "..."
    draw.text((76, english_y), english, fill=accent, font=font(24))
    draw.text((76, 906), stem, fill=ink, font=font(20))
    draw.ellipse((610, 892, 634, 916), fill=brass)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT / f"{stem}.png", format="PNG", optimize=True)


def main() -> None:
    lectures = json.loads(DATA.read_text(encoding="utf-8"))
    stems = {Path(str(lecture["fileName"])).stem for lecture in lectures}
    missing = stems - SUPPORTED_STEMS
    obsolete = SUPPORTED_STEMS - stems
    if missing or obsolete:
        raise ValueError(f"Cover motif registry mismatch. Missing: {sorted(missing)}; obsolete: {sorted(obsolete)}")
    for lecture in lectures:
        generate(lecture)
    print(f"Generated {len(lectures)} topic-specific lecture covers in {OUTPUT}")


if __name__ == "__main__":
    main()
