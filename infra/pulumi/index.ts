import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// ─── Configuración ───
const config = new pulumi.Config();
const instanceType = config.get("instanceType") || "t3.micro";
const sshKeyPath = config.get("sshKeyPath") || path.join(os.homedir(), ".ssh", "diplo_mod2_key.pub");

// Leer la llave pública SSH
const publicKey = fs.readFileSync(sshKeyPath, "utf-8");

// ─── Par de llaves SSH en AWS ───
const keyPair = new aws.ec2.KeyPair("pulumi-diplo-key", {
    keyName: "diplo-mod2-pulumi-key",
    publicKey: publicKey,
    tags: {
        Project: "control-asistencia-academica",
        ManagedBy: "Pulumi",
    },
});

// ─── Grupo de Seguridad ───
const secGroup = new aws.ec2.SecurityGroup("pulumi-server-sg", {
    description: "Permitir SSH (22) y HTTP (80)",
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"], description: "SSH" },
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"], description: "HTTP" },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: {
        Name: "pulumi-server-sg",
        Project: "control-asistencia-academica",
        ManagedBy: "Pulumi",
    },
});

// ─── Obtener la AMI más reciente de Ubuntu 22.04 LTS ───
const ubuntuAmi = aws.ec2.getAmi({
    mostRecent: true,
    owners: ["099720109477"], // Canonical
    filters: [
        { name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"] },
        { name: "virtualization-type", values: ["hvm"] },
    ],
});

// ─── Instancia EC2 Básica ───
const server = new aws.ec2.Instance("pulumi-web-server", {
    instanceType: instanceType,
    ami: ubuntuAmi.then((ami) => ami.id),
    keyName: keyPair.keyName,
    vpcSecurityGroupIds: [secGroup.id],
    associatePublicIpAddress: true,
    userData: `#!/bin/bash
echo "=== Servidor aprovisionado con Pulumi ===" > /var/log/pulumi-init.log
apt-get update -y
apt-get install -y nginx
echo "<h1>Control de Asistencia - Aprovisionado con Pulumi</h1>" > /var/www/html/index.html
systemctl restart nginx
`,
    tags: {
        Name: "asistencia-server-pulumi",
        Project: "control-asistencia-academica",
        ManagedBy: "Pulumi",
    },
});

// ─── Outputs ───
export const instanceId = server.id;
export const publicIp = server.publicIp;
export const publicDns = server.publicDns;
export const sshCommand = pulumi.interpolate`ssh -i ~/.ssh/diplo_mod2_key ubuntu@${server.publicIp}`;
