# Guía Rápida de Defensa - AWS CloudFormation (Clase 6)

**Estudiante:** Alexander Inturias (`ainturias`)  
**Proyecto:** Control de Asistencia Académica  
**Módulo:** Módulo 2 - Infraestructura como Código (IaC)  

---

## 1. Resumen de lo que vas a presentar (30 segundos)

> *"Buenas noches ingeniero. Para esta entrega migramos la infraestructura a **AWS CloudFormation** utilizando un template declarativo en YAML. Aprovisionamos **2 servidores EC2** (Backend y Frontend) con discos gp3 cifrados, sus respectivos **Security Groups** con reglas de firewall para SSH, HTTP y puertos de la aplicación, y configuramos una **suite de 3 escáneres de seguridad** (`cfn-lint`, `terrascan` y `gitleaks`) para validar la infraestructura antes del despliegue."*

---

## 2. Paso a Paso para la Demostración en la Consola Web de AWS

Si el docente te pide crear o mostrar el Stack en vivo en AWS:

1. **Entrar a la Consola de AWS:**
   * Asegúrate de estar en la región **`us-east-2` (Ohio)** (arriba a la derecha).
   * En el buscador escribe **CloudFormation** y entra al servicio.

2. **Crear el Stack:**
   * Clic en el botón naranja: **Create stack** -> **With new resources (standard)**.
   * En *Prerequisite*: Deja marcado **Template is ready**.
   * En *Specify template*: Marca **Upload a template file**.
   * Clic en **Choose file** y selecciona:
     `/home/alex/Escritorio/PC-TODO/diplo-mod-2/control-asistencia-academica/infra/cloudformation/template.yaml`
   * Clic en **Next**.

3. **Parámetros del Stack:**
   * **Stack name:** `stack-asistencia-dev`
   * **Ambiente:** `dev`
   * **KeyName:** `diplo-mod2-key`
   * **TipoInstancia:** `t3.micro`
   * Clic en **Next** -> **Next** (dejar opciones por defecto) -> Clic en **Submit**.

4. **Qué mostrar mientras se crea (tarda solo ~40 segundos):**
   * Pestaña **Events**: Muestra cómo CloudFormation crea primero los Security Groups y luego las dos instancias EC2.
   * Pestaña **Resources**: Muestra que los 4 recursos (`BackendSecurityGroup`, `FrontendSecurityGroup`, `BackendInstance`, `FrontendInstance`) están creados.
   * Pestaña **Outputs**: Muestra las IPs públicas generadas.
   * **Abrir la URL Web en el navegador:** Haz clic o abre `http://<IP_PUBLICA_FRONTEND>` y se verá la página web de confirmación de Nginx activa.

---

## 3. Paso a Paso para Explicar el Código YAML (`template.yaml`)

Abre [`infra/cloudformation/template.yaml`](../infra/cloudformation/template.yaml) en tu editor y muestra sus 4 bloques principales:

1. **`Parameters` (Líneas 10 - 36):**
   > *"Hicimos el template modular y reutilizable. Permite alternar entre ambientes (`dev`, `qa`, `prod`) y cambiar el tamaño de instancia (`t3.micro`, `t3.small`) sin tocar el código fuente."*

2. **`Security Groups` (Líneas 43 - 95):**
   > *"Declaramos dos grupos de seguridad: uno para el Backend abriendo SSH (22), API NestJS (3000) y PostgreSQL (5432), y otro para el Frontend abriendo SSH (22) y HTTP (80)."*

3. **`EC2 Instances` (Líneas 97 - 165):**
   > *"Aprovisionamos las 2 máquinas con discos EBS gp3 de 20GB y 15GB con **cifrado en reposo (`Encrypted: true`)**. En el bloque `UserData` automatizamos el arranque instalando Nginx para validar la conectividad en segundos."*

4. **`Outputs` (Líneas 167 - 200):**
   > *"Exportamos las IPs públicas y los comandos SSH directos para administración."*

---

## 4. Demostración de los 3 Escáneres de Seguridad (Terminal)

Abre una terminal y ejecuta el script automatizado:

```bash
cd ~/Escritorio/PC-TODO/diplo-mod-2/control-asistencia-academica
./infra/scripts/run-cfn-scans.sh
```

Explica cada herramienta según vaya apareciendo en pantalla:

### 1. `cfn-lint` (Linter Oficial de AWS)
* **Qué hace:** Valida la sintaxis YAML y los esquemas oficiales de AWS Resource Specification.
* **Qué decir:** *"cfn-lint valida que el template cumpla al 100% con la especificación de AWS, comprobando que no existan errores de nombres, referencias nulas o tipos incompatibles. Aquí vemos que pasa con cero errores."*

### 2. `terrascan` (Cumplimiento de Políticas CIS Benchmarks)
* **Comando que corre:** `terrascan scan -i cft -f template.yaml`
* **Qué hace:** Evalúa 142 políticas de seguridad bajo el estándar CIS Benchmarks para CloudFormation.
* **Qué decir:** *"Terrascan evalúa políticas de seguridad empresarial. Nos señala 9 observaciones comunes en despliegues iniciales: nos advierte que los puertos 22 y 5432 están abiertos a internet y nos recomienda activar monitoreo detallado de CloudWatch y tokens IMDSv2."*

### 3. `gitleaks` (Secret Scanning)
* **Qué hace:** Búsqueda ultrarrápida de contraseñas, tokens y llaves API en el template.
* **Qué decir:** *"Gitleaks analiza el archivo en 15 milisegundos y confirma que no dejamos ninguna contraseña de base de datos ni token de AWS expuesto en el código."*

---

## 5. Preguntas Típicas del Docente y Respuestas Rápidas

* **P: ¿Por qué en CloudFormation no hay archivo `tfstate` como en Terraform?**
  * **R:** *"Porque CloudFormation es un servicio gestionado por AWS. AWS almacena y sincroniza el estado internamente dentro del motor del Stack, por lo que no necesitamos configurar buckets S3 ni DynamoDB para bloqueo de concurrencia."*

* **P: ¿Qué ventaja tiene CloudFormation si falla la creación de un recurso?**
  * **R:** *"Cuenta con **rollback automático**. Si la segunda máquina falla al crearse, CloudFormation destruye automáticamente los recursos creados en ese intento y deja la cuenta limpia en el estado cero, evitando costos por recursos huérfanos."*

* **P: ¿Qué es un Change Set?**
  * **R:** *"Es el equivalente a `terraform plan`. Permite ver la previsualización exacta de qué recursos se van a crear, modificar o eliminar antes de aplicar cambios a un Stack en producción."*
