"""
🌊 Copernicus Marine Data Fetcher v2
Mòdul per descarregar i processar dades marines de Copernicus Marine Service
per a la zona de L'Ametlla de Mar (gàbies d'aqüicultura Balfegó).

Versió 2 — Multi-profunditat + Biogeoquímica + Forecast
  - Dades a 5 profunditats: superfície, 10m, 20m, 30m, 40m
  - Biogeoquímica: oxigen dissolt, clorofil·la, nitrats, fosfats
  - Termoclina: Mixed Layer Depth (MLD)
  - Forecast: 3 dies enrere + 5 dies endavant

Requisits:
  - Haver fet `copernicusmarine login` prèviament
  - Dependències: copernicusmarine, xarray, netcdf4, pandas, numpy
"""

import os
import math
import tempfile
from datetime import datetime, timedelta, timezone

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

# Profunditats a extreure (metres)
DEPTHS = [0, 10, 20, 30, 40]

# Rang temporal
DAYS_BACK = 3
DAYS_FORWARD = 5


# ─── Definició de datasets de Copernicus ──────────────────────────────
DATASETS = [
    # --- Física (amb profunditat) ---
    {
        'name': 'temperature',
        'dataset_id': 'cmems_mod_med_phy-tem_anfc_4.2km_P1D-m',
        'variables': ['thetao'],
        'has_depth': True,
        'description': 'Temperatura del mar',
    },
    {
        'name': 'salinity',
        'dataset_id': 'cmems_mod_med_phy-sal_anfc_4.2km_P1D-m',
        'variables': ['so'],
        'has_depth': True,
        'description': 'Salinitat',
    },
    {
        'name': 'currents',
        'dataset_id': 'cmems_mod_med_phy-cur_anfc_4.2km_P1D-m',
        'variables': ['uo', 'vo'],
        'has_depth': True,
        'description': 'Corrents marins (u/v)',
    },
    # --- Biogeoquímica (amb profunditat) ---
    {
        'name': 'oxygen',
        'dataset_id': 'cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m',
        'variables': ['o2'],
        'has_depth': True,
        'description': 'Oxigen dissolt',
    },
    {
        'name': 'chlorophyll',
        'dataset_id': 'cmems_mod_med_bgc-pft_anfc_4.2km_P1D-m',
        'variables': ['chl'],
        'has_depth': True,
        'description': 'Clorofil·la',
    },
    {
        'name': 'nutrients',
        'dataset_id': 'cmems_mod_med_bgc-nut_anfc_4.2km_P1D-m',
        'variables': ['no3', 'po4'],
        'has_depth': True,
        'description': 'Nutrients (nitrats, fosfats)',
    },
    # --- 2D sense profunditat ---
    {
        'name': 'mixed_layer',
        'dataset_id': 'cmems_mod_med_phy-mld_anfc_4.2km-2D_PT1H-m',
        'variables': ['mlotst'],
        'has_depth': False,
        'description': 'Profunditat capa de mescla (termoclina)',
    },
]


def fetch_all_marine_data():
    """
    Descarrega totes les dades marines de Copernicus i les retorna
    com a diccionari JSON-ready amb dades multi-profunditat.
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=DAYS_BACK)
    end_date = now + timedelta(days=DAYS_FORWARD)

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

    # Paràmetres de subset
    params = {
        'dataset_id': ds_config['dataset_id'],
        'variables': ds_config['variables'],
        'minimum_longitude': ZONE['min_lon'],
        'maximum_longitude': ZONE['max_lon'],
        'minimum_latitude': ZONE['min_lat'],
        'maximum_latitude': ZONE['max_lat'],
        'start_datetime': start_date.strftime('%Y-%m-%dT00:00:00'),
        'end_datetime': end_date.strftime('%Y-%m-%dT23:59:59'),
        'output_directory': temp_dir,
        'output_filename': filename,
        'overwrite': True,
    }

    # Afegir rang de profunditat si el dataset ho suporta
    if ds_config['has_depth']:
        params['minimum_depth'] = 0
        params['maximum_depth'] = 45  # Cobreix fins a 40m + marge

    copernicusmarine.subset(**params)

    # Processament amb xarray
    result = {}
    with xr.open_dataset(filepath) as ds:
        lat_dim = _find_dim(ds, ['latitude', 'lat'])
        lon_dim = _find_dim(ds, ['longitude', 'lon'])
        dims_to_avg = [d for d in [lat_dim, lon_dim] if d is not None]

        if ds_config['has_depth'] and 'depth' in ds.dims:
            # Extreure dades a cada profunditat objectiu
            for target_depth in DEPTHS:
                ds_at_depth = ds.sel(depth=target_depth, method='nearest')

                # Mitjana espacial
                if dims_to_avg:
                    ds_mean = ds_at_depth.mean(dim=dims_to_avg, skipna=True)
                else:
                    ds_mean = ds_at_depth

                # Extreure sèrie temporal per variable
                for var in ds_config['variables']:
                    if var not in ds_mean:
                        continue
                    daily = _extract_timeseries(ds_mean[var])
                    result[f'{var}_depth{target_depth}'] = daily

        else:
            # Dades 2D (sense profunditat) — ex: MLD
            if 'depth' in ds.dims:
                ds = ds.isel(depth=0)

            if dims_to_avg:
                ds_mean = ds.mean(dim=dims_to_avg, skipna=True)
            else:
                ds_mean = ds

            for var in ds_config['variables']:
                if var not in ds_mean:
                    continue
                da = ds_mean[var]

                # Si dades horàries → remostrar a mitjana diària
                times = pd.DatetimeIndex(da.time.values)
                if len(times) > 1:
                    time_diff = (times[1] - times[0]).total_seconds()
                    if time_diff < 86400:  # Menys d'un dia → resample
                        da = da.resample(time='1D').mean()

                daily = _extract_timeseries(da)
                result[var] = daily

    # Neteja del fitxer
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception:
            pass

    return result


def _extract_timeseries(da):
    """Extreu una sèrie temporal d'un DataArray com a llista de dicts."""
    times = pd.DatetimeIndex(da.time.values)
    values = da.values.flatten()
    daily = []
    for t, v in zip(times, values):
        val = float(v) if not (np.isnan(v) if np.isscalar(v) else True) else None
        daily.append({
            'date': t.strftime('%Y-%m-%d'),
            'value': round(val, 2) if val is not None else None,
        })
    return daily


def _find_dim(ds, candidates):
    """Busca un nom de dimensió entre una llista de candidats."""
    for name in candidates:
        if name in ds.dims:
            return name
    return None


def _calculate_current(uo_val, vo_val):
    """Calcula velocitat i direcció del corrent a partir de components u/v."""
    if uo_val is None or vo_val is None:
        return None, None
    speed = math.sqrt(uo_val ** 2 + vo_val ** 2)
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
    """Construeix la resposta JSON final amb dades multi-profunditat."""
    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    response = {
        'status': 'ok',
        'version': 2,
        'last_updated': datetime.now(timezone.utc).isoformat(),
        'location': ZONE,
        'depths': DEPTHS,
        'period': {
            'start': start_date.strftime('%Y-%m-%d'),
            'end': end_date.strftime('%Y-%m-%d'),
        },
        'current': {},
        'mixed_layer_depth': None,
        'daily': [],
        'units': {
            'temperature': '°C',
            'salinity': 'PSU',
            'current_speed': 'm/s',
            'current_direction': '°',
            'oxygen': 'mmol/m³',
            'chlorophyll': 'mg/m³',
            'nitrate': 'mmol/m³',
            'phosphate': 'mmol/m³',
            'mixed_layer_depth': 'm',
        },
    }

    # ─── Dades actuals per profunditat ────────────────────────────
    for depth in DEPTHS:
        depth_key = 'surface' if depth == 0 else f'{depth}m'
        depth_data = {}

        # Temperatura
        _set_latest(depth_data, 'temperature',
                    results.get('temperature'), f'thetao_depth{depth}')
        # Salinitat
        _set_latest(depth_data, 'salinity',
                    results.get('salinity'), f'so_depth{depth}')
        # Corrents
        uo_data = _get_dataset_var(results.get('currents'), f'uo_depth{depth}')
        vo_data = _get_dataset_var(results.get('currents'), f'vo_depth{depth}')
        uo_latest = _get_latest_valid(uo_data)
        vo_latest = _get_latest_valid(vo_data)
        if uo_latest and vo_latest:
            speed, direction = _calculate_current(
                uo_latest['value'], vo_latest['value']
            )
            depth_data['current_speed'] = speed
            depth_data['current_direction'] = direction
            depth_data['current_direction_label'] = _get_direction_label(direction)
        # Oxigen
        _set_latest(depth_data, 'oxygen',
                    results.get('oxygen'), f'o2_depth{depth}')
        # Clorofil·la
        _set_latest(depth_data, 'chlorophyll',
                    results.get('chlorophyll'), f'chl_depth{depth}')
        # Nitrats
        _set_latest(depth_data, 'nitrate',
                    results.get('nutrients'), f'no3_depth{depth}')
        # Fosfats
        _set_latest(depth_data, 'phosphate',
                    results.get('nutrients'), f'po4_depth{depth}')

        response['current'][depth_key] = depth_data

    # ─── Mixed Layer Depth (termoclina) ──────────────────────────
    mld_data = _get_dataset_var(results.get('mixed_layer'), 'mlotst')
    mld_latest = _get_latest_valid(mld_data)
    if mld_latest:
        response['mixed_layer_depth'] = mld_latest['value']

    # ─── Dades diàries (merge per data, amb profunditat) ─────────
    all_dates = set()
    for ds_name, ds_data in results.items():
        if ds_data is None:
            continue
        for var_key, var_data in ds_data.items():
            for entry in var_data:
                all_dates.add(entry['date'])

    for date_str in sorted(all_dates):
        entry = {
            'date': date_str,
            'is_forecast': date_str > today_str,
        }

        # Dades per profunditat
        for depth in DEPTHS:
            depth_key = 'surface' if depth == 0 else f'{depth}m'
            depth_data = {}

            # Temperatura
            _set_for_date(depth_data, 'temperature',
                          results.get('temperature'), f'thetao_depth{depth}', date_str)
            # Salinitat
            _set_for_date(depth_data, 'salinity',
                          results.get('salinity'), f'so_depth{depth}', date_str)
            # Corrents
            uo_val = _get_value_for_date(
                _get_dataset_var(results.get('currents'), f'uo_depth{depth}'), date_str)
            vo_val = _get_value_for_date(
                _get_dataset_var(results.get('currents'), f'vo_depth{depth}'), date_str)
            if uo_val is not None and vo_val is not None:
                speed, direction = _calculate_current(uo_val, vo_val)
                depth_data['current_speed'] = speed
                depth_data['current_direction'] = direction
            # Oxigen
            _set_for_date(depth_data, 'oxygen',
                          results.get('oxygen'), f'o2_depth{depth}', date_str)
            # Clorofil·la
            _set_for_date(depth_data, 'chlorophyll',
                          results.get('chlorophyll'), f'chl_depth{depth}', date_str)
            # Nitrats
            _set_for_date(depth_data, 'nitrate',
                          results.get('nutrients'), f'no3_depth{depth}', date_str)
            # Fosfats
            _set_for_date(depth_data, 'phosphate',
                          results.get('nutrients'), f'po4_depth{depth}', date_str)

            entry[depth_key] = depth_data

        # MLD per dia
        mld_val = _get_value_for_date(
            _get_dataset_var(results.get('mixed_layer'), 'mlotst'), date_str)
        entry['mixed_layer_depth'] = mld_val

        response['daily'].append(entry)

    return response


# ─── Helpers ─────────────────────────────────────────────────────────

def _get_dataset_var(dataset_result, var_key):
    """Retorna la llista de dades per una variable, o [] si no existeix."""
    if dataset_result is None:
        return []
    return dataset_result.get(var_key, [])


def _set_latest(target_dict, field_name, dataset_result, var_key):
    """Afegeix el valor més recent d'una variable al diccionari."""
    data = _get_dataset_var(dataset_result, var_key)
    latest = _get_latest_valid(data)
    if latest:
        target_dict[field_name] = latest['value']


def _set_for_date(target_dict, field_name, dataset_result, var_key, date_str):
    """Afegeix el valor per una data al diccionari."""
    data = _get_dataset_var(dataset_result, var_key)
    val = _get_value_for_date(data, date_str)
    if val is not None:
        target_dict[field_name] = val


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
    print("🌊 Provant descàrrega de dades marines v2...\n")
    data = fetch_all_marine_data()
    print("\n📊 Resultat:")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"\n📏 Profunditats: {data.get('depths')}")
    print(f"📅 Dies amb dades: {len(data.get('daily', []))}")
    if data.get('current'):
        for dk, dv in data['current'].items():
            print(f"   {dk}: temp={dv.get('temperature', '--')}°C, "
                  f"O₂={dv.get('oxygen', '--')}")
    if data.get('mixed_layer_depth'):
        print(f"🌡️ Termoclina (MLD): {data['mixed_layer_depth']}m")
