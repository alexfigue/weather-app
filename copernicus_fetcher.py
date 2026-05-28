"""
🌊 Copernicus Marine Data Fetcher
Mòdul per descarregar i processar dades marines de Copernicus Marine Service
per a la zona de L'Ametlla de Mar (gàbies d'aqüicultura Balfegó).

Requisits:
  - Haver fet `copernicusmarine login` prèviament
  - Dependències: copernicusmarine, xarray, netcdf4, pandas, numpy
"""

import os
import math
import tempfile
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import xarray as xr
import copernicusmarine


# ─── Configuració de la zona ─────────────────────────────────────────
ZONE = {
    'name': "L'Ametlla de Mar - Zona Gàbies",
    'min_lat': 40.80,
    'max_lat': 40.90,
    'min_lon': 0.80,
    'max_lon': 0.90,
}

# Quants dies enrere agafar
DAYS_BACK = 7


# ─── Definició de datasets de Copernicus ──────────────────────────────
DATASETS = [
    {
        'name': 'temperature',
        'dataset_id': 'cmems_mod_med_phy-tem_anfc_4.2km_P1D-m',
        'variables': ['thetao'],
        'description': 'Temperatura del mar',
    },
    {
        'name': 'salinity',
        'dataset_id': 'cmems_mod_med_phy-sal_anfc_4.2km_P1D-m',
        'variables': ['so'],
        'description': 'Salinitat',
    },
    {
        'name': 'currents',
        'dataset_id': 'cmems_mod_med_phy-cur_anfc_4.2km_P1D-m',
        'variables': ['uo', 'vo'],
        'description': 'Corrents marins (components u/v)',
    },
]


def fetch_all_marine_data():
    """
    Descarrega totes les dades marines de Copernicus i les retorna
    com a diccionari JSON-ready.
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=DAYS_BACK)

    temp_dir = tempfile.mkdtemp(prefix='copernicus_')
    all_results = {}

    for ds_config in DATASETS:
        name = ds_config['name']
        print(f"  📡 Descarregant {ds_config['description']}...")

        try:
            result = _fetch_and_process(
                ds_config=ds_config,
                start_date=start_date,
                end_date=end_date,
                temp_dir=temp_dir,
            )
            all_results[name] = result
            print(f"  ✅ {name} — OK")
        except Exception as e:
            print(f"  ⚠️  {name} ha fallat: {e}")
            all_results[name] = None

    # Neteja del directori temporal
    _cleanup_dir(temp_dir)

    # Construïm la resposta final
    return _build_response(all_results, start_date, end_date)


def _fetch_and_process(ds_config, start_date, end_date, temp_dir):
    """Descarrega un dataset i el processa amb xarray."""
    filename = f"{ds_config['name']}.nc"
    filepath = os.path.join(temp_dir, filename)

    # Descàrrega de Copernicus Marine
    copernicusmarine.subset(
        dataset_id=ds_config['dataset_id'],
        variables=ds_config['variables'],
        minimum_longitude=ZONE['min_lon'],
        maximum_longitude=ZONE['max_lon'],
        minimum_latitude=ZONE['min_lat'],
        maximum_latitude=ZONE['max_lat'],
        start_datetime=start_date.strftime('%Y-%m-%dT00:00:00'),
        end_datetime=end_date.strftime('%Y-%m-%dT23:59:59'),
        output_directory=temp_dir,
        output_filename=filename,
        overwrite=True,
    )

    # Processament amb xarray
    result = {}
    with xr.open_dataset(filepath) as ds:
        # Agafem la profunditat superficial si existeix
        if 'depth' in ds.dims:
            ds = ds.isel(depth=0)

        # Identifiquem les dimensions espacials
        lat_dim = _find_dim(ds, ['latitude', 'lat'])
        lon_dim = _find_dim(ds, ['longitude', 'lon'])

        # Mitjana espacial sobre la zona
        dims_to_avg = [d for d in [lat_dim, lon_dim] if d is not None]
        if dims_to_avg:
            ds_mean = ds.mean(dim=dims_to_avg, skipna=True)
        else:
            ds_mean = ds

        # Extraiem dades per variable
        for var in ds_config['variables']:
            if var not in ds_mean:
                continue

            da = ds_mean[var]
            times = pd.DatetimeIndex(da.time.values)
            values = da.values.flatten()

            daily = []
            for t, v in zip(times, values):
                val = float(v) if not np.isnan(v) else None
                daily.append({
                    'date': t.strftime('%Y-%m-%d'),
                    'value': round(val, 2) if val is not None else None,
                })
            result[var] = daily

    # Neteja del fitxer temporal
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception:
            pass

    return result


def _find_dim(ds, candidates):
    """Busca un nom de dimensió entre una llista de candidats."""
    for name in candidates:
        if name in ds.dims:
            return name
    return None


def _calculate_current(uo_val, vo_val):
    """
    Calcula velocitat i direcció del corrent a partir de components u/v.
    Retorna (speed, direction_degrees).
    """
    if uo_val is None or vo_val is None:
        return None, None

    speed = math.sqrt(uo_val ** 2 + vo_val ** 2)

    # Direcció cap a on va el corrent (convenci oceanogràfica)
    direction_rad = math.atan2(uo_val, vo_val)
    direction_deg = (math.degrees(direction_rad) + 360) % 360

    return round(speed, 3), round(direction_deg, 1)


def _get_direction_label(degrees):
    """Converteix graus a etiqueta de brúixola."""
    if degrees is None:
        return '--'
    dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
    idx = round(degrees / 45) % 8
    return dirs[idx]


def _build_response(results, start_date, end_date):
    """Construeix la resposta JSON final amb totes les dades processades."""
    response = {
        'status': 'ok',
        'last_updated': datetime.utcnow().isoformat(),
        'location': ZONE,
        'period': {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d'),
        },
        'current': {},
        'daily': [],
        'units': {
            'sea_temperature': '°C',
            'salinity': 'PSU',
            'current_speed': 'm/s',
            'current_direction': '°',
        },
    }

    # --- Temperatura actual ---
    if results.get('temperature') and results['temperature'].get('thetao'):
        temp_data = results['temperature']['thetao']
        latest = _get_latest_valid(temp_data)
        if latest:
            response['current']['sea_temperature'] = latest['value']

    # --- Salinitat actual ---
    if results.get('salinity') and results['salinity'].get('so'):
        sal_data = results['salinity']['so']
        latest = _get_latest_valid(sal_data)
        if latest:
            response['current']['salinity'] = latest['value']

    # --- Corrents actuals ---
    if results.get('currents'):
        curr = results['currents']
        uo_latest = _get_latest_valid(curr.get('uo', []))
        vo_latest = _get_latest_valid(curr.get('vo', []))

        if uo_latest and vo_latest:
            speed, direction = _calculate_current(
                uo_latest['value'], vo_latest['value']
            )
            response['current']['current_speed'] = speed
            response['current']['current_direction'] = direction
            response['current']['current_direction_label'] = (
                _get_direction_label(direction)
            )

    # --- Dades diàries (merge per data) ---
    all_dates = set()

    for ds_name, ds_data in results.items():
        if ds_data is None:
            continue
        for var_name, var_data in ds_data.items():
            for entry in var_data:
                all_dates.add(entry['date'])

    for date_str in sorted(all_dates):
        entry = {'date': date_str}

        # Temperatura
        if results.get('temperature') and results['temperature'].get('thetao'):
            val = _get_value_for_date(results['temperature']['thetao'], date_str)
            entry['sea_temperature'] = val

        # Salinitat
        if results.get('salinity') and results['salinity'].get('so'):
            val = _get_value_for_date(results['salinity']['so'], date_str)
            entry['salinity'] = val

        # Corrents
        if results.get('currents'):
            uo_val = _get_value_for_date(
                results['currents'].get('uo', []), date_str
            )
            vo_val = _get_value_for_date(
                results['currents'].get('vo', []), date_str
            )
            if uo_val is not None and vo_val is not None:
                speed, direction = _calculate_current(uo_val, vo_val)
                entry['current_speed'] = speed
                entry['current_direction'] = direction

        response['daily'].append(entry)

    return response


def _get_latest_valid(data_list):
    """Retorna l'última entrada vàlida (no nul·la) d'una llista."""
    if not data_list:
        return None
    for item in reversed(data_list):
        if item.get('value') is not None:
            return item
    return None


def _get_value_for_date(data_list, date_str):
    """Busca el valor per a una data concreta."""
    for item in data_list:
        if item['date'] == date_str:
            return item.get('value')
    return None


def _cleanup_dir(dir_path):
    """Neteja el directori temporal."""
    try:
        for f in os.listdir(dir_path):
            fp = os.path.join(dir_path, f)
            if os.path.isfile(fp):
                os.remove(fp)
        os.rmdir(dir_path)
    except Exception:
        pass


# ─── Test directe ────────────────────────────────────────────────────
if __name__ == '__main__':
    import json
    print("🌊 Provant descàrrega de dades marines...\n")
    data = fetch_all_marine_data()
    print("\n📊 Resultat:")
    print(json.dumps(data, indent=2, ensure_ascii=False))
