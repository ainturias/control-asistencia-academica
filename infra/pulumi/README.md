# Aprovisionamiento con Pulumi (TypeScript)

Este subproyecto implementa Infraestructura como Código (IaC) moderna utilizando **Pulumi** con el lenguaje **TypeScript**, como alternativa y complemento a Terraform para la gestión de infraestructura en la nube.

---

## Arquitectura del Proyecto

* **`Pulumi.yaml`**: Manifiesto del proyecto Pulumi donde se define el runtime (`nodejs`) y el nombre del proyecto.
* **`Pulumi.dev.yaml`**: Configuración específica del stack `dev` (región de AWS, tipo de instancia, ruta de llave SSH).
* **`index.ts`**: Código fuente en TypeScript que declara los recursos en la nube:
  * Par de llaves SSH (`aws.ec2.KeyPair`).
  * Grupo de seguridad para puertos 22 (SSH) y 80 (HTTP) (`aws.ec2.SecurityGroup`).
  * Búsqueda de AMI de Ubuntu 22.04 LTS (`aws.ec2.getAmi`).
  * Instancia EC2 (`aws.ec2.Instance`) con script de inicialización Nginx.
  * Exports de IP pública, DNS y comando de conexión SSH.

---

## Comandos de Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar sesión en Pulumi (Modo Local sin necesidad de cuenta web):**
   ```bash
   pulumi login --local
   ```

3. **Ver vista previa de cambios (equivalente a `terraform plan`):**
   ```bash
   pulumi preview
   ```

4. **Desplegar infraestructura (equivalente a `terraform apply`):**
   ```bash
   pulumi up
   ```

5. **Destruir recursos (equivalente a `terraform destroy`):**
   ```bash
   pulumi destroy
   ```
