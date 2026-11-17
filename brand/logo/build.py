# Builds concept glyphs (black masters) + Apple-style tile previews.
import math
BLUE_TOP, BLUE_BOT = "#4C8DFF", "#1F4FE0"   # light-from-top gradient around Action Blue

def squircle(size=256, n=5.0, steps=160):
    r = size / 2; pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        c, s = math.cos(t), math.sin(t)
        x = r + r * math.copysign(abs(c) ** (2 / n), c)
        y = r + r * math.copysign(abs(s) ** (2 / n), s)
        pts.append(f"{x:.2f},{y:.2f}")
    return "M" + " L".join(pts) + " Z"

def ring_arc(cx, cy, ro, ri, a0, a1):
    # filled annular sector, angles in degrees, clockwise from 12 o'clock
    def p(r, a):
        a = math.radians(a - 90); return f"{cx + r*math.cos(a):.2f},{cy + r*math.sin(a):.2f}"
    large = 1 if (a1 - a0) % 360 > 180 else 0
    return (f"M{p(ro,a0)} A{ro},{ro} 0 {large} 1 {p(ro,a1)} L{p(ri,a1)} "
            f"A{ri},{ri} 0 {large} 0 {p(ri,a0)} Z")

# A — Layered F: stem+top arm one piece (outer corner follows the tile curve), middle arm on its own layer
A_back = "M60,72 A32,32 0 0 1 92,40 L196,40 L196,88 L108,88 L108,216 L60,216 Z"
A_front = "M120,120 L180,120 L180,162 L120,162 Z"
# B — Cover: two nested corners shielding a point
B_back = "M48,80 A32,32 0 0 1 80,48 L208,48 L208,88 L88,88 L88,208 L48,208 Z"
B_front = "M108,128 A20,20 0 0 1 128,108 L208,108 L208,144 L144,144 L144,208 L108,208 Z"
B_dot = "M188,188 m-20,0 a20,20 0 1 0 40,0 a20,20 0 1 0 -40,0 Z"
# C — Renewal ring: the policy year as a ring, closing toward the renewal dot
C_back = ring_arc(128, 128, 88, 52, 12, 300)
C_dot = (lambda a: f"M{128+70*math.cos(a)-18:.2f},{128+70*math.sin(a):.2f} a18,18 0 1 0 36,0 a18,18 0 1 0 -36,0 Z")(math.radians(336-90))

concepts = {"a": [A_back, A_front], "b": [B_back, B_front, B_dot], "c": [C_back, C_dot]}

def svg(body, size=256):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">{body}</svg>\n'

for k, parts in concepts.items():
    open(f"concept-{k}.svg", "w").write(svg("".join(f'<path d="{d}"/>' for d in parts)))
    # Apple tile: squircle, top-light gradient, glyph scaled to ~68% safe area, front layer slightly translucent
    s = 0.66; o = 128 * (1 - s)
    layers = "".join(
        f'<path d="{d}" fill="url(#g{k})" {"opacity=\"0.78\"" if i and k != "c" else ""}/>' for i, d in enumerate(parts))
    tile = (f'<defs><linearGradient id="t{k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BLUE_TOP}"/>'
            f'<stop offset="1" stop-color="{BLUE_BOT}"/></linearGradient>'
            f'<linearGradient id="g{k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/>'
            f'<stop offset="1" stop-color="#E4ECFF"/></linearGradient>'
            f'<linearGradient id="h{k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".28"/>'
            f'<stop offset=".5" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>'
            f'<path d="{squircle()}" fill="url(#t{k})"/><path d="{squircle()}" fill="url(#h{k})"/>'
            f'<g transform="translate({o:.1f},{o:.1f}) scale({s})">{layers}</g>')
    open(f"concept-{k}-tile.svg", "w").write(svg(tile))
