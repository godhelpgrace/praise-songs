import os
import re
import json
import time
import argparse
from collections import defaultdict
# 可选的 pypinyin 支持：在 Windows 或缺失依赖时不抛错
try:
    from pypinyin import lazy_pinyin as _lazy_pinyin, Style as _Style
except Exception:
    _lazy_pinyin = None
    _Style = None

def to_url_path(path: str) -> str:
    """Convert filesystem path to URL-safe forward-slash path."""
    if not isinstance(path, str):
        return ''
    return path.replace('\\', '/')

def get_song_initial(song_name):
    if not song_name:
        return '#'
    first_char = song_name[0]
    if '\u4e00' <= first_char <= '\u9fff':
        # 使用拼音首字母；在缺失依赖或异常时安全降级
        if _lazy_pinyin and _Style:
            try:
                letters = _lazy_pinyin(first_char, style=_Style.FIRST_LETTER)
                if letters:
                    return str(letters[0]).upper()
            except Exception:
                pass
        return '#'
    elif first_char.isalpha():
        return first_char.upper()
    else:
        return '#'

def get_song_name(filename):
    return re.sub(r'\.jpg|\.png|\.jpeg', '', filename).strip()

def generate_song_page(song_name, image_path, output_dir):
    song_html_name = song_name.replace(' ', '_')
    html_content = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{song_name}</title>
    <style>
        body, html {{
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
        }}
        img {{
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }}
        .back-link {{
            position: absolute;
            top: 20px;
            left: 20px;
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
            padding: 10px 15px;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
            z-index: 2;
        }}
    </style>
</head>
<body>
    <a href="../index.html" class="back-link">返回首页</a>
    <img src="{image_path}" alt="{song_name}">
</body>
</html>
"""
    with open(os.path.join(output_dir, f"{song_html_name}.html"), 'w', encoding='utf-8') as f:
        f.write(html_content)

def generate_presentation_page(output_dir):
    presentation_html_content = r"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>歌曲演示</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
            background-color: #000;
            color: white;
            font-family: sans-serif;
        }
        #presentation-container {
            width: 100vw;
            height: 100vh;
            position: relative;
            /* 默认白色背景，确保无背景图时不是黑屏 */
            background: #fff;
        }
        /* 全局背景图：位于所有内容之下，50% 透明 */
        #global-bg {
            position: absolute;
            z-index: 0;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            object-fit: cover;
            opacity: 0.3; /* 全局背景透明度 30% */
            pointer-events: none; /* 背景不拦截事件 */
        }
        /* 层叠：白色半透明“纸张”叠层，增强立999 */
        #paper-overlay {
            position: absolute;
            z-index: 0; /* 位于背景之上、内容之下 */
            /* 四周留白，形成中央矩形叠层区域 */
            top: 3vh;
            left: 3vw;
            right: 3vw;
            bottom: 3vh;
            background: rgba(255, 255, 255, 0.40);
            border: 1.5px solid rgba(255, 255, 255, 0.85);
            border-radius: 12px;
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.20);
            pointer-events: none; /* 不影响交互 */
        }
        /* 单页显示：每次仅显示图片的上半或下半 */
        #split-container {
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            position: relative;
            /* 需与全局背景叠加，避免 multiply 与纯黑导致整屏变黑 */
            background: transparent;
        }
        .song-split-img {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            transform-origin: top center; /* 缩放围绕顶部中点，保证与top偏移联动 */
            height: 200vh; /* 将图片高度设为视口的两倍，以便裁切半页仍能填满屏幕 */
            width: auto;
            max-width: none;
            top: 0; /* 通过 JS 设置为 0 或 -100vh 实现上下半页 */
            /* 白底透明、黑字不透明：multiply 与 50% 背景叠加实现白底半透明 */
            mix-blend-mode: multiply;
            /* 适度增强黑字可读性：提升对比度、轻微压暗白底 */
            filter: contrast(1.12) brightness(0.98);
            z-index: 1;
        }
        .nav-button {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            padding: 15px;
            cursor: pointer;
            font-size: 24px;
            z-index: 10;
            border-radius: 50%;
        }
        #prev-song { left: 20px; }
        #next-song { right: 20px; }
        #song-info {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            padding: 10px 20px;
            border-radius: 10px;
        }
        /* 位置微调控件 */
        #adjust-controls {
            position: absolute;
            bottom: 20px;
            left: 20px;
            background-color: rgba(0,0,0,0.5);
            color: #fff;
            border-radius: 8px;
            padding: 6px 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 10;
            font-size: 14px;
        }
        #adjust-controls .adjust-btn {
            border: 1px solid rgba(255,255,255,0.6);
            background: transparent;
            color: #fff;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
        }
        #adjust-controls .adjust-btn:hover { background-color: rgba(255,255,255,0.15); }
        #offset-readout { min-width: 60px; text-align: center; }
        #fullscreen-button, #exit-button {
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            padding: 10px 15px;
            cursor: pointer;
            font-size: 16px;
            border-radius: 5px;
            z-index: 10;
        }
        #exit-button {
            right: 150px;
        }
        /* 背景与混合模式控制 */
        #bg-controls {
            position: absolute;
            bottom: 80px;
            left: 20px;
            background-color: rgba(0,0,0,0.5);
            color: #fff;
            border-radius: 8px;
            padding: 6px 8px;
            display: none; /* 隐藏背景控制面板，透明度与混合模式写死 */
            align-items: center;
            gap: 8px;
            z-index: 10;
            font-size: 14px;
        }
        #bg-opacity { width: 140px; }
        #blend-select {
            border: 1px solid rgba(255,255,255,0.6);
            background: transparent;
            color: #fff;
            border-radius: 4px;
            padding: 4px 8px;
        }
    </style>
</head>
<body>
    <div id="presentation-container">
        <!-- 全局背景图（50%透明），仅作装饰，不影响前景文字与控件 -->
        <img id="global-bg" src="" alt="背景图">
        <!-- 白色半透明叠层：位于背景图与内容之间，形成层叠质感 -->
        <div id="paper-overlay"></div>
        <div id="split-container">
            <img id="song-image-split" class="song-split-img" src="" alt="歌曲图片半页">
        </div>
        <button id="prev-song" class="nav-button">‹</button>
        <button id="next-song" class="nav-button">›</button>
        <div id="song-info">
            <span id="current-song-name"></span> (<span id="current-song-index"></span>/<span id="total-songs"></span>) · <span id="current-song-half">上半</span>
        </div>
        <button id="fullscreen-button">全屏</button>
        <button id="exit-button">退出演示</button>
        <div id="adjust-controls" title="↑/↓ 或 W/S 微调；R复位；支持放大/缩小；上下半独立记忆">
            <button id="move-up" class="adjust-btn">上移</button>
            <button id="move-down" class="adjust-btn">下移</button>
            <button id="reset-offset" class="adjust-btn">复位</button>
            <span id="offset-readout">偏移：+0vh</span>
            <button id="zoom-in" class="adjust-btn" title="放大">放大</button>
            <button id="zoom-out" class="adjust-btn" title="缩小">缩小</button>
            <span id="zoom-readout" title="当前缩放">缩放：1.00×</span>
            <button id="save-params" class="adjust-btn" title="保存当前参数为文件">保存参数</button>
        </div>
        <div id="bg-controls" title="背景透明度与混合模式">
            <!-- 背景控制已写死为 100% 透明度与 multiply 混合，控制面板隐藏 -->
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(window.location.search);
            const songsParam = params.get('songs');
            const imageDir = params.get('imageDir');
            const bgParam = params.get('bg');
            const paramsFile = params.get('paramsFile');
            const songs = songsParam ? JSON.parse(decodeURIComponent(songsParam)) : [];
            
            let currentSongIdx = 0; // 0..songs.length-1
            let currentHalf = 0; // 0: 上半, 1: 下半

            const songImageSplit = document.getElementById('song-image-split');
            const globalBg = document.getElementById('global-bg');
            const presentationContainer = document.getElementById('presentation-container');
            // 背景图加载成功则显示，但保持容器白色底色，避免与黑色页面底色叠加变暗
            globalBg.onload = () => {
                presentationContainer.style.background = '#fff';
                globalBg.style.display = 'block';
            };
            globalBg.onerror = () => {
                presentationContainer.style.background = '#fff';
                globalBg.style.display = 'none';
            };
            const currentSongName = document.getElementById('current-song-name');
            const currentSongIndex = document.getElementById('current-song-index');
            const totalSongs = document.getElementById('total-songs');
            const currentSongHalf = document.getElementById('current-song-half');
            const prevButton = document.getElementById('prev-song');
            const nextButton = document.getElementById('next-song');
            const fullscreenButton = document.getElementById('fullscreen-button');
            const exitButton = document.getElementById('exit-button');
            // 需要在全屏时隐藏的底部信息与微调控件
            const songInfoBar = document.getElementById('song-info');
            const adjustControls = document.getElementById('adjust-controls');
            // 背景透明度与混合模式：默认透明度 50%，混合模式 multiply

            // 位置微调与记忆
            let currentSong = null; // 当前歌曲对象
            const moveUpBtn = document.getElementById('move-up');
            const moveDownBtn = document.getElementById('move-down');
            const resetOffsetBtn = document.getElementById('reset-offset');
            const offsetReadout = document.getElementById('offset-readout');
            const STEP_VH = 2; // 每次微调 2vh
            // 统一参数文件存储：偏移不再使用逐图本地散存，统一读写 paramsData
            function getOffsetFor(file, half) {
                const entry = paramsData.items[file];
                if (!entry) return 0;
                const val = Number((half === 0 ? entry.top?.offsetVh : entry.bottom?.offsetVh) ?? 0);
                return isNaN(val) ? 0 : val;
            }
            function setOffsetFor(file, half, value) {
                const entry = paramsData.items[file];
                if (!entry) return;
                if (half === 0) entry.top.offsetVh = value; else entry.bottom.offsetVh = value;
                saveParamsToLocal(paramsData);
            }
            function updateReadout(value) {
                const sign = value >= 0 ? '+' : '';
                offsetReadout.textContent = `偏移：${sign}${value}vh`;
            }
            function applyPosition(offsetVh, zoom) {
                if (currentHalf === 0) {
                    // 上半：以图片顶部为锚点，缩放不影响顶部定位
                    songImageSplit.style.top = `calc(${offsetVh}vh)`;
                } else {
                    // 下半：需要根据缩放将图片上移半张高度（100vh * zoom），再加偏移
                    songImageSplit.style.top = `calc(-100vh * ${zoom} + ${offsetVh}vh)`;
                }
            }

            // 缩放持久化
            const zoomInBtn = document.getElementById('zoom-in');
            const zoomOutBtn = document.getElementById('zoom-out');
            const zoomReadout = document.getElementById('zoom-readout');
            const ZOOM_STEP = 0.05; // 每次缩放步进
            const MIN_ZOOM = 0.5;
            const MAX_ZOOM = 2.0;
            // 参数文件支持：默认值 + 可选加载 + 导出
            const PARAMS_STORAGE_KEY = 'presentationParamsV1';
            function buildDefaultParams() {
                const items = {};
                songs.forEach(s => {
                    items[s.file] = {
                        top: { offsetVh: 0, zoom: 1 },
                        bottom: { offsetVh: 0, zoom: 1 }
                    };
                });
                return { imageDir, items };
            }
            let paramsData = buildDefaultParams();
            // 从本地存储加载（同目录则合并）
            try {
                const storedParams = JSON.parse(localStorage.getItem(PARAMS_STORAGE_KEY) || 'null');
                if (storedParams && storedParams.imageDir === imageDir && storedParams.items) {
                    Object.keys(storedParams.items).forEach(f => {
                        const it = storedParams.items[f];
                        if (!paramsData.items[f]) return;
                        paramsData.items[f].top.offsetVh = Number(it.top?.offsetVh ?? 0);
                        paramsData.items[f].top.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(it.top?.zoom ?? 1)));
                        paramsData.items[f].bottom.offsetVh = Number(it.bottom?.offsetVh ?? 0);
                        paramsData.items[f].bottom.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(it.bottom?.zoom ?? 1)));
                    });
                }
            } catch(e) {}
            let loadedParamsRaw = null;
            async function loadParamsFile(path) {
                if (!path) return;
                try {
                    const resp = await fetch(path);
                    if (!resp.ok) return;
                    const data = await resp.json();
                    if (!data) return;
                    // 保留原始JSON用于后续合并下载
                    loadedParamsRaw = data;
                    let itemsObj = null;
                    if (data.items && data.imageDir === imageDir) {
                        itemsObj = data.items;
                    } else if (data.dirs && data.dirs[imageDir] && data.dirs[imageDir].items) {
                        itemsObj = data.dirs[imageDir].items;
                    }
                    if (!itemsObj) return;
                    Object.keys(itemsObj).forEach(f => {
                        const it = itemsObj[f];
                        if (!paramsData.items[f]) return;
                        paramsData.items[f].top.offsetVh = Number(it.top?.offsetVh ?? 0);
                        paramsData.items[f].top.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(it.top?.zoom ?? 1)));
                        paramsData.items[f].bottom.offsetVh = Number(it.bottom?.offsetVh ?? 0);
                        paramsData.items[f].bottom.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(it.bottom?.zoom ?? 1)));
                    });
                } catch(e) { console.warn('加载参数文件失败:', e); }
            }
            function collectParams() { return paramsData; }
            function saveParamsToLocal(paramsObj) { try { localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(paramsObj)); } catch(e) {} }
            function downloadParams(paramsObj, filename = 'presentation_params.json') {
                const blob = new Blob([JSON.stringify(paramsObj, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
            async function saveParamsToServer(paramsObj) {
                try {
                    const resp = await fetch('http://localhost:8002/save_params', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(paramsObj)
                    });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const data = await resp.json().catch(() => ({}));
                    return data;
                } catch (e) {
                    console.warn('保存到服务器失败:', e);
                    return null;
                }
            }

            // 离线保存与重试同步
            const PENDING_KEY = 'presentationParamsPendingV1';
            function markPending(paramsObj) {
                try { localStorage.setItem(PENDING_KEY, JSON.stringify(paramsObj)); } catch(e) {}
            }
            async function trySyncPending() {
                try {
                    const raw = localStorage.getItem(PENDING_KEY);
                    if (!raw) return false;
                    const pending = JSON.parse(raw);
                    const res = await saveParamsToServer(pending);
                    if (res && res.status === 'ok') {
                        localStorage.removeItem(PENDING_KEY);
                        return true;
                    }
                    return false;
                } catch(e) { return false; }
            }
            function mergeParams(existing, incoming) {
                // existing 结构：{ dirs: { imageDir: { items: {...}, updatedAt } }, updatedAt }
                // incoming 结构：{ imageDir, items }
                const safeExisting = (existing && typeof existing === 'object') ? existing : {};
                const dirs = (safeExisting.dirs && typeof safeExisting.dirs === 'object') ? { ...safeExisting.dirs } : {};
                const imageDirKey = incoming?.imageDir;
                const items = (incoming?.items && typeof incoming.items === 'object') ? incoming.items : {};
                if (!imageDirKey) return safeExisting;

                const dirEntry = (dirs[imageDirKey] && typeof dirs[imageDirKey] === 'object') ? { ...dirs[imageDirKey] } : {};
                const storedItems = (dirEntry.items && typeof dirEntry.items === 'object') ? { ...dirEntry.items } : {};

                Object.keys(items).forEach(filename => {
                    const val = items[filename] || {};
                    const top = val.top || {};
                    const bottom = val.bottom || {};
                    const topMask = Array.isArray(top.mask) ? top.mask : [];
                    const bottomMask = Array.isArray(bottom.mask) ? bottom.mask : [];
                    storedItems[filename] = {
                        top: {
                            offsetVh: Number.isFinite(top.offsetVh) ? Number(top.offsetVh) : 0,
                            zoom: Number.isFinite(top.zoom) ? Number(top.zoom) : 1,
                            mask: topMask,
                        },
                        bottom: {
                            offsetVh: Number.isFinite(bottom.offsetVh) ? Number(bottom.offsetVh) : 0,
                            zoom: Number.isFinite(bottom.zoom) ? Number(bottom.zoom) : 1,
                            mask: bottomMask,
                        },
                    };
                });

                const now = Date.now();
                dirEntry.items = storedItems;
                dirEntry.updatedAt = now;
                dirs[imageDirKey] = dirEntry;

                return {
                    ...safeExisting,
                    dirs,
                    updatedAt: now,
                };
            }
            function buildMergedParamsForDownload(incoming) {
                const existing = loadedParamsRaw && typeof loadedParamsRaw === 'object' ? loadedParamsRaw : {};
                // 支持旧格式（顶层 imageDir/items）作为existing的初始内容
                if (existing.imageDir && existing.items && !existing.dirs) {
                    const wrapped = { dirs: {} };
                    wrapped.dirs[existing.imageDir] = {
                        items: existing.items,
                        updatedAt: Date.now(),
                    };
                    loadedParamsRaw = wrapped;
                }
                return mergeParams(loadedParamsRaw || existing, incoming);
            }
            function clampZoom(z) { return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)); }
            function getZoomFor(file, half) {
                const entry = paramsData.items[file];
                const val = Number((half === 0 ? entry?.top?.zoom : entry?.bottom?.zoom) ?? 1);
                const z = isNaN(val) ? 1 : val;
                return clampZoom(z);
            }
            function setZoomFor(file, half, value) {
                const entry = paramsData.items[file];
                if (!entry) return;
                const z = clampZoom(value);
                if (half === 0) entry.top.zoom = z; else entry.bottom.zoom = z;
                saveParamsToLocal(paramsData);
            }
            function applyTransform(zoom) {
                songImageSplit.style.transform = `translateX(-50%) scale(${zoom})`;
            }
            function updateZoomReadout(value) {
                zoomReadout.textContent = `缩放：${value.toFixed(2)}×`;
            }
            // 固定背景透明度为 50%
            globalBg.style.opacity = '0.5';
            // 固定混合模式为 multiply
            songImageSplit.style.mixBlendMode = 'multiply';

            // 默认背景图：bj.jpg（相对服务器根目录）
            // 若未通过参数或存储提供背景图，则使用 bj.jpg
            let bgUrl = bgParam;
            try {
                const stored = localStorage.getItem('presentationBg');
                if (!bgUrl && stored) bgUrl = stored;
            } catch(e) {}
            function resolveBg(p) {
                if (!p) return null;
                // 如果是绝对操作系统路径或包含分隔符，仅取文件名以适配 http 服务根目录
                const m = p.match(/[^\\/]+$/);
                return m ? m[0] : p;
            }
            const finalBg = resolveBg(bgUrl) || 'bj.jpg';
            globalBg.src = finalBg;

            // 保留图片加载行为用于偏移/缩放应用，无遮盖刷逻辑
            songImageSplit.addEventListener('load', () => {
                requestAnimationFrame(() => {
                    const offsetVh = getOffsetFor(currentSong?.file, currentHalf);
                    const zoom = getZoomFor(currentSong?.file, currentHalf);
                    applyPosition(offsetVh, zoom);
                    applyTransform(zoom);
                });
            });

            function updateSong() {
                if (songs.length === 0) return;
                const song = songs[currentSongIdx];
                currentSong = song;
                const src = `../${imageDir}/${song.file}`;
                songImageSplit.src = src;
                songImageSplit.alt = song.name + (currentHalf === 0 ? ' - 上半部分' : ' - 下半部分');
                const offsetVh = getOffsetFor(song.file, currentHalf);
                const zoom = getZoomFor(song.file, currentHalf);
                applyPosition(offsetVh, zoom);
                applyTransform(zoom);
                updateReadout(offsetVh);
                updateZoomReadout(zoom);
                currentSongName.textContent = song.name;
                currentSongIndex.textContent = currentSongIdx + 1;
                totalSongs.textContent = songs.length;
                currentSongHalf.textContent = (currentHalf === 0) ? '上半' : '下半';
            }

            prevButton.addEventListener('click', () => {
                if (currentHalf === 1) {
                    // 从下半退回到上半
                    currentHalf = 0;
                } else {
                    // 从上半退到上一首的下半
                    currentSongIdx = (currentSongIdx - 1 + songs.length) % songs.length;
                    currentHalf = 1;
                }
                updateSong();
            });

            nextButton.addEventListener('click', () => {
                if (currentHalf === 0) {
                    // 上半 -> 下半
                    currentHalf = 1;
                } else {
                    // 下半 -> 下一首上半
                    currentSongIdx = (currentSongIdx + 1) % songs.length;
                    currentHalf = 0;
                }
                updateSong();
            });
            
            exitButton.addEventListener('click', () => {
                window.location.href = '../index.html';
            });

            fullscreenButton.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                    fullscreenButton.textContent = '退出全屏';
                    // 进入全屏：隐藏底部信息栏与微调控件
                    if (songInfoBar) songInfoBar.style.display = 'none';
                    if (adjustControls) adjustControls.style.display = 'none';
                    // 进入全屏：隐藏“退出演示”和“退出全屏”按钮
                    if (exitButton) exitButton.style.display = 'none';
                    if (fullscreenButton) fullscreenButton.style.display = 'none';
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                        fullscreenButton.textContent = '全屏';
                        // 退出全屏：恢复显示（采用默认布局）
                        if (songInfoBar) songInfoBar.style.display = '';
                        if (adjustControls) adjustControls.style.display = 'flex';
                        // 退出全屏：恢复“退出演示”和“全屏”按钮显示
                        if (exitButton) exitButton.style.display = '';
                        if (fullscreenButton) fullscreenButton.style.display = '';
                    }
                }
            });
            
            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement) {
                    fullscreenButton.textContent = '全屏';
                    // 退出全屏后的兜底恢复
                    if (songInfoBar) songInfoBar.style.display = '';
                    if (adjustControls) adjustControls.style.display = 'flex';
                    if (exitButton) exitButton.style.display = '';
                    if (fullscreenButton) fullscreenButton.style.display = '';
                } else {
                    // 进入全屏事件：确保隐藏（避免通过ESC或系统UI进入全屏未触发按钮逻辑）
                    if (songInfoBar) songInfoBar.style.display = 'none';
                    if (adjustControls) adjustControls.style.display = 'none';
                    if (exitButton) exitButton.style.display = 'none';
                    if (fullscreenButton) fullscreenButton.style.display = 'none';
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    prevButton.click();
                } else if (e.key === 'ArrowRight') {
                    nextButton.click();
                } else if (document.fullscreenElement && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                    // 全屏模式：↑/↓翻页
                    if (e.key === 'ArrowUp') {
                        prevButton.click();
                    } else {
                        nextButton.click();
                    }
                } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
                    // 非全屏：↑/W 微调偏移
                    if (!currentSong) return;
                    const v = getOffsetFor(currentSong.file, currentHalf) + STEP_VH;
                    setOffsetFor(currentSong.file, currentHalf, v);
                    const z = getZoomFor(currentSong.file, currentHalf);
                    applyPosition(v, z);
                    updateReadout(v);
                } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
                    // 非全屏：↓/S 微调偏移
                    if (!currentSong) return;
                    const v = getOffsetFor(currentSong.file, currentHalf) - STEP_VH;
                    setOffsetFor(currentSong.file, currentHalf, v);
                    const z = getZoomFor(currentSong.file, currentHalf);
                    applyPosition(v, z);
                    updateReadout(v);
                } else if (e.key.toLowerCase() === 'r' || e.key === '0') {
                    if (!currentSong) return;
                    setOffsetFor(currentSong.file, currentHalf, 0);
                    const z = getZoomFor(currentSong.file, currentHalf);
                    applyPosition(0, z);
                    updateReadout(0);
                } else if (e.key === 'Escape' && document.fullscreenElement) {
                    document.exitFullscreen();
                }
            });

            // 按钮微调
            moveUpBtn.addEventListener('click', () => {
                if (!currentSong) return;
                const v = getOffsetFor(currentSong.file, currentHalf) + STEP_VH;
                setOffsetFor(currentSong.file, currentHalf, v);
                const z = getZoomFor(currentSong.file, currentHalf);
                applyPosition(v, z);
                updateReadout(v);
            });
            moveDownBtn.addEventListener('click', () => {
                if (!currentSong) return;
                const v = getOffsetFor(currentSong.file, currentHalf) - STEP_VH;
                setOffsetFor(currentSong.file, currentHalf, v);
                const z = getZoomFor(currentSong.file, currentHalf);
                applyPosition(v, z);
                updateReadout(v);
            });
            resetOffsetBtn.addEventListener('click', () => {
                if (!currentSong) return;
                setOffsetFor(currentSong.file, currentHalf, 0);
                const z = getZoomFor(currentSong.file, currentHalf);
                applyPosition(0, z);
                updateReadout(0);
            });

            // 缩放按钮事件
            zoomInBtn.addEventListener('click', () => {
                if (!currentSong) return;
                const z = clampZoom(getZoomFor(currentSong.file, currentHalf) + ZOOM_STEP);
                setZoomFor(currentSong.file, currentHalf, z);
                applyTransform(z);
                const v = getOffsetFor(currentSong.file, currentHalf);
                applyPosition(v, z);
                updateZoomReadout(z);
            });
            zoomOutBtn.addEventListener('click', () => {
                if (!currentSong) return;
                const z = clampZoom(getZoomFor(currentSong.file, currentHalf) - ZOOM_STEP);
                setZoomFor(currentSong.file, currentHalf, z);
                applyTransform(z);
                const v = getOffsetFor(currentSong.file, currentHalf);
                applyPosition(v, z);
                updateZoomReadout(z);
            });

            // 保存参数：在本脚本内生成并更新JSON（参考服务端合并规则）
            const saveParamsBtn = document.getElementById('save-params');
            if (saveParamsBtn) {
                saveParamsBtn.addEventListener('click', async () => {
                    const incoming = collectParams();
                    // 始终更新本地缓存
                    saveParamsToLocal(incoming);
                    const originalText = saveParamsBtn.textContent;
                    saveParamsBtn.disabled = true;
                    // 首选保存到服务端；失败则离线存储并后台重试
                    const serverRes = await saveParamsToServer(incoming);
                    if (serverRes && serverRes.status === 'ok') {
                        saveParamsBtn.textContent = '已保存✓';
                    } else {
                        markPending(incoming);
                        saveParamsBtn.textContent = '已离线保存✓';
                    }
                    setTimeout(() => {
                        saveParamsBtn.textContent = originalText;
                        saveParamsBtn.disabled = false;
                    }, 1500);
                });
            }

            // 页面加载后定期尝试推送离线保存的数据到服务端
            setInterval(() => { trySyncPending(); }, 5000);

            // 背景图加载与记忆：仅影响背景，黑字与控件保持不透明
            const BG_STORAGE_KEY = 'presentationBgSrc';
            function resolveBgSrc(raw) {
                if (!raw) return '';
                const r = decodeURIComponent(raw);
                if (r.startsWith('http://') || r.startsWith('https://') || r.startsWith('../') || r.startsWith('/')) {
                    return r;
                }
                // 若包含路径分隔符，视为相对工程根的图片路径
                if (r.includes('/')) {
                    return `../${r}`;
                }
                // 视为文件名，拼接到图片目录
                return `../${imageDir}/${r}`;
            }
            function applyGlobalBg(src) {
                if (!src) return; 
                globalBg.src = src;
            }
            let bgStored = null;
            try { bgStored = localStorage.getItem(BG_STORAGE_KEY); } catch (e) { bgStored = null; }
            if (bgParam) {
                const s = resolveBgSrc(bgParam);
                applyGlobalBg(s);
                try { localStorage.setItem(BG_STORAGE_KEY, bgParam); } catch(e) {}
            } else if (bgStored) {
                applyGlobalBg(resolveBgSrc(bgStored));
            } else {
                // 无参数且无存储：默认使用项目根目录的 bj.jpg
                applyGlobalBg('../bj.jpg');
                // 在图片加载前仍为白色兜底
                presentationContainer.style.background = '#fff';
            }

            if (paramsFile) {
                loadParamsFile(paramsFile).then(() => {
                    updateSong();
                });
            } else {
                updateSong();
            }
        });
    </script>
</body>
</html>
"""
    with open(os.path.join(output_dir, "presentation.html"), 'w', encoding='utf-8') as f:
        f.write(presentation_html_content)


def generate_html_index(directory, output_file):
    songs_by_initial = defaultdict(list)
    song_file_map = {}
    for filename in os.listdir(directory):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            song_name = get_song_name(filename)
            if song_name:
                initial = get_song_initial(song_name)
                songs_by_initial[initial].append(song_name)
                song_file_map[song_name] = filename

    sorted_initials = sorted(songs_by_initial.keys(), key=lambda x: (x == '#', x))
    
    output_dir = os.path.dirname(output_file)
    pages_dir = os.path.join(output_dir, 'pages')
    if not os.path.exists(pages_dir):
        os.makedirs(pages_dir)

    generate_presentation_page(pages_dir)
    # 计算相对目录并规范为 URL 路径（Windows 下避免反斜杠）
    image_dir_rel_path_fs = os.path.relpath(directory, output_dir)
    image_dir_rel_path = to_url_path(image_dir_rel_path_fs)

    html_content = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>精选诗歌</title>
    <style>
        body {
            font-family: sans-serif;
            line-height: 1.6;
            margin: 20px;
            /* 首页背景图 */
            background-image: url('首页背景.jpg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-attachment: fixed;
        }
        h1 {
            text-align: center;
        }
        .category {
            margin-bottom: 20px;
            border: 1px solid #ccc;
            padding: 15px;
            border-radius: 8px;
        }
        .category h2 {
            border-bottom: 2px solid #eaeaea;
            padding-bottom: 10px;
        }
        .song-list {
            list-style: none;
            padding: 0;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 10px;
        }
        .song-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .song-item a {
            text-decoration: none;
            color: #333;
        }
        .song-item a:hover {
            color: #007BFF;
        }
        .add-to-presentation {
            margin-left: 10px;
            cursor: pointer;
            color: #007BFF;
            font-size: 0.5em; /* 比常规文字小一半 */
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.6em;
            height: 1.6em;
            border-radius: 50%;
            border: 1px solid #007BFF;
            line-height: 1;
            user-select: none;
        }
        .add-to-presentation:hover {
            background-color: rgba(0, 123, 255, 0.12);
        }
        .add-to-presentation.added {
            color: #888;
            border-color: #bbb;
            background-color: #f2f2f2;
        }

        /* 悬浮弹窗样式 */
        #presentation-panel {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 400px;
            max-height: 62vh;
            background: rgba(255,255,255,0.92);
            color: #333;
            border-radius: 14px;
            border: 1px solid rgba(0,0,0,0.06);
            box-shadow: 0 18px 40px rgba(0,0,0,0.18);
            backdrop-filter: blur(8px) saturate(1.15);
            -webkit-backdrop-filter: blur(8px) saturate(1.15);
            z-index: 9999;
            overflow: hidden;
            transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        #presentation-panel.hidden { display: none; }
        #presentation-panel .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            background: linear-gradient(180deg, #fdfdfd, #f3f3f3);
            border-bottom: 1px solid #e9e9e9;
            cursor: move;
            border-top-left-radius: 14px;
            border-top-right-radius: 14px;
            font-weight: 600;
        }
        #presentation-panel .panel-header .actions {
            display: flex;
            gap: 8px;
        }
        #presentation-panel .panel-header button {
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 18px;
            color: #666;
            padding: 4px 6px;
            border-radius: 8px;
            transition: all 0.15s ease;
        }
        #presentation-panel .panel-header button:hover {
            color: #222;
            background: rgba(0,0,0,0.06);
        }
        #presentation-panel .panel-body {
            padding: 12px;
            overflow: auto;
            background: rgba(255,255,255,0.66);
        }
        #presentation-panel.collapsed .panel-body { display: none; }
        #presentation-panel .panel-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 12px;
            border-top: 1px solid #eee;
            background: linear-gradient(180deg, rgba(255,255,255,0.85), rgba(245,245,245,0.9));
        }
        #presentation-items {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        #presentation-items li {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            margin: 6px 0;
            border-radius: 10px;
            background: rgba(255,255,255,0.8);
            border: 1px solid rgba(0,0,0,0.06);
            box-shadow: 0 4px 10px rgba(0,0,0,0.06);
            transition: transform 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
        }
        #presentation-items li:hover {
            background: rgba(255,255,255,0.95);
            transform: translateY(-1px);
            box-shadow: 0 6px 14px rgba(0,0,0,0.1);
        }
        #presentation-items li + li {
            margin-top: 8px;
        }
        #presentation-items .remove {
            color: #c00;
            cursor: pointer;
            font-size: 14px;
            opacity: 0.85;
            padding: 2px 8px;
            border-radius: 6px;
            transition: background 0.12s ease, opacity 0.12s ease;
        }
        #presentation-items .remove:hover {
            opacity: 1;
            background: rgba(200,0,0,0.08);
        }
        #presentation-items .drag-handle {
            cursor: grab;
            color: #888;
            margin-right: 8px;
            user-select: none;
            font-size: 16px;
        }
        #presentation-items .drag-handle:active { cursor: grabbing; }
        #presentation-items li.dragging {
            opacity: 0.7;
            transform: scale(0.98);
        }
        #open-panel-button {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9998;
            display: none;
            padding: 10px 14px;
            border-radius: 24px;
            background: linear-gradient(135deg, #3a8bff, #0573ff);
            color: #fff;
            border: none;
            cursor: pointer;
            box-shadow: 0 10px 20px rgba(5,115,255,0.3);
            transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        #open-panel-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 14px 26px rgba(5,115,255,0.35);
        }
    </style>
</head>
<body>
    <h1>精选诗歌</h1>
"""

    song_counter = 1
    for initial in sorted_initials:
        html_content += f'<div class="category"><h2>{initial}</h2><ul class="song-list">'
        songs = sorted(songs_by_initial[initial])
        for song in songs:
            song_html_name = song.replace(' ', '_')
            image_filename = song_file_map[song]
            
            # Generate individual song page for each song（确保 URL 路径为正斜杠）
            generate_song_page(song, f"../{image_dir_rel_path}/{image_filename}", pages_dir)

            html_content += f'<li class="song-item"><a href="pages/{song_html_name}.html" target="_blank">{song_counter}. {song}</a><span class="add-to-presentation" title="加入演示" aria-label="加入演示" data-song-name="{song}" data-song-file="{image_filename}">＋</span></li>'
            song_counter += 1
        html_content += '</ul></div>'

    # 悬浮弹窗HTML（携带图片目录）
    html_content += f"""
    <div id="presentation-panel" data-image-dir="{image_dir_rel_path}">
        <div class="panel-header" id="panel-header">
            <span>演示列表 <span id="panel-count">(0)</span></span>
            <div class="actions">
                <button id="panel-minimize" title="最小化">—</button>
                <button id="panel-close" title="关闭">×</button>
            </div>
        </div>
        <div class="panel-body">
            <ul id="presentation-items"></ul>
        </div>
        <div class="panel-footer">
            <button id="panel-clear">清空</button>
            <button id="panel-start">一键启动演示</button>
        </div>
    </div>
    <button id="open-panel-button">演示列表</button>
    """
    html_content += """
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const addToPresentationLinks = document.querySelectorAll('.add-to-presentation');
            const storageKey = 'presentationList';
            let presentationList = JSON.parse(localStorage.getItem(storageKey)) || [];

            // 面板元素
            const panel = document.getElementById('presentation-panel');
            const imageDir = panel.getAttribute('data-image-dir');
            const panelHeader = document.getElementById('panel-header');
            const panelMinimize = document.getElementById('panel-minimize');
            const panelClose = document.getElementById('panel-close');
            const openPanelButton = document.getElementById('open-panel-button');
            const panelItems = document.getElementById('presentation-items');
            const panelClear = document.getElementById('panel-clear');
            const panelStart = document.getElementById('panel-start');
            const panelCount = document.getElementById('panel-count');

            function updateLinkState(link) {
                const songName = link.getAttribute('data-song-name');
                const songExists = presentationList.some(song => song.name === songName);
                if (songExists) {
                    link.classList.add('added');
                    link.textContent = '✓';
                    link.title = '已加入';
                    link.setAttribute('aria-label', '已加入');
                } else {
                    link.classList.remove('added');
                    link.textContent = '＋';
                    link.title = '加入演示';
                    link.setAttribute('aria-label', '加入演示');
                }
            }

            addToPresentationLinks.forEach(updateLinkState);

            function renderPanelList() {
                panelItems.innerHTML = '';
                presentationList.forEach((song, idx) => {
                    const li = document.createElement('li');
                    // 拖拽排序：为每个条目设置可拖拽
                    li.setAttribute('draggable', 'true');
                    li.dataset.index = String(idx);
                    li.innerHTML = `<span class="drag-handle" title="拖动排序">⋮⋮</span><span class="song-text">${idx + 1}. ${song.name}</span><span class="remove" data-name="${song.name}">移除</span>`;
                    const removeEl = li.querySelector('.remove');
                    if (removeEl) removeEl.setAttribute('draggable', 'false');
                    addDragHandlers(li);
                    panelItems.appendChild(li);
                });
                panelCount.textContent = `(${presentationList.length})`;
            }

            function saveList() {
                localStorage.setItem(storageKey, JSON.stringify(presentationList));
                renderPanelList();
            }

            renderPanelList();

            addToPresentationLinks.forEach(link => {
                link.addEventListener('click', function() {
                    const songName = this.getAttribute('data-song-name');
                    const songFile = this.getAttribute('data-song-file');
                    if (this.classList.contains('added')) {
                        presentationList = presentationList.filter(s => s.name !== songName);
                    } else {
                        presentationList.push({name: songName, file: songFile});
                    }
                    localStorage.setItem(storageKey, JSON.stringify(presentationList));
                    updateLinkState(this);
                    renderPanelList();
                });
            });

            // 移除首页按钮后，保留面板内一键启动

            // 面板移除事件
            panelItems.addEventListener('click', function(e) {
                if (e.target.classList.contains('remove')) {
                    const name = e.target.getAttribute('data-name');
                    presentationList = presentationList.filter(s => s.name !== name);
                    saveList();
                    // 同步更新主列表链接状态
                    addToPresentationLinks.forEach(updateLinkState);
                }
            });

            // 拖拽排序实现
            let dragSrcIndex = null;
            function addDragHandlers(li) {
                li.addEventListener('dragstart', function(e) {
                    dragSrcIndex = Number(li.dataset.index);
                    li.classList.add('dragging');
                    try { e.dataTransfer.effectAllowed = 'move'; } catch (_) {}
                });
                li.addEventListener('dragend', function() {
                    li.classList.remove('dragging');
                });
                li.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
                });
                li.addEventListener('drop', function(e) {
                    e.preventDefault();
                    const targetIdx = Number(li.dataset.index);
                    if (dragSrcIndex === null || targetIdx === dragSrcIndex) return;
                    const item = presentationList.splice(dragSrcIndex, 1)[0];
                    const insertIdx = dragSrcIndex < targetIdx ? targetIdx - 1 : targetIdx;
                    presentationList.splice(insertIdx, 0, item);
                    saveList();
                    // 重新渲染后索引变化，确保主列表按钮状态一致
                    addToPresentationLinks.forEach(updateLinkState);
                    dragSrcIndex = null;
                });
            }

            // 清空
            panelClear.addEventListener('click', function() {
                if (presentationList.length === 0) return;
                if (confirm('确认清空演示列表？')) {
                    presentationList = [];
                    saveList();
                    addToPresentationLinks.forEach(updateLinkState);
                }
            });

            // 一键启动
            panelStart.addEventListener('click', function() {
                const currentList = JSON.parse(localStorage.getItem(storageKey)) || [];
                if (currentList.length > 0) {
                    const songsParam = encodeURIComponent(JSON.stringify(currentList));
                    // 读取已记忆的背景图，作为演示页的全局背景
                    const bgStored = localStorage.getItem('presentationBgSrc');
                    const bgParam = bgStored ? `&bg=${encodeURIComponent(bgStored)}` : '';
                    window.open(`pages/presentation.html?songs=${songsParam}&imageDir=${encodeURIComponent(imageDir)}${bgParam}`, '_blank');
                } else {
                    alert('演示列表为空，请先添加歌曲');
                }
            });

            // 最小化/恢复
            panelMinimize.addEventListener('click', function() {
                panel.classList.toggle('collapsed');
            });

            // 关闭面板
            panelClose.addEventListener('click', function() {
                panel.classList.add('hidden');
                openPanelButton.style.display = 'block';
            });

            // 打开面板
            openPanelButton.addEventListener('click', function() {
                panel.classList.remove('hidden');
                openPanelButton.style.display = 'none';
            });

            // 拖拽功能
            (function enableDrag() {
                let isDragging = false;
                let startX = 0, startY = 0;
                let startLeft = 0, startTop = 0;

                function onMouseDown(e) {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    const rect = panel.getBoundingClientRect();
                    startLeft = rect.left;
                    startTop = rect.top;
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                }

                function onMouseMove(e) {
                    if (!isDragging) return;
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    panel.style.left = (startLeft + dx) + 'px';
                    panel.style.top = (startTop + dy) + 'px';
                    panel.style.right = 'auto';
                    panel.style.bottom = 'auto';
                }

                function onMouseUp() {
                    isDragging = false;
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }

                panelHeader.addEventListener('mousedown', onMouseDown);
            })();
        });
    </script>
</body>
</html>
"""

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    # 在脚本同级目录生成/更新统一参数 JSON：默认值（offsetVh=0, zoom=1）
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        params_path = os.path.join(script_dir, 'presentation_params.json')
        # 现有文件读取或初始化结构
        data = {}
        if os.path.exists(params_path):
            try:
                with open(params_path, 'r', encoding='utf-8') as pf:
                    data = json.load(pf)
            except Exception:
                data = {}
        if 'dirs' not in data or not isinstance(data.get('dirs'), dict):
            data['dirs'] = {}
        # 以相对目录为键，补齐 items
        dir_entry = data['dirs'].get(image_dir_rel_path, {})
        items = dir_entry.get('items', {})
        # 为本目录所有图片补齐默认项（文件名为键）
        for song, filename in song_file_map.items():
            if filename not in items:
                items[filename] = {
                    'top': { 'offsetVh': 0, 'zoom': 1 },
                    'bottom': { 'offsetVh': 0, 'zoom': 1 }
                }
        dir_entry['items'] = items
        dir_entry['updatedAt'] = int(time.time() * 1000)
        data['dirs'][image_dir_rel_path] = dir_entry
        data['updatedAt'] = int(time.time() * 1000)
        # 写回文件
        with open(params_path, 'w', encoding='utf-8') as pf:
            json.dump(data, pf, ensure_ascii=False, indent=2)
    except Exception:
        # 安静失败，不影响页面生成
        pass

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_song_dir = os.path.join(script_dir, '灵栖清泉曲谱')

    parser = argparse.ArgumentParser(description='Generate HTML index and presentation pages.')
    parser.add_argument('--song-dir', dest='song_dir', default=default_song_dir,
                        help='Path to the directory containing song images (defaults to ./清理后/灵栖清泉曲谱)')
    parser.add_argument('--output', dest='output', default=os.path.join(script_dir, 'index.html'),
                        help='Path to the output index.html file (defaults to script directory)')
    args = parser.parse_args()

    song_directory = args.song_dir
    output_html_file = args.output

    # Ensure paths are absolute for filesystem operations
    if not os.path.isabs(song_directory):
        song_directory = os.path.abspath(os.path.join(script_dir, song_directory))
    if not os.path.isabs(output_html_file):
        output_html_file = os.path.abspath(os.path.join(script_dir, output_html_file))

    generate_html_index(song_directory, output_html_file)
    print(f"HTML index generated at: {output_html_file}")