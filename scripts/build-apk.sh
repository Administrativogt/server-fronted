#!/usr/bin/env bash
# Compila el APK de la app móvil con versión y nombre únicos.
#
#   bash scripts/build-apk.sh <modo> [--no-bump]
#
#   modo: mobile        → emulador Android contra el backend local (10.0.2.2)
#         mobile-device → teléfonos por Wi-Fi contra el backend local (IP de la Mac)
#         mobile-prod   → producción (administrativogt.com, datos REALES)
#
# Cada compilación sube la versión en mobile-version.json (versionCode +1 y el
# último número de versionName +1) salvo con --no-bump, y deja el APK en
# dist-apk/administrativo-v<versión>-<code>-<entorno>.apk.
set -euo pipefail

MODE="${1:-}"
BUMP=true
[ "${2:-}" = "--no-bump" ] && BUMP=false

case "$MODE" in
  mobile) LABEL=emulador ;;
  mobile-device) LABEL=pruebas ;;
  mobile-prod) LABEL=prod ;;
  *) echo "uso: bash scripts/build-apk.sh mobile|mobile-device|mobile-prod [--no-bump]"; exit 1 ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VFILE=mobile-version.json

if $BUMP; then
  node -e '
    const fs = require("fs");
    const v = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const p = v.versionName.split(".").map(Number);
    p[p.length - 1] += 1;
    v.versionName = p.join(".");
    v.versionCode += 1;
    fs.writeFileSync(process.argv[1], JSON.stringify(v, null, 2) + "\n");
  ' "$VFILE"
fi
NAME=$(node -p 'require("./mobile-version.json").versionName')
CODE=$(node -p 'require("./mobile-version.json").versionCode')

# Aviso si la IP de la Mac ya no es la del build Wi-Fi (los teléfonos no conectarían)
if [ "$MODE" = mobile-device ]; then
  IP=$(ipconfig getifaddr en0 2>/dev/null || true)
  if [ -n "$IP" ] && ! grep -q "$IP" .env.mobile-device; then
    echo "⚠️  La IP de la Mac es $IP pero .env.mobile-device apunta a otra:"
    grep VITE_API_URL .env.mobile-device
    echo "   Actualiza .env.mobile-device y network_security_config.xml antes de compilar."
    exit 1
  fi
fi

echo "▶ Compilando v$NAME ($CODE) — $LABEL"
npx vite build --config vite.mobile.config.ts --mode "$MODE"
npx cap sync android
(cd android && JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}" ./gradlew assembleDebug -q)

mkdir -p dist-apk
OUT="dist-apk/administrativo-v${NAME}-${CODE}-${LABEL}.apk"
cp android/app/build/outputs/apk/debug/app-debug.apk "$OUT"
echo "✔ $ROOT/$OUT"
