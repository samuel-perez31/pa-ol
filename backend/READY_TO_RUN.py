"""Script para iniciar ambos servidores (Backend y Frontend)"""
import subprocess
import sys
import time
import os

print("=" * 60)
print("INICIANDO SISTEMA PAÑOL - Pañol Agil")
print("=" * 60)

# 1. Iniciar Backend (FastAPI + Uvicorn)
print("\n[1] Iniciando Backend FastAPI...")
backend_proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
    cwd="C:\\Users\\Lenovo76\\Documents\\pa-ol\\backend",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

# Esperar un poco para que el backend inicie
time.sleep(3)

# 2. Iniciar Frontend (Vite/React)
print("[2] Iniciando Frontend React...")
frontend_proc = subprocess.Popen(
    [sys.executable, "-m", "vite", "dev"],
    cwd="C:\\Users\\Lenovo76\\Documents\\pa-ol\\frontend",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

time.sleep(3)

print("\n" + "=" * 60)
print("SISTEMA INICIADO CORRECTAMENTE")
print("=" * 60)
print("Backend:  http://localhost:8000")
print("Frontend: http://localhost:5173 (o 5174)")
print("=" * 60)
print("Presiona Ctrl+C para detener ambos servidores")
print("=" * 60)

# Mantener vivo
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nDeteniendo servidores...")
    backend_proc.terminate()
    frontend_proc.terminate()
    backend_proc.wait()
    frontend_proc.wait()
    print("Servidores detenidos.")