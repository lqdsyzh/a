# -*- coding: utf-8 -*-
"""
============================================================================
  MINECRAFT CLONE - 完整克隆版
  作者: TraeCode
  引擎: PyOpenGL + Pygame
============================================================================
  功能:
    - 3D 体素世界（区块 16x16x128）
    - 40+ 种方块（草、泥土、石头、木头、树叶、玻璃、矿石、TNT...）
    - 6 种生物群系：平原、森林、沙漠、山地、海洋、雪地
    - 程序化地形 + 洞穴 + 树木 + 矿石
    - 第一人称 + 物理（重力/跳跃/碰撞/游泳）
    - 方块破坏/放置 + 库存 + 合成
    - 昼夜循环 + 太阳/月亮/星空
    - 生物（猪牛羊鸡/僵尸骷髅）+ 粒子 + 音效
    - 生命/饥饿/死亡/重生 + HUD
============================================================================
"""
import math, random, time, sys, os, struct, array, ctypes
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional

import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *

# ============================================================================
# 1. 常量
# ============================================================================
WINDOW_W, WINDOW_H = 1280, 720
TARGET_FPS = 60
MOUSE_SENS = 0.15
FOV = 70.0
NEAR, FAR = 0.1, 300.0

CHUNK_SX, CHUNK_SY, CHUNK_SZ = 16, 128, 16
CHUNK_VOL = CHUNK_SX * CHUNK_SY * CHUNK_SZ
SEA_LEVEL = 48
RENDER_DIST = 5
DAY_LENGTH = 600.0

PLAYER_HEIGHT = 1.8
PLAYER_EYE = 1.62
PLAYER_RADIUS = 0.3
GRAVITY = 28.0
JUMP_SPEED = 8.4
WALK_SPEED = 4.3
SPRINT_SPEED = 6.0
SWIM_SPEED = 2.0

def idx(x, y, z):
    return x + y * CHUNK_SX + z * CHUNK_SX * CHUNK_SY

# ============================================================================
# 2. 方块 ID 与属性
# ============================================================================
BLOCK_AIR = 0
BLOCK_BEDROCK = 1
BLOCK_STONE = 2
BLOCK_DIRT = 3
BLOCK_GRASS = 4
BLOCK_SAND = 5
BLOCK_WATER = 6
BLOCK_LAVA = 7
BLOCK_WOOD = 8
BLOCK_LEAVES = 9
BLOCK_PLANK = 10
BLOCK_COBBLE = 11
BLOCK_COAL = 12
BLOCK_IRON = 13
BLOCK_GOLD = 14
BLOCK_DIAMOND = 15
BLOCK_REDSTONE = 16
BLOCK_GLASS = 17
BLOCK_BRICK = 18
BLOCK_MOSSY = 19
BLOCK_WORKBENCH = 20
BLOCK_FURNACE = 21
BLOCK_TNT = 22
BLOCK_CRAFTED_SNOW = 23
BLOCK_SAPLING = 24
BLOCK_FLOWER_RED = 25
BLOCK_FLOWER_YELLOW = 26
BLOCK_TALL_GRASS = 27
BLOCK_BED = 28
BLOCK_CAKE = 29
BLOCK_BOOKSHELF = 30
BLOCK_CLAY = 31
BLOCK_GRAVEL = 32
BLOCK_ICE = 33
BLOCK_PUMPKIN = 34
BLOCK_CACTUS = 35
BLOCK_SUGAR = 36
BLOCK_SPONGE = 37
BLOCK_OBSIDIAN = 38
BLOCK_GLOWSTONE = 39
BLOCK_SANDSTONE = 40
BLOCK_COUNT = 41

# 物品
ITEM_STICK = 50
ITEM_TORCH = 51
ITEM_WOOD_PICK = 60
ITEM_STONE_PICK = 61
ITEM_IRON_PICK = 62
ITEM_DIAMOND_PICK = 63
ITEM_WOOD_SWORD = 64
ITEM_STONE_SWORD = 65
ITEM_IRON_SWORD = 66
ITEM_DIAMOND_SWORD = 67
ITEM_WOOD_AXE = 68
ITEM_STONE_AXE = 69
ITEM_IRON_AXE = 70
ITEM_DIAMOND_AXE = 71
ITEM_BUCKET = 80
ITEM_FLINT_STEEL = 81
ITEM_SUGAR_ITEM = 90
ITEM_BOOK = 91
ITEM_APPLE = 92
ITEM_RAW_PORK = 93
ITEM_COOKED_PORK = 94

@dataclass
class BlockProps:
    name: str = "Unknown"
    solid: bool = True
    transparent: bool = False
    opaque_render: bool = True
    fluid: bool = False
    cross: bool = False
    billboard: bool = False
    hardness: float = 1.0
    drop_id: int = 0
    emissive: float = 0.0
    light_block: int = 0
    biome_color: bool = False

BLOCK_PROPS = {
    BLOCK_AIR:         BlockProps("Air", solid=False, transparent=True, opaque_render=False, light_block=0),
    BLOCK_BEDROCK:     BlockProps("Bedrock", hardness=-1, drop_id=0),
    BLOCK_STONE:       BlockProps("Stone", hardness=1.5, drop_id=BLOCK_COBBLE),
    BLOCK_DIRT:        BlockProps("Dirt", hardness=0.5, drop_id=BLOCK_DIRT, biome_color=True),
    BLOCK_GRASS:       BlockProps("Grass", hardness=0.6, drop_id=BLOCK_DIRT, biome_color=True),
    BLOCK_SAND:        BlockProps("Sand", hardness=0.5, drop_id=BLOCK_SAND),
    BLOCK_WATER:       BlockProps("Water", solid=False, transparent=True, fluid=True, light_block=2, drop_id=0),
    BLOCK_LAVA:        BlockProps("Lava", solid=False, transparent=True, fluid=True, emissive=1.0, light_block=15, drop_id=0),
    BLOCK_WOOD:        BlockProps("Oak Log", hardness=2.0, drop_id=BLOCK_WOOD),
    BLOCK_LEAVES:      BlockProps("Leaves", hardness=0.2, drop_id=BLOCK_SAPLING, transparent=True, light_block=1, biome_color=True),
    BLOCK_PLANK:       BlockProps("Oak Planks", hardness=2.0, drop_id=BLOCK_PLANK),
    BLOCK_COBBLE:      BlockProps("Cobblestone", hardness=2.0, drop_id=BLOCK_COBBLE),
    BLOCK_COAL:        BlockProps("Coal Ore", hardness=3.0, drop_id=BLOCK_COAL),
    BLOCK_IRON:        BlockProps("Iron Ore", hardness=3.0, drop_id=BLOCK_IRON),
    BLOCK_GOLD:        BlockProps("Gold Ore", hardness=3.0, drop_id=BLOCK_GOLD),
    BLOCK_DIAMOND:     BlockProps("Diamond Ore", hardness=3.0, drop_id=BLOCK_DIAMOND),
    BLOCK_REDSTONE:    BlockProps("Redstone Ore", hardness=3.0, drop_id=BLOCK_REDSTONE, emissive=0.3),
    BLOCK_GLASS:       BlockProps("Glass", hardness=0.3, transparent=True, drop_id=0),
    BLOCK_BRICK:       BlockProps("Stone Bricks", hardness=2.0, drop_id=BLOCK_BRICK),
    BLOCK_MOSSY:       BlockProps("Mossy Stone", hardness=2.0, drop_id=BLOCK_MOSSY),
    BLOCK_WORKBENCH:   BlockProps("Crafting Table", hardness=2.5, drop_id=BLOCK_WORKBENCH),
    BLOCK_FURNACE:     BlockProps("Furnace", hardness=3.5, drop_id=BLOCK_FURNACE),
    BLOCK_TNT:         BlockProps("TNT", hardness=0.0, drop_id=BLOCK_TNT),
    BLOCK_CRAFTED_SNOW:BlockProps("Snow Layer", solid=False, transparent=True, hardness=0.2, drop_id=0, biome_color=True),
    BLOCK_SAPLING:     BlockProps("Sapling", solid=False, transparent=True, cross=True, hardness=0.0, drop_id=BLOCK_SAPLING, biome_color=True),
    BLOCK_FLOWER_RED:  BlockProps("Poppy", solid=False, transparent=True, cross=True, hardness=0.0, drop_id=BLOCK_FLOWER_RED),
    BLOCK_FLOWER_YELLOW:BlockProps("Dandelion", solid=False, transparent=True, cross=True, hardness=0.0, drop_id=BLOCK_FLOWER_YELLOW),
    BLOCK_TALL_GRASS:  BlockProps("Tall Grass", solid=False, transparent=True, cross=True, hardness=0.0, drop_id=0, biome_color=True),
    BLOCK_BED:         BlockProps("Bed", hardness=0.2, drop_id=BLOCK_BED, solid=False, transparent=True),
    BLOCK_CAKE:        BlockProps("Cake", solid=False, transparent=True, hardness=0.5, drop_id=0),
    BLOCK_BOOKSHELF:   BlockProps("Bookshelf", hardness=1.5, drop_id=BLOCK_BOOKSHELF),
    BLOCK_CLAY:        BlockProps("Clay", hardness=0.6, drop_id=BLOCK_CLAY),
    BLOCK_GRAVEL:      BlockProps("Gravel", hardness=0.6, drop_id=BLOCK_GRAVEL),
    BLOCK_ICE:         BlockProps("Ice", hardness=0.5, transparent=True, drop_id=0),
    BLOCK_PUMPKIN:     BlockProps("Pumpkin", hardness=1.0, drop_id=BLOCK_PUMPKIN),
    BLOCK_CACTUS:      BlockProps("Cactus", hardness=0.4, drop_id=BLOCK_CACTUS),
    BLOCK_SUGAR:       BlockProps("Sugar Cane", solid=False, transparent=True, cross=False, hardness=0.0, drop_id=BLOCK_SUGAR),
    BLOCK_SPONGE:      BlockProps("Sponge", hardness=0.6, drop_id=BLOCK_SPONGE),
    BLOCK_OBSIDIAN:    BlockProps("Obsidian", hardness=10.0, drop_id=BLOCK_OBSIDIAN),
    BLOCK_GLOWSTONE:   BlockProps("Glowstone", hardness=0.3, drop_id=BLOCK_GLOWSTONE, emissive=1.0, light_block=15),
    BLOCK_SANDSTONE:   BlockProps("Sandstone", hardness=0.8, drop_id=BLOCK_SANDSTONE),
}

ITEM_META = {
    ITEM_STICK: ("Stick", 64), ITEM_TORCH: ("Torch", 64),
    ITEM_WOOD_PICK: ("Wood Pickaxe", 1), ITEM_STONE_PICK: ("Stone Pickaxe", 1),
    ITEM_IRON_PICK: ("Iron Pickaxe", 1), ITEM_DIAMOND_PICK: ("Diamond Pickaxe", 1),
    ITEM_WOOD_SWORD: ("Wood Sword", 1), ITEM_STONE_SWORD: ("Stone Sword", 1),
    ITEM_IRON_SWORD: ("Iron Sword", 1), ITEM_DIAMOND_SWORD: ("Diamond Sword", 1),
    ITEM_WOOD_AXE: ("Wood Axe", 1), ITEM_STONE_AXE: ("Stone Axe", 1),
    ITEM_IRON_AXE: ("Iron Axe", 1), ITEM_DIAMOND_AXE: ("Diamond Axe", 1),
    ITEM_BUCKET: ("Bucket", 1), ITEM_FLINT_STEEL: ("Flint and Steel", 1),
    ITEM_SUGAR_ITEM: ("Sugar", 64), ITEM_BOOK: ("Book", 64),
    ITEM_APPLE: ("Apple", 64), ITEM_RAW_PORK: ("Raw Porkchop", 64),
    ITEM_COOKED_PORK: ("Cooked Porkchop", 64),
}

# 工具等级
TOOL_NONE = 0
TOOL_WOOD = 1
TOOL_STONE = 2
TOOL_IRON = 3
TOOL_DIAMOND = 4

TOOL_LEVEL = {
    ITEM_WOOD_PICK: TOOL_WOOD, ITEM_STONE_PICK: TOOL_STONE,
    ITEM_IRON_PICK: TOOL_IRON, ITEM_DIAMOND_PICK: TOOL_DIAMOND,
    ITEM_WOOD_SWORD: TOOL_WOOD, ITEM_STONE_SWORD: TOOL_STONE,
    ITEM_IRON_SWORD: TOOL_IRON, ITEM_DIAMOND_SWORD: TOOL_DIAMOND,
    ITEM_WOOD_AXE: TOOL_WOOD, ITEM_STONE_AXE: TOOL_STONE,
    ITEM_IRON_AXE: TOOL_IRON, ITEM_DIAMOND_AXE: TOOL_DIAMOND,
}

def item_name(iid):
    if iid in BLOCK_PROPS: return BLOCK_PROPS[iid].name
    return ITEM_META.get(iid, ("Unknown", 64))[0]

def item_max_stack(iid):
    if iid in BLOCK_PROPS:
        if iid in (BLOCK_CAKE, BLOCK_BED): return 1
        return 64
    return ITEM_META.get(iid, ("", 64))[1]

# ============================================================================
# 3. 程序化纹理生成
# ============================================================================
def _hsl(h, s, l):
    h = h % 360
    c = (1 - abs(2*l - 1)) * s
    x = c * (1 - abs(((h/60) % 2) - 1))
    m = l - c/2
    if h < 60:   r,g,b = c,x,0
    elif h < 120: r,g,b = x,c,0
    elif h < 180: r,g,b = 0,c,x
    elif h < 240: r,g,b = 0,x,c
    elif h < 300: r,g,b = x,0,c
    else:         r,g,b = c,0,x
    return int((r+m)*255), int((g+m)*255), int((b+m)*255)

def _noise(rng, base, amt=12):
    r,g,b = base
    n = rng.randint(-amt, amt)
    return (max(0, min(255, r+n)), max(0, min(255, g+n)), max(0, min(255, b+n)))

def _fill(fn):
    """生成 16x16 纹理"""
    return fn()

def t_grass_top():
    rng = random.Random(1)
    return [_noise(rng, _hsl(rng.choice([95,100,110,115,120]), 0.6, 0.35 + rng.random()*0.15)) for _ in range(256)]
def t_grass_side():
    rng = random.Random(3)
    pix = []
    for y in range(16):
        for x in range(16):
            if y >= 12:
                base = _hsl(rng.choice([95,100,110,115,120]), 0.6, 0.35 + rng.random()*0.15)
                if rng.random() < 0.10: base = _hsl(110, 0.7, 0.4)
            else:
                base = _hsl(28, 0.45, 0.30 + rng.random()*0.10)
            pix.append(_noise(rng, base))
    return pix
def t_dirt():
    rng = random.Random(2)
    return [_noise(rng, _hsl(28, 0.45, 0.30 + rng.random()*0.10)) for _ in range(256)]
def t_stone():
    rng = random.Random(4)
    return [_noise(rng, _hsl(0, 0, 0.45 + rng.random()*0.15)) for _ in range(256)]
def t_cobble():
    rng = random.Random(5)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(0, 0, 0.42 + rng.random()*0.15)
            if x % 5 == 0 or y % 5 == 0: base = _hsl(0, 0, 0.28)
            pix.append(_noise(rng, base))
    return pix
def t_sand():
    rng = random.Random(6)
    return [_noise(rng, _hsl(45, 0.4, 0.70 + rng.random()*0.10)) for _ in range(256)]
def t_water():
    rng = random.Random(7)
    return [_noise(rng, _hsl(210, 0.6, 0.30 + rng.random()*0.10)) for _ in range(256)]
def t_lava():
    rng = random.Random(8)
    return [_noise(rng, _hsl(rng.choice([15,20,25,30]), 0.95, 0.50 + rng.random()*0.15)) for _ in range(256)]
def t_wood_side():
    rng = random.Random(9)
    return [_noise(rng, _hsl(28, 0.55, 0.30 + math.sin((i%16)*0.6)*0.05)) for i in range(256)]
def t_wood_top():
    rng = random.Random(10)
    pix = []
    for y in range(16):
        for x in range(16):
            d = math.sqrt((x-7.5)**2 + (y-7.5)**2)
            r = max(0.15, min(0.5, 0.30 + math.sin(d*0.8)*0.08))
            pix.append(_noise(rng, _hsl(28, 0.55, r)))
    return pix
def t_leaves():
    rng = random.Random(11)
    return [_noise(rng, _hsl(rng.choice([95,100,110,115,120,90]), 0.7, 0.30 + rng.random()*0.15) if rng.random() > 0.08 else _hsl(80, 0.4, 0.25)) for _ in range(256)]
def t_plank():
    rng = random.Random(12)
    return [_noise(rng, _hsl(30, 0.5, 0.40 + math.sin((i//16)*0.6)*0.04 + rng.random()*0.05)) for i in range(256)]
def t_ore(color):
    rng = random.Random(hash(color) & 0xFFFF)
    return [_noise(rng, _hsl(0, 0, 0.45 + rng.random()*0.15)) if rng.random() > 0.18 else _noise(rng, color) for _ in range(256)]
def t_glass():
    pix = []
    for y in range(16):
        for x in range(16):
            if x in (0,15) or y in (0,15): pix.append((220, 230, 240))
            else: pix.append((180, 220, 240))
    return pix
def t_brick():
    rng = random.Random(14)
    pix = []
    for y in range(16):
        for x in range(16):
            row = y // 4
            offset = (row % 2) * 4
            in_brick = ((x + offset) % 8 != 0) and (y % 4 != 0)
            base = _hsl(15, 0.45, 0.40 + rng.random()*0.10) if in_brick else _hsl(0, 0, 0.30)
            pix.append(_noise(rng, base))
    return pix
def t_mossy():
    rng = random.Random(15)
    return [_noise(rng, _hsl(110, 0.5, 0.30) if rng.random() < 0.25 else _hsl(0, 0, 0.45 + rng.random()*0.10)) for _ in range(256)]
def t_wb_top():
    rng = random.Random(16)
    return [_noise(rng, _hsl(28, 0.55, 0.35 + rng.random()*0.05)) for _ in range(256)]
def t_wb_side():
    rng = random.Random(17)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(28, 0.55, 0.30 + rng.random()*0.05)
            if 4 <= y <= 11 and 2 <= x <= 13 and (x+y) % 2 == 0:
                base = (max(0,base[0]-15), max(0,base[1]-15), max(0,base[2]-15))
            pix.append(_noise(rng, base))
    return pix
def t_wb_front():
    rng = random.Random(18)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(28, 0.55, 0.30 + rng.random()*0.05)
            if 2 <= x <= 13 and 3 <= y <= 12 and (x in (2,13) or y in (3,12)):
                base = (max(0,base[0]-30), max(0,base[1]-30), max(0,base[2]-30))
            pix.append(_noise(rng, base))
    return pix
def t_furnace_side():
    rng = random.Random(19)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(0, 0, 0.40 + rng.random()*0.08)
            if 2 <= x <= 13 and 3 <= y <= 12:
                if x in (2,13) or y in (3,12): base = (max(0,base[0]-30), max(0,base[1]-30), max(0,base[2]-30))
                if 6 <= x <= 9 and 5 <= y <= 10: base = (10, 10, 10)
            pix.append(_noise(rng, base))
    return pix
def t_furnace_top():
    rng = random.Random(20)
    return [_noise(rng, _hsl(0, 0, 0.50 + rng.random()*0.08)) for _ in range(256)]
def t_tnt():
    rng = random.Random(21)
    pix = []
    for y in range(16):
        for x in range(16):
            if y < 3 or y > 12: base = _hsl(0, 0, 0.20)
            else: base = _hsl(0, 0.85, 0.45 + rng.random()*0.10)
            pix.append(_noise(rng, base))
    return pix
def t_snow():
    rng = random.Random(22)
    return [_noise(rng, _hsl(0, 0, 0.92 + rng.random()*0.05)) for _ in range(256)]
def t_sapling():
    pix = []
    for y in range(16):
        for x in range(16):
            d = math.sqrt((x-7.5)**2 + (y-10)**2)
            if d < 3.5 and y > 6:
                pix.append((_hsl(110, 0.7, 0.30 + (y%3)*0.05)))
            else:
                pix.append((0, 0, 0))
    return pix
def t_flower_red():
    pix = []
    for y in range(16):
        for x in range(16):
            d = math.sqrt((x-7.5)**2 + (y-5)**2)
            if d < 3: pix.append(_hsl(0, 0.85, 0.45))
            elif 9 <= y <= 15 and abs(x-7.5) < 1: pix.append(_hsl(110, 0.7, 0.30))
            else: pix.append((0, 0, 0))
    return pix
def t_flower_yellow():
    pix = []
    for y in range(16):
        for x in range(16):
            d = math.sqrt((x-7.5)**2 + (y-5)**2)
            if d < 3: pix.append(_hsl(50, 0.85, 0.55))
            elif 9 <= y <= 15 and abs(x-7.5) < 1: pix.append(_hsl(110, 0.7, 0.30))
            else: pix.append((0, 0, 0))
    return pix
def t_tall_grass():
    pix = []
    for y in range(16):
        for x in range(16):
            if x in range(5, 12) and y > 4 + (x % 3): pix.append(_hsl(110, 0.7, 0.30 + (x+y)%3*0.05))
            else: pix.append((0, 0, 0))
    return pix
def t_bed():
    rng = random.Random(27)
    return [_noise(rng, _hsl(0, 0.85, 0.50 + (i//16 > 9)*-0.4 + rng.random()*0.10)) for i in range(256)]
def t_cake():
    rng = random.Random(28)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(30, 0.6, 0.55 + rng.random()*0.10) if y <= 10 else _hsl(0, 0.85, 0.45)
            pix.append(_noise(rng, base))
    return pix
def t_bookshelf():
    rng = random.Random(29)
    book_colors = [_hsl(0,0.6,0.30), _hsl(35,0.6,0.40), _hsl(110,0.4,0.35), _hsl(220,0.5,0.40), _hsl(0,0.6,0.30)]
    return [_noise(rng, _hsl(30, 0.5, 0.35) if y in (3,12) else book_colors[(x*3+y) % 5]) for y in range(16) for x in range(16)]
def t_clay():
    rng = random.Random(30)
    return [_noise(rng, _hsl(220, 0.15, 0.75 + rng.random()*0.08)) for _ in range(256)]
def t_gravel():
    rng = random.Random(31)
    return [_noise(rng, _hsl(0, 0, 0.45 + rng.random()*0.20)) for _ in range(256)]
def t_ice():
    rng = random.Random(32)
    return [_noise(rng, _hsl(195, 0.4, 0.80 + rng.random()*0.10)) for _ in range(256)]
def t_pumpkin_side():
    rng = random.Random(33)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(28, 0.85, 0.42 if x % 3 == 0 else 0.50 + rng.random()*0.05)
            pix.append(_noise(rng, base))
    return pix
def t_pumpkin_top():
    rng = random.Random(34)
    return [_noise(rng, _hsl(28, 0.7, 0.45 + rng.random()*0.10)) for _ in range(256)]
def t_pumpkin_face():
    rng = random.Random(35)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(28, 0.85, 0.50 + rng.random()*0.10)
            if 9 <= y <= 13 and 4 <= x <= 11:
                if (x+y) % 3 == 0 or (x in (4,11) and y in (10,12)):
                    base = (30, 15, 0)
            if (3 <= x <= 6 and 4 <= y <= 7) or (9 <= x <= 12 and 4 <= y <= 7):
                if x in (3,6,9,12) or y in (4,7):
                    base = (30, 15, 0)
            pix.append(_noise(rng, base))
    return pix
def t_cactus():
    rng = random.Random(36)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(110, 0.55, 0.30 + rng.random()*0.10)
            if x in (0, 1, 14, 15): base = _hsl(110, 0.5, 0.22)
            pix.append(_noise(rng, base))
    return pix
def t_sugar():
    rng = random.Random(37)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(60, 0.4, 0.70 + rng.random()*0.10)
            if x in (0, 15): base = _hsl(60, 0.4, 0.50)
            pix.append(_noise(rng, base))
    return pix
def t_sponge():
    rng = random.Random(38)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(48, 0.75, 0.65 + rng.random()*0.10)
            if rng.random() < 0.10: base = (40, 25, 10)
            pix.append(_noise(rng, base))
    return pix
def t_obsidian():
    rng = random.Random(39)
    return [_noise(rng, _hsl(280, 0.2, 0.10 + rng.random()*0.10)) for _ in range(256)]
def t_glowstone():
    rng = random.Random(40)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(50, 0.5, 0.70 + rng.random()*0.10)
            if rng.random() < 0.15: base = _hsl(50, 0.7, 0.85)
            pix.append(_noise(rng, base))
    return pix
def t_sandstone():
    rng = random.Random(41)
    pix = []
    for y in range(16):
        for x in range(16):
            base = _hsl(45, 0.4, 0.70 + rng.random()*0.10)
            if y == 4 or y == 12: base = _hsl(40, 0.3, 0.55)
            pix.append(_noise(rng, base))
    return pix
def t_bedrock():
    rng = random.Random(42)
    return [_noise(rng, _hsl(0, 0, 0.20 + rng.random()*0.15)) for _ in range(256)]
def t_stick():
    rng = random.Random(50)
    return [_noise(rng, _hsl(30, 0.5, 0.45 + math.sin((i%16)*0.8)*0.05 + rng.random()*0.05)) for i in range(256)]
def t_pickaxe():
    rng = random.Random(51)
    return [_noise(rng, _hsl(30, 0.5, 0.40) if (i%16) > 2 and (i%16) < 12 and (i//16) > 4 and (i//16) < 12 else _hsl(30, 0.5, 0.30)) for i in range(256)]
def t_apple():
    rng = random.Random(52)
    return [_noise(rng, _hsl(0, 0.85, 0.40 + rng.random()*0.10) if math.sqrt(((i%16)-8)**2 + ((i//16)-8)**2) < 6 else _hsl(0,0,0)) for i in range(256)]
def t_pork():
    rng = random.Random(53)
    return [_noise(rng, _hsl(0, 0.6, 0.65 + rng.random()*0.10)) for _ in range(256)]
def t_cooked():
    rng = random.Random(54)
    return [_noise(rng, _hsl(20, 0.6, 0.40 + rng.random()*0.10)) for _ in range(256)]

# 纹理表
TEX = {}  # (block_id, face) -> pixels
def build_textures():
    same = [
        (BLOCK_BEDROCK, t_bedrock()), (BLOCK_STONE, t_stone()),
        (BLOCK_DIRT, t_dirt()), (BLOCK_SAND, t_sand()),
        (BLOCK_WATER, t_water()), (BLOCK_LAVA, t_lava()),
        (BLOCK_LEAVES, t_leaves()), (BLOCK_PLANK, t_plank()),
        (BLOCK_COBBLE, t_cobble()), (BLOCK_COAL, t_ore((20,20,20))),
        (BLOCK_IRON, t_ore((200,180,160))), (BLOCK_GOLD, t_ore((255,220,80))),
        (BLOCK_DIAMOND, t_ore((100,230,230))), (BLOCK_REDSTONE, t_ore((220,30,30))),
        (BLOCK_GLASS, t_glass()), (BLOCK_BRICK, t_brick()), (BLOCK_MOSSY, t_mossy()),
        (BLOCK_TNT, t_tnt()), (BLOCK_CRAFTED_SNOW, t_snow()),
        (BLOCK_SAPLING, t_sapling()), (BLOCK_FLOWER_RED, t_flower_red()),
        (BLOCK_FLOWER_YELLOW, t_flower_yellow()), (BLOCK_TALL_GRASS, t_tall_grass()),
        (BLOCK_BED, t_bed()), (BLOCK_CAKE, t_cake()), (BLOCK_BOOKSHELF, t_bookshelf()),
        (BLOCK_CLAY, t_clay()), (BLOCK_GRAVEL, t_gravel()), (BLOCK_ICE, t_ice()),
        (BLOCK_CACTUS, t_cactus()), (BLOCK_SUGAR, t_sugar()),
        (BLOCK_SPONGE, t_sponge()), (BLOCK_OBSIDIAN, t_obsidian()),
        (BLOCK_GLOWSTONE, t_glowstone()), (BLOCK_SANDSTONE, t_sandstone()),
    ]
    for b, pix in same:
        for f in range(6):
            TEX[(b, f)] = pix
    # 特殊
    top, side, bot = t_grass_top(), t_grass_side(), t_dirt()
    for f in range(6):
        if f == 2: TEX[(BLOCK_GRASS, f)] = top
        elif f == 3: TEX[(BLOCK_GRASS, f)] = bot
        else: TEX[(BLOCK_GRASS, f)] = side
    for f in range(6):
        if f in (2,3): TEX[(BLOCK_WOOD, f)] = t_wood_top()
        else: TEX[(BLOCK_WOOD, f)] = t_wood_side()
    for f in range(6):
        if f == 2: TEX[(BLOCK_WORKBENCH, f)] = t_wb_top()
        elif f == 4: TEX[(BLOCK_WORKBENCH, f)] = t_wb_front()
        else: TEX[(BLOCK_WORKBENCH, f)] = t_wb_side()
    for f in range(6):
        if f == 2: TEX[(BLOCK_FURNACE, f)] = t_furnace_top()
        else: TEX[(BLOCK_FURNACE, f)] = t_furnace_side()
    for f in range(6):
        if f == 2: TEX[(BLOCK_PUMPKIN, f)] = t_pumpkin_top()
        elif f == 4: TEX[(BLOCK_PUMPKIN, f)] = t_pumpkin_face()
        else: TEX[(BLOCK_PUMPKIN, f)] = t_pumpkin_side()
    # 物品
    for f in range(6):
        TEX[(ITEM_STICK, f)] = t_stick()
        TEX[(ITEM_WOOD_PICK, f)] = t_pickaxe()
        TEX[(ITEM_STONE_PICK, f)] = t_pickaxe()
        TEX[(ITEM_IRON_PICK, f)] = t_pickaxe()
        TEX[(ITEM_DIAMOND_PICK, f)] = t_pickaxe()
        TEX[(ITEM_WOOD_SWORD, f)] = t_pickaxe()
        TEX[(ITEM_WOOD_AXE, f)] = t_pickaxe()
        TEX[(ITEM_APPLE, f)] = t_apple()
        TEX[(ITEM_RAW_PORK, f)] = t_pork()
        TEX[(ITEM_COOKED_PORK, f)] = t_cooked()

# ============================================================================
# 4. 纹理图集
# ============================================================================
def build_atlas():
    tiles_per_row = 32
    total = len(TEX)
    rows = (total + tiles_per_row - 1) // tiles_per_row
    aw = tiles_per_row * 17
    ah = rows * 17
    atlas = [[0,0,0] for _ in range(aw*ah)]
    block_uv = {}
    i = 0
    for key, pix in TEX.items():
        tx = i % tiles_per_row
        ty = i // tiles_per_row
        ox = tx * 17
        oy = ty * 17
        for y in range(16):
            for x in range(16):
                r,g,b = pix[y*16+x]
                atlas[(oy+y)*aw + ox+x] = [r,g,b]
        u0 = ox/aw; v0 = oy/ah
        u1 = (ox+16)/aw; v1 = (oy+16)/ah
        block_uv[key] = (u0, v0, u1, v1)
        i += 1
    return atlas, aw, ah, block_uv

# ============================================================================
# 5. Perlin 噪声
# ============================================================================
class PerlinNoise:
    def __init__(self, seed=1337):
        rng = random.Random(seed)
        self.perm = list(range(256))
        rng.shuffle(self.perm)
        self.perm = self.perm + self.perm
    def _fade(self, t): return t*t*t*(t*(t*6-15)+10)
    def _lerp(self, a, b, t): return a + t*(b-a)
    def _grad2(self, h, x, y):
        h = h & 3
        u = x if h < 2 else y
        v = y if h < 2 else x
        return (u if (h & 1) == 0 else -u) + (v if (h & 2) == 0 else -v)
    def noise2(self, x, y):
        X = int(math.floor(x)) & 255
        Y = int(math.floor(y)) & 255
        x -= math.floor(x); y -= math.floor(y)
        u = self._fade(x); v = self._fade(y)
        a = self.perm[X] + Y
        b = self.perm[X+1] + Y
        return self._lerp(self._lerp(self._grad2(self.perm[a], x, y),
                                     self._grad2(self.perm[b], x-1, y), u),
                          self._lerp(self._grad2(self.perm[a+1], x, y-1),
                                     self._grad2(self.perm[b+1], x-1, y-1), u), v) * 0.7071
    def octave(self, x, y, octaves=4, persistence=0.5, scale=1.0):
        total = 0.0; freq = 1.0; amp = 1.0; maxv = 0.0
        for _ in range(octaves):
            total += self.noise2(x*freq/scale, y*freq/scale) * amp
            maxv += amp
            amp *= persistence
            freq *= 2.0
        return total / maxv
    def octave3(self, x, y, z, octaves=3, persistence=0.5, scale=1.0):
        # 3D 简化为分别 xz 和 y
        a = self.octave(x, z, octaves, persistence, scale)
        b = self.octave(x*0.3, y*0.3, octaves, persistence, scale)
        return a + b * 0.5

# ============================================================================
# 6. 区块 Chunk
# ============================================================================
class Chunk:
    __slots__ = ('cx', 'cz', 'blocks', 'mesh_dirty', 'vbos', 'counts', 'generated')
    def __init__(self, cx, cz):
        self.cx = cx
        self.cz = cz
        self.blocks = array.array('B', [0]) * CHUNK_VOL
        self.mesh_dirty = True
        self.vbos = [0, 0, 0]   # solid, water, cross
        self.counts = [0, 0, 0]
        self.generated = False
    def get(self, x, y, z):
        if 0 <= x < CHUNK_SX and 0 <= y < CHUNK_SY and 0 <= z < CHUNK_SZ:
            return self.blocks[idx(x,y,z)]
        return BLOCK_AIR
    def set(self, x, y, z, b):
        if 0 <= x < CHUNK_SX and 0 <= y < CHUNK_SY and 0 <= z < CHUNK_SZ:
            self.blocks[idx(x,y,z)] = b

# ============================================================================
# 7. 世界 World
# ============================================================================
class World:
    def __init__(self, seed=12345):
        self.seed = seed
        self.chunks: Dict[Tuple[int,int], Chunk] = {}
        self.pn_height = PerlinNoise(seed)
        self.pn_biome = PerlinNoise(seed+1)
        self.pn_cave1 = PerlinNoise(seed+2)
        self.pn_cave2 = PerlinNoise(seed+3)
        self.pn_ore = PerlinNoise(seed+5)
        self.pn_tree = PerlinNoise(seed+6)
        self.pn_detail = PerlinNoise(seed+7)
        self.time_of_day = 0.30

    def get_chunk(self, cx, cz, create=True):
        k = (cx, cz)
        c = self.chunks.get(k)
        if c is None and create:
            c = Chunk(cx, cz)
            self.generate_chunk(c)
            self.chunks[k] = c
        return c

    def get_block(self, x, y, z):
        if y < 0 or y >= CHUNK_SY: return BLOCK_AIR
        cx = x >> 4
        cz = z >> 4
        c = self.chunks.get((cx, cz))
        if c is None: return BLOCK_AIR
        lx = x & 15
        lz = z & 15
        return c.blocks[idx(lx, y, lz)]

    def set_block(self, x, y, z, b):
        if y < 0 or y >= CHUNK_SY: return
        cx = x >> 4
        cz = z >> 4
        c = self.get_chunk(cx, cz)
        lx = x & 15; lz = z & 15
        c.blocks[idx(lx, y, lz)] = b
        c.mesh_dirty = True
        if lx == 0:   self._touch(cx-1, cz)
        if lx == 15:  self._touch(cx+1, cz)
        if lz == 0:   self._touch(cx, cz-1)
        if lz == 15:  self._touch(cx, cz+1)

    def _touch(self, cx, cz):
        c = self.chunks.get((cx, cz))
        if c: c.mesh_dirty = True

    def biome_at(self, x, z):
        temp = self.pn_biome.octave(x*0.005, z*0.005, 3, 0.5, 64)
        moisture = self.pn_biome.octave(x*0.01 + 1000, z*0.01 + 1000, 3, 0.5, 64)
        elevation = self.pn_biome.octave(x*0.003 + 500, z*0.003 + 500, 4, 0.5, 256)
        if elevation < -0.20: return "ocean"
        if temp < -0.30: return "snow"
        if temp < -0.10 and moisture < 0.0: return "snow"
        if temp > 0.40 and moisture < -0.1: return "desert"
        if elevation > 0.35: return "mountain"
        if moisture > 0.15: return "forest"
        return "plains"

    def height_at(self, x, z):
        b = self.biome_at(x, z)
        base = self.pn_height.octave(x*0.015, z*0.015, 4, 0.5, 256)
        h2 = self.pn_detail.octave(x*0.08, z*0.08, 2, 0.5, 32)
        h = int(48 + base*20 + h2*3)
        if b == "ocean":
            h = min(h, SEA_LEVEL - 2 + int(self.pn_height.octave(x*0.05+333, z*0.05+333, 2, 0.5, 32)*2))
        elif b == "mountain":
            m = self.pn_height.octave(x*0.02, z*0.02, 5, 0.6, 128)
            h = 50 + int(m*40)
        elif b == "desert":
            h = max(SEA_LEVEL+1, min(58, h))
        elif b == "snow":
            h = max(SEA_LEVEL+2, h + 4)
        elif b == "forest":
            h = max(SEA_LEVEL+1, h + 2)
        return max(1, min(CHUNK_SY-10, h))

    def generate_chunk(self, chunk):
        cx, cz = chunk.cx, chunk.cz
        ox = cx * CHUNK_SX
        oz = cz * CHUNK_SZ
        # 地形
        for lz in range(CHUNK_SZ):
            for lx in range(CHUNK_SX):
                x = ox + lx
                z = oz + lz
                h = self.height_at(x, z)
                biome = self.biome_at(x, z)
                for y in range(CHUNK_SY):
                    b = BLOCK_AIR
                    if y == 0: b = BLOCK_BEDROCK
                    elif y < h - 4: b = BLOCK_STONE
                    elif y < h:
                        if biome == "desert": b = BLOCK_SAND
                        elif biome == "ocean": b = BLOCK_SAND
                        else: b = BLOCK_DIRT
                    elif y == h:
                        if biome == "desert": b = BLOCK_SAND
                        elif biome == "ocean": b = BLOCK_SAND
                        elif biome == "snow": b = BLOCK_CRAFTED_SNOW
                        else: b = BLOCK_GRASS
                    elif y < SEA_LEVEL and y > h:
                        b = BLOCK_WATER
                    chunk.blocks[idx(lx, y, lz)] = b
        # 洞穴
        for lz in range(CHUNK_SZ):
            for lx in range(CHUNK_SX):
                x = ox + lx
                z = oz + lz
                for y in range(1, min(60, CHUNK_SY)):
                    n1 = self.pn_cave1.octave(x*0.05, z*0.05, 3, 0.5, 32)
                    n2 = self.pn_cave2.octave(x*0.07 + 50, y*0.12 + 50, z*0.07 + 50, 3, 0.5, 32)
                    cave = n1 * n2
                    if cave > 0.30 and chunk.blocks[idx(lx, y, lz)] not in (BLOCK_BEDROCK, BLOCK_WATER, BLOCK_LAVA):
                        chunk.blocks[idx(lx, y, lz)] = BLOCK_AIR
        # 矿石
        for lz in range(CHUNK_SZ):
            for lx in range(CHUNK_SX):
                x = ox + lx
                z = oz + lz
                for y in range(1, 60):
                    cur = chunk.blocks[idx(lx, y, lz)]
                    if cur != BLOCK_STONE: continue
                    n = self.pn_ore.noise2(x*0.3 + 5000, y*0.3 + z*0.3)
                    if y < 12 and n > 0.55: chunk.blocks[idx(lx, y, lz)] = BLOCK_DIAMOND
                    elif y < 20 and n > 0.45: chunk.blocks[idx(lx, y, lz)] = BLOCK_GOLD
                    elif y < 40 and n > 0.40: chunk.blocks[idx(lx, y, lz)] = BLOCK_IRON
                    elif n > 0.35: chunk.blocks[idx(lx, y, lz)] = BLOCK_COAL
        # 树、花、仙人掌
        for lz in range(2, CHUNK_SZ-2):
            for lx in range(2, CHUNK_SX-2):
                x = ox + lx
                z = oz + lz
                biome = self.biome_at(x, z)
                h = self.height_at(x, z)
                if h >= CHUNK_SY-4 or h <= SEA_LEVEL: continue
                surface = chunk.blocks[idx(lx, h, lz)]
                tree_n = self.pn_tree.noise2(x*0.7, z*0.7)
                if biome == "forest" and surface == BLOCK_GRASS and tree_n > 0.55:
                    self._grow_tree(chunk, lx, h+1, lz)
                elif biome == "plains" and surface == BLOCK_GRASS and tree_n > 0.72:
                    r = random.random()
                    if r < 0.3: chunk.blocks[idx(lx, h+1, lz)] = BLOCK_FLOWER_RED if random.random() < 0.5 else BLOCK_FLOWER_YELLOW
                    else: chunk.blocks[idx(lx, h+1, lz)] = BLOCK_TALL_GRASS
                elif biome == "snow" and surface == BLOCK_CRAFTED_SNOW and tree_n > 0.65:
                    self._grow_tree(chunk, lx, h+1, lz)
                elif biome == "desert" and surface == BLOCK_SAND:
                    if random.random() < 0.03:
                        chunk.blocks[idx(lx, h+1, lz)] = BLOCK_CACTUS
                        if h+2 < CHUNK_SY: chunk.blocks[idx(lx, h+2, lz)] = BLOCK_CACTUS
                        if h+3 < CHUNK_SY and random.random() < 0.5:
                            chunk.blocks[idx(lx, h+3, lz)] = BLOCK_CACTUS
        chunk.generated = True

    def _grow_tree(self, chunk, lx, y, lz):
        height = random.randint(4, 6)
        for i in range(height):
            if y+i < CHUNK_SY: chunk.blocks[idx(lx, y+i, lz)] = BLOCK_WOOD
        top = y + height
        for dy in range(-1, 3):
            for dz in range(-2, 3):
                for dx in range(-2, 3):
                    if abs(dz)+abs(dx) <= 3 and not (dy < 0 and dz == 0 and dx == 0):
                        if 0 <= lx+dx < CHUNK_SX and 0 <= lz+dz < CHUNK_SZ and top+dy < CHUNK_SY:
                            if chunk.blocks[idx(lx+dx, top+dy, lz+dz)] == BLOCK_AIR:
                                chunk.blocks[idx(lx+dx, top+dy, lz+dz)] = BLOCK_LEAVES

    def update_loaded_chunks(self, player_pos):
        pcx = int(player_pos[0]) >> 4
        pcz = int(player_pos[2]) >> 4
        needed = set()
        for dx in range(-RENDER_DIST, RENDER_DIST+1):
            for dz in range(-RENDER_DIST, RENDER_DIST+1):
                needed.add((pcx+dx, pcz+dz))
        for k in needed:
            if k not in self.chunks:
                c = Chunk(*k)
                self.generate_chunk(c)
                self.chunks[k] = c
        for k in list(self.chunks.keys()):
            dx = k[0] - pcx; dz = k[1] - pcz
            if dx*dx + dz*dz > (RENDER_DIST+2)**2:
                del self.chunks[k]

    def find_spawn(self):
        for radius in range(0, 200, 4):
            for _ in range(40):
                x = random.randint(-radius, radius)
                z = random.randint(-radius, radius)
                b = self.biome_at(x, z)
                if b in ("plains", "forest"):
                    h = self.height_at(x, z)
                    if h >= SEA_LEVEL+1:
                        return (x+0.5, h+1.5, z+0.5)
        return (0.5, 70.0, 0.5)

# ============================================================================
# 8. 库存 Inventory
# ============================================================================
@dataclass
class ItemStack:
    item_id: int = 0
    count: int = 0
    @property
    def empty(self): return self.count <= 0

class Inventory:
    def __init__(self):
        self.size = 36
        self.hotbar_size = 9
        self.slots: List[ItemStack] = [ItemStack() for _ in range(self.size)]
        self.selected = 0
        # 初始物品
        self.add_item(BLOCK_PLANK, 32)
        self.add_item(BLOCK_COBBLE, 16)
        self.add_item(BLOCK_TNT, 5)
        self.add_item(BLOCK_SAPLING, 4)
        self.add_item(BLOCK_SUGAR, 4)
        self.add_item(ITEM_APPLE, 3)
        self.add_item(ITEM_RAW_PORK, 2)
    def clear(self):
        for s in self.slots: s.item_id = 0; s.count = 0
    def add_item(self, item_id, count=1):
        for s in self.slots:
            if s.item_id == item_id and s.count < item_max_stack(item_id):
                s.count += count
                return True
        for s in self.slots:
            if s.empty:
                s.item_id = item_id; s.count = count
                return True
        return False
    def get_selected(self): return self.slots[self.selected]
    def set_selected(self, idx):
        if 0 <= idx < self.hotbar_size: self.selected = idx
    def remove_one(self, idx):
        if 0 <= idx < len(self.slots):
            s = self.slots[idx]
            if not s.empty:
                s.count -= 1
                if s.count <= 0: s.item_id = 0

# ============================================================================
# 9. 合成系统
# ============================================================================
RECIPES_SHAPELESS = {
    frozenset([(BLOCK_PLANK, 1), (BLOCK_PLANK, 1)]): (ITEM_STICK, 4),
    frozenset([(BLOCK_PLANK, 4)]): (BLOCK_WORKBENCH, 1),
    frozenset([(BLOCK_PLANK, 3), (ITEM_STICK, 2)]): (ITEM_WOOD_PICK, 1),
    frozenset([(BLOCK_COBBLE, 3), (ITEM_STICK, 2)]): (ITEM_STONE_PICK, 1),
    frozenset([(BLOCK_IRON, 3), (ITEM_STICK, 2)]): (ITEM_IRON_PICK, 1),
    frozenset([(BLOCK_DIAMOND, 3), (ITEM_STICK, 2)]): (ITEM_DIAMOND_PICK, 1),
    frozenset([(BLOCK_PLANK, 2), (ITEM_STICK, 1)]): (ITEM_WOOD_SWORD, 1),
    frozenset([(BLOCK_COBBLE, 2), (ITEM_STICK, 1)]): (ITEM_STONE_SWORD, 1),
    frozenset([(BLOCK_IRON, 2), (ITEM_STICK, 1)]): (ITEM_IRON_SWORD, 1),
    frozenset([(BLOCK_DIAMOND, 2), (ITEM_STICK, 1)]): (ITEM_DIAMOND_SWORD, 1),
    frozenset([(BLOCK_PLANK, 2), (ITEM_STICK, 1)]): (ITEM_WOOD_AXE, 1),
    frozenset([(BLOCK_COBBLE, 2), (ITEM_STICK, 1)]): (ITEM_STONE_AXE, 1),
    frozenset([(BLOCK_IRON, 2), (ITEM_STICK, 1)]): (ITEM_IRON_AXE, 1),
    frozenset([(BLOCK_DIAMOND, 2), (ITEM_STICK, 1)]): (ITEM_DIAMOND_AXE, 1),
    frozenset([(BLOCK_COBBLE, 8)]): (BLOCK_FURNACE, 1),
    frozenset([(BLOCK_SAND, 4), (BLOCK_REDSTONE, 1)]): (BLOCK_TNT, 1),
    frozenset([(BLOCK_SAND, 1)]): (BLOCK_GLASS, 1),
    frozenset([(BLOCK_STONE, 4)]): (BLOCK_BRICK, 4),
    frozenset([(BLOCK_COBBLE, 4)]): (BLOCK_MOSSY, 4),
    frozenset([(ITEM_BOOK, 3), (BLOCK_PLANK, 6)]): (BLOCK_BOOKSHELF, 1),
    frozenset([(BLOCK_PLANK, 6)]): (ITEM_BOOK, 3),
}

def can_craft(inv_slots):
    items = [(s.item_id, s.count) for s in inv_slots if not s.empty]
    if not items: return None
    key = frozenset((iid, c) for iid,c in items)
    return RECIPES_SHAPELESS.get(key, None)

# ============================================================================
# 10. 玩家 Player
# ============================================================================
class Player:
    def __init__(self, world):
        self.world = world
        self.pos = [0.5, 70.0, 0.5]
        self.vel = [0.0, 0.0, 0.0]
        self.rot = [0.0, 0.0]
        self.on_ground = False
        self.in_water = False
        self.in_lava = False
        self.health = 20.0
        self.max_health = 20.0
        self.hunger = 20.0
        self.max_hunger = 20.0
        self.hurt_time = 0.0
        self.dead = False
        self.death_time = 0.0
        self.sprinting = False
        self.inventory = Inventory()
        self.reach = 5.5

    def block_in_range(self):
        ox, oy, oz = self.pos
        yaw = math.radians(self.rot[0])
        pitch = math.radians(self.rot[1])
        ex, ey, ez = ox, oy + PLAYER_EYE, oz
        dx = -math.sin(yaw) * math.cos(pitch)
        dy = -math.sin(pitch)
        dz = -math.cos(yaw) * math.cos(pitch)
        step = 0.05
        t = 0.0
        prev = None
        while t < self.reach:
            x = ex + dx*t
            y = ey + dy*t
            z = ez + dz*t
            bx, by, bz = int(math.floor(x)), int(math.floor(y)), int(math.floor(z))
            if (bx, by, bz) != prev:
                b = self.world.get_block(bx, by, bz)
                if b != BLOCK_AIR and not BLOCK_PROPS[b].fluid and not BLOCK_PROPS[b].cross:
                    if (x >= bx and x <= bx+1 and y >= by and y <= by+1 and z >= bz and z <= bz+1):
                        face = self._pick_face(x-bx, y-by, z-bz, dx, dy, dz)
                        return ((bx, by, bz), face, t)
                prev = (bx, by, bz)
            t += step
        return None

    def _pick_face(self, fx, fy, fz, dx, dy, dz):
        faces = [(0,1,0),(0,-1,0),(1,0,0),(-1,0,0),(0,0,1),(0,0,-1)]
        best = 0; bestd = 100
        for i,(nx,ny,nz) in enumerate(faces):
            cx, cy, cz = 0.5+nx*0.5, 0.5+ny*0.5, 0.5+nz*0.5
            d = math.sqrt((fx-cx)**2 + (fy-cy)**2 + (fz-cz)**2)
            if d < bestd: bestd = d; best = i
        return best

    def step(self, dt, keys):
        if self.dead: return
        # 饥饿
        if self.sprinting: self.hunger -= 0.05 * dt
        else: self.hunger -= 0.008 * dt
        if self.hunger < 0: self.hunger = 0
        if self.hunger == 0 and self.health > 1:
            self.health -= 0.5 * dt; self.hurt_time = 0.4
        if self.hurt_time > 0: self.hurt_time -= dt

        # 当前方块
        bx, by, bz = int(math.floor(self.pos[0])), int(math.floor(self.pos[1])), int(math.floor(self.pos[2]))
        head_block = self.world.get_block(bx, by+1, bz)
        feet_block = self.world.get_block(bx, by, bz)
        self.in_water = feet_block == BLOCK_WATER or head_block == BLOCK_WATER
        self.in_lava = feet_block == BLOCK_LAVA or head_block == BLOCK_LAVA
        if self.in_lava:
            self.health -= 1.0 * dt
            self.hurt_time = 0.4

        yaw = math.radians(self.rot[0])
        forward = (-math.sin(yaw), 0, -math.cos(yaw))
        right = (math.cos(yaw), 0, -math.sin(yaw))
        mx, mz = 0, 0
        if keys[K_w]: mx += forward[0]; mz += forward[2]
        if keys[K_s]: mx -= forward[0]; mz -= forward[2]
        if keys[K_a]: mx -= right[0];   mz -= right[2]
        if keys[K_d]: mx += right[0];   mz += right[2]
        if keys[K_SPACE]:
            if self.in_water: self.vel[1] = max(self.vel[1], 3.5)
            elif self.on_ground: self.vel[1] = JUMP_SPEED
        if keys[K_LSHIFT] and self.in_water:
            self.vel[1] = min(self.vel[1], -3.0)

        mlen = math.sqrt(mx*mx + mz*mz)
        if mlen > 0: mx /= mlen; mz /= mlen

        speed = SPRINT_SPEED if self.sprinting else (SWIM_SPEED if self.in_water else WALK_SPEED)
        accel = 18.0 if self.on_ground else 4.0
        if self.in_water: accel = 8.0
        self.vel[0] += mx * accel * dt
        self.vel[2] += mz * accel * dt

        fric = 0.85 if self.on_ground else 0.95
        if self.in_water: fric = 0.6
        self.vel[0] *= fric ** (dt*60)
        self.vel[2] *= fric ** (dt*60)
        vh = math.sqrt(self.vel[0]**2 + self.vel[2]**2)
        if vh > speed:
            self.vel[0] *= speed/vh; self.vel[2] *= speed/vh

        if self.in_water: self.vel[1] -= GRAVITY*0.3 * dt
        else: self.vel[1] -= GRAVITY * dt

        self._move_axis(0, self.vel[0] * dt)
        self._move_axis(1, self.vel[1] * dt)
        self._move_axis(2, self.vel[2] * dt)

        if self.health <= 0:
            self.dead = True; self.health = 0; self.vel = [0,0,0]

    def _collides(self, x, y, z):
        x0 = x - PLAYER_RADIUS; x1 = x + PLAYER_RADIUS
        y0 = y - PLAYER_HEIGHT + 0.2; y1 = y + 0.2
        z0 = z - PLAYER_RADIUS; z1 = z + PLAYER_RADIUS
        bx0 = int(math.floor(x0)); bx1 = int(math.floor(x1 - 1e-6))
        by0 = int(math.floor(y0)); by1 = int(math.floor(y1 - 1e-6))
        bz0 = int(math.floor(z0)); bz1 = int(math.floor(z1 - 1e-6))
        for bx in range(bx0, bx1+1):
            for by in range(by0, by1+1):
                for bz in range(bz0, bz1+1):
                    if not (0 <= by < CHUNK_SY): continue
                    b = self.world.get_block(bx, by, bz)
                    if b == BLOCK_AIR or BLOCK_PROPS[b].fluid: continue
                    if BLOCK_PROPS[b].cross: continue
                    return True
        return False

    def _move_axis(self, axis, delta):
        if delta == 0: return
        new_pos = self.pos[:]
        new_pos[axis] += delta
        if self._collides(*new_pos):
            if axis == 1:
                if delta < 0: self.on_ground = True
                self.vel[1] = 0
            elif axis == 0: self.vel[0] = 0
            else: self.vel[2] = 0
        else:
            self.pos[axis] = new_pos[axis]
            if axis == 1 and delta > 0: self.on_ground = False

    def respawn(self):
        self.dead = False
        self.health = self.max_health
        self.hunger = self.max_hunger
        sp = self.world.find_spawn()
        self.pos = [sp[0], sp[1], sp[2]]
        self.vel = [0,0,0]

    def take_damage(self, amount):
        if self.dead: return
        self.health -= amount
        self.hurt_time = 0.4
    def heal(self, amount):
        self.health = min(self.max_health, self.health + amount)
    def feed(self, amount):
        self.hunger = min(self.max_hunger, self.hunger + amount)

# ============================================================================
# 11. 生物 Mob
# ============================================================================
@dataclass
class Mob:
    kind: str
    x: float
    y: float
    z: float
    vx: float = 0.0
    vy: float = 0.0
    vz: float = 0.0
    yaw: float = 0.0
    health: float = 10.0
    hostile: bool = False
    hurt_time: float = 0.0
    age: float = 0.0
    variant: int = 0
    knockback_time: float = 0.0

MOB_KINDS = {
    "pig":   {"hp": 10, "hostile": False, "color": (240, 180, 180), "size": (0.9, 0.9, 1.2), "damage": 0},
    "cow":   {"hp": 10, "hostile": False, "color": (60, 50, 40),    "size": (0.9, 1.2, 1.4), "damage": 0},
    "sheep": {"hp": 8,  "hostile": False, "color": (240, 240, 240), "size": (0.9, 1.0, 1.2), "damage": 0},
    "chicken":{"hp": 4, "hostile": False, "color": (220, 200, 150), "size": (0.5, 0.7, 0.8), "damage": 0},
    "zombie":{"hp": 20, "hostile": True,  "color": (60, 130, 60),   "size": (0.6, 1.95, 0.5), "damage": 2.0},
    "skeleton":{"hp": 16, "hostile": True, "color": (220, 220, 220),"size": (0.6, 1.95, 0.5), "damage": 2.0},
}

class MobManager:
    def __init__(self, world):
        self.world = world
        self.mobs: List[Mob] = []
        self.spawn_timer = 0.0

    def step(self, dt, player):
        if self.spawn_timer <= 0:
            self.spawn_timer = 4.0
            if self.world.time_of_day > 0.75 or self.world.time_of_day < 0.25:
                self._spawn_hostile((player.pos[0], player.pos[1], player.pos[2]))
            else:
                self._spawn_passive((player.pos[0], player.pos[1], player.pos[2]))
        self.spawn_timer -= dt

        for m in self.mobs:
            meta = MOB_KINDS.get(m.kind, {})
            m.age += dt
            if m.hurt_time > 0: m.hurt_time -= dt
            if m.knockback_time > 0: m.knockback_time -= dt
            sx,sy,sz = meta.get("size", (0.6,1.0,0.6))
            # 重力
            m.vy -= GRAVITY * dt
            dx = 0; dz = 0
            if m.hostile and not player.dead:
                ddx = player.pos[0] - m.x
                ddz = player.pos[2] - m.z
                d = math.sqrt(ddx*ddx + ddz*ddz)
                if d < 18 and d > 0.1:
                    dx = ddx/d; dz = ddz/d
                    m.yaw = math.degrees(math.atan2(ddx, ddz))
                if d < 1.3 and player.hurt_time <= 0:
                    player.take_damage(meta.get("damage", 1.0))
            else:
                if m.knockback_time <= 0 and random.random() < 0.02:
                    angle = random.random() * math.tau
                    dx = math.cos(angle)
                    dz = math.sin(angle)
                    m.yaw = math.degrees(math.atan2(dx, dz))
            speed = 2.5 if m.hostile else 1.4
            m.vx += dx * speed * 3 * dt
            m.vz += dz * speed * 3 * dt
            m.vx *= 0.85; m.vz *= 0.85
            m.x += m.vx * dt
            m.z += m.vz * dt
            m.y += m.vy * dt
            bx = int(math.floor(m.x))
            bz = int(math.floor(m.z))
            h = self.world.height_at(bx, bz)
            if m.y < h + 0.4:
                m.y = h + 0.4
                m.vy = 0
        # 过滤
        self.mobs = [m for m in self.mobs
                     if m.health > 0
                     and abs(m.x - player.pos[0]) < RENDER_DIST*16
                     and abs(m.z - player.pos[2]) < RENDER_DIST*16]

    def _spawn_passive(self, p):
        if len(self.mobs) > 25: return
        for _ in range(2):
            angle = random.random() * math.tau
            dist = random.uniform(8, 30)
            x = p[0] + math.cos(angle)*dist
            z = p[2] + math.sin(angle)*dist
            h = self.world.height_at(int(x), int(z))
            if h < SEA_LEVEL: continue
            biome = self.world.biome_at(int(x), int(z))
            if biome in ("forest", "plains"):
                kind = random.choices(["pig","cow","sheep","chicken"], weights=[3,2,2,2])[0]
            else:
                kind = "pig"
            self.mobs.append(Mob(kind=kind, x=x, y=h+1.0, z=z, yaw=random.random()*360, health=MOB_KINDS[kind]["hp"]))

    def _spawn_hostile(self, p):
        for _ in range(2):
            angle = random.random() * math.tau
            dist = random.uniform(10, 25)
            x = p[0] + math.cos(angle)*dist
            z = p[2] + math.sin(angle)*dist
            h = self.world.height_at(int(x), int(z))
            if h < SEA_LEVEL: continue
            kind = random.choice(["zombie","skeleton"])
            self.mobs.append(Mob(kind=kind, x=x, y=h+1.0, z=z, yaw=random.random()*360, health=MOB_KINDS[kind]["hp"]))

    def damage(self, mob, amount):
        mob.health -= amount
        mob.hurt_time = 0.4

# ============================================================================
# 12. 粒子
# ============================================================================
class Particle:
    __slots__ = ('x','y','z','vx','vy','vz','life','max_life','color','size')
    def __init__(self, x,y,z, vx,vy,vz, life, color, size=0.1):
        self.x=x; self.y=y; self.z=z
        self.vx=vx; self.vy=vy; self.vz=vz
        self.life=life; self.max_life=life
        self.color=color; self.size=size

class ParticleSystem:
    def __init__(self):
        self.particles: List[Particle] = []

    def spawn_break(self, x, y, z, block_id, count=20):
        pix = TEX.get((block_id, 2)) or TEX.get((block_id, 0))
        if pix is None: return
        for _ in range(count):
            sx = x + random.random()
            sy = y + random.random()
            sz = z + random.random()
            vx = (random.random()-0.5)*3
            vy = random.random()*3 + 1
            vz = (random.random()-0.5)*3
            color = random.choice(pix)
            self.particles.append(Particle(sx, sy, sz, vx, vy, vz, random.uniform(0.5, 1.2), color, 0.08))

    def spawn_explosion(self, x, y, z, count=80):
        for _ in range(count):
            sx = x + 0.5; sy = y + 0.5; sz = z + 0.5
            angle = random.random() * math.tau
            elev = random.random() * math.pi
            speed = random.uniform(2, 8)
            vx = math.cos(angle)*math.sin(elev)*speed
            vy = math.cos(elev)*speed
            vz = math.sin(angle)*math.sin(elev)*speed
            color = random.choice([(255,180,60),(255,100,30),(200,200,200),(60,60,60)])
            self.particles.append(Particle(sx, sy, sz, vx, vy, vz, random.uniform(0.5, 1.5), color, 0.12))

    def spawn_smoke(self, x, y, z, count=10):
        for _ in range(count):
            vx = (random.random()-0.5)*1
            vy = random.random()*2 + 0.5
            vz = (random.random()-0.5)*1
            color = random.choice([(80,80,80),(120,120,120),(160,160,160)])
            self.particles.append(Particle(x+0.5, y+0.5, z+0.5, vx, vy, vz, random.uniform(0.8, 1.5), color, 0.15))

    def step(self, dt):
        for p in self.particles:
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.z += p.vz * dt
            p.vy -= 5 * dt
            p.life -= dt
        self.particles = [p for p in self.particles if p.life > 0]
        if len(self.particles) > 600:
            self.particles = self.particles[-600:]

# ============================================================================
# 13. 渲染器
# ============================================================================
FACES = [
    # PX (right)
    ((1,1,1, 0,1,1, 0,0,1, 1,0,1), (1,1, 0,1, 0,0, 1,0)),
    # NX (left)
    ((0,1,0, 1,1,0, 1,0,0, 0,0,0), (1,1, 0,1, 0,0, 1,0)),
    # PY (top)
    ((0,1,1, 1,1,1, 1,1,0, 0,1,0), (0,0, 1,0, 1,1, 0,1)),
    # NY (bottom)
    ((0,0,0, 1,0,0, 1,0,1, 0,0,1), (0,0, 1,0, 1,1, 0,1)),
    # PZ (front)
    ((1,1,0, 1,1,1, 0,1,1, 0,1,0), (0,0, 1,0, 1,1, 0,1)),
    # NZ (back)
    ((0,1,1, 1,1,1, 1,0,1, 0,0,1), (0,0, 1,0, 1,1, 0,1)),
]
NEIGHBOR_OFFSETS = [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]
FACE_LIGHT = [0.78, 0.78, 1.0, 0.5, 0.85, 0.65]

class Renderer:
    def __init__(self, world, block_uv, atlas_size):
        self.world = world
        self.block_uv = block_uv
        self.atlas_size = atlas_size
        self.chunk_data = {}  # chunk_key -> {solid, water, cross, vbos, counts}

    def build_chunk_mesh(self, chunk):
        solid = []
        water = []
        cross = []
        for y in range(CHUNK_SY):
            for z in range(CHUNK_SZ):
                for x in range(CHUNK_SX):
                    b = chunk.blocks[idx(x,y,z)]
                    if b == BLOCK_AIR: continue
                    props = BLOCK_PROPS[b]
                    if props.fluid:
                        self._add_fluid(chunk, x, y, z, b, water)
                        continue
                    if props.cross:
                        self._add_cross(x, y, z, b, cross)
                        continue
                    self._add_cube(chunk, x, y, z, b, solid)
        return solid, water, cross

    def _add_cube(self, chunk, x, y, z, b, out):
        for face_i in range(6):
            ox, oy, oz = NEIGHBOR_OFFSETS[face_i]
            nb = self._get_block(chunk, x+ox, y+oy, z+oz)
            props_nb = BLOCK_PROPS[nb]
            # 剔除逻辑：邻居是空气、cross/流体/不透明固体则绘制
            if nb == BLOCK_AIR or props_nb.cross or (props_nb.fluid and nb != b) or (not props_nb.opaque_render and not props_nb.fluid):
                pass
            else:
                continue
            verts, _ = FACES[face_i]
            uv_box = self.block_uv.get((b, face_i)) or self.block_uv.get((b, 0))
            if uv_box is None: continue
            u0,v0,u1,v1 = uv_box
            uvs = (u0,v0, u1,v0, u1,v1, u0,v1)
            light = FACE_LIGHT[face_i]
            for vi in range(4):
                vx = verts[vi*3] + x
                vy = verts[vi*3+1] + y
                vz = verts[vi*3+2] + z
                out.append(vx); out.append(vy); out.append(vz)
                out.append(uvs[vi*2]); out.append(uvs[vi*2+1])
                out.append(light); out.append(1.0)

    def _add_fluid(self, chunk, x, y, z, b, out):
        for face_i in range(6):
            ox, oy, oz = NEIGHBOR_OFFSETS[face_i]
            nb = self._get_block(chunk, x+ox, y+oy, z+oz)
            if nb == BLOCK_AIR or BLOCK_PROPS[nb].fluid:
                verts, _ = FACES[face_i]
                uv_box = self.block_uv.get((b, face_i)) or self.block_uv.get((b, 0))
                if uv_box is None: continue
                u0,v0,u1,v1 = uv_box
                uvs = (u0,v0, u1,v0, u1,v1, u0,v1)
                light = FACE_LIGHT[face_i] * 0.85
                h_off = -0.1 if face_i != 2 else 0.0
                for vi in range(4):
                    vx = verts[vi*3] + x
                    vy = verts[vi*3+1] + y + h_off
                    vz = verts[vi*3+2] + z
                    out.append(vx); out.append(vy); out.append(vz)
                    out.append(uvs[vi*2]); out.append(uvs[vi*2+1])
                    out.append(light); out.append(0.75)

    def _add_cross(self, x, y, z, b, out):
        uv_box = self.block_uv.get((b, 0))
        if uv_box is None: return
        u0,v0,u1,v1 = uv_box
        for c in [
            [(x,y,z),(x+1,y+1,z+1),(x,y,z+1),(x+1,y+1,z)],
            [(x+1,y,z),(x,y+1,z+1),(x+1,y,z+1),(x,y+1,z)],
        ]:
            for (px,py,pz) in c:
                out.append(px); out.append(py); out.append(pz)
            out.extend([u0,v0, u1,v0, u1,v1, u0,v1])
            for _ in range(4):
                out.append(0.9); out.append(0.6)

    def _get_block(self, chunk, x, y, z):
        if 0 <= y < CHUNK_SY and 0 <= x < CHUNK_SX and 0 <= z < CHUNK_SZ:
            return chunk.blocks[idx(x,y,z)]
        wx = chunk.cx*CHUNK_SX + x
        wz = chunk.cz*CHUNK_SZ + z
        return self.world.get_block(wx, y, wz)

    def update_chunk(self, chunk):
        solid, water, cross = self.build_chunk_mesh(chunk)
        k = (chunk.cx, chunk.cz)
        data = self.chunk_data.get(k, {"vbos":[0,0,0], "counts":[0,0,0]})
        # 删除旧 VBO
        for v in data["vbos"]:
            if v:
                try: glDeleteBuffers(1, [v])
                except: pass
        # 上传
        new_vbos = [0,0,0]
        for i, d in enumerate([solid, water, cross]):
            count = len(d) // 7
            data["counts"][i] = count
            if count == 0:
                new_vbos[i] = 0
                continue
            vbo = glGenBuffers(1)
            glBindBuffer(GL_ARRAY_BUFFER, vbo)
            arr = (GLfloat * len(d))(*d)
            glBufferData(GL_ARRAY_BUFFER, len(d)*4, arr, GL_STATIC_DRAW)
            new_vbos[i] = vbo
        data["vbos"] = new_vbos
        self.chunk_data[k] = data
        chunk.mesh_dirty = False

    def draw_chunks(self):
        for k, data in self.chunk_data.items():
            vbos = data["vbos"]
            counts = data["counts"]
            if vbos[0] and counts[0] > 0:
                glBindBuffer(GL_ARRAY_BUFFER, vbos[0])
                glEnableClientState(GL_VERTEX_ARRAY)
                glEnableClientState(GL_TEXTURE_COORD_ARRAY)
                glVertexPointer(3, GL_FLOAT, 28, ctypes.c_void_p(0))
                glTexCoordPointer(2, GL_FLOAT, 28, ctypes.c_void_p(12))
                glDrawArrays(GL_QUADS, 0, counts[0])
        # 透明物体
        glEnable(GL_BLEND)
        glDepthMask(GL_FALSE)
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
        for k, data in self.chunk_data.items():
            vbos = data["vbos"]
            counts = data["counts"]
            for i in (1, 2):
                if vbos[i] and counts[i] > 0:
                    glBindBuffer(GL_ARRAY_BUFFER, vbos[i])
                    glEnableClientState(GL_VERTEX_ARRAY)
                    glEnableClientState(GL_TEXTURE_COORD_ARRAY)
                    glVertexPointer(3, GL_FLOAT, 28, ctypes.c_void_p(0))
                    glTexCoordPointer(2, GL_FLOAT, 28, ctypes.c_void_p(12))
                    glDrawArrays(GL_QUADS, 0, counts[i])
        glDepthMask(GL_TRUE)
        glDisable(GL_BLEND)

    def draw_selection(self, x, y, z):
        glDisable(GL_TEXTURE_2D)
        glLineWidth(2.0)
        glColor4f(0, 0, 0, 0.7)
        edges = [
            (0,0,0,1,0,0),(1,0,0,1,0,1),(1,0,1,0,0,1),(0,0,1,0,0,0),
            (0,1,0,1,1,0),(1,1,0,1,1,1),(1,1,1,0,1,1),(0,1,1,0,1,0),
            (0,0,0,0,1,0),(1,0,0,1,1,0),(1,0,1,1,1,1),(0,0,1,0,1,1),
        ]
        glBegin(GL_LINES)
        for e in edges:
            glVertex3f(x+e[0]+0.005, y+e[1]+0.005, z+e[2]+0.005)
            glVertex3f(x+e[3]-0.005, y+e[4]+0.005, z+e[5]+0.005)
        glEnd()
        glLineWidth(1.0)
        glEnable(GL_TEXTURE_2D)

# ============================================================================
# 14. 音效
# ============================================================================
def gen_sound(freq, duration, decay=2.0, sr=22050, noise_mix=0.0, vol=0.3):
    n = int(duration * sr)
    buf = array.array('h')
    for i in range(n):
        t = i / sr
        env = math.exp(-decay * t)
        s = math.sin(2*math.pi*freq*t) + 0.5*math.sin(2*math.pi*freq*2*t)
        if noise_mix > 0:
            s = s*(1-noise_mix) + (random.random()*2-1)*noise_mix
        v = max(-1, min(1, s*env*vol))
        buf.append(int(v * 32767))
    return pygame.mixer.Sound(buffer=buf.tobytes())

class SoundManager:
    def __init__(self):
        self.enabled = False
        try:
            pygame.mixer.pre_init(22050, -16, 2, 256)
            pygame.mixer.init()
            self.snd_break = gen_sound(180, 0.15, decay=15, noise_mix=0.6, vol=0.4)
            self.snd_place = gen_sound(420, 0.08, decay=20, vol=0.3)
            self.snd_step  = gen_sound(100, 0.10, decay=25, noise_mix=0.7, vol=0.2)
            self.snd_boom  = gen_sound(60,  0.5,  decay=4,  noise_mix=0.9, vol=0.6)
            self.snd_hurt  = gen_sound(300, 0.3,  decay=8,  vol=0.3)
            self.snd_eat   = gen_sound(220, 0.2,  decay=10, vol=0.2)
            self.enabled = True
        except Exception:
            self.enabled = False
    def play(self, name):
        if not self.enabled: return
        s = getattr(self, name, None)
        if s:
            try: s.play()
            except: pass

# ============================================================================
# 15. HUD
# ============================================================================
class HUD:
    def __init__(self, screen_w, screen_h):
        self.w = screen_w
        self.h = screen_h
        pygame.font.init()
        try:
            self.font = pygame.font.SysFont("Minecraft,monospace", 16)
            self.font_big = pygame.font.SysFont("Minecraft,monospace", 22)
            self.font_title = pygame.font.SysFont("Minecraft,monospace", 40)
        except Exception:
            self.font = pygame.font.Font(None, 18)
            self.font_big = pygame.font.Font(None, 26)
            self.font_title = pygame.font.Font(None, 44)

    def draw_crosshair(self, screen):
        cx, cy = self.w//2, self.h//2
        pygame.draw.line(screen, (255,255,255), (cx-6, cy), (cx+6, cy), 2)
        pygame.draw.line(screen, (255,255,255), (cx, cy-6), (cx, cy+6), 2)

    def draw_hotbar(self, screen, inv):
        sw, sh = 182, 22
        sx = self.w//2 - sw//2
        sy = self.h - 30
        pygame.draw.rect(screen, (20,20,20,200), (sx-2, sy-2, sw+4, sh+4))
        pygame.draw.rect(screen, (40,40,40), (sx, sy, sw, sh))
        for i in range(9):
            x = sx + i*20 + 1
            pygame.draw.rect(screen, (60,60,60), (x, sy+1, 18, 20))
            if i == inv.selected:
                pygame.draw.rect(screen, (255,255,255), (x-1, sy, 20, 22), 2)
            s = inv.slots[i]
            if not s.empty:
                col = (200, 200, 200)
                pix = TEX.get((s.item_id, 2)) or TEX.get((s.item_id, 0))
                if pix: col = pix[(2*16)+8]
                pygame.draw.rect(screen, col, (x+2, sy+2, 14, 14))
                if s.count > 1:
                    txt = self.font.render(str(s.count), True, (255,255,255))
                    screen.blit(txt, (x+15-txt.get_width(), sy+18-txt.get_height()))

    def draw_hearts(self, screen, player):
        x0 = self.w//2 - 91
        y0 = self.h - 50
        for i in range(10):
            x = x0 + i*9
            pygame.draw.rect(screen, (0,0,0), (x, y0, 9, 9))
            hp = i*2 + 2
            if player.health >= hp:
                self._heart(screen, x, y0, "full")
            elif player.health >= hp-1:
                self._heart(screen, x, y0, "half")
            else:
                self._heart(screen, x, y0, "empty")
        for i in range(10):
            x = x0 + i*9
            pygame.draw.rect(screen, (0,0,0), (x, y0+10, 9, 9))
            hp = i*2 + 2
            if player.hunger >= hp:
                self._food(screen, x, y0+10, "full")
            elif player.hunger >= hp-1:
                self._food(screen, x, y0+10, "half")
            else:
                self._food(screen, x, y0+10, "empty")

    def _heart(self, screen, x, y, kind):
        col = (220, 30, 30) if kind == "full" else ((180,30,30) if kind=="half" else (60,0,0))
        pygame.draw.circle(screen, col, (x+2, y+3), 2)
        pygame.draw.circle(screen, col, (x+6, y+3), 2)
        pygame.draw.polygon(screen, col, [(x, y+3), (x+8, y+3), (x+4, y+8)])

    def _food(self, screen, x, y, kind):
        col = (200, 130, 50) if kind == "full" else ((140,90,30) if kind=="half" else (40,20,0))
        pygame.draw.rect(screen, col, (x+1, y+2, 7, 6))

    def draw_text(self, screen, text, x, y, color=(255,255,255), font=None):
        f = font or self.font
        s = f.render(text, True, color)
        screen.blit(s, (x, y))

    def draw_inventory(self, screen, inv):
        overlay = pygame.Surface((self.w, self.h), pygame.SRCALPHA)
        overlay.fill((0,0,0,160))
        screen.blit(overlay, (0,0))
        pw, ph = 380, 280
        px = self.w//2 - pw//2
        py = self.h//2 - ph//2
        pygame.draw.rect(screen, (200,200,200), (px, py, pw, ph))
        pygame.draw.rect(screen, (100,100,100), (px, py, pw, ph), 3)
        self.draw_text(screen, "Inventory", px+8, py+8, (0,0,0), self.font_big)
        slot = 32
        ox = px + 16
        oy = py + 50
        for i in range(36):
            row = i // 9
            col = i % 9
            x = ox + col*slot
            y = oy + row*slot
            pygame.draw.rect(screen, (150,150,150), (x, y, 30, 30))
            pygame.draw.rect(screen, (80,80,80), (x, y, 30, 30), 2)
            s = inv.slots[i]
            if not s.empty:
                col2 = (200, 200, 200)
                pix = TEX.get((s.item_id, 2)) or TEX.get((s.item_id, 0))
                if pix: col2 = pix[(2*16)+8]
                pygame.draw.rect(screen, col2, (x+2, y+2, 26, 26))
                if s.count > 1:
                    self.draw_text(screen, str(s.count), x+18, y+18, (0,0,0))
        # 提示
        self.draw_text(screen, "Press E to close", px+8, py+ph-25, (60,60,60))

    def draw_menu(self, screen, title, items, sel):
        overlay = pygame.Surface((self.w, self.h), pygame.SRCALPHA)
        overlay.fill((0,0,0,180))
        screen.blit(overlay, (0,0))
        self.draw_text(screen, title, self.w//2 - 100, 80, (255,255,255), self.font_title)
        for i, it in enumerate(items):
            color = (255,255,0) if i == sel else (200,200,200)
            self.draw_text(screen, it, self.w//2 - 60, 200 + i*40, color, self.font_big)

    def draw_pause(self, screen):
        overlay = pygame.Surface((self.w, self.h), pygame.SRCALPHA)
        overlay.fill((0,0,0,140))
        screen.blit(overlay, (0,0))
        self.draw_text(screen, "Game Paused", self.w//2 - 130, 200, (255,255,255), self.font_title)
        self.draw_text(screen, "ESC - Resume", self.w//2 - 80, 280, (200,200,200), self.font_big)
        self.draw_text(screen, "F3 - Toggle Debug", self.w//2 - 80, 320, (200,200,200), self.font_big)
        self.draw_text(screen, "E - Inventory", self.w//2 - 80, 360, (200,200,200), self.font_big)
        self.draw_text(screen, "WASD - Move", self.w//2 - 80, 400, (200,200,200), self.font_big)
        self.draw_text(screen, "Space - Jump", self.w//2 - 80, 440, (200,200,200), self.font_big)
        self.draw_text(screen, "Shift - Swim Down", self.w//2 - 80, 480, (200,200,200), self.font_big)
        self.draw_text(screen, "Ctrl - Sprint", self.w//2 - 80, 520, (200,200,200), self.font_big)
        self.draw_text(screen, "1-9 - Hotbar", self.w//2 - 80, 560, (200,200,200), self.font_big)

# ============================================================================
# 16. 主游戏
# ============================================================================
class Game:
    def __init__(self):
        pygame.init()
        pygame.display.set_mode((WINDOW_W, WINDOW_H), DOUBLEBUF | OPENGL)
        pygame.display.set_caption("Minecraft Clone - TraeCode")
        glEnable(GL_DEPTH_TEST)
        glEnable(GL_CULL_FACE)
        glCullFace(GL_BACK)
        glFrontFace(GL_CCW)
        glEnable(GL_TEXTURE_2D)
        glShadeModel(GL_SMOOTH)
        glEnable(GL_BLEND)
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
        glClearColor(0.5, 0.7, 0.9, 1.0)

        build_textures()
        atlas, aw, ah, block_uv = build_atlas()
        self.atlas_w, self.atlas_h = aw, ah
        self.block_uv = block_uv
        self.atlas_tex_id = glGenTextures(1)
        glBindTexture(GL_TEXTURE_2D, self.atlas_tex_id)
        flat = bytearray()
        for r,g,b in atlas:
            flat.append(r); flat.append(g); flat.append(b)
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, aw, ah, 0, GL_RGB, GL_UNSIGNED_BYTE, bytes(flat))
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP)

        self.world = World(seed=12345)
        print("Generating spawn chunks...")
        for dx in range(-1, 2):
            for dz in range(-1, 2):
                self.world.get_chunk(dx, dz)
        sp = self.world.find_spawn()
        self.player = Player(self.world)
        self.player.pos = [sp[0], sp[1], sp[2]]
        self.mobs = MobManager(self.world)
        self.particles = ParticleSystem()
        self.sound = SoundManager()
        self.renderer = Renderer(self.world, block_uv, (aw, ah))
        self.hud = HUD(WINDOW_W, WINDOW_H)
        for c in self.world.chunks.values():
            self.renderer.update_chunk(c)

        self.state = "play"
        self.running = True
        self.clock = pygame.time.Clock()
        self.fps = 0
        self.fov_setting = FOV
        self.last_time = time.time()
        self.show_debug = True
        self.keys = {}
        pygame.mouse.set_visible(False)
        pygame.event.set_grab(True)

    def run(self):
        while self.running:
            now = time.time()
            dt = min(0.1, now - self.last_time)
            self.last_time = now
            self.clock.tick(TARGET_FPS)
            self.fps = int(self.clock.get_fps())
            self.handle_events()
            if self.state == "play":
                self.update(dt)
            self.render()
        pygame.quit()

    def handle_events(self):
        for ev in pygame.event.get():
            if ev.type == QUIT:
                self.running = False
            elif ev.type == KEYDOWN:
                self.keys[ev.key] = True
                if ev.key == K_ESCAPE:
                    if self.state == "play":
                        self.state = "pause"
                    elif self.state == "pause":
                        self.state = "play"
                    pygame.mouse.set_visible(self.state == "pause")
                    pygame.event.set_grab(self.state == "pause")
                if ev.key == K_e:
                    if self.state == "play":
                        self.state = "inventory"
                    elif self.state == "inventory":
                        self.state = "play"
                    pygame.mouse.set_visible(self.state != "play")
                    pygame.event.set_grab(self.state == "play")
                if ev.key == K_F3:
                    self.show_debug = not self.show_debug
                if self.state == "dead":
                    if ev.key == K_RETURN:
                        self.player.respawn()
                        self.state = "play"
                        pygame.mouse.set_visible(False)
                        pygame.event.set_grab(True)
                if ev.key in range(K_1, K_10):
                    self.player.inventory.set_selected(ev.key - K_1)
            elif ev.type == KEYUP:
                self.keys[ev.key] = False
            elif ev.type == MOUSEMOTION:
                if self.state == "play":
                    dx, dy = ev.rel
                    self.player.rot[0] += dx * MOUSE_SENS
                    self.player.rot[1] += dy * MOUSE_SENS
                    self.player.rot[1] = max(-89, min(89, self.player.rot[1]))
            elif ev.type == MOUSEBUTTONDOWN:
                if self.state == "play":
                    if ev.button == 1:
                        self.on_left_click()
                    elif ev.button == 3:
                        self.on_right_click()
                    elif ev.button == 4:
                        sel = (self.player.inventory.selected - 1) % 9
                        self.player.inventory.set_selected(sel)
                    elif ev.button == 5:
                        sel = (self.player.inventory.selected + 1) % 9
                        self.player.inventory.set_selected(sel)

    def on_left_click(self):
        sel = self.player.block_in_range()
        if sel:
            pos, face, dist = sel
            b = self.world.get_block(*pos)
            if b == BLOCK_BEDROCK: return
            # 最佳工具
            tool_level = TOOL_NONE
            hand = self.player.inventory.get_selected()
            if hand and not hand.empty and hand.item_id in TOOL_LEVEL:
                tool_level = TOOL_LEVEL[hand.item_id]
            # TNT 立即爆炸
            if b == BLOCK_TNT:
                self.world.set_block(*pos, BLOCK_AIR)
                self.explode(pos[0]+0.5, pos[1]+0.5, pos[2]+0.5, power=3.5)
                return
            self.break_block(pos)
            self.sound.play("snd_break")
        else:
            for m in self.mobs.mobs:
                d = math.sqrt((m.x - self.player.pos[0])**2 + (m.z - self.player.pos[2])**2)
                if d < 3.5 and abs(m.y - (self.player.pos[1]-1.4)) < 1.6:
                    self.mobs.damage(m, 3.0)
                    self.sound.play("snd_hurt")
                    m.vx = (m.x - self.player.pos[0]) * 4
                    m.vz = (m.z - self.player.pos[2]) * 4
                    m.vy = 4
                    m.knockback_time = 0.4
                    break

    def break_block(self, pos):
        b = self.world.get_block(*pos)
        if b == BLOCK_BEDROCK: return
        props = BLOCK_PROPS[b]
        self.particles.spawn_break(pos[0], pos[1], pos[2], b, 25)
        if props.drop_id != 0:
            self.player.inventory.add_item(props.drop_id, 1)
        self.world.set_block(*pos, BLOCK_AIR)

    def on_right_click(self):
        sel = self.player.block_in_range()
        if not sel: return
        pos, face, dist = sel
        ox, oy, oz = NEIGHBOR_OFFSETS[face]
        np = (pos[0]+ox, pos[1]+oy, pos[2]+oz)
        if self._player_in_block(*np): return
        if self.world.get_block(*np) != BLOCK_AIR: return
        hand = self.player.inventory.get_selected()
        if hand.empty: return
        iid = hand.item_id
        if iid in BLOCK_PROPS and BLOCK_PROPS[iid].solid and not BLOCK_PROPS[iid].fluid:
            if iid in (BLOCK_CAKE, BLOCK_BED):  # 简化
                return
            self.world.set_block(*np, iid)
            hand.count -= 1
            if hand.count <= 0: hand.item_id = 0
            self.sound.play("snd_place")
            self.particles.spawn_break(np[0], np[1], np[2], iid, 8)
        elif iid in ITEM_META:
            # 食物
            if iid == ITEM_APPLE:
                self.player.feed(4)
                self.player.heal(1)
                self.sound.play("snd_eat")
                hand.count -= 1
                if hand.count <= 0: hand.item_id = 0
            elif iid == ITEM_RAW_PORK:
                self.player.feed(2)
                hand.count -= 1
                if hand.count <= 0: hand.item_id = 0
            elif iid == ITEM_COOKED_PORK:
                self.player.feed(6)
                self.player.heal(4)
                self.sound.play("snd_eat")
                hand.count -= 1
                if hand.count <= 0: hand.item_id = 0

    def _player_in_block(self, x, y, z):
        p = self.player.pos
        return (p[0]-PLAYER_RADIUS <= x+1 and p[0]+PLAYER_RADIUS >= x and
                p[1]-PLAYER_HEIGHT+0.2 <= y+1 and p[1]+0.2 >= y and
                p[2]-PLAYER_RADIUS <= z+1 and p[2]+PLAYER_RADIUS >= z)

    def explode(self, x, y, z, power=3.0):
        self.sound.play("snd_boom")
        self.particles.spawn_explosion(x, y, z, 100)
        self.particles.spawn_smoke(x, y, z, 30)
        r = int(power)
        bx, by, bz = int(x), int(y), int(z)
        for dx in range(-r, r+1):
            for dy in range(-r, r+1):
                for dz in range(-r, r+1):
                    d = math.sqrt(dx*dx + dy*dy + dz*dz)
                    if d > r: continue
                    if random.random() < 1 - d/r:
                        px, py, pz = bx+dx, by+dy, bz+dz
                        b = self.world.get_block(px, py, pz)
                        if b in (BLOCK_AIR, BLOCK_BEDROCK): continue
                        if b == BLOCK_OBSIDIAN and d < 2: continue
                        self.world.set_block(px, py, pz, BLOCK_AIR)
        # 伤害玩家
        dd = math.sqrt((self.player.pos[0]-x)**2 + (self.player.pos[1]-y)**2 + (self.player.pos[2]-z)**2)
        if dd < power*2:
            self.player.take_damage((power*2 - dd) * 4)

    def update(self, dt):
        self.world.time_of_day = (self.world.time_of_day + dt/DAY_LENGTH) % 1.0
        self.player.sprinting = self.keys.get(K_LCTRL, False)
        self.player.step(dt, self.keys)
        if self.player.health <= 0 and not self.player.dead:
            self.player.dead = True
            self.state = "dead"
            pygame.mouse.set_visible(True)
            pygame.event.set_grab(False)
        self.world.update_loaded_chunks(self.player.pos)
        self.mobs.step(dt, self.player)
        self.particles.step(dt)
        for chunk in self.world.chunks.values():
            if chunk.mesh_dirty:
                self.renderer.update_chunk(chunk)

    def get_sky_colors(self):
        t = self.world.time_of_day
        ang = (t - 0.25) * 2 * math.pi
        sun_h = math.sin(ang)
        if sun_h > 0.2:
            top = (0.40, 0.65, 0.95)
            bot = (0.72, 0.86, 1.0)
        elif sun_h > -0.1:
            f = (sun_h + 0.1) / 0.3
            top = (0.40*(1-f) + 0.10*f, 0.40*(1-f) + 0.15*f, 0.55*(1-f) + 0.45*f)
            bot = (0.95*(1-f) + 0.95*f, 0.55*(1-f) + 0.40*f, 0.30*(1-f) + 0.20*f)
        else:
            top = (0.02, 0.02, 0.08)
            bot = (0.05, 0.05, 0.15)
        return top, bot, sun_h

    def render(self):
        top, bot, sun_h = self.get_sky_colors()
        glClearColor(bot[0], bot[1], bot[2], 1.0)
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glEnable(GL_FOG)
        glFogi(GL_FOG_MODE, GL_LINEAR)
        glFogf(GL_FOG_START, FAR*0.4)
        glFogf(GL_FOG_END, FAR*0.95)
        glFogfv(GL_FOG_COLOR, (bot[0], bot[1], bot[2], 1))

        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        gluPerspective(self.fov_setting, WINDOW_W/WINDOW_H, NEAR, FAR)
        glMatrixMode(GL_MODELVIEW)
        glLoadIdentity()
        yaw = math.radians(self.player.rot[0])
        pitch = math.radians(self.player.rot[1])
        ex = self.player.pos[0]; ey = self.player.pos[1]+PLAYER_EYE; ez = self.player.pos[2]
        fx = ex - math.sin(yaw)*math.cos(pitch)
        fy = ey - math.sin(pitch)
        fz = ez - math.cos(yaw)*math.cos(pitch)
        gluLookAt(ex, ey, ez, fx, fy, fz, 0, 1, 0)

        # 光照颜色
        if sun_h > 0:
            light_amt = 0.4 + 0.6*sun_h
        else:
            light_amt = 0.15
        light_col = (min(1, light_amt*1.2), min(1, light_amt*1.1), min(1, light_amt*0.9))
        glColor3f(*light_col)

        glBindTexture(GL_TEXTURE_2D, self.atlas_tex_id)
        self.renderer.draw_chunks()
        self._draw_mobs()
        self._draw_particles()

        if self.state == "play" and not self.player.dead:
            sel = self.player.block_in_range()
            if sel:
                pos, face, dist = sel
                self.renderer.draw_selection(*pos)

        # 切换到 2D 渲染 HUD
        glMatrixMode(GL_PROJECTION)
        glPushMatrix()
        glLoadIdentity()
        glOrtho(0, WINDOW_W, WINDOW_H, 0, -1, 1)
        glMatrixMode(GL_MODELVIEW)
        glPushMatrix()
        glLoadIdentity()
        glDisable(GL_DEPTH_TEST)
        glDisable(GL_FOG)
        glDisable(GL_TEXTURE_2D)
        glColor4f(1,1,1,1)
        glEnable(GL_BLEND)
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)

        # 读取 OpenGL 缓冲到 Pygame surface
        glReadBuffer(GL_BACK)
        data = glReadPixels(0, 0, WINDOW_W, WINDOW_H, GL_RGB, GL_UNSIGNED_BYTE)
        screen = pygame.display.get_surface()
        img = pygame.image.fromstring(data, (WINDOW_W, WINDOW_H), "RGB")
        img = pygame.transform.flip(img, False, True)
        screen.blit(img, (0, 0))

        if self.state == "play":
            self.hud.draw_crosshair(screen)
            self.hud.draw_hotbar(screen, self.player.inventory)
            self.hud.draw_hearts(screen, self.player)
            if self.show_debug:
                bx, by, bz = int(self.player.pos[0]), int(self.player.pos[1]), int(self.player.pos[2])
                biome = self.world.biome_at(bx, bz)
                h = self.world.height_at(bx, bz)
                self.hud.draw_text(screen, f"FPS: {self.fps}", 8, 8, (255,255,255))
                self.hud.draw_text(screen, f"XYZ: {self.player.pos[0]:.1f} {self.player.pos[1]:.1f} {self.player.pos[2]:.1f}", 8, 26)
                self.hud.draw_text(screen, f"Biome: {biome}", 8, 44)
                self.hud.draw_text(screen, f"Mobs: {len(self.mobs.mobs)}", 8, 62)
                hour = int(self.world.time_of_day*24)
                self.hud.draw_text(screen, f"Day: {hour:02d}:00", 8, 80)
                self.hud.draw_text(screen, f"Ground: y={h}", 8, 98)
        elif self.state == "pause":
            self.hud.draw_pause(screen)
        elif self.state == "inventory":
            self.hud.draw_inventory(screen, self.player.inventory)
        elif self.state == "dead":
            overlay = pygame.Surface((WINDOW_W, WINDOW_H), pygame.SRCALPHA)
            overlay.fill((120, 0, 0, 100))
            screen.blit(overlay, (0,0))
            self.hud.draw_text(screen, "You Died!", WINDOW_W//2 - 80, WINDOW_H//2 - 30, (255,255,255), self.hud.font_title)
            self.hud.draw_text(screen, "Press Enter to Respawn", WINDOW_W//2 - 110, WINDOW_H//2 + 30, (200,200,200), self.hud.font_big)

        if self.player.hurt_time > 0 and not self.player.dead:
            red = pygame.Surface((WINDOW_W, WINDOW_H), pygame.SRCALPHA)
            red.fill((255, 0, 0, int(80 * (self.player.hurt_time/0.4))))
            screen.blit(red, (0,0))

        glEnable(GL_DEPTH_TEST)
        glEnable(GL_TEXTURE_2D)
        glDisable(GL_BLEND)
        glMatrixMode(GL_PROJECTION)
        glPopMatrix()
        glMatrixMode(GL_MODELVIEW)
        glPopMatrix()
        pygame.display.flip()

    def _draw_mobs(self):
        glDisable(GL_TEXTURE_2D)
        for m in self.mobs.mobs:
            meta = MOB_KINDS.get(m.kind, {})
            sx,sy,sz = meta.get("size", (0.6,1.0,0.6))
            col = meta.get("color", (180, 180, 180))
            glPushMatrix()
            glTranslatef(m.x, m.y - sy/2, m.z)
            glRotatef(-m.yaw, 0, 1, 0)
            # 身体
            if m.hurt_time > 0:
                glColor3f(1, 0, 0)
            else:
                glColor3f(col[0]/255, col[1]/255, col[2]/255)
            self._box(sx, sy, sz)
            # 头部（更深）
            glColor3f(col[0]/255*0.7, col[1]/255*0.7, col[2]/255*0.7)
            glPushMatrix()
            glTranslatef(0, sy*0.35, 0)
            self._box(sx*0.6, sx*0.6, sx*0.6)
            glPopMatrix()
            # 眼睛
            glColor3f(0, 0, 0)
            glPushMatrix()
            glTranslatef(sx*0.15, sy*0.4, sz*0.3+0.001)
            self._box(sx*0.1, sx*0.1, 0.02)
            glPopMatrix()
            glPushMatrix()
            glTranslatef(-sx*0.15, sy*0.4, sz*0.3+0.001)
            self._box(sx*0.1, sx*0.1, 0.02)
            glPopMatrix()
            glPopMatrix()
        glEnable(GL_TEXTURE_2D)

    def _box(self, sx, sy, sz):
        v = [
            ( sx/2, -sy/2,  sz/2), (-sx/2, -sy/2,  sz/2), (-sx/2,  sy/2,  sz/2), ( sx/2,  sy/2,  sz/2),
            ( sx/2, -sy/2, -sz/2), (-sx/2, -sy/2, -sz/2), (-sx/2,  sy/2, -sz/2), ( sx/2,  sy/2, -sz/2),
        ]
        faces = [
            (0,1,2,3),(5,4,7,6),(4,0,3,7),(1,5,6,2),(3,2,6,7),(4,5,1,0)
        ]
        glBegin(GL_QUADS)
        for f in faces:
            for i in f:
                glVertex3f(*v[i])
        glEnd()

    def _draw_particles(self):
        if not self.particles.particles: return
        glDisable(GL_TEXTURE_2D)
        glColor4f(1,1,1,1)
        glBegin(GL_QUADS)
        for p in self.particles.particles:
            alpha = min(1, p.life / p.max_life)
            glColor4f(p.color[0]/255, p.color[1]/255, p.color[2]/255, alpha)
            s = p.size
            glVertex3f(p.x-s, p.y-s, p.z)
            glVertex3f(p.x+s, p.y-s, p.z)
            glVertex3f(p.x+s, p.y+s, p.z)
            glVertex3f(p.x-s, p.y+s, p.z)
        glEnd()
        glEnable(GL_TEXTURE_2D)

# ============================================================================
# 入口
# ============================================================================
if __name__ == "__main__":
    try:
        Game().run()
    except Exception as e:
        import traceback
        traceback.print_exc()
        input("Press Enter to exit...")
