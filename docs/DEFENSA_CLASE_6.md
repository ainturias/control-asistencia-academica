# Guía Rápida de Defensa - AWS CloudFormation (Clase 6)

**Estudiante:** Alexander Inturias (`ainturias`)  
**Proyecto:** Control de Asistencia Académica  
**Módulo:** Módulo 2 - Infraestructura como Código (IaC)  

---

## 1. Resumen de lo que vas a presentar (30 segundos)

> *"Buenas noches ingeniero. Para esta entrega migramos la infraestructura a **AWS CloudFormation** utilizando un template declarativo en YAML. Aprovisionamos **2 servidores EC2** (Backend y Frontend) con discos gp3 cifrados, sus respectivos **Grupos de Seguridad (Security Groups)** con reglas de firewall para SSH, HTTP y puertos de la aplicación, y configuramos una **suite de 3 escáneres de seguridad** (`cfn-lint`, `terrascan` y `gitleaks`) para validar la infraestructura antes del despliegue."*

---

## 2. Paso a Paso para la Demostración en la Consola Web de AWS (en Español)

Si el docente te pide crear o mostrar la Pila (Stack) en vivo en AWS:

1. **Entrar a la Consola de Administración de AWS:**
   * Asegúrate de estar en la región **EE. UU. Este (Ohio) `us-east-2`** (arriba a la derecha, al lado de tu nombre de usuario).
   * En el buscador de la barra superior escribe **CloudFormation** y haz clic en el servicio.

2. **Crear la Pila (Stack):**
   * Haz clic en el botón naranja: **Crear pila** -> **Con recursos nuevos (estándar)**.
   * En la sección *Requisito previo*: Deja seleccionada la opción **La plantilla está lista**.
   * En *Especificar plantilla*: Selecciona la opción **Cargar un archivo de plantilla**.
   * Haz clic en el botón **Seleccionar archivo** (o *Elegir archivo*) y busca en tu máquina:
     `/home/alex/Escritorio/PC-TODO/diplo-mod-2/control-asistencia-academica/infra/cloudformation/template.yaml`
   * Haz clic en el botón naranja inferior: **Siguiente**.

3. **Configurar los Detalles y Parámetros:**
   * **Nombre de la pila:** Escribe `stack-asistencia-dev`
   * **Ambiente:** `dev`
   * **KeyName:** `diplo-mod2-key`
   * **TipoInstancia:** `t3.micro`
   * Haz clic en **Siguiente** -> En *Opciones de la pila* deja todo por defecto y haz clic en **Siguiente** -> En la pantalla de revisión final haz clic en el botón inferior: **Enviar** (o *Crear pila*).

4. **Qué mostrar mientras se crea (tarda solo ~40 segundos):**
   * Pestaña **Eventos:** Muestra cómo CloudFormation crea primero los Grupos de Seguridad y luego las dos instancias EC2 en paralelo.
   * Pestaña **Recursos:** Muestra los 4 recursos creados con éxito (`BackendSecurityGroup`, `FrontendSecurityGroup`, `BackendInstance`, `FrontendInstance`).
   * Pestaña **Salidas:** Muestra las IPs públicas y URLs que se generaron automáticamente.
   * **Abrir la URL en el navegador:** Copia el valor de `UrlWebFrontend` (ejemplo: `http://<IP_PUBLICA>`) y ábrelo en una nueva pestaña; se verá la página de bienvenida de Nginx confirmando que el servidor está activo.

---

## 3. Paso a Paso para Explicar el Código YAML (`template.yaml`)

Abre [`infra/cloudformation/template.yaml`](../infra/cloudformation/template.yaml) en tu editor y muestra sus 4 bloques principales:

1. **Parámetros (`Parameters` - Líneas 8 a 34):**
   > *"Hicimos el template modular y reutilizable. Permite alternar entre ambientes (`dev`, `qa`, `prod`) y cambiar el tamaño de instancia (`t3.micro`, `t3.small`) directamente desde la consola sin tocar el archivo."*

2. **Grupos de Seguridad (`Security Groups` - Líneas 40 a 92):**
   > *"Declaramos dos firewalls virtuales: uno para el Backend abriendo SSH (22), API NestJS (3000) y PostgreSQL (5432), y otro para el Frontend abriendo SSH (22) y el puerto web HTTP (80)."*

3. **Instancias EC2 (`Resources` - Líneas 94 a 157):**
   > *"Aprovisionamos las 2 máquinas virtuales con discos EBS gp3 de 20GB y 15GB con **cifrado en reposo (`Encrypted: true`)**. En el bloque `UserData` automatizamos el arranque instalando Nginx para validar la conectividad en segundos."*

4. **Salidas (`Outputs` - Líneas 159 a 187):**
   > *"Exportamos las IPs públicas de ambos servidores y los comandos SSH directos listos para conectarse."*

---

## 4. Demostración de los 3 Escáneres de Seguridad (Terminal)

Abre la terminal y ejecuta el script automatizado que valida la plantilla:

```bash
cd ~/Escritorio/PC-TODO/diplo-mod-2/control-asistencia-academica
./infra/scripts/run-cfn-scans.sh
```

Explica cada herramienta según vaya apareciendo en pantalla:

### 1. `cfn-lint` (Linter Oficial de AWS)
* **Qué hace:** Valida la sintaxis YAML y los esquemas oficiales de AWS Resource Specification.
* **Qué decir:** *"cfn-lint comprueba que la plantilla cumpla al 100% con las reglas y tipos oficiales de AWS, verificando que no existan errores de nombres, referencias nulas o configuraciones incompatibles antes de tocar la nube. Como vemos, pasa con cero errores."*

### 2. `terrascan` (Cumplimiento de Políticas CIS Benchmarks)
* **Qué hace:** Evalúa 142 políticas de seguridad bajo el estándar CIS Benchmarks para CloudFormation (`-i cft`).
* **Qué decir:** *"Terrascan evalúa políticas de seguridad empresarial. Nos señala observaciones normales en despliegues iniciales: nos advierte que los puertos 22 y 5432 están abiertos a internet y nos recomienda activar monitoreo detallado de CloudWatch y tokens IMDSv2."*

### 3. `gitleaks` (Secret Scanning)
* **Qué hace:** Búsqueda ultrarrápida de contraseñas, tokens y llaves secretas en la plantilla.
* **Qué decir:** *"Gitleaks analiza el archivo en 15 milisegundos y confirma que no dejamos ninguna contraseña de base de datos ni credencial de AWS quemada en el código."*

---

## 5. Preguntas Típicas del Docente y Respuestas Rápidas

* **P: ¿Por qué en CloudFormation no hay archivo `tfstate` como en Terraform?**
  * **R:** *"Porque CloudFormation es un servicio gestionado propio de AWS. AWS almacena y sincroniza el estado internamente dentro del motor de la Pila (Stack), por lo que no necesitamos configurar buckets S3 ni bases de datos para el bloqueo de estado."*

* **P: ¿Qué ventaja tiene CloudFormation si falla la creación de un recurso?**
  * **R:** *"Cuenta con **reversión automática (Rollback)**. Si la segunda máquina falla al crearse, CloudFormation destruye automáticamente los recursos creados en ese intento y deja la cuenta limpia en el estado cero, evitando costos por recursos huérfanos."*

* **P: ¿Qué es un Conjunto de Cambios (Change Set)?**
  * **R:** *"Es el equivalente a `terraform plan`. Permite ver la previsualización exacta de qué recursos se van a crear, modificar o eliminar antes de aplicar cambios a una pila en producción."*

---

## 6. Comandos Individuales para Cada Escáner (Ejecución Paso a Paso)

Si en la defensa el docente te pide: *"No corras el script completo, corre cada herramienta una por una y explícame el comando"*, sigue este orden lógico:

```bash
# Ubícate siempre primero en la raíz del proyecto
cd ~/Escritorio/PC-TODO/diplo-mod-2/control-asistencia-academica
```

---

### Paso 1: `cfn-lint` (Linter y Validador de Sintaxis)

* **¿Por qué va de primero?**  
  Es el filtro más básico y rápido. Antes de analizar seguridad, primero debemos comprobar que la plantilla esté bien escrita, sin errores de indentación YAML ni propiedades inválidas para AWS.
* **Comando a ejecutar:**
  ```bash
  cfn-lint infra/cloudformation/template.yaml
  ```
* **¿Qué hace este comando?**  
  Compara tu archivo con la especificación oficial de AWS (*CloudFormation Resource Specification*). Revisa que los tipos de recursos existan, que los parámetros tengan tipos válidos (`String`, `AWS::EC2::Image::Id`) y que no haya referencias circulares.
* **¿Qué resultado esperar?**  
  Termina silenciosamente en menos de 1 segundo sin imprimir errores (código de salida 0), lo que significa que el template es **100% válido para AWS**.

---

### Paso 2: `terrascan` (Cumplimiento de Políticas CIS Benchmarks)

* **¿Por qué va de segundo?**  
  Una vez que sabemos que la plantilla compila, evaluamos si la arquitectura cloud cumple con las mejores prácticas de seguridad de la industria.
* **Comando a ejecutar:**
  ```bash
  terrascan scan -i cft -f infra/cloudformation/template.yaml
  ```
* **¿Qué significan las opciones del comando?**
  * `scan`: Le indica a Terrascan que inicie una auditoría.
  * `-i cft`: Especifica el tipo de tecnología (*IaC Type*): **CloudFormation Template (`cft`)**.
  * `-f infra/cloudformation/template.yaml`: Ruta exacta del archivo que queremos auditar.
* **¿Qué hace este comando?**  
  Ejecuta 142 reglas de seguridad basadas en el estándar **CIS Benchmarks** utilizando el motor Open Policy Agent (OPA).
* **¿Qué resultado esperar y qué decir?**  
  Muestra una tabla con observaciones normales de severidad Alta/Media: alerta que los puertos 22 (SSH) y 5432 (Postgres) están abiertos a `0.0.0.0/0` y sugiere activar CloudWatch Detailed Monitoring y tokens de seguridad IMDSv2.

---

### Paso 3: `gitleaks` (Secret Scanning / Detección de Credenciales)

* **¿Por qué va de tercero?**  
  Es la última barrera antes del despliegue. Evita que por descuido subamos contraseñas de bases de datos, tokens JWT o credenciales de AWS al repositorio o a la nube.
* **Comando a ejecutar:**
  ```bash
  gitleaks detect --no-git -v -s infra/cloudformation/template.yaml
  ```
* **¿Qué significan las opciones del comando?**
  * `detect`: Activa el modo de escaneo de secretos.
  * `--no-git`: Le indica que analice el archivo directamente en el disco (sin obligar a que esté en un commit previo).
  * `-v`: Modo detallado (*verbose*), muestra estadísticas de tiempo y escaneo.
  * `-s <archivo>`: Ruta del archivo específico a inspeccionar (*source*).
* **¿Qué hace este comando?**  
  Busca mediante patrones regex y cálculo de entropía de Shannon si existen llaves privadas, passwords en texto plano o API keys expuestas.
* **¿Qué resultado esperar y qué decir?**  
  Termina en 5 milisegundos mostrando `no leaks found` (0 fugas), confirmando que el código está limpio de credenciales sensibles.

---

### Tabla Resumen de Comandos Rápidos

| Orden | Herramienta | Comando para la terminal | ¿Qué valida? |
| :---: | :--- | :--- | :--- |
| **1°** | **`cfn-lint`** | `cfn-lint infra/cloudformation/template.yaml` | Sintaxis y esquemas oficiales de AWS |
| **2°** | **`terrascan`** | `terrascan scan -i cft -f infra/cloudformation/template.yaml` | Políticas de seguridad y CIS Benchmarks |
| **3°** | **`gitleaks`** | `gitleaks detect --no-git -v -s infra/cloudformation/template.yaml` | Fuga de contraseñas y llaves de acceso |

