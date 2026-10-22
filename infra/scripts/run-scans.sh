#!/usr/bin/env bash
# ==============================================================================
# Script de Ejecución de Escáneres de Seguridad DevSecOps (Clase 4)
# Proyecto: Control de Asistencia Académica
# Autor: ainturias
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

COLOR_RESET="\033[0m"
COLOR_BLUE="\033[1;34m"
COLOR_GREEN="\033[1;32m"
COLOR_YELLOW="\033[1;33m"
COLOR_CYAN="\033[1;36m"

echo -e "${COLOR_BLUE}==================================================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}    SUITE DE SEGURIDAD IaC & SECRET SCANNING - DEVSECOPS          ${COLOR_RESET}"
echo -e "${COLOR_BLUE}==================================================================${COLOR_RESET}"
echo ""

# 1. tfsec (AWS & Azure)
echo -e "${COLOR_CYAN}[1/3] Ejecutando tfsec (Análisis Estático de Seguridad IaC)...${COLOR_RESET}"
echo -e "${COLOR_YELLOW}--> Escaneando AWS (infra/aws):${COLOR_RESET}"
tfsec ./infra/aws || true
echo ""
echo -e "${COLOR_YELLOW}--> Escaneando Azure (infra/azure):${COLOR_RESET}"
tfsec ./infra/azure || true
echo ""

# 2. terrascan (AWS & Azure)
echo -e "${COLOR_CYAN}[2/3] Ejecutando terrascan (Cumplimiento de Políticas CIS/OPA)...${COLOR_RESET}"
echo -e "${COLOR_YELLOW}--> Escaneando AWS (infra/aws):${COLOR_RESET}"
terrascan scan -i terraform -d ./infra/aws || true
echo ""
echo -e "${COLOR_YELLOW}--> Escaneando Azure (infra/azure):${COLOR_RESET}"
terrascan scan -i terraform -d ./infra/azure || true
echo ""

# 3. gitleaks
echo -e "${COLOR_CYAN}[3/3] Ejecutando gitleaks (Secret Scanning en Repositorio e Historial)...${COLOR_RESET}"
gitleaks detect -v || true
echo ""

echo -e "${COLOR_GREEN}==================================================================${COLOR_RESET}"
echo -e "${COLOR_GREEN} Escaneo completado. Revisa docs/DEFENSA_CLASE_4.md para detalles. ${COLOR_RESET}"
echo -e "${COLOR_GREEN}==================================================================${COLOR_RESET}"
