from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "assets" / "art"
OUTPUT = ROOT / "docs" / "previews" / "nezha_animation_preview.gif"

CANVAS = (405, 720)
FRAME_DURATION_MS = 90


def open_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def fit_to_canvas(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def resize_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def paste_center(
    canvas: Image.Image,
    image: Image.Image,
    center: tuple[float, float],
    rotation: float = 0.0,
    opacity: float = 1.0,
) -> None:
    layer = image
    if opacity < 1.0:
        layer = image.copy()
        layer.putalpha(ImageEnhance.Brightness(layer.getchannel("A")).enhance(opacity))
    if rotation:
        layer = layer.rotate(rotation, resample=Image.Resampling.BICUBIC, expand=True)
    x = round(center[0] - layer.width / 2)
    y = round(center[1] - layer.height / 2)
    canvas.alpha_composite(layer, (x, y))


def ease_out_cubic(value: float) -> float:
    return 1 - (1 - value) ** 3


def ease_in_quad(value: float) -> float:
    return value * value


def build_background() -> Image.Image:
    paths = [
        ART / "backgrounds" / "day" / "bg_00_sky.png",
        ART / "backgrounds" / "day" / "bg_01_clouds.png",
        ART / "backgrounds" / "day" / "bg_02_landscape.png",
        ART / "backgrounds" / "day" / "bg_03_chentang_pass.png",
    ]
    layers = [fit_to_canvas(open_rgba(path), CANVAS) for path in paths]
    background = layers[0]
    for layer in layers[1:]:
        background.alpha_composite(layer)
    return background


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    background = build_background()
    foreground = fit_to_canvas(
        open_rgba(ART / "backgrounds" / "day" / "bg_04_foreground.png"),
        CANVAS,
    )

    poses = {
        "idle": resize_width(open_rgba(ART / "characters" / "nezha" / "nezha_idle.png"), 150),
        "boost": resize_width(open_rgba(ART / "characters" / "nezha" / "nezha_boost.png"), 154),
        "fall": resize_width(open_rgba(ART / "characters" / "nezha" / "nezha_fall.png"), 152),
        "hit": resize_width(open_rgba(ART / "characters" / "nezha" / "nezha_hit.png"), 158),
        "result": resize_width(open_rgba(ART / "characters" / "nezha" / "nezha_result.png"), 165),
    }
    wheels = {
        "normal": resize_width(open_rgba(ART / "characters" / "nezha" / "wind_fire_wheel_normal.png"), 72),
        "boost": resize_width(open_rgba(ART / "characters" / "nezha" / "wind_fire_wheel_boost.png"), 79),
        "weak": resize_width(open_rgba(ART / "characters" / "nezha" / "wind_fire_wheel_weak.png"), 67),
    }
    hit_effect = resize_width(open_rgba(ART / "effects" / "fx_collision_puff.png"), 95)
    fire_effect = resize_width(open_rgba(ART / "effects" / "fx_fire_sparks.png"), 64)

    frames: list[Image.Image] = []

    def render(
        pose_name: str,
        player_center: tuple[float, float],
        body_rotation: float,
        wheel_name: str,
        wheel_angle: float,
        wheel_opacity: float = 1.0,
        hit_opacity: float = 0.0,
        fire_opacity: float = 0.0,
    ) -> None:
        frame = background.copy()
        px, py = player_center
        wheel_y = py + 77
        paste_center(frame, wheels[wheel_name], (px - 27, wheel_y), wheel_angle, wheel_opacity)
        paste_center(frame, wheels[wheel_name], (px + 37, wheel_y + 5), wheel_angle + 48, wheel_opacity)
        if fire_opacity > 0:
            paste_center(frame, fire_effect, (px + 5, wheel_y + 7), -10, fire_opacity)
        paste_center(frame, poses[pose_name], player_center, body_rotation)
        if hit_opacity > 0:
            paste_center(frame, hit_effect, (px + 74, py - 7), -8, hit_opacity)
        frame.alpha_composite(foreground)
        frames.append(frame.convert("RGB"))

    # 待机：轻微悬浮和呼吸感。
    for index in range(10):
        phase = index / 10 * math.tau
        render(
            "idle",
            (150, 305 + math.sin(phase) * 7),
            math.sin(phase) * 1.5,
            "normal",
            index * 34,
        )

    # 点击上升：快速抬升，风火轮增强。
    for index in range(7):
        t = index / 6
        render(
            "boost",
            (153, 305 - ease_out_cubic(t) * 90),
            -3 - t * 10,
            "boost",
            index * 48,
            fire_opacity=0.25 + t * 0.55,
        )

    # 下坠：逐渐加速并向下倾斜。
    for index in range(11):
        t = index / 10
        render(
            "fall",
            (155, 215 + ease_in_quad(t) * 165),
            -5 + t * 25,
            "weak" if t > 0.42 else "normal",
            index * 28,
        )

    # 受击：短促横向震动和碰撞烟云。
    shake = [0, 11, -9, 7, -4, 2]
    for index, offset in enumerate(shake):
        render(
            "hit",
            (157 + offset, 382 + index * 3),
            10 + index * 5,
            "weak",
            index * 22,
            wheel_opacity=max(0.25, 1 - index * 0.13),
            hit_opacity=max(0.25, 1 - index * 0.13),
        )

    # 结算：角色坐下，弱火渐隐。
    for index in range(11):
        t = index / 10
        render(
            "result",
            (158, 420 + math.sin(t * math.pi) * 4),
            0,
            "weak",
            index * 14,
            wheel_opacity=max(0.0, 0.55 - t * 0.55),
        )

    # 轻柔淡出，便于循环回到待机。
    clean_background = background.copy()
    clean_background.alpha_composite(foreground)
    clean_background = clean_background.convert("RGB")
    for index in range(4):
        alpha = (index + 1) / 4
        frames.append(Image.blend(frames[-1], clean_background, alpha))

    palette = frames[0].convert("P", palette=Image.Palette.ADAPTIVE, colors=192)
    gif_frames = [frame.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG) for frame in frames]
    gif_frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=gif_frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"Created {OUTPUT} with {len(gif_frames)} frames")


if __name__ == "__main__":
    main()

