#!/bin/bash

# LinkedIn Feed Cleaner - Demo Test Script
# Bu script demo sayfasını başlatır

echo "🚀 LinkedIn Feed Cleaner - Demo Test"
echo "======================================"
echo ""

# Extension klasörüne git
cd "$(dirname "$0")/extension" || exit

# Port kontrolü
PORT=8000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port $PORT zaten kullanımda!"
    echo "Lütfen başka bir port seçin veya mevcut server'ı durdurun."
    exit 1
fi

# Python kontrolü
if command -v python3 &> /dev/null; then
    echo "✅ Python3 bulundu"
    echo "📂 Demo sayfası başlatılıyor..."
    echo ""
    echo "🌐 Tarayıcıda şu adrese gidin:"
    echo "   http://localhost:$PORT/demo/demo.html"
    echo ""
    echo "⏹️  Durdurmak için Ctrl+C'ye basın"
    echo ""
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "✅ Python bulundu"
    echo "📂 Demo sayfası başlatılıyor..."
    echo ""
    echo "🌐 Tarayıcıda şu adrese gidin:"
    echo "   http://localhost:$PORT/demo/demo.html"
    echo ""
    echo "⏹️  Durdurmak için Ctrl+C'ye basın"
    echo ""
    python -m SimpleHTTPServer $PORT 2>/dev/null || python -m http.server $PORT
else
    echo "❌ Python bulunamadı!"
    echo ""
    echo "Alternatif: Node.js ile çalıştırabilirsiniz:"
    echo "  npx http-server -p $PORT"
    exit 1
fi

