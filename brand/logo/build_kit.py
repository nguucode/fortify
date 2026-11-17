# Fortify logo kit — one geometry source, every master file.
# Run: PYTHONPATH=<dir with fonttools> python3 build_kit.py <path to inter-latin-wght-normal.woff2>
import math, sys, os

OUT = os.path.join(os.path.dirname(__file__), "final")
os.makedirs(OUT, exist_ok=True)

def oklch_hex(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_, m_, s_ = L + .3963377774*a + .2158037573*b, L - .1055613458*a - .0638541728*b, L - .0894841775*a - 1.2914855480*b
    l, m, s = l_**3, m_**3, s_**3
    rgb = (4.0767416621*l - 3.3077115913*m + .2309699292*s,
           -1.2684380046*l + 2.6097574011*m - .3413193965*s,
           -.0041960863*l - .7034186147*m + 1.7076147010*s)
    enc = lambda x: 12.92*x if x <= .0031308 else 1.055*x**(1/2.4) - .055
    return "#" + "".join(f"{round(max(0, min(1, enc(c)))*255):02X}" for c in rgb)

ACTION = oklch_hex(.5772, .2324, 260)     # DESIGN.md primary
PRESSED = oklch_hex(.488, .243, 264.4)    # DESIGN.md primary-hover
TILE_TOP = oklch_hex(.66, .19, 258)       # light-from-top end of the tile gradient
INK = oklch_hex(.205, 0, 0)               # DESIGN.md ink

# ---- Layered F (256 grid). Stem 48, horizontals 46 (thinned ~4% optically), glyph nudged +4 right for optical centre.
DX = 4
BACK = (f"M{60+DX},72 A32,32 0 0 1 {92+DX},40 L{196+DX},40 L{196+DX},86 L{108+DX},86 L{108+DX},216 L{60+DX},216 Z")
FRONT = f"M{120+DX},110 L{180+DX},110 L{180+DX},152 L{120+DX},152 Z"   # 12-unit gap = its own layer
# Small cut (<=32 px): gap closed, middle arm joins the stem, everything heavier so it holds at 16 px.
SMALL = (f"M{56+DX},76 A36,36 0 0 1 {92+DX},40 L{200+DX},40 L{200+DX},92 L{116+DX},92 L{116+DX},112 "
         f"L{184+DX},112 L{184+DX},160 L{116+DX},160 L{116+DX},216 L{56+DX},216 Z")

def squircle(size=256, n=5.0, steps=192):
    r = size / 2; pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps; c, s = math.cos(t), math.sin(t)
        pts.append(f"{r + r*math.copysign(abs(c)**(2/n), c):.2f},{r + r*math.copysign(abs(s)**(2/n), s):.2f}")
    return "M" + " L".join(pts) + " Z"
SQ = squircle()

def svg(w, h, body, title="Fortify logo"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'<title>{title}</title>{body}</svg>\n')

def tile(uid, glyph_parts, scale=.66, front_opacity=.72):
    o = 128 * (1 - scale)
    defs = (f'<defs><linearGradient id="t{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{TILE_TOP}"/>'
            f'<stop offset="1" stop-color="{PRESSED}"/></linearGradient>'
            f'<linearGradient id="g{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/>'
            f'<stop offset="1" stop-color="#E6EDFF"/></linearGradient>'
            f'<linearGradient id="h{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".22"/>'
            f'<stop offset=".5" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>')
    glyph = "".join(f'<path d="{d}" fill="url(#g{uid})"{f" opacity=\"{front_opacity}\"" if i else ""}/>'
                    for i, d in enumerate(glyph_parts))
    return (defs + f'<path d="{SQ}" fill="url(#t{uid})"/><path d="{SQ}" fill="url(#h{uid})"/>'
            f'<g transform="translate({o:.2f},{o:.2f}) scale({scale})">{glyph}</g>')

def flat(parts, color):
    return "".join(f'<path d="{d}" fill="{color}"/>' for d in parts)

# ---- Wordmark: "Fortify" in Inter 600, tracking -0.02em, outlined to paths
def wordmark_paths(font_path, cap_px):
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    f = instantiateVariableFont(TTFont(font_path), {"wght": 600})
    upm = f["head"].unitsPerEm; cap = f["OS/2"].sCapHeight
    k = cap_px / cap; gs = f.getGlyphSet(); cmap = f.getBestCmap(); hm = f["hmtx"]
    x, out = 0.0, []
    for i, ch in enumerate("Fortify"):
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, x, cap_px)))   # baseline at y=cap_px
        out.append(pen.getCommands())
        x += hm[g][0] * k - (0.02 * upm * k if i < 6 else 0)
    # right edge = last glyph advance minus its RSB is close enough; trim with bbox below
    return " ".join(out), x, cap_px

def build(font_path):
    files = {}
    files["fortify-symbol.svg"] = svg(256, 256, flat([BACK, FRONT], "#000000"))
    files["fortify-symbol-small.svg"] = svg(256, 256, flat([SMALL], "#000000"))
    files["fortify-symbol-blue.svg"] = svg(256, 256, flat([BACK, FRONT], ACTION))
    files["fortify-app-icon.svg"] = svg(256, 256, tile("a", [BACK, FRONT]))
    files["fortify-app-icon-small.svg"] = svg(256, 256, tile("s", [SMALL], scale=.74))
    files["fortify-app-icon-flat.svg"] = svg(256, 256, f'<path d="{SQ}" fill="{ACTION}"/>'
        f'<g transform="translate(43.52,43.52) scale(.66)">{flat([BACK, FRONT], "#FFFFFF")}</g>')

    # Horizontal lockup: tile 256, wordmark cap = 0.5 tile, gap = 0.25 tile, cap centred on tile
    d, adv, cap = wordmark_paths(font_path, 128)
    gap, y = 64, (256 - 128) / 2
    W = 256 + gap + int(adv) + 4
    word = lambda c: f'<g transform="translate({256+gap},{y})"><path d="{d}" fill="{c}"/></g>'
    files["fortify-horizontal.svg"] = svg(W, 256, tile("h", [BACK, FRONT]) + word(INK))
    files["fortify-horizontal-dark.svg"] = svg(W, 256, tile("d", [BACK, FRONT]) + word("#FFFFFF"))
    files["fortify-horizontal-black.svg"] = svg(W, 256, flat([BACK, FRONT], "#000000") + word("#000000"))
    files["fortify-horizontal-white.svg"] = svg(W, 256, flat([BACK, FRONT], "#FFFFFF") + word("#FFFFFF"))

    # Stacked lockup: tile 256 centred, wordmark cap 56 below with a 48 gap
    d2, adv2, cap2 = wordmark_paths(font_path, 56)
    SW = max(256, int(adv2) + 8); SH = 256 + 48 + 56 + 16   # 16 = descender room for y
    tx = (SW - 256) / 2; wx = (SW - adv2) / 2
    files["fortify-stacked.svg"] = svg(SW, SH, f'<g transform="translate({tx},0)">{tile("k", [BACK, FRONT])}</g>'
        f'<g transform="translate({wx:.2f},{256+48})"><path d="{d2}" fill="{INK}"/></g>')
    files["fortify-wordmark.svg"] = svg(int(adv) + 4, 128 + 36, f'<path d="{d}" fill="{INK}"/>')

    for name, body in files.items():
        open(os.path.join(OUT, name), "w").write(body)
    print("ACTION", ACTION, "PRESSED", PRESSED, "TILE_TOP", TILE_TOP, "INK", INK)
    print("\n".join(files))

if __name__ == "__main__":
    build(sys.argv[1])
