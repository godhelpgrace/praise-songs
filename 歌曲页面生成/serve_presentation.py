import os
import json
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PARAMS_FILENAME = 'presentation_params.json'
PARAMS_PATH = os.path.join(ROOT_DIR, PARAMS_FILENAME)


def merge_params(existing: dict, incoming: dict) -> dict:
    """Merge incoming params into existing structure.
    Expected incoming structure: { imageDir: str, items: { filename: {top:{}, bottom:{}} } }
    Stored structure: { dirs: { imageDir: { items: {...}, updatedAt: int } }, updatedAt: int }
    """
    if not isinstance(existing, dict):
        existing = {}
    dirs = existing.get('dirs')
    if not isinstance(dirs, dict):
        dirs = {}

    image_dir = incoming.get('imageDir')
    items = incoming.get('items') or {}
    if not image_dir or not isinstance(items, dict):
        return existing

    dir_entry = dirs.get(image_dir) or {}
    stored_items = dir_entry.get('items') or {}

    # Override provided filenames; keep others
    for filename, val in items.items():
        top = val.get('top', {}) or {}
        bottom = val.get('bottom', {}) or {}
        # 直接存储mask数组（若缺失则为空数组），用于遮盖刷持久化
        top_mask = top.get('mask') if isinstance(top.get('mask'), list) else []
        bottom_mask = bottom.get('mask') if isinstance(bottom.get('mask'), list) else []

        stored_items[filename] = {
            'top': {
                'offsetVh': int(top.get('offsetVh', 0)),
                'zoom': float(top.get('zoom', 1)),
                'mask': top_mask,
            },
            'bottom': {
                'offsetVh': int(bottom.get('offsetVh', 0)),
                'zoom': float(bottom.get('zoom', 1)),
                'mask': bottom_mask,
            },
        }

    now = int(time.time() * 1000)
    dir_entry['items'] = stored_items
    dir_entry['updatedAt'] = now
    dirs[image_dir] = dir_entry

    existing['dirs'] = dirs
    existing['updatedAt'] = now
    return existing


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def _set_cors_headers(self):
        # Allow cross-origin requests for saving params (from other localhost ports)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        # Handle CORS preflight for /save_params
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path != '/save_params':
            self.send_error(404, 'Not Found')
            return

        content_length = int(self.headers.get('Content-Length', '0'))
        try:
            raw = self.rfile.read(content_length) if content_length > 0 else b'{}'
            incoming = json.loads(raw.decode('utf-8') or '{}')
        except Exception as e:
            self.send_error(400, f'Invalid JSON: {e}')
            return

        try:
            existing = {}
            if os.path.exists(PARAMS_PATH):
                with open(PARAMS_PATH, 'r', encoding='utf-8') as f:
                    try:
                        existing = json.load(f)
                    except Exception:
                        existing = {}

            merged = merge_params(existing, incoming)
            with open(PARAMS_PATH, 'w', encoding='utf-8') as f:
                json.dump(merged, f, ensure_ascii=False, indent=2)

            out = json.dumps({'status': 'ok', 'file': PARAMS_FILENAME}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(out)))
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(out)
        except Exception as e:
            # Return JSON with CORS headers on failure
            err = json.dumps({'status': 'error', 'message': f'{e}'}).encode('utf-8')
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(err)))
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(err)


def main():
    port = int(os.environ.get('PORT', '8000'))
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print(f"Serving presentation at http://localhost:{port}/ (root: {ROOT_DIR})")
    print(f"Params file path: {PARAMS_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()