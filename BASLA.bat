@echo off
title Rhythm Forge — Sunucu Baslatiliyor
echo.
echo  Rhythm Forge baslatiliyor...
echo  Sunucu: http://localhost:4174
echo.
start "" "http://localhost:4174"
nodemon --watch server.js server.js
pause
