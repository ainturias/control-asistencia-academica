# Guía de Defensa Técnica - Seguridad en IaC y Cadena de Suministro DevSecOps

**Módulo 2:** Infraestructura como Código (IaC)  
**Proyecto:** Control de Asistencia Académica  
**Estudiante:** Alexander Inturias (`ainturias`)  
**Fecha:** Octubre 2026  

---

## 1. Contexto y Justificación de las Herramientas

En la **Clase 4**, el docente explicó el diagrama integral de la **Cadena de Suministro de Software DevSecOps (Software Supply Chain Security)** y realizó demostraciones prácticas de `TFLint` (linter de reglas básicas de Terraform) y `Checkov` (escáner general). 

Como parte del requerimiento práctico para la siguiente sesión, se solicitó la implementación de **3 escáneres adicionales** que validen la seguridad de la infraestructura y protejan la cadena de suministro sin solapar herramientas de otros módulos (como escaneo de imágenes Docker o dependencias de aplicación, las cuales corresponden a módulos posteriores).

Las 3 herramientas seleccionadas e integradas son:

| Herramienta | Tipo / Categoría | Eslabón en la Cadena DevSecOps | ¿Qué valida específicamente? |
| :--- | :--- | :--- | :--- |
| **`tfsec`** *(Aqua Security)* | **IaC Static Security Analysis** | Fase 5: Análisis estático de código IaC antes de `plan` / `apply` | Malas configuraciones críticas de arquitectura: puertos abiertos (`0.0.0.0/0`), falta de cifrado en reposo (EBS/Storage), ausencia de tokens IMDSv2. |
| **`terrascan`** *(Tenable)* | **Policy as Code & Compliance** | Fase 7: Gobernanza y Cumplimiento de Políticas (Rego/OPA) | Cumplimiento de estándares y marcos normativos internacionales (**CIS Benchmarks**, NIST) mediante políticas declarativas con motor Open Policy Agent. |
| **`gitleaks`** *(Gitleaks)* | **Secret Scanning** | Fase 6: Detección y prevención de fuga de credenciales | Búsqueda profunda de secretos quemados en el código y en todo el historial de Git (llaves AWS, Azure tokens, JWT secrets, contraseñas). |

---

## 2. ¿Es necesario "dañar" un archivo a propósito para la defensa?

**No es necesario dañar ningún archivo.**

En entornos reales de nube, los despliegues iniciales suelen tener configuraciones permisivas para facilitar pruebas de conectividad (por ejemplo, permitir SSH en el puerto 22 a internet o pasar variables de entorno al script de inicio). 

Nuestra infraestructura de AWS y Azure **ya contiene hallazgos técnicos 100% auténticos** que permiten demostrar el poder de cada escáner sin recurrir a simulaciones artificiales:
* **`tfsec`** detecta **11 problemas en AWS** y **7 en Azure** (puertos abiertos al mundo, discos sin cifrar, falta de IMDSv2).
* **`terrascan`** detecta **8 violaciones de políticas CIS en AWS** y **2 en Azure** (falta de monitoreo detallado, NSG no asociado a subnet).
* **`gitleaks`** detecta **3 secretos reales** en el repositorio (el `JWT_SECRET` en los scripts de provisionamiento y un token en el README).

Defender con hallazgos reales demuestra madurez técnica y comprensión profunda de los riesgos inherentes al aprovisionamiento cloud.

---

## 3. Guion Paso a Paso para la Presentación en Vivo

A continuación tienes la estructura exacta para exponer ante el ingeniero y tus compañeros:

### Paso 1: Introducción (30 segundos)
> *"Buenas noches ingeniero, buenas noches compañeros. Para esta práctica de seguridad en Infraestructura como Código, integramos 3 escáneres especializados que cubren diferentes fases de la cadena de suministro DevSecOps: `tfsec` para análisis de seguridad estática en Terraform, `terrascan` para cumplimiento de políticas CIS y OPA, y `gitleaks` para la detección de secretos y credenciales en el código y en el historial."*

---

### Paso 2: Demostración de `tfsec` (Fase de Análisis Estático de IaC)

#### Comando a ejecutar en la terminal:
```bash
# Ubicarse en la raíz del proyecto
cd ~/Escritorio/PC-TODO/diplo-mod-2/control-asistencia-academica

# Escanear la infraestructura de AWS
tfsec ./infra/aws
```

*(Opcional: Escanear Azure con `tfsec ./infra/azure`)*

#### Qué explicar al docente mientras se ven los resultados:
1. **Qué hace la herramienta:** *"tfsec analiza nuestros archivos `.tf` sin necesidad de conectarse a la nube ni de ejecutar `terraform init/plan`. Trabaja de forma estática en cuestión de milisegundos."*
2. **Hallazgos clave que muestra la pantalla:**
   * **Reglas de Security Group permisivas (`aws-ec2-no-public-ingress-sgr`):** Señala que el puerto 22 (SSH) está expuesto a `0.0.0.0/0`. Explicar: *"Esto representa un riesgo crítico porque expone el servidor a ataques de fuerza bruta y escaneo masivo desde internet. En un entorno corporativo se debe restringir a una IP de VPN o Bastion Host."*
   * **Falta de cifrado en reposo (`aws-ec2-enable-at-rest-encryption`):** Señala que el volumen EBS raíz no tiene cifrado activado.
   * **Falta de IMDSv2 (`aws-ec2-enforce-http-token-imds`):** Explicar: *"Detecta que no exigimos tokens de sesión para el servicio de metadatos de EC2, lo cual previene ataques de SSRF (Server-Side Request Forgery) que comprometan credenciales temporales de IAM."*

---

### Paso 3: Demostración de `terrascan` (Fase de Cumplimiento Normativo / Policy as Code)

#### Comando a ejecutar en la terminal:
```bash
# Escanear infraestructura de AWS
terrascan scan -i terraform -d ./infra/aws

# Escanear infraestructura de Azure
terrascan scan -i terraform -d ./infra/azure
```

#### Qué explicar al docente mientras se ven los resultados:
1. **Diferencia frente a un linter tradicional:** *"A diferencia de un linter sintáctico, `terrascan` funciona con el motor Open Policy Agent (OPA) y políticas escritas en lenguaje Rego. Su objetivo no es ver si el código compila, sino si cumple con marcos regulatorios como **CIS Benchmarks** y **NIST**."*
2. **Hallazgos clave en AWS (8 violaciones detectadas):**
   * **Monitoreo detallado (`Ensure that detailed monitoring is enabled for EC2 instances`):** *"Exige activar CloudWatch detailed monitoring para tener métricas de 1 minuto en lugar de 5 minutos, vital para detección de incidentes en tiempo real."*
   * **Restricción de puertos específicos:** Detecta puertos 22, 80 y 3000 sin segmentación estricta.
3. **Hallazgos clave en Azure:**
   * Señala la ausencia de un Resource Lock en el Resource Group para prevenir borrados accidentales en producción.

---

### Paso 4: Demostración de `gitleaks` (Fase de Detección de Secretos)

#### Comando a ejecutar en la terminal:
```bash
# Escanear el repositorio completo y su historial de Git
gitleaks detect -v
```

#### Qué explicar al docente mientras se ven los resultados:
1. **El peligro que mitiga:** *"Como mencionó el ingeniero en la clase sobre el caso de Hugging Face y las fugas de llaves en repositorios públicos, uno de los errores más graves en DevSecOps es subir credenciales al código de infraestructura."*
2. **Hallazgos detectados en vivo:**
   * Detecta `JWT_SECRET=diplomado-devsecops-secreto-2026` dentro del bloque `user_data` de `infra/aws/main.tf` y `infra/azure/main.tf`.
   * Detecta un token de ejemplo en la documentación.
3. **Lección DevSecOps:** *"Gitleaks nos alerta que pasar secretos en texto plano mediante scripts de `user_data` es una mala práctica porque queda expuesto en la consola de AWS/Azure y en el historial de Git. La solución correcta que implementaremos es desacoplar los secretos hacia Azure Key Vault o AWS Secrets Manager."*

---

### Paso 5: Demostración Opcional (Simulación de Inyección de Credenciales)
Si el docente pide ver cómo reacciona la herramienta en el flujo de trabajo ante un nuevo error:
```bash
# Simular que un desarrollador crea un archivo con una credencial de prueba
echo 'AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"' > test_secret.tf

# Escanear archivos sin commitear
gitleaks detect --no-git -v

# Limpiar el archivo de prueba
rm test_secret.tf
```
*Gitleaks detectará la regla `aws-secret-access-key` inmediatamente en milisegundos.*

---

## 4. Preguntas Frecuentes del Docente y Respuestas Sugeridas

### P1: "¿Por qué usar `tfsec` si ya tenemos `Checkov`?"
> **Respuesta:** *"Checkov es un escáner multipropósito muy potente que abarca múltiples tecnologías (Kubernetes, ARM, CloudFormation, Terraform). Sin embargo, `tfsec` está ultra-optimizado específicamente para Terraform: es un binario nativo en Go que se ejecuta en milisegundos (menos de 20ms en nuestro proyecto frente a los 10-15 segundos que puede tomar Checkov), lo que lo hace perfecto para hooks de pre-commit de desarrolladores donde la velocidad es crítica."*

### P2: "¿Qué valor agrega `terrascan` sobre los demás?"
> **Respuesta:** *"Terrascan se basa en OPA (Open Policy Agent) y políticas en Rego. Esto permite a una empresa crear sus propias políticas internas corporativas (por ejemplo: 'ningún recurso puede crearse sin el tag CostCenter' o 'ningún disco puede medir más de 50GB sin aprobación previa') y validarlas de manera homogénea tanto en Terraform como en Kubernetes y Helm."*

### P3: "¿En qué etapa del pipeline CI/CD colocarías cada uno?"
> **Respuesta:** 
> * **Pre-commit / IDE local:** `gitleaks` y `tfsec` (para que el desarrollador reciba feedback instantáneo antes de hacer `git push`).
> * **Pull Request en GitHub Actions:** `gitleaks` bloqueando el merge si hay secretos + `tfsec` y `terrascan` generando reportes de cumplimiento.
> * **Pipeline CD antes del `terraform apply`:** Bloqueo estricto si existen violaciones de severidad `CRITICAL` o `HIGH` según las políticas de la organización.

---

## 5. Resumen de Comandos Rápidos

| Herramienta | Comando Rápido |
| :--- | :--- |
| **tfsec (AWS)** | `tfsec ./infra/aws` |
| **tfsec (Azure)** | `tfsec ./infra/azure` |
| **terrascan (AWS)** | `terrascan scan -i terraform -d ./infra/aws` |
| **terrascan (Azure)** | `terrascan scan -i terraform -d ./infra/azure` |
| **gitleaks** | `gitleaks detect -v` |
