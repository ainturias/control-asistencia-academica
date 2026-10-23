# Guía de Defensa Técnica - Aprovisionamiento con AWS CloudFormation y Seguridad

**Módulo 2:** Infraestructura como Código (IaC)  
**Proyecto:** Control de Asistencia Académica  
**Estudiante:** Alexander Inturias (`ainturias`)  
**Clase:** Clase 6  

---

## 1. Objetivos de la Presentación

1. **Demostrar el aprovisionamiento de la arquitectura con AWS CloudFormation:**
   * Mostrar el template declarativo en YAML ([`infra/cloudformation/template.yaml`](../infra/cloudformation/template.yaml)).
   * Explicar la gestión nativa del estado de AWS mediante **Stacks** y cómo se eliminó la necesidad de un archivo `.tfstate`.
   * Demostrar la resolución de dependencias mediante funciones intrínsecas (`!Sub`, `!Ref`, `!GetAtt`), donde el Frontend Nginx recibe automáticamente la IP pública del Backend.
2. **Demostrar la suite de escáneres de seguridad aplicados a CloudFormation:**
   * **`cfn-lint`**: Linter oficial de AWS CloudFormation para cumplimiento de esquemas.
   * **`terrascan`**: Análisis de seguridad y cumplimiento normativo **CIS Benchmarks** para templates CFT (`-i cft`).
   * **`gitleaks`**: Auditoría de prevención de fuga de secretos en scripts de automatización.

---

## 2. Comparativa Técnica: Terraform vs Pulumi vs AWS CloudFormation

Si el docente pregunta: *"¿Qué diferencias prácticas notaste al migrar tu proyecto de Terraform a CloudFormation?"*:

| Criterio | HashiCorp Terraform | Pulumi (TypeScript) | AWS CloudFormation |
| :--- | :--- | :--- | :--- |
| **Soporte Cloud** | Multicloud (AWS, Azure, GCP) | Multicloud (AWS, Azure, GCP) | Específico y optimizado para AWS |
| **Lenguaje** | HCL (HashiCorp Configuration Language) | Lenguaje de propósito general (TypeScript, Python) | YAML o JSON declarativo |
| **Manejo de Estado** | Requiere backend externo (`tfstate` en S3 / Azure Blob con Locking) | Requiere servicio Pulumi o backend local | **Totalmente gestionado por AWS** (sin archivo de estado externo) |
| **Rollback ante Fallos** | No automático (deja recursos a medio crear) | No automático por defecto | **Automático y completo** (regresa al estado cero si un recurso falla) |
| **Previsualización** | `terraform plan` | `pulumi preview` | **Change Sets** |

---

## 3. Guion Paso a Paso para la Exposición en Vivo

### Paso 1: Introducción (30 segundos)
> *"Buenas noches ingeniero, buenas noches compañeros. Para esta práctica migramos toda la infraestructura de nuestro sistema de Control de Asistencia a **AWS CloudFormation** utilizando un template declarativo en YAML. Definimos dos servidores EC2 con discos cifrados gp3, sus respectivos Security Groups y la automatización completa de despliegue de NestJS, PostgreSQL y React con Nginx."*

---

### Paso 2: Mostrar el Template en YAML (1 minuto)
Abre el archivo [`infra/cloudformation/template.yaml`](../infra/cloudformation/template.yaml) en el editor y destaca los siguientes puntos:
1. **Parámetros (`Parameters`):**
   * Señala que el template es reutilizable entre ambientes (`dev`, `qa`, `prod`) y permite cambiar el tipo de instancia (`t3.micro`, `t3.small`).
2. **Recursos (`Resources`):**
   * **Backend:** Instancia EC2 con 20GB EBS gp3 cifrado. Muestra el bloque `UserData` donde se configura memoria swap de 2GB, Node.js 22, PostgreSQL y PM2.
   * **Frontend:** Muestra la configuración de Nginx y destaca la función:
     ```yaml
     proxy_pass http://${BackendInstance.PublicIp}:3000/api/;
     ```
     > *"Lo más potente de CloudFormation es que no necesitamos conocer la IP del Backend de antemano; mediante `!Sub` y `${BackendInstance.PublicIp}`, AWS inyecta dinámicamente la IP pública en la configuración de Nginx durante el aprovisionamiento."*
3. **Salidas (`Outputs`):** Muestra las exportaciones de URLs e IPs públicas.

---

### Paso 3: Demostración en AWS (Consola o CLI) (1.5 minutos)

#### En la Consola Web de AWS:
1. Ir al servicio **CloudFormation** en la región **`us-east-2` (Ohio)**.
2. Mostrar el Stack creado (ej. `stack-asistencia-dev`) en estado **`CREATE_COMPLETE`**.
3. Ir a la pestaña **Resources**: mostrar los Security Groups y las 2 instancias EC2.
4. Ir a la pestaña **Outputs**: mostrar los valores de `UrlWebFrontend` y `IpPublicaBackend`.
5. Abrir la URL web en una pestaña del navegador para demostrar que el frontend carga y se comunica con la API.

---

### Paso 4: Demostración de los Escáneres de Seguridad (1.5 minutos)

Abre la terminal y ejecuta el script unificado de escaneo:

```bash
cd ~/Escritorio/PC-TODO/diplo-mod-2/control-asistencia-academica
./infra/scripts/run-cfn-scans.sh
```

Explica cada herramienta mientras se imprimen los resultados:

1. **`cfn-lint` (Linter Oficial de AWS):**
   > *"Primero ejecutamos `cfn-lint`. Esta herramienta valida que nuestro YAML cumpla al 100% con la especificación del Resource Specification de AWS, detectando errores de sintaxis, tipos de datos inválidos y dependencias circulares antes de tocar la nube."*
   *(Muestra que termina con éxito total y 0 errores).*

2. **`terrascan scan -i cft` (Cumplimiento de Políticas CIS):**
   > *"Luego ejecutamos `terrascan` con el flag `-i cft` (CloudFormation Template). Evalúa 142 políticas de seguridad basadas en **CIS Benchmarks** y nos señala buenas prácticas a nivel empresarial: nos recomienda activar monitoreo detallado en CloudWatch y restringir el puerto SSH 22 para que no esté abierto al mundo."*

3. **`gitleaks` (Secret Scanning):**
   > *"Por último, corremos `gitleaks`. Audita el template en apenas 20 milisegundos y nos alerta si alguien hardcodeó credenciales o tokens en los scripts de inicio."*

---

## 4. Preguntas Frecuentes del Docente y Respuestas Sugeridas

### P1: "¿Por qué CloudFormation no tiene un archivo `terraform.tfstate`?"
> **Respuesta:** *"Porque CloudFormation es un servicio gestionado (managed service) nativo de AWS. AWS mantiene internamente el grafo de dependencias y el estado del ciclo de vida dentro del motor del Stack. Esto elimina la necesidad de configurar buckets S3 y tablas DynamoDB para el bloqueo de estado (state locking) que hacíamos en Terraform."*

### P2: "¿Qué pasa si la segunda instancia EC2 falla durante la creación?"
> **Respuesta:** *"CloudFormation activa un rollback automático. Si la instancia del Frontend falla, CloudFormation destruye la instancia Backend y los Security Groups que se crearon en ese mismo proceso, devolviendo la cuenta al estado inicial limpio y evitando costos por recursos huérfanos."*

### P3: "¿Cómo previsualizas los cambios antes de desplegar en CloudFormation?"
> **Respuesta:** *"Mediante **Change Sets**. Es la funcionalidad equivalente a `terraform plan` en CloudFormation. Permite ver el diff exacto de qué recursos se agregarán, modificarán o destruirán antes de confirmar la ejecución."*
