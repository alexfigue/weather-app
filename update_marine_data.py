"""
🌊 Script per actualitzar les dades marines de Copernicus
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
    print("🌊 Descarregant dades marines de Copernicus...\n")

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
            c = data['current']
            print(f"\n📊 Resum actual:")
            print(f"   🌡️ Temp. mar:  {c.get('sea_temperature', '--')}°C")
            print(f"   🧂 Salinitat:  {c.get('salinity', '--')} PSU")
            print(f"   🌊 Corrent:    {c.get('current_speed', '--')} m/s "
                  f"{c.get('current_direction_label', '')}")

        if data.get('daily'):
            print(f"   📅 Dies amb dades: {len(data['daily'])}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
