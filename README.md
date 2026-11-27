# Root Probe — Soil Intelligence

Dashboard for the Root Probe prototype: two soil-moisture probes, DHT11 air temperature/humidity, ESP32-S3 and Supabase.

## GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main**, folder **/(root)**, then Save.
4. Wait for GitHub Pages to publish the site.

## Supabase
The dashboard reads the latest 30 records from `public.root_probe_data` every 5 seconds. It expects:
- `soil_top_raw`, `soil_bottom_raw`
- `soil_top_percent`, `soil_bottom_percent` (optional; if null, the dashboard estimates them)
- `temperature`, `air_humidity`
- `created_at`

The browser uses the Supabase publishable key. Keep secret/service-role keys out of this repository. Row Level Security must remain enabled and policies should be reviewed before production use.

## Temporary moisture estimate
Until each probe is calibrated independently, the dashboard uses a provisional mapping: ADC 4095 = 0% and ADC 1800 = 100%. These are not calibrated soil-moisture measurements. Update the two calibration objects in `app.js` after taking dry and wet reference readings.

## Hardware pin map
- ESP32-S3 N16R8
- Top soil sensor AO → GPIO 4
- Bottom soil sensor AO → GPIO 6
- DHT11 DATA → GPIO 5
- Sensor power → 3.3V; common GND
