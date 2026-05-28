"""
🌦️🌊 El Tiempo + Mar — Backend Server
Servidor Flask que:
  1. Serveix l'app web (fitxers estàtics)
  2. Descarrega dades marines de Copernicus Marine Service
  3. Les serveix via API JSON a /api/marine

Ús:
  python server.py
  → Obre http://localhost:5000 al navegador
"""

import json
import os
import threading
import time
from datetime import datetime, timezone

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from copernicus_fetcher import fetch_all_marine_data

# ─── Configuració ────────────────────────────────────────────────────
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(STATIC_DIR, 'marine_cache.json')
CACHE_DURATION = 6 * 3600  # 6 hores (les dades marines s'actualitzen 1x/dia)
PORT = 5000

# ─── Flask App ───────────────────────────────────────────────────────
app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='')
CORS(app)

# ─── Cache en memòria ────────────────────────────────────────────────
_cache_lock = threading.Lock()
_cache_data = None
_cache_timestamp = 0
_is_fetching = False


# ─── Rutes ───────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Serveix la pàgina principal."""
    return send_from_directory(STATIC_DIR, 'index.html')


@app.route('/api/marine')
def get_marine_data():
    """Retorna les dades marines en format JSON."""
    global _cache_data, _cache_timestamp

    # 1. Mirem cache en memòria
    if _cache_data and (time.time() - _cache_timestamp) < CACHE_DURATION:
        return jsonify(_cache_data)

    # 2. Mirem cache en fitxer
    file_data = _load_file_cache()
    if file_data:
        with _cache_lock:
            _cache_data = file_data
            _cache_timestamp = time.time()
        return jsonify(file_data)

    # 3. No hi ha dades — iniciem descàrrega en background
    _trigger_fetch()

    # Si tenim dades velles (caducades), les retornem igualment
    if _cache_data:
        return jsonify(_cache_data)

    return jsonify({
        'status': 'loading',
        'message': "Les dades marines s'estan descarregant de Copernicus..."
              " Torna a carregar en ~60 segons.",
    }), 202


@app.route('/api/marine/refresh', methods=['POST'])
def refresh_marine():
    """Força la re-descàrrega de dades marines."""
    _trigger_fetch()
    return jsonify({
        'status': 'ok',
        'message': 'Actualització en curs...',
    })


# ─── Descàrrega en background ────────────────────────────────────────

def _trigger_fetch():
    """Inicia la descàrrega en un thread separat si no n'hi ha cap actiu."""
    global _is_fetching
    if _is_fetching:
        return
    _is_fetching = True
    thread = threading.Thread(target=_do_fetch, daemon=True)
    thread.start()


def _do_fetch():
    """Executa la descàrrega de Copernicus i actualitza la cache."""
    global _cache_data, _cache_timestamp, _is_fetching
    try:
        print("\n[🌊] Descarregant dades marines de Copernicus...")
        print("[🌊] Això pot trigar 30-60 segons la primera vegada...\n")

        data = fetch_all_marine_data()

        with _cache_lock:
            _cache_data = data
            _cache_timestamp = time.time()

        # Guardem a fitxer per persistència
        try:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            print(f"[🌊] Avís: no s'ha pogut guardar cache: {e}")

        print("\n[🌊] ✅ Dades marines actualitzades correctament!")
        print(f"[🌊] Pròxima actualització en {CACHE_DURATION // 3600} hores")

    except Exception as e:
        print(f"\n[🌊] ❌ Error descarregant dades: {e}")
    finally:
        _is_fetching = False


def _load_file_cache():
    """Carrega dades de la cache en fitxer si és recent."""
    if not os.path.exists(CACHE_FILE):
        return None
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Comprovem si la cache és recent
        updated = data.get('last_updated', '')
        if updated:
            cache_time = datetime.fromisoformat(updated)
            age_seconds = (datetime.now(timezone.utc).replace(tzinfo=None) - cache_time).total_seconds()
            if age_seconds < CACHE_DURATION:
                return data

        # Cache caducada però la retornem igualment com a fallback
        return data
    except Exception:
        return None


# ─── Auto-refresh periòdic ────────────────────────────────────────────

def _schedule_periodic_refresh():
    """Programa actualitzacions periòdiques de les dades marines."""
    def _loop():
        while True:
            time.sleep(CACHE_DURATION)
            print("\n[🌊] Auto-refresh programat...")
            _trigger_fetch()

    thread = threading.Thread(target=_loop, daemon=True)
    thread.start()


# ─── Main ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # Intentem carregar cache existent al iniciar
    cached = _load_file_cache()
    if cached:
        _cache_data = cached
        _cache_timestamp = time.time()
        print("[🌊] Cache marina carregada des de fitxer")
    else:
        print("[🌊] No hi ha cache — es descarregaran dades al primer request")

    # Iniciem descàrrega en background
    _trigger_fetch()

    # Programem auto-refresh
    _schedule_periodic_refresh()

    print()
    print("=" * 55)
    print("  🌦️🌊  EL TIEMPO + MAR  —  L'Ametlla de Mar")
    print("=" * 55)
    print(f"  📍 Obre el navegador a: http://localhost:{PORT}")
    print(f"  📡 API dades marines:   http://localhost:{PORT}/api/marine")
    print("  🛑 Per aturar: Ctrl+C")
    print("=" * 55)
    print()

    app.run(host='0.0.0.0', port=PORT, debug=False)
