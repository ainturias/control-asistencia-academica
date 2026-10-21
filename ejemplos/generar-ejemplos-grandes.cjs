// Genera ejemplos grandes: 80 estudiantes y fechas Lun/Mié/Vie de fin de sep a fin de nov 2026.
const ExcelJS = require('../backend/node_modules/exceljs');
const path = require('path');

const NOMBRES = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Sofía', 'Diego', 'Valeria', 'José', 'Camila',
  'Miguel', 'Daniela', 'Jorge', 'Gabriela', 'Fernando', 'Andrea', 'Ricardo', 'Paola', 'Alejandro', 'Natalia',
  'Mauricio', 'Carla', 'Rodrigo', 'Lucía', 'Marcelo', 'Fabiola', 'Sergio', 'Mariana', 'Gonzalo', 'Ximena'];
const SEGUNDOS = ['Andrés', 'Isabel', 'Antonio', 'Fernanda', 'Alberto', 'Alejandra', 'Eduardo', 'Patricia', '', ''];
const APELLIDOS = ['Pérez', 'López', 'Gutiérrez', 'Rodríguez', 'Fernández', 'Mendoza', 'Rojas', 'Suárez',
  'Vargas', 'Quispe', 'Mamani', 'Choque', 'Flores', 'Romero', 'Justiniano', 'Áñez', 'Vaca', 'Saucedo',
  'Montaño', 'Céspedes', 'Arteaga', 'Salvatierra', 'Gil', 'Ribera', 'Paz', 'Soliz', 'Torrez', 'Zurita'];
const DOMINIOS = ['gmail.com', 'gmail.com', 'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];

const sinAcentos = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function estudiantes(cantidad) {
  const filas = [];
  const usados = new Set();
  for (let i = 0; i < cantidad; i++) {
    const n = NOMBRES[(i * 7) % NOMBRES.length];
    const s = SEGUNDOS[(i * 3) % SEGUNDOS.length];
    const a1 = APELLIDOS[(i * 5) % APELLIDOS.length];
    const a2 = APELLIDOS[(i * 11 + 3) % APELLIDOS.length];
    const nombre = [n, s, a1, a2].filter(Boolean).join(' ');
    let correo = `${sinAcentos(n)}.${sinAcentos(a1)}`.replace(/ñ/g, 'n');
    let c = correo, k = 1;
    while (usados.has(c)) c = `${correo}${++k}`;
    usados.add(c);
    filas.push([String(218040000 + i * 37 + 11), nombre, `${c}@${DOMINIOS[i % DOMINIOS.length]}`]);
  }
  return filas;
}

function fechas() {
  const filas = [];
  const d = new Date(Date.UTC(2026, 8, 28)); // lunes 28/09/2026
  const fin = new Date(Date.UTC(2026, 10, 27));
  const pad = (x) => String(x).padStart(2, '0');
  for (; d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
    const dia = d.getUTCDay(); // 1 lun, 3 mié, 5 vie, 6 sáb
    const fecha = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
    if (dia === 1 || dia === 3) filas.push([fecha, '18:00', '21:00']);
    else if (dia === 5) filas.push([fecha, '18:30', '21:30']);
    else if (dia === 6 && d.getUTCDate() % 2 === 0) filas.push([fecha, '09:00', '12:00']); // algunos sábados
  }
  return filas;
}

async function escribir(archivo, hoja, encabezado, filas, anchos) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(hoja, { views: [{ state: 'frozen', ySplit: 1 }] });
  const h = ws.addRow(encabezado);
  h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  h.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5046E5' } }));
  filas.forEach((f) => ws.addRow(f));
  anchos.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  await wb.xlsx.writeFile(path.join(__dirname, archivo));
  console.log(`${archivo}: ${filas.length} filas`);
}

(async () => {
  await escribir('estudiantes_grande.xlsx', 'Estudiantes',
    ['Número de registro', 'Nombre completo', 'Correo electrónico'], estudiantes(80), [20, 42, 38]);
  await escribir('fechas_grande.xlsx', 'Fechas de clase',
    ['Fecha', 'Hora inicio', 'Hora fin'], fechas(), [14, 12, 12]);
})();
