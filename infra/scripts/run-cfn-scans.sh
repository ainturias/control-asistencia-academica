#!/usr/bin/env bash
# ==============================================================================
# Script de Escaneo de Seguridad para AWS CloudFormation (Clase 5 y 6)
# Proyecto: Control de Asistencia Academica
# Autor: ainturias
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEMPLATE_PATH="${ROOT_DIR}/infra/cloudformation/template.yaml"

COLOR_RESET="\033[0m"
COLOR_BLUE="\033[1;34m"
COLOR_GREEN="\033[1;32m"
COLOR_YELLOW="\033[1;33m"
COLOR_CYAN="\033[1;36m"

echo -e "${COLOR_BLUE}==================================================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}  SUITE DE SEGURIDAD AWS CLOUDFORMATION - DEVSECOPS (CLASE 5 & 6) ${COLOR_RESET}"
echo -e "${COLOR_BLUE}==================================================================${COLOR_RESET}"
echo -e "Template objetivo: ${TEMPLATE_PATH}"
echo ""

# 1. cfn-lint
echo -e "${COLOR_CYAN}[1/3] Ejecutando cfn-lint (Linter y Validador Oficial AWS CloudFormation)...${COLOR_RESET}"
if cfn-lint "${TEMPLATE_PATH}"; then
    echo -e "${COLOR_GREEN}✓ cfn-lint: El template cumple al 100% con la especificacion y esquemas de AWS.${COLOR_RESET}"
else
    echo -e "${COLOR_YELLOW}⚠ cfn-lint encontro advertencias o errores en el template.${COLOR_RESET}"
fi
echo ""

# 2. terrascan (CloudFormation)
echo -e "${COLOR_CYAN}[2/3] Ejecutando terrascan (Cumplimiento de Politicas CIS / OPA para CFT)...${COLOR_RESET}"
terrascan scan -i cft -f "${TEMPLATE_PATH}" || true
echo ""

# 3. gitleaks
echo -e "${COLOR_CYAN}[3/3] Ejecutando gitleaks (Secret Scanning en el Template de CloudFormation)...${COLOR_RESET}"
gitleaks detect --no-git -v -s "${TEMPLATE_PATH}" || true
echo ""

echo -e "${COLOR_GREEN}==================================================================${COLOR_RESET}"
echo -e "${COLOR_GREEN} Escaneo de CloudFormation completado.                           ${COLOR_RESET}"
echo -e "${COLOR_GREEN} Revisa docs/DEFENSA_CLASE_6.md para la guia de presentacion.     ${COLOR_RESET}"
echo -e "${COLOR_GREEN}==================================================================${COLOR_RESET}"
