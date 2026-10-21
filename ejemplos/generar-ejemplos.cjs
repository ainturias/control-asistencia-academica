// Genera archivos Excel de ejemplo en ../ejemplos
const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');
const out = path.join(__dirname, '..', 'ejemplos');

async function students(file, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Estudiantes');
  ws.addRow(['Número de registro', 'Nombre completo', 'Correo electrónico']).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c) => (c.width = 30));
  await wb.xlsx.writeFile(path.join(out, file));
}

async function sessions(file, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Fechas');
  ws.addRow(['Fecha', 'Hora inicio', 'Hora fin']).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c) => (c.width = 16));
  await wb.xlsx.writeFile(path.join(out, file));
}

(async () => {
  await students('estudiantes.xlsx', [
    [1001, 'Juan Pérez', 'juan@gmail.com'],
    [1002, 'María López', 'maria@gmail.com'],
    [1003, 'Carlos Gutiérrez', 'carlos@gmail.com'],
    [1004, 'Ana Rodríguez', 'ana@gmail.com'],
    [1005, 'Luis Fernández', 'luis@gmail.com'],
    [1006, 'Sofía Mendoza', 'sofia@gmail.com'],
    [1007, 'Diego Rojas', 'diego@gmail.com'],
    [1008, 'Valeria Suárez', 'valeria@gmail.com'],
  ]);
  await sessions('fechas.xlsx', [
    ['05/10/2026', '18:00', '21:00'],
    ['07/10/2026', '18:00', '21:00'],
    ['12/10/2026', '18:00', '21:00'],
    ['14/10/2026', '18:00', '21:00'],
    ['16/10/2026', '18:00', '21:00'],
    ['19/10/2026', '18:00', '21:00'],
    ['21/10/2026', '18:00', '21:00'],
  ]);
  // Archivos con errores, para probar las validaciones (RF-11)
  await students('estudiantes_con_errores.xlsx', [
    [1001, 'Juan Pérez', 'juan@gmail.com'],
    [1001, 'Registro Duplicado', 'dup@gmail.com'],
    ['', 'Sin Registro', 'sin@gmail.com'],
    [1004, '', 'correo-invalido'],
  ]);
  await sessions('fechas_con_errores.xlsx', [
    ['05/10/2026', '18:00', '21:00'],
    ['05/10/2026', '18:00', '21:00'],
    ['31/02/2026', '18:00', '21:00'],
    ['09/10/2026', '21:00', '18:00'],
  ]);
  console.log('Ejemplos generados en', out);
})();
