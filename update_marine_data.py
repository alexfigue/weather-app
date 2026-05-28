"""
🌊 Script per actualitzar les dades marines de Copernicus v2
Genera marine_data.json per a l'app web (usat per GitHub Actions i localment)

Ús:
  python update_marine_data.py
"""

import json
import os
import sys

# Afegim el directori actual al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from copernicus_fetcher import fetch_all_marine_data


def main():
    print("🌊 Descarregant dades marines de Copernicus (v2 multi-profunditat)...\n")

    try:
        data = fetch_all_marine_data()

        output_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            'marine_data.json'
        )

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

        print(f"\n✅ Dades guardades a: {output_path}")

        # Resum
        if data.get('current'):
            print(f"\n📊 Resum actual per profunditat:")
            for depth_key, depth_data in data['current'].items():
                temp = depth_data.get('temperature', '--')
                sal = depth_data.get('salinity', '--')
                o2 = depth_data.get('oxygen', '--')
                chl = depth_data.get('chlorophyll', '--')
                print(f"   📏 {depth_key:>8s}: "
                      f"🌡️ {temp}°C  "
                      f"🧂 {sal} PSU  "
                      f"O₂ {o2}  "
                      f"Chl {chl}")

        if data.get('mixed_layer_depth'):
            print(f"\n   🌡️ Termoclina (MLD): {data['mixed_layer_depth']}m")

        if data.get('daily'):
            n_past = sum(1 for d in data['daily'] if not d.get('is_forecast'))
            n_forecast = sum(1 for d in data['daily'] if d.get('is_forecast'))
            print(f"\n   📅 Dies: {n_past} passat + {n_forecast} forecast = "
                  f"{len(data['daily'])} total")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
