@echo off
title SE7VEN ENERGIA - Servidor
color 0A
echo =========================================
echo ⚡ SE7VEN ENERGIA - Servidor
echo =========================================
echo.
echo 📁 Pasta: C:\Users\pc\Desktop\SE7VEN_Orcamentos
echo 🌐 Acesse: http://localhost:8000
echo.
echo 📱 No celular: http://SEU_IP:8000
echo.
echo 🔍 Para descobrir o IP: ipconfig
echo.
echo =========================================
echo Pressione CTRL+C para parar
echo =========================================
echo.
python -m http.server 8000
pause
