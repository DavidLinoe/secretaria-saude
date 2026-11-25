#!/bin/bash

# ======================================================
# BUILD DO APK ANDROID (debug) — Secretaria da Saúde
# Uso: bash scripts/build-apk.sh   (rodar de dentro de frontend/)
#
# Adaptado do build-final.sh do monorepo mobile-root, mas bem mais simples
# porque este repo é um app só (sem Nx, sem múltiplos projetos disputando
# appId/webDir): `capacitor.config.ts` já é fixo e correto, não precisa ser
# recriado a cada build. Gera um APK de DEBUG (assinado com o keystore de
# debug padrão do Android) — suficiente para instalar/testar no aparelho;
# não é o que se sobe pra Play Store (isso exigiria keystore de release,
# fora do escopo deste MVP).
# ======================================================

set -e

cd "$(dirname "$0")/.." # garante que roda a partir de frontend/, mesmo se chamado de outro lugar

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

error()   { echo -e "${RED}❌ $1${NC}"; exit 1; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo "=========================================================="
echo "🚀 BUILD APK — Secretaria da Saúde"
echo "=========================================================="

# ======================================================
# PASSO 1: Java + Android SDK
# ======================================================
info "📌 Configurando Java e Android SDK..."

# JAVA_HOME: usa o que já estiver exportado; senão procura um JDK 21 (o
# módulo Android do Capacitor 8 exige `--source 21` — JDK 17 compila com
# "invalid source release: 21"). Caminhos cobrem as duas convenções de nome
# mais comuns (Fedora: `java-21`/`java-21-openjdk`; Debian/Ubuntu:
# `java-21-openjdk-amd64`); se nenhum bater, cai pro `java` do PATH como
# último recurso (pode falhar se não for JDK 21+).
if [ -z "$JAVA_HOME" ]; then
    for candidate in /usr/lib/jvm/java-21 /usr/lib/jvm/java-21-openjdk /usr/lib/jvm/java-21-openjdk-amd64; do
        if [ -x "$candidate/bin/java" ]; then
            JAVA_HOME="$candidate"
            break
        fi
    done
fi
if [ -z "$JAVA_HOME" ]; then
    JAVA_BIN=$(command -v java) || error "Java não encontrado no PATH. Instale um JDK 21 ou exporte JAVA_HOME."
    JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$JAVA_BIN")")")"
    warning "Nenhum JDK 21 encontrado nos caminhos padrão — usando o 'java' do PATH ($JAVA_HOME). Se o build falhar com 'invalid source release: 21', instale um JDK 21 e exporte JAVA_HOME."
fi
export JAVA_HOME
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

[ -x "$JAVA_HOME/bin/java" ] || error "JAVA_HOME inválido: $JAVA_HOME (exporte JAVA_HOME apontando pro seu JDK 17+)"
"$JAVA_HOME/bin/java" -version 2>&1 | head -1
[ -d "$ANDROID_HOME" ] || error "Android SDK não encontrado em $ANDROID_HOME (exporte ANDROID_HOME)"
success "Java e Android SDK OK (JAVA_HOME=$JAVA_HOME)"

# ======================================================
# PASSO 2: URL DA API + BUILD ANGULAR
# ======================================================
# O APK roda no celular, entao "localhost" nao serve: precisa do endereco do
# backend na rede. Defina com API_URL=http://IP:3000/ ; sem isso, usa o IP da
# rede local desta maquina (celular e PC na mesma rede Wi-Fi).
# Emulador Android: API_URL=http://10.0.2.2:3000/
if [ -z "$API_URL" ]; then
    LAN_IP=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' | head -1)
    [ -n "$LAN_IP" ] || error "Nao detectei o IP da rede. Rode: API_URL=http://SEU_IP:3000/ npm run build:apk"
    API_URL="http://$LAN_IP:3000/"
fi
case "$API_URL" in */) ;; *) API_URL="$API_URL/" ;; esac
info "API do app: $API_URL (backend precisa estar rodando la: cd backend && npm run dev)"
cat > src/environments/environment.apk.ts <<ENVEOF
// GERADO por scripts/build-apk.sh - nao editar nem commitar.
export const environment = {
  production: true,
  apiUrl: '$API_URL',
};
ENVEOF

info "📌 Build Angular (produção)..."
rm -rf dist/frontend
npx ng build --configuration=apk

SOURCE_DIR="dist/frontend/browser"
[ -f "$SOURCE_DIR/index.html" ] || error "Build não gerou $SOURCE_DIR/index.html — confira o output do 'ng build' acima"
success "Build Angular OK ($SOURCE_DIR)"

# ======================================================
# PASSO 3: PLATAFORMA ANDROID (Capacitor)
# ======================================================
if [ ! -d android ]; then
    info "📌 Nenhum projeto Android ainda — rodando 'npx cap add android' (primeira vez)..."
    npx cap add android
    success "Projeto Android criado"
else
    info "📌 Projeto Android já existe — pulando 'cap add' (rode 'npx cap sync' cobre o resto)"
fi

# ======================================================
# PASSO 3.5: GARANTIR ORIENTAÇÃO PORTRAIT
# ======================================================
# Convenção do produto (app de escanear nota/estoque não faz sentido em
# paisagem). Idempotente: só mexe se ainda não houver screenOrientation.
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ] && ! grep -q "android:screenOrientation" "$MANIFEST"; then
    node - "$MANIFEST" <<'NODEEOF'
const fs = require('fs');
const file = process.argv[2];
let xml = fs.readFileSync(file, 'utf8');
xml = xml.replace(/(<activity[^>]*android:name="\.MainActivity")/,
  '$1\n            android:screenOrientation="portrait"');
fs.writeFileSync(file, xml);
console.log('   screenOrientation=portrait adicionado ao AndroidManifest.xml');
NODEEOF
fi

# ======================================================
# PASSO 4: SYNC (copia o build web pro projeto Android)
# ======================================================
info "📌 Sincronizando web build -> Android..."
npx cap sync android
success "Sync concluído"

# ======================================================
# PASSO 5: BUILD DO APK (debug)
# ======================================================
info "📌 Buildando APK (debug)..."
cd android

echo "sdk.dir=$ANDROID_HOME" > local.properties

# Mata qualquer Gradle daemon reaproveitado de uma build anterior antes de
# começar. Um daemon é um processo JVM de longa duração que guarda estado
# (caches de transform, classpath) em memória entre builds — se o projeto
# for regenerado/limpo por fora (ex.: apagar `android/` na mão, como este
# script faz) enquanto o daemon de uma build anterior ainda está vivo, ele
# serve esse estado em memória sem notar que o disco mudou, e a build
# seguinte falha (ou pior: "sucede" empacotando artefato inconsistente —
# foi exatamente isso que causou um APK que instalava mas não abria).
./gradlew --stop >/dev/null 2>&1 || true

./gradlew clean assembleDebug

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
[ -f "$APK_PATH" ] || error "APK não encontrado em $APK_PATH após o build"

cd ..

# ======================================================
# PASSO 6: COPIAR O APK PRA UM LOCAL PREVISÍVEL
# ======================================================
mkdir -p release
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FINAL_APK="release/secretaria-saude-${TIMESTAMP}.apk"
cp "android/$APK_PATH" "$FINAL_APK"
ln -sf "secretaria-saude-${TIMESTAMP}.apk" release/secretaria-saude-latest.apk
success "APK gerado: $FINAL_APK"

# ======================================================
# PASSO 7: INSTALAR NO DISPOSITIVO CONECTADO (opcional)
# ======================================================
APP_ID=$(grep -oE "appId:\s*'[^']+'" capacitor.config.ts | sed -E "s/appId:\s*'([^']+)'/\1/")

if command -v adb &> /dev/null && adb devices | grep -q "device$"; then
    info "📱 Dispositivo Android conectado — instalando..."
    adb uninstall "$APP_ID" 2>/dev/null || true
    adb install "$FINAL_APK" && success "App instalado no dispositivo!"
    adb shell monkey -p "$APP_ID" 1 >/dev/null 2>&1 || true
else
    info "Nenhum dispositivo Android conectado (adb devices) — pulei a instalação automática."
fi

echo ""
echo "=========================================================="
success "🚀 APK PRONTO: $FINAL_APK"
echo "=========================================================="
