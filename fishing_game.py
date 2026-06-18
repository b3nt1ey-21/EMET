"""
Reel Frenzy - an arcade fishing game built with pygame.

How to play
-----------
  * Press SPACE to cast your hook into the sea.
  * On the way DOWN, steer with LEFT / RIGHT to DODGE the fish.
    Touching a fish (or reaching the seabed) flips you into reel mode,
    so a clean dive reaches the deeper, more valuable waters.
  * On the way UP, steer INTO fish to hook them. Snag several in one
    trip for a combo multiplier.
  * You have 90 seconds. Make as much money as you can and beat the
    high score.

Controls
--------
  SPACE / UP ... cast & start reeling early
  LEFT / RIGHT . steer the hook
  P ............ pause
  R ............ restart (on the game-over screen)
  ESC .......... quit

Run it:           python fishing_game.py
Headless check:   python fishing_game.py --selftest 300
"""

import sys
import os
import math
import random
from array import array

# --------------------------------------------------------------------------
# Headless self-test handling: must happen BEFORE pygame is initialised so the
# dummy SDL drivers take effect (lets the game loop run with no display/audio).
# --------------------------------------------------------------------------
SELFTEST_FRAMES = 0
if "--selftest" in sys.argv:
    idx = sys.argv.index("--selftest")
    try:
        SELFTEST_FRAMES = int(sys.argv[idx + 1])
    except (IndexError, ValueError):
        SELFTEST_FRAMES = 300
    os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
    os.environ.setdefault("SDL_AUDIODRIVER", "dummy")

import pygame

# --------------------------------------------------------------------------
# Constants
# --------------------------------------------------------------------------
WIDTH, HEIGHT = 960, 720
WATER_Y = 168                 # y of the water surface
SEABED_Y = HEIGHT - 24        # deepest the hook can travel
FPS = 60
GAME_SECONDS = 90

HIGHSCORE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "highscore.txt")

# Palette
SKY_TOP = (143, 206, 240)
SKY_BOTTOM = (208, 236, 248)
WATER_TOP = (70, 168, 224)
WATER_DEEP = (6, 20, 54)
SUN = (255, 241, 173)
FOAM = (224, 244, 252)
HULL = (140, 78, 48)
HULL_DARK = (104, 56, 33)
DECK = (196, 142, 92)
ROD = (60, 44, 36)
LINE = (235, 240, 245)
HOOK_COLOR = (220, 226, 232)
WHITE = (245, 248, 250)
INK = (24, 34, 52)

# States
TITLE, PLAYING, PAUSED, GAMEOVER = "title", "playing", "paused", "gameover"

# Fish species: name, color, body width, value, base speed, depth band, rarity.
# depth band is a (min, max) fraction of the water column (0 = surface, 1 = bed).
FISH_SPECIES = [
    # name        color            w   value  speed  depth band   weight
    ("Sardine",   (176, 196, 208),  34,    5,  2.4, (0.00, 0.45),  34),
    ("Mackerel",  (104, 160, 150),  44,   10,  2.0, (0.10, 0.55),  26),
    ("Clownfish", (244, 142,  54),  40,   18,  1.7, (0.25, 0.70),  18),
    ("Bass",      (96, 124,  86),   56,   28,  1.5, (0.35, 0.80),  13),
    ("Tuna",      (70, 110, 156),   78,   55,  1.3, (0.55, 0.95),   7),
    ("Anglerfish",(58,  60,  84),   66,   95,  0.9, (0.70, 1.00),   4),
    ("Gold Koi",  (245, 200,  70),  38,  150,  2.7, (0.20, 0.95),   2),
]


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------
def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c1, c2, t):
    return (int(lerp(c1[0], c2[0], t)),
            int(lerp(c1[1], c2[1], t)),
            int(lerp(c1[2], c2[2], t)))


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


def weighted_choice(species):
    total = sum(s[6] for s in species)  # weight is index 6
    r = random.uniform(0, total)
    upto = 0
    for s in species:
        upto += s[6]
        if r <= upto:
            return s
    return species[-1]


# --------------------------------------------------------------------------
# Procedural audio (generated at runtime so there are no asset files).
# Everything is guarded so the game still runs with no working sound device.
# --------------------------------------------------------------------------
class Audio:
    def __init__(self):
        self.ok = False
        self.sounds = {}
        try:
            if pygame.mixer.get_init() is None:
                pygame.mixer.init(44100, -16, 2, 512)
            self.ok = True
        except pygame.error:
            self.ok = False
            return
        self.sounds = {
            "cast": self._tone([(196, 0.10), (147, 0.10)], vol=0.30),
            "splash": self._noise(0.18, vol=0.22),
            "catch": self._tone([(523, 0.07), (784, 0.10)], vol=0.34),
            "big": self._tone([(523, 0.08), (659, 0.08), (988, 0.16)], vol=0.40),
            "miss": self._tone([(247, 0.10), (185, 0.14)], vol=0.26),
            "tick": self._tone([(1320, 0.02)], vol=0.10),
        }

    def _envelope(self, i, n):
        # quick attack, smooth decay
        attack = max(1, int(n * 0.04))
        if i < attack:
            return i / attack
        return max(0.0, 1.0 - (i - attack) / (n - attack))

    def _tone(self, segments, vol=0.3):
        if not self.ok:
            return None
        sr = 44100
        buf = array("h")
        amp = int(32767 * vol)
        for freq, dur in segments:
            n = int(sr * dur)
            for i in range(n):
                env = self._envelope(i, n)
                s = int(amp * env * math.sin(2 * math.pi * freq * (i / sr)))
                buf.append(s)
                buf.append(s)
        try:
            return pygame.mixer.Sound(buffer=buf.tobytes())
        except pygame.error:
            return None

    def _noise(self, dur, vol=0.2):
        if not self.ok:
            return None
        sr = 44100
        n = int(sr * dur)
        buf = array("h")
        amp = int(32767 * vol)
        val = 0.0
        for i in range(n):
            env = max(0.0, 1.0 - i / n)
            val = 0.86 * val + 0.14 * random.uniform(-1, 1)  # low-passed noise
            buf.append(int(amp * env * val))
            buf.append(int(amp * env * val))
        try:
            return pygame.mixer.Sound(buffer=buf.tobytes())
        except pygame.error:
            return None

    def play(self, name):
        snd = self.sounds.get(name)
        if snd is not None:
            try:
                snd.play()
            except pygame.error:
                pass


# --------------------------------------------------------------------------
# Entities
# --------------------------------------------------------------------------
class Fish:
    def __init__(self, species, direction=None):
        (self.name, self.color, self.w, self.value,
         self.base_speed, self.band, self.weight) = species
        self.h = int(self.w * 0.52)
        column = SEABED_Y - WATER_Y
        ymin = WATER_Y + self.band[0] * column + self.h
        ymax = WATER_Y + self.band[1] * column
        self.y = random.uniform(ymin, max(ymin + 1, ymax))
        self.dir = direction if direction else random.choice((-1, 1))
        if self.dir > 0:
            self.x = -self.w
        else:
            self.x = WIDTH + self.w
        self.speed = self.base_speed * random.uniform(0.8, 1.25)
        self.phase = random.uniform(0, math.tau)
        self.wiggle = 0.0
        self.hooked = False

    @property
    def radius(self):
        return self.w * 0.42

    def update(self, t):
        self.x += self.dir * self.speed
        self.y += math.sin(t * 2.0 + self.phase) * 0.4   # gentle bobbing
        self.wiggle = math.sin(t * 12 + self.phase) * 0.5 + 0.5

    def offscreen(self):
        return self.x < -self.w * 2 or self.x > WIDTH + self.w * 2

    def draw(self, surf, t):
        draw_fish(surf, self.x, self.y, self.w, self.h,
                  self.color, self.dir, self.wiggle)


class Bubble:
    def __init__(self, x=None, y=None):
        self.x = x if x is not None else random.uniform(0, WIDTH)
        self.y = y if y is not None else random.uniform(WATER_Y, SEABED_Y)
        self.r = random.uniform(2, 6)
        self.speed = random.uniform(0.4, 1.4)
        self.sway = random.uniform(0, math.tau)

    def update(self, t):
        self.y -= self.speed
        self.x += math.sin(t * 2 + self.sway) * 0.4

    def draw(self, surf):
        a = int(clamp(120 * (self.y - WATER_Y) / (SEABED_Y - WATER_Y) + 40,
                      30, 150))
        s = pygame.Surface((int(self.r * 2 + 2), int(self.r * 2 + 2)),
                           pygame.SRCALPHA)
        pygame.draw.circle(s, (220, 240, 255, a),
                           (int(self.r + 1), int(self.r + 1)), int(self.r), 1)
        surf.blit(s, (self.x - self.r, self.y - self.r))


class Popup:
    def __init__(self, x, y, text, color, font):
        self.x, self.y = x, y
        self.text = text
        self.color = color
        self.font = font
        self.life = 1.0

    def update(self, dt):
        self.y -= 38 * dt
        self.life -= dt * 0.9

    def draw(self, surf):
        if self.life <= 0:
            return
        a = int(clamp(self.life * 255, 0, 255))
        img = self.font.render(self.text, True, self.color)
        img.set_alpha(a)
        surf.blit(img, (self.x - img.get_width() // 2, self.y))


# --------------------------------------------------------------------------
# Drawing routines
# --------------------------------------------------------------------------
def draw_fish(surf, x, y, w, h, color, facing, wiggle):
    """Draw a simple but characterful fish centred on (x, y)."""
    x, y = int(x), int(y)
    half_w, half_h = w // 2, h // 2
    dark = lerp_color(color, INK, 0.35)
    light = lerp_color(color, WHITE, 0.30)

    # tail (behind, opposite to facing direction)
    tail_x = x - facing * half_w
    flick = (wiggle - 0.5) * h * 0.7
    tail = [
        (tail_x, y),
        (tail_x - facing * h * 0.7, y - half_h * 0.9 + flick),
        (tail_x - facing * h * 0.7, y + half_h * 0.9 + flick),
    ]
    pygame.draw.polygon(surf, dark, tail)

    # body
    body = pygame.Rect(x - half_w, y - half_h, w, h)
    pygame.draw.ellipse(surf, color, body)
    # top highlight
    hl = pygame.Rect(x - half_w, y - half_h, w, max(3, h // 2))
    pygame.draw.ellipse(surf, light, hl)
    pygame.draw.ellipse(surf, dark, body, 2)

    # top fin
    fin_top = [
        (x - facing * 2, y - half_h),
        (x + facing * half_w * 0.5, y - half_h - h * 0.35),
        (x + facing * half_w * 0.45, y - half_h * 0.6),
    ]
    pygame.draw.polygon(surf, dark, fin_top)

    # eye
    eye_x = x + facing * half_w * 0.55
    eye_y = y - h * 0.12
    pygame.draw.circle(surf, WHITE, (int(eye_x), int(eye_y)), max(2, h // 7))
    pygame.draw.circle(surf, INK, (int(eye_x + facing), int(eye_y)),
                       max(1, h // 12))


def make_background():
    """Pre-render the sky + water gradient once."""
    bg = pygame.Surface((WIDTH, HEIGHT))
    for y in range(HEIGHT):
        if y < WATER_Y:
            t = y / WATER_Y
            bg.fill(lerp_color(SKY_TOP, SKY_BOTTOM, t), (0, y, WIDTH, 1))
        else:
            t = (y - WATER_Y) / (HEIGHT - WATER_Y)
            t = t ** 0.85
            bg.fill(lerp_color(WATER_TOP, WATER_DEEP, t), (0, y, WIDTH, 1))

    # sun with soft glow
    glow = pygame.Surface((260, 260), pygame.SRCALPHA)
    for r in range(120, 0, -6):
        a = int(8 + (120 - r) * 0.7)
        pygame.draw.circle(glow, (*SUN, a), (130, 130), r)
    bg.blit(glow, (WIDTH - 250, -40))
    pygame.draw.circle(bg, SUN, (WIDTH - 120, 88), 46)

    # a couple of soft clouds
    for cx, cy, s in ((180, 70, 1.0), (430, 50, 0.7), (560, 96, 0.5)):
        cloud = pygame.Surface((int(180 * s), int(80 * s)), pygame.SRCALPHA)
        col = (255, 255, 255, 150)
        for dx, dy, rr in ((40, 45, 34), (80, 35, 42), (125, 48, 30),
                           (95, 55, 36)):
            pygame.draw.circle(cloud, col, (int(dx * s), int(dy * s)),
                               int(rr * s))
        bg.blit(cloud, (cx, cy))
    return bg


def draw_boat(surf, t):
    """Draw the floating boat + rod and return the rod-tip position."""
    bob = math.sin(t * 1.6) * 4
    cx = WIDTH * 0.30
    deck_y = WATER_Y - 6 + bob

    # hull
    hull = [
        (cx - 86, deck_y),
        (cx + 86, deck_y),
        (cx + 60, deck_y + 40),
        (cx - 60, deck_y + 40),
    ]
    pygame.draw.polygon(surf, HULL, hull)
    pygame.draw.polygon(surf, HULL_DARK, hull, 3)
    pygame.draw.rect(surf, DECK, (cx - 86, deck_y - 8, 172, 10),
                     border_radius=4)

    # little cabin
    pygame.draw.rect(surf, (238, 232, 220), (cx - 40, deck_y - 40, 46, 34),
                     border_radius=4)
    pygame.draw.rect(surf, HULL_DARK, (cx - 40, deck_y - 40, 46, 34), 2,
                     border_radius=4)
    pygame.draw.rect(surf, (150, 205, 235), (cx - 32, deck_y - 33, 14, 14))
    pygame.draw.rect(surf, (150, 205, 235), (cx - 14, deck_y - 33, 14, 14))

    # fishing rod reaching out to the right
    rod_base = (cx + 40, deck_y - 6)
    rod_tip = (cx + 150, deck_y - 58 + bob)
    pygame.draw.line(surf, ROD, rod_base, rod_tip, 4)
    pygame.draw.circle(surf, (40, 30, 26), rod_base, 5)
    return rod_tip


def draw_hook(surf, x, y):
    """Draw the hook centred so its barb tip is the catch point (x, y)."""
    x, y = int(x), int(y)
    pygame.draw.line(surf, HOOK_COLOR, (x, y - 18), (x, y - 4), 3)
    pygame.draw.arc(surf, HOOK_COLOR,
                    pygame.Rect(x - 10, y - 10, 20, 20),
                    math.radians(200), math.radians(20), 3)
    pygame.draw.circle(surf, HOOK_COLOR, (x, y), 2)


def vertical_gradient_text(font, text, top, bottom):
    base = font.render(text, True, WHITE)
    w, h = base.get_size()
    grad = pygame.Surface((w, h), pygame.SRCALPHA)
    for yy in range(h):
        grad.fill((*lerp_color(top, bottom, yy / max(1, h - 1)), 255),
                  (0, yy, w, 1))
    out = base.copy()
    out.blit(grad, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)
    return out


# --------------------------------------------------------------------------
# The hook / line the player controls
# --------------------------------------------------------------------------
class Hook:
    IDLE, DROPPING, REELING = "idle", "dropping", "reeling"

    DROP_SPEED = 4.2
    REEL_SPEED = 3.4
    MOVE_SPEED = 6.2

    def __init__(self):
        self.reset(WIDTH * 0.30 + 150, WATER_Y - 58)

    def reset(self, tip_x, tip_y):
        self.state = Hook.IDLE
        self.tip = (tip_x, tip_y)
        self.x = tip_x
        self.y = WATER_Y + 6
        self.caught = []      # fish currently on the line
        self.max_depth = 0.0

    def cast(self, audio):
        if self.state == Hook.IDLE:
            self.state = Hook.DROPPING
            self.y = WATER_Y + 6
            self.caught = []
            audio.play("cast")
            audio.play("splash")

    def start_reeling(self, audio):
        if self.state == Hook.DROPPING:
            self.state = Hook.REELING
            audio.play("tick")

    def update(self, held_left, held_right):
        if self.state == Hook.IDLE:
            self.x = self.tip[0]
            self.y = WATER_Y + 6
            return
        if held_left:
            self.x -= Hook.MOVE_SPEED
        if held_right:
            self.x += Hook.MOVE_SPEED
        self.x = clamp(self.x, 18, WIDTH - 18)

        if self.state == Hook.DROPPING:
            self.y += Hook.DROP_SPEED
            depth = (self.y - WATER_Y) / (SEABED_Y - WATER_Y)
            self.max_depth = max(self.max_depth, depth)
            if self.y >= SEABED_Y:
                self.y = SEABED_Y
                self.state = Hook.REELING
        elif self.state == Hook.REELING:
            self.y -= Hook.REEL_SPEED
            for i, f in enumerate(self.caught):
                f.x = self.x + (i + 1) * 4 * (1 if i % 2 else -1)
                f.y = self.y + 22 + i * 20

    def draw(self, surf, t):
        # line from rod tip to hook
        pygame.draw.line(surf, LINE, self.tip, (self.x, self.y), 2)
        for f in self.caught:
            f.draw(surf, t)
        draw_hook(surf, self.x, self.y)


# --------------------------------------------------------------------------
# Game
# --------------------------------------------------------------------------
class Game:
    def __init__(self, screen, fonts, audio):
        self.screen = screen
        self.fonts = fonts
        self.audio = audio
        self.bg = make_background()
        self.high_score = self.load_highscore()
        self.state = TITLE
        self.t = 0.0
        self.reset()

    # ---- persistence ----
    def load_highscore(self):
        try:
            with open(HIGHSCORE_FILE) as fh:
                return int(fh.read().strip() or "0")
        except (OSError, ValueError):
            return 0

    def save_highscore(self):
        try:
            with open(HIGHSCORE_FILE, "w") as fh:
                fh.write(str(self.high_score))
        except OSError:
            pass

    # ---- lifecycle ----
    def reset(self):
        self.money = 0
        self.time_left = GAME_SECONDS
        self.fish = []
        self.bubbles = [Bubble() for _ in range(46)]
        self.popups = []
        self.hook = Hook()
        self.spawn_timer = 0.0
        self.last_dodged = None
        self.combo_flash = 0.0
        for _ in range(10):
            self._spawn_fish()

    def start(self):
        self.reset()
        self.state = PLAYING

    def _spawn_fish(self):
        if len(self.fish) > 26:
            return
        self.fish.append(Fish(weighted_choice(FISH_SPECIES)))

    # ---- input ----
    def cast(self):
        if self.state != PLAYING:
            return
        if self.hook.state == Hook.IDLE:
            self.hook.cast(self.audio)
        elif self.hook.state == Hook.DROPPING:
            self.hook.start_reeling(self.audio)

    def handle_event(self, event):
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                return "quit"
            if self.state == TITLE and event.key in (pygame.K_SPACE,
                                                      pygame.K_RETURN):
                self.start()
            elif self.state == GAMEOVER and event.key == pygame.K_r:
                self.start()
            elif self.state == PLAYING:
                if event.key in (pygame.K_SPACE, pygame.K_UP):
                    self.cast()
                elif event.key == pygame.K_p:
                    self.state = PAUSED
            elif self.state == PAUSED and event.key == pygame.K_p:
                self.state = PLAYING
        return None

    # ---- update ----
    def update(self, dt, held_left, held_right):
        self.t += dt
        for b in self.bubbles:
            b.update(self.t)
            if b.y < WATER_Y:
                b.__init__(y=SEABED_Y)
        for p in self.popups:
            p.update(dt)
        self.popups = [p for p in self.popups if p.life > 0]
        self.combo_flash = max(0.0, self.combo_flash - dt)

        if self.state != PLAYING:
            for f in self.fish:
                f.update(self.t)
            return

        self.time_left -= dt
        if self.time_left <= 0:
            self.time_left = 0
            self.end_game()
            return

        # spawn drip-feed
        self.spawn_timer -= dt
        if self.spawn_timer <= 0:
            self.spawn_timer = random.uniform(0.5, 1.1)
            self._spawn_fish()

        for f in self.fish:
            f.update(self.t)
        self.fish = [f for f in self.fish if not f.offscreen()]

        self.hook.update(held_left, held_right)
        self._handle_collisions()

        if (self.hook.state == Hook.REELING and
                self.hook.y <= WATER_Y + 6):
            self._land_catch()

    def _handle_collisions(self):
        hx, hy = self.hook.x, self.hook.y
        if self.hook.state == Hook.DROPPING:
            # dodging phase: a touch ends the descent (fish not caught)
            for f in self.fish:
                if math.hypot(f.x - hx, f.y - hy) < f.radius + 8:
                    self.hook.start_reeling(self.audio)
                    self.audio.play("tick")
                    break
        elif self.hook.state == Hook.REELING:
            remaining = []
            for f in self.fish:
                if (not f.hooked and
                        math.hypot(f.x - hx, f.y - hy) < f.radius + 8):
                    f.hooked = True
                    self.hook.caught.append(f)
                    self.audio.play("catch")
                    self.popups.append(
                        Popup(f.x, f.y - 18, f"+${f.value}",
                              (255, 244, 180), self.fonts["small"]))
                else:
                    remaining.append(f)
            self.fish = remaining

    def _land_catch(self):
        caught = self.hook.caught
        if caught:
            base = sum(f.value for f in caught)
            n = len(caught)
            mult = 1.0 + 0.25 * (n - 1)
            total = int(round(base * mult))
            self.money += total
            if n >= 2:
                self.combo_flash = 1.2
                self.audio.play("big")
                self.popups.append(
                    Popup(WIDTH * 0.30 + 150, WATER_Y - 96,
                          f"x{n} COMBO!  +${total}", (255, 214, 90),
                          self.fonts["mid"]))
            else:
                self.popups.append(
                    Popup(WIDTH * 0.30 + 150, WATER_Y - 80, f"+${total}",
                          (200, 255, 200), self.fonts["mid"]))
        else:
            self.audio.play("miss")
        self.hook.reset(self.hook.tip[0], self.hook.tip[1])

    def end_game(self):
        self.state = GAMEOVER
        if self.money > self.high_score:
            self.high_score = self.money
            self.save_highscore()

    # ---- rendering ----
    def draw(self):
        s = self.screen
        s.blit(self.bg, (0, 0))

        # surface foam line with a little shimmer
        for x in range(0, WIDTH, 12):
            yy = WATER_Y + math.sin(self.t * 2 + x * 0.05) * 2
            pygame.draw.line(s, FOAM, (x, yy), (x + 6, yy), 2)

        for b in self.bubbles:
            b.draw(s)
        for f in self.fish:
            f.draw(s, self.t)

        rod_tip = draw_boat(s, self.t)
        self.hook.tip = rod_tip
        if self.hook.state == Hook.IDLE:
            self.hook.x, self.hook.y = rod_tip[0], WATER_Y + 6
        self.hook.draw(s, self.t)

        for p in self.popups:
            p.draw(s)

        self._draw_hud()

        if self.state == TITLE:
            self._draw_title()
        elif self.state == PAUSED:
            self._overlay("PAUSED", "Press P to resume")
        elif self.state == GAMEOVER:
            self._draw_gameover()

    def _draw_hud(self):
        s = self.screen
        money_img = self.fonts["mid"].render(f"${self.money}", True, WHITE)
        self._shadow_blit(money_img, (20, 16))
        hi_img = self.fonts["small"].render(
            f"Best  ${self.high_score}", True, (235, 240, 245))
        self._shadow_blit(hi_img, (22, 54))

        # timer (turns red near the end)
        secs = int(math.ceil(self.time_left))
        col = (255, 120, 110) if self.time_left <= 10 else WHITE
        tmr = self.fonts["mid"].render(f"{secs}s", True, col)
        self._shadow_blit(tmr, (WIDTH - tmr.get_width() - 22, 16))

        # depth / line-value readout while fishing
        if self.state == PLAYING and self.hook.state != Hook.IDLE:
            if self.hook.state == Hook.DROPPING:
                msg = "DIVING - dodge the fish!  (SPACE to reel)"
                c = (200, 240, 255)
            else:
                val = sum(f.value for f in self.hook.caught)
                msg = f"REELING - {len(self.hook.caught)} on the line  (${val})"
                c = (255, 232, 160)
            img = self.fonts["small"].render(msg, True, c)
            self._shadow_blit(img, (WIDTH // 2 - img.get_width() // 2, 58))

    def _shadow_blit(self, img, pos):
        # Black silhouette from the glyph alpha, offset for a soft drop shadow.
        shadow = img.copy()
        shadow.fill((0, 0, 0, 255), special_flags=pygame.BLEND_RGB_MULT)
        self.screen.blit(shadow, (pos[0] + 2, pos[1] + 2))
        self.screen.blit(img, pos)

    def _overlay(self, title, subtitle):
        s = self.screen
        veil = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        veil.fill((4, 12, 30, 150))
        s.blit(veil, (0, 0))
        t = vertical_gradient_text(self.fonts["big"], title,
                                   (255, 255, 255), (150, 200, 255))
        s.blit(t, (WIDTH // 2 - t.get_width() // 2, HEIGHT // 2 - 70))
        sub = self.fonts["mid"].render(subtitle, True, WHITE)
        s.blit(sub, (WIDTH // 2 - sub.get_width() // 2, HEIGHT // 2 + 10))

    def _draw_title(self):
        s = self.screen
        veil = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        veil.fill((4, 12, 30, 120))
        s.blit(veil, (0, 0))
        title = vertical_gradient_text(self.fonts["big"], "REEL FRENZY",
                                       (255, 246, 200), (90, 180, 240))
        s.blit(title, (WIDTH // 2 - title.get_width() // 2, 150))

        lines = [
            "Dive deep dodging fish, then catch them on the way up.",
            "",
            "SPACE  cast  /  start reeling",
            "LEFT  RIGHT  steer the hook",
            "Chain catches for a COMBO multiplier!",
            "",
            "Press SPACE to fish",
        ]
        y = 320
        for i, ln in enumerate(lines):
            font = self.fonts["mid"] if i == len(lines) - 1 else \
                self.fonts["small"]
            col = (255, 230, 120) if i == len(lines) - 1 else WHITE
            img = font.render(ln, True, col)
            s.blit(img, (WIDTH // 2 - img.get_width() // 2, y))
            y += 34 if ln else 16

    def _draw_gameover(self):
        s = self.screen
        veil = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        veil.fill((4, 12, 30, 170))
        s.blit(veil, (0, 0))
        t = vertical_gradient_text(self.fonts["big"], "TIME!",
                                   (255, 255, 255), (150, 200, 255))
        s.blit(t, (WIDTH // 2 - t.get_width() // 2, 170))

        money = self.fonts["big"].render(f"${self.money}", True,
                                         (255, 224, 120))
        s.blit(money, (WIDTH // 2 - money.get_width() // 2, 280))

        if self.money >= self.high_score and self.money > 0:
            tag = self.fonts["mid"].render("NEW BEST!", True, (255, 150, 170))
            s.blit(tag, (WIDTH // 2 - tag.get_width() // 2, 360))
        else:
            tag = self.fonts["small"].render(
                f"Best  ${self.high_score}", True, WHITE)
            s.blit(tag, (WIDTH // 2 - tag.get_width() // 2, 366))

        sub = self.fonts["mid"].render("Press R to fish again", True, WHITE)
        s.blit(sub, (WIDTH // 2 - sub.get_width() // 2, 430))


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------
def build_fonts():
    return {
        "small": pygame.font.Font(None, 28),
        "mid": pygame.font.Font(None, 40),
        "big": pygame.font.Font(None, 96),
    }


def run_selftest(frames):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    audio = Audio()
    game = Game(screen, build_fonts(), audio)
    game.start()
    rng = random.Random(1234)
    dt = 1.0 / FPS
    for i in range(frames):
        # drive some synthetic input
        if game.hook.state == Hook.IDLE and rng.random() < 0.05:
            game.cast()
        if game.hook.state == Hook.DROPPING and rng.random() < 0.02:
            game.cast()
        left = rng.random() < 0.3
        right = rng.random() < 0.3
        game.update(dt, left, right)
        game.draw()
        if game.state == GAMEOVER:
            game.start()
    print(f"selftest OK: ran {frames} frames, money sample={game.money}, "
          f"fish={len(game.fish)}, audio={'on' if audio.ok else 'off'}")
    pygame.quit()
    return 0


def main():
    if SELFTEST_FRAMES:
        return run_selftest(SELFTEST_FRAMES)

    pygame.init()
    pygame.display.set_caption("Reel Frenzy")
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    clock = pygame.time.Clock()
    audio = Audio()
    game = Game(screen, build_fonts(), audio)

    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0
        dt = min(dt, 0.05)  # avoid huge steps after a stall
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif game.handle_event(event) == "quit":
                running = False
        keys = pygame.key.get_pressed()
        held_left = keys[pygame.K_LEFT] or keys[pygame.K_a]
        held_right = keys[pygame.K_RIGHT] or keys[pygame.K_d]
        game.update(dt, held_left, held_right)
        game.draw()
        pygame.display.flip()

    pygame.quit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
