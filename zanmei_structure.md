# Zanmei.ai Website Structure

## Main Navigation
*   **发现 (Discover)**: `https://www.zanmei.ai/`
*   **乐库 (Library)**: `https://www.zanmei.ai/music/`
*   **歌单 (Playlist)**: `https://www.zanmei.ai/box/`
*   **歌谱 (Sheet Music)**: `https://www.zanmei.ai/tab/`
*   **客户端 (Client)**: `https://c.cnzmsg.com/`

## Pages & Features Details

### 1. Discover (发现) - Home Page
**URL**: `https://www.zanmei.ai/`

**Sections & Functional Units**:
*   **精选歌单 (Selected Playlists)**
    *   Actions: 播放灵修音乐 (Play Devotional Music)
    *   Link: 更多 »
*   **推荐专辑 (Recommended Albums)**
    *   Filters/Tabs: 传统圣乐, 伴奏集, 纯音乐, 中国风
    *   Link: 更多 »
*   **EP首发 (EP Premiere)**
    *   Display: Latest EP albums
*   **推荐歌曲 (Recommended Songs)**
    *   Actions: 播放全部 (Play All)
    *   Link: 更多 »
*   **热门专辑 (Popular Albums)**
    *   Link: 更多 »
*   **热门新歌 (Popular New Songs)**
    *   Actions: 播放全部 (Play All)
    *   Link: 更多 »
*   **精选视频 (Featured Videos)**
    *   Filters/Tabs: 赞美会, 赞美舞蹈, 经典圣诗, 现场Live, 灵修音乐, 字幕投影
    *   Link: 更多 »

### 2. Library (乐库)
**URL**: `https://www.zanmei.ai/music/`

**Sub-Navigation**:
*   歌库 (Library)
*   音乐人 (Musicians)
*   专辑 (Albums)
*   视频 (Videos)
*   歌曲 (Songs)
*   排行榜 (Charts)

**Filters (Categories)**:
*   **专辑分类 (Album Categories)**: 全部, 古典/传统, 现代流行, 乡村民谣, 中国风, 器乐/纯音乐, R&B/Hip-Hop, 戏曲, 爵士/布鲁斯, 以色列, 舞曲/电子, 古风, 其它
*   **音乐人分类 (Musician Categories)**: 全部, 内地, 港台, 日韩, 东南亚, 欧美, 其它

**Sections**:
*   **最新发布专辑 (Latest Released Albums)**
    *   Link: 更多 »
*   **推荐歌曲 (Recommended Songs)**
    *   Link: 更多 »
*   **热门歌曲 (Popular Songs)**
    *   Link: 更多 »
*   **最新歌曲 (Latest Songs)**
    *   Link: 更多 »
*   **热门音乐人 (Popular Musicians)**
    *   Display: List of musicians with song counts

### 3. Playlist (歌单)
**URL**: `https://www.zanmei.ai/box/`

**Filters (Categories)**:
*   **语种 (Language)**: 全部, 国语, 粤语, 闽南语, 日语, 韩语, 英语, 地方, 希伯来语, 少数民族语, 德语, 拉丁语, 法语, 西班牙语, 其它
*   **流派 (Genre)**: 全部, 古典/传统, 现代流行, 乡村民谣, 中国风, 器乐/纯音乐, R&B/Hip-Hop, 戏曲, 爵士/布鲁斯, 以色列, 舞曲/电子, 古风, 其它
*   **场合 (Occasion)**: 全部, 布道会, 婚礼, 洗礼, 圣餐礼, 追思礼, 毕业典礼, 培灵会, 主日学, 集体崇拜, 圣诞节, 感恩节, 受难节, 复活节, 赞美会, 祷告会
*   **情绪 (Mood)**: 全部, 悔改, 喜乐, 安慰, 信心, 伤心, 感恩, 复兴, 渴慕, 怀旧, 清新, 放松, 安静
*   **场景 (Scene)**: 全部, 清晨, 午休, 夜晚, 读经, 祷告, 灵修, 跳舞, 工作, 旅途, 驾车, 运动

**Sections**:
*   **推荐歌单 (Recommended Playlists)**
    *   Link: 更多 »
*   **热门歌单 (Popular Playlists)**
    *   Link: 更多 »

### 4. Sheet Music (歌谱)
**URL**: `https://www.zanmei.ai/tab/`

**Sub-Navigation**:
*   歌谱 (Sheet Music)
*   诗歌本 (Songbooks)

**Filters (Categories)**:
*   **歌谱种类 (Type)**: 全部, 总谱, 简谱, 五线, 六线, 指弹, 歌词, 和弦, 伴奏, 指法, 多声部, 其它
*   **适用乐器 (Instrument)**: 全部, 吉他, 贝斯, 钢琴, 提琴, 口琴, 箫笛, 鼓类, 其它
*   **歌谱调号 (Key)**: 全部, C, C♯/D♭, D, E♭, E, F, F♯/G♭, G, A♭, A, B♭, B, Am, B♭m, Bm, Cm, C♯m, Dm, E♭m, Em, Fm, F♯m, Gm, G♯m
*   **歌谱拍号 (Time Signature)**: 全部, 2/2, 2/4, 3/4, 4/4, 6/4, 3/8, 6/8, 9/8, 12/8, 8/4, 其它
*   **歌谱格式 (Format)**: 全部, 文本, 图片, 文档, 软件, 压缩包
*   **首字母 (Initial)**: 全部, A-Z, 其他

**Sections**:
*   **推荐诗歌本 (Recommended Songbooks)**
    *   Link: 更多 »
*   **最新发布歌谱 (Latest Sheet Music)**

## Backend Technology Analysis

### 1. Infrastructure & CDN
*   **CDN/Proxy**: Cloudflare (Identified via `server: cloudflare` and `cf-ray` headers).
*   **Protocols**: Supports HTTP/3 (`alt-svc: h3=":443"`).
*   **Compression**: Uses `zstd` encoding for content delivery.

### 2. Server-Side Technology
*   **Language**: PHP (Inferred from `PHPSESSID` cookie).
*   **Web Server**: Likely Nginx or Apache behind Cloudflare (Cloudflare hides the origin server header, but PHP is commonly paired with these).

### 3. Frontend/Client-Side Libraries
*   **jQuery**: version 1.12.4 (Found in script tags).
*   **UI Components**: `artDialog` (v5), `jquery.autocomplete`.
*   **Analytics**: Google Analytics (`gtag.js`), Cloudflare Insights.

### 4. Performance & Caching
*   **Caching Strategy**: `cache-control: no-store, no-cache, must-revalidate` (Indicates dynamic content is not cached by browsers by default, likely handled by application logic).
*   **Cloudflare Cache**: `cf-cache-status: DYNAMIC` (Requests are passing through to the origin server).

### 5. Security Headers
*   **Strict-Transport-Security (HSTS)**: Not explicitly seen in the initial probe, but site enforces HTTPS.
*   **X-Content-Type-Options**: Not explicitly seen.

## Inferred Data Model & Storage Strategy

### 1. URL Structure & Routing
*   **Song**: `/song/{id}.html` (e.g., `/song/43192.html`). ID is numeric.
*   **Album**: `/album/{id}.html` (e.g., `/album/4132.html`) or `/album/{slug}.html` (e.g., `/album/jesus-my-all.html`). Supports both ID and slug.
*   **Playlist**: `/box/{id}.html` (e.g., `/box/729832.html`). ID is numeric.
*   **Sheet Music**: `/tab/` (root), specific sheets likely follow a similar ID pattern.
*   **Musician**: `/artist/{slug}.html` (e.g., `/artist/new-heart-music.html`).

### 2. Media Storage & CDN (File Naming)
*   **Images**: Stored on `file.xiaohai.ai` (likely an alias or separate media server).
    *   **Path Pattern**: `/{type}/{year}/{month}/{day}/{object_id}.{ext}.webp`
    *   **Example**: `https://file.xiaohai.ai/album/2020/11/28/5fc22d0b326344615e1cf095.jpg.webp`
    *   **Inference**: The object ID `5fc22d0b326344615e1cf095` is a 24-character hex string, which strongly suggests a **MongoDB ObjectId**. This implies the backend metadata database might be MongoDB, or at least the file storage system uses MongoDB-like IDs.
*   **LRC Lyrics**: Stored on `www.zanmei.ai` (local to the app server).
    *   **Path Pattern**: `/down/lyric/{object_id}.lrc`
    *   **Example**: `/down/lyric/5fc2335e6651b74a78184d4b.lrc`
    *   **Inference**: Also uses a 24-char hex ID (`5fc2335e6651b74a78184d4b`).
*   **Audio**: Not directly exposed in HTML (likely loaded dynamically or via blob), but metadata points to IDs.

### 3. Inferred Database Schema (Relational + Document)
Based on the observed data:
*   **Songs Table/Collection**:
    *   `id`: Numeric (e.g., 43192) - Public facing ID.
    *   `uuid`: 24-char Hex (e.g., 5fc2335e...) - Internal ID for linking files.
    *   `title`: String ("生命的珍宝").
    *   `album_id`: Foreign Key to Album.
    *   `artist_id`: Foreign Key to Artist.
    *   `lyric_file_id`: ID for the LRC file.
*   **Albums Table/Collection**:
    *   `id`: Numeric (e.g., 4132).
    *   `slug`: String ("jesus-my-all").
    *   `title`: String.
    *   `cover_image_id`: ID for the cover image.
    *   `release_date`: Date.
*   **Artists Table/Collection**:
    *   `id`: Numeric or Slug.
    *   `name`: String ("新心音乐").
*   **Files/Media Collection**:
    *   `id`: 24-char Hex.
    *   `path`: Stored path (year/month/day/).
    *   `type`: 'image', 'lrc', 'audio'.

### 4. Replication Strategy for User
To replicate this system for your own content:
1.  **Storage**: Set up an object storage (like AWS S3, Aliyun OSS, or MinIO) for media files (images, audio, lrc).
2.  **Naming Convention**: Adopt the `/{type}/{yyyy}/{mm}/{dd}/{uuid}.{ext}` convention to avoid directory clutter.
3.  **Database**:
    *   Use a relational DB (MySQL/PostgreSQL) for structured data (Songs, Albums, Playlists) if you prefer strict schemas.
    *   OR use MongoDB if you want to match the observed ID style natively.
    *   Key Fields: `title`, `slug` (for pretty URLs), `storage_path` (for media).
4.  **Frontend**:
    *   Use a player library (like `aplayer` or `howler.js`) that can consume the audio URLs.
    *   Implement an LRC parser to display lyrics synchronously.
