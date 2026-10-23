# Aprovisionamiento con AWS CloudFormation (YAML)

**Proyecto:** Control de Asistencia Académica  
**Módulo:** Módulo 2 - Infraestructura como Código (IaC)  
**Autor:** Alexander Inturias (`ainturias`)  

---

## 1. Descripción del Proyecto

Este subproyecto implementa la infraestructura completa en la nube de Amazon Web Services (AWS) utilizando **AWS CloudFormation** en formato YAML declarativo (`template.yaml`), migrando la arquitectura previamente definida en Terraform y Pulumi.

A diferencia de Terraform o Pulumi, CloudFormation es el servicio nativo de AWS para IaC:
* **Sin archivo de estado externo:** AWS mantiene el estado del ciclo de vida dentro de la entidad **Stack**.
* **Rollback automático:** Si alguno de los recursos falla durante la creación o actualización, CloudFormation revierte de forma automática todos los recursos al estado inicial.
* **Integración nativa:** Resolución dinámica de dependencias cruzadas mediante funciones intrínsecas (`!Ref`, `!Sub`, `!GetAtt`).

---

## 2. Arquitectura de Recursos

El template [`template.yaml`](template.yaml) aprovisiona los siguientes componentes:

1. **Parámetros Configurables (`Parameters`):**
   * `Proyecto`: Nombre base del proyecto (`control-asistencia-academica`).
   * `Ambiente`: Entorno de despliegue (`dev`, `qa`, `prod`).
   * `TipoInstancia`: Tamaño de máquina EC2 (`t3.micro`, `t3.small`).
   * `KeyName`: KeyPair SSH para acceso a los servidores (`diplo-mod2-key`).
   * `ImagenAmi`: AMI base de Ubuntu 22.04 LTS en `us-east-2`.
   * `RepoUrl`: Repositorio Git del código de la aplicación.

2. **Grupos de Seguridad (`Resources`):**
   * **`BackendSecurityGroup`:** Permite SSH (22), API NestJS (3000) y PostgreSQL (5432).
   * **`FrontendSecurityGroup`:** Permite SSH (22) y servidor web HTTP Nginx (80).

3. **Servidores Virtuales EC2:**
   * **`BackendInstance`:** Instancia EC2 con 20GB de disco EBS gp3 cifrado. Script `UserData` automatizado para instalar Node.js 22, Git, PostgreSQL 14, clonar el repositorio, compilar y ejecutar el backend NestJS con PM2.
   * **`FrontendInstance`:** Instancia EC2 con 15GB de disco EBS gp3 cifrado. Script `UserData` que compila el frontend React y configura Nginx como proxy inverso hacia la IP pública de la instancia Backend (`${BackendInstance.PublicIp}`).

4. **Salidas (`Outputs`):**
   * IDs e IPs públicas de ambas instancias.
   * URLs de acceso: `UrlWebFrontend` (puerto 80) y `UrlApiBackend` (puerto 3000).
   * Comandos de conexión SSH preconfigurados.

---

## 3. Instrucciones de Despliegue

### Opción A: Despliegue mediante la Consola Web de AWS (Recomendado para la clase)

1. Iniciar sesión en la consola de **AWS Management Console** y seleccionar la región **EE. UU. Este (Ohio) `us-east-2`**.
2. Navegar al servicio **CloudFormation** en la barra de búsqueda superior.
3. Hacer clic en el botón naranja **Crear pila** (Con recursos nuevos - estándar).
4. En la sección **Requisito previo**, seleccionar **La plantilla está lista**.
5. En **Especificar plantilla**, seleccionar **Cargar un archivo de plantilla**.
6. Hacer clic en **Seleccionar archivo** (o *Elegir archivo*) y seleccionar el archivo [`infra/cloudformation/template.yaml`](template.yaml).
7. Hacer clic en **Siguiente**.
8. En **Nombre de la pila**, colocar: `stack-asistencia-dev`.
9. Verificar o personalizar los parámetros (Ambiente, KeyName, etc.) y hacer clic en **Siguiente**.
10. Avanzar en las opciones de configuración y hacer clic en **Enviar**.
11. Monitorear la pestaña **Eventos** hasta que el estado cambie a **`CREATE_COMPLETE`**.
12. Ir a la pestaña **Salidas** para obtener la IP pública y URL del Frontend.

### Opción B: Despliegue mediante AWS CLI

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation/template.yaml \
  --stack-name stack-asistencia-dev \
  --parameter-overrides Ambiente=dev TipoInstancia=t3.micro KeyName=diplo-mod2-key \
  --region us-east-2
```

---

## 4. Escaneo de Seguridad y Cumplimiento

Para auditar el template de CloudFormation antes o durante la defensa, ejecutar el script unificado:

```bash
./infra/scripts/run-cfn-scans.sh
```

El script ejecuta:
1. **`cfn-lint`**: Valida sintaxis, referencias circulares y esquemas oficiales de AWS.
2. **`terrascan scan -i cft`**: Audita más de 140 políticas CIS Benchmarks (detección de puertos abiertos y tokens IMDSv2).
3. **`gitleaks`**: Detecta contraseñas o llaves secretas expuestas en los scripts `UserData`.
