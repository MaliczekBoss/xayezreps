"""Usuwa tło ze zdjęć produktów (BiRefNet na karcie graficznej) i zapisuje je jako przezroczyste WEBP.

Każdy produkt jest wycinany, oczyszczany z jasnej obwódki po starym tle, przycinany i ustawiany na środku
kwadratu, żeby na kartach wszystkie miały podobną wielkość. Pliki już przerobione są pomijane.

Model: BiRefNet-general z rembg (~/.rembg/models/birefnet-general/birefnet-general.onnx) przerobiony na
połowiczną precyzję, bo w pełnej nie mieści się w 8 GB pamięci karty. Brakującą wersję fp16 skrypt robi sam.

Użycie (środowisko z onnxruntime-gpu[cuda,cudnn], onnx, onnxconverter-common, opencv-python-headless, pillow):
  python scripts/cutout.py <folder ze zdjęciami> <folder wyjściowy> [--size 640] [--only id1,id2]
"""

import argparse
import csv
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image

MODEL_DIR = Path.home() / ".rembg" / "models" / "birefnet-general"
MARGIN = 0.07
MIN_SPECK = 0.004
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def fp16_model() -> Path:
    path = MODEL_DIR / "birefnet-general-fp16.onnx"
    if not path.exists():
        import onnx
        from onnxconverter_common import float16

        model = onnx.load(str(MODEL_DIR / "birefnet-general.onnx"))
        onnx.save(float16.convert_float_to_float16(model, keep_io_types=True), str(path))
    return path


class BiRefNet:
    def __init__(self, path: Path):
        ort.preload_dlls()
        ort.set_default_logger_severity(3)
        cuda = {"arena_extend_strategy": "kSameAsRequested", "cudnn_conv_algo_search": "HEURISTIC", "gpu_mem_limit": str(int(7.2 * 1024**3))}
        self.session = ort.InferenceSession(str(path), providers=[("CUDAExecutionProvider", cuda), "CPUExecutionProvider"])
        self.input = self.session.get_inputs()[0].name

    def mask(self, img: Image.Image) -> np.ndarray:
        """Maska produktu 0–1 w rozmiarze zdjęcia (przygotowanie obrazu jak w rembg)."""
        x = np.asarray(img.resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
        x = x / max(float(x.max()), 1e-6)
        x = ((x - MEAN) / STD).transpose(2, 0, 1)[None]
        pred = self.session.run(None, {self.input: x.astype(np.float32)})[0][0, 0].astype(np.float32)
        pred = 1 / (1 + np.exp(-np.clip(pred, -40, 40)))
        pred = (pred - pred.min()) / max(float(pred.max() - pred.min()), 1e-6)
        return cv2.resize(pred, img.size, interpolation=cv2.INTER_LINEAR)


def clean_mask(alpha: np.ndarray) -> np.ndarray:
    """Usuwa drobne plamki odłączone od produktu; zostawia wszystkie większe części (np. dwa buty, kolczyki)."""
    solid = (alpha > 0.5).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
    if count <= 2:
        return alpha
    areas = stats[1:, cv2.CC_STAT_AREA]
    keep = np.zeros(count, dtype=bool)
    keep[1:] = areas >= areas.sum() * MIN_SPECK
    removed = (~keep[labels]) & (labels > 0)
    grown = cv2.dilate(removed.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    out = alpha.copy()
    out[grown & ~keep[labels]] = 0
    return out


def decontaminate(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Zdejmuje kolor starego tła z półprzezroczystych krawędzi (żeby na ciemnej stronie nie było jasnej obwódki)."""
    a = alpha[..., None]
    bg_weight = (alpha < 0.05).astype(np.float32)
    k = max(15, (min(rgb.shape[:2]) // 25) | 1)
    num = cv2.blur(rgb * bg_weight[..., None], (k, k))
    den = cv2.blur(bg_weight, (k, k))[..., None]
    background = np.where(den > 1e-3, num / np.maximum(den, 1e-3), rgb)
    fg = np.clip((rgb - (1 - a) * background) / np.maximum(a, 0.08), 0, 255)
    edge = (alpha > 0.02) & (alpha < 0.98)
    out = rgb.copy()
    out[edge] = fg[edge]
    return out


def place(rgba: Image.Image, size: int) -> Image.Image:
    """Przycina do produktu i ustawia go na środku kwadratu z marginesem."""
    box = rgba.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    if box:
        rgba = rgba.crop(box)
    w, h = rgba.size
    scale = int(size * (1 - 2 * MARGIN)) / max(w, h)
    rgba = rgba.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(rgba, ((size - rgba.width) // 2, (size - rgba.height) // 2), rgba)
    return canvas


def load(path: Path) -> Image.Image:
    img = Image.open(path)
    img.load()
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        img = Image.alpha_composite(Image.new("RGBA", img.size, (255, 255, 255, 255)), img)
    img = img.convert("RGB")
    if max(img.size) > 1400:
        img.thumbnail((1400, 1400), Image.LANCZOS)
    return img


def finish(img: Image.Image, alpha: np.ndarray, dst: Path, size: int) -> float:
    alpha = clean_mask(alpha)
    rgb = decontaminate(np.asarray(img, dtype=np.float32), alpha)
    rgba = np.dstack([rgb, alpha * 255]).round().astype(np.uint8)
    out = place(Image.fromarray(rgba, "RGBA"), size)
    tmp = dst.with_suffix(".tmp")
    out.save(tmp, "WEBP", quality=76, alpha_quality=82, method=6)
    os.replace(tmp, dst)
    return float((alpha > 0.5).mean())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("src")
    parser.add_argument("dst")
    parser.add_argument("--size", type=int, default=640)
    parser.add_argument("--only", default="")
    args = parser.parse_args()

    src, dst = Path(args.src), Path(args.dst)
    dst.mkdir(parents=True, exist_ok=True)
    only = {x for x in args.only.split(",") if x}
    files = sorted(p for p in src.iterdir() if p.is_file() and p.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png", ".img"})
    if only:
        files = [p for p in files if p.stem in only]
    todo = [p for p in files if not (dst / f"{p.stem}.webp").exists()]
    print(f"Do przerobienia: {len(todo)} z {len(files)}", flush=True)
    if not todo:
        return

    net = BiRefNet(fp16_model())
    log_path = src.parent / "cutout-log.csv"
    new_log = not log_path.exists()
    started = time.time()

    with open(log_path, "a", newline="", encoding="utf-8") as log_file, ThreadPoolExecutor(max_workers=6) as pool:
        log = csv.writer(log_file)
        if new_log:
            log.writerow(["id", "coverage", "error"])

        def record(stem, future):
            try:
                log.writerow([stem, f"{future.result():.4f}", ""])
            except Exception as e:
                log.writerow([stem, "", repr(e)[:200]])

        loading = {0: pool.submit(load, todo[0])}
        finishing = []
        for i, path in enumerate(todo):
            if i + 1 < len(todo):
                loading[i + 1] = pool.submit(load, todo[i + 1])
            try:
                img = loading.pop(i).result()
                alpha = net.mask(img)
                finishing.append((path.stem, pool.submit(finish, img, alpha, dst / f"{path.stem}.webp", args.size)))
            except Exception as e:
                log.writerow([path.stem, "", repr(e)[:200]])
            while len(finishing) > 12:
                record(*finishing.pop(0))
            if (i + 1) % 200 == 0:
                rate = (i + 1) / (time.time() - started)
                print(f"  {i + 1}/{len(todo)}  {rate:.2f} zdj./s  zostało ok. {(len(todo) - i - 1) / rate / 60:.0f} min", flush=True)
                log_file.flush()
        for item in finishing:
            record(*item)
    print(f"Gotowe w {(time.time() - started) / 60:.1f} min", flush=True)


if __name__ == "__main__":
    sys.exit(main())
