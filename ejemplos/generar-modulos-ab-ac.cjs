// Genera los Excel de dos módulos distintos (moduloAB y moduloAC) en ../ejemplos
const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');
const out = path.join(__dirname, '..', 'ejemplos');

async function students(file, headers, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Estudiantes');
  ws.addRow(headers).font = { bold: true };
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

/** Fechas DD/MM/AAAA entre `from` y `to` (AAAA-MM-DD) que caen en los días de la semana indicados (0 = domingo). */
function classDates(from, to, weekdays, start, end) {
  const rows = [];
  for (let d = new Date(`${from}T12:00:00Z`); d <= new Date(`${to}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    if (!weekdays.includes(d.getUTCDay())) continue;
    const [y, m, day] = d.toISOString().slice(0, 10).split('-');
    rows.push([`${day}/${m}/${y}`, start, end]);
  }
  return rows;
}

(async () => {
  // moduloAB: lunes, miércoles y viernes de 19:00 a 22:00, del 14/10/2026 al 13/11/2026.
  await students('moduloAB_estudiantes.xlsx', ['Número de registro', 'Nombre completo', 'Correo electrónico'], [
    [2001, 'Andrés Vargas', 'andres.vargas@gmail.com'],
    [2002, 'Camila Torres', 'camila.torres@gmail.com'],
    [2003, 'Bruno Salazar', 'bruno.salazar@gmail.com'],
    [2004, 'Daniela Quispe', 'daniela.quispe@gmail.com'],
    [2005, 'Esteban Flores', 'esteban.flores@gmail.com'],
    [2006, 'Fernanda Ríos', 'fernanda.rios@gmail.com'],
    [2007, 'Gabriel Mamani', 'gabriel.mamani@gmail.com'],
    [2008, 'Helena Choque', 'helena.choque@gmail.com'],
    [2009, 'Iván Paredes', 'ivan.paredes@gmail.com'],
    [2010, 'Julia Céspedes', 'julia.cespedes@gmail.com'],
  ]);
  await sessions('moduloAB_fechas.xlsx', classDates('2026-10-14', '2026-11-13', [1, 3, 5], '19:00', '22:00'));

  // moduloAC: martes y jueves de 18:30 a 21:30, del 17/11/2026 al 17/12/2026.
  // Trae columnas extra (Teléfono y Carrera) para probar los campos adicionales.
  await students(
    'moduloAC_estudiantes.xlsx',
    ['Número de registro', 'Nombre completo', 'Correo electrónico', 'Teléfono', 'Carrera'],
    [
      [3001, 'Karen Gutiérrez', 'karen.gutierrez@gmail.com', '70011223', 'Ingeniería de Sistemas'],
      [3002, 'Leonardo Aguilar', 'leonardo.aguilar@gmail.com', '70022334', 'Ingeniería Industrial'],
      [3003, 'Mariana Rocha', 'mariana.rocha@gmail.com', '70033445', 'Administración'],
      [3004, 'Nicolás Herrera', 'nicolas.herrera@gmail.com', '70044556', 'Ingeniería de Sistemas'],
      [3005, 'Olivia Medina', 'olivia.medina@gmail.com', '70055667', 'Contaduría'],
      [3006, 'Pablo Castro', 'pablo.castro@gmail.com', '70066778', 'Ingeniería Comercial'],
      [3007, 'Renata Villca', 'renata.villca@gmail.com', '70077889', 'Derecho'],
      [3008, 'Samuel Ortiz', 'samuel.ortiz@gmail.com', '70088990', 'Ingeniería de Sistemas'],
      [3009, 'Tatiana Limachi', 'tatiana.limachi@gmail.com', '70099001', 'Psicología'],
      [3010, 'Ulises Navarro', 'ulises.navarro@gmail.com', '70100112', 'Arquitectura'],
      [3011, 'Ximena Peña', 'ximena.pena@gmail.com', '70111223', 'Economía'],
      [3012, 'Yerko Zambrana', 'yerko.zambrana@gmail.com', '70122334', 'Ingeniería Civil'],
    ],
  );
  await sessions('moduloAC_fechas.xlsx', classDates('2026-11-17', '2026-12-17', [2, 4], '18:30', '21:30'));

  console.log('Módulos AB y AC generados en', out);
})();
