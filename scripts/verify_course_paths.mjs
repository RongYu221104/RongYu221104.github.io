import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { courses, edges, categories } = JSON.parse(readFileSync(new URL('../src/data/course-paths.json', import.meta.url)));
const expected = `CALC|微积分|Calculus
LA|线性代数|Linear Algebra
VA|矢量分析|Vector Analysis
RA|实变函数|Real Analysis
FA|泛函分析|Functional Analysis
AA|抽象代数|Abstract Algebra
GRT|群表示论|Group Representation Theory
LGLA|Lie 群 Lie 代数|Lie Groups and Lie Algebras
ODE|常微分方程|Ordinary Differential Equations
PS|概率与统计|Probability and Statistics
MP|数学物理|Mathematical Physics
DG|微分几何|Differential Geometry
MECH|力学|Mechanics
CM|经典力学|Classical Mechanics
TH|热学|Thermology
SM|统计力学|Statistical Mechanics
EM|电磁学|Electromagnetism
OP|光学|Optics
ED|电动力学|Electrodynamics
SR|狭义相对论|Special Relativity
GR|广义相对论|General Relativity
AP|原子物理|Atomic Physics
QM|量子力学|Quantum Mechanics
QFT|量子场论|Quantum Field Theory`.split('\n');
assert.deepEqual(courses.map(c => `${c.code}|${c.titleZh}|${c.titleEn}`), expected);
const ids = new Set(courses.map(c => c.code));
const membership = [
  ['代数', 'LA AA GRT LGLA'], ['分析', 'CALC ODE VA PS RA MP FA'], ['几何', 'DG'],
  ['力学与相对论', 'MECH CM SR GR'], ['热物理', 'TH SM'], ['电磁理论', 'EM OP ED'], ['量子物理', 'AP QM QFT'],
];
assert.deepEqual(categories.map(c => [c.titleZh, c.courses.join(' ')]), membership);
assert.equal(new Set(categories.flatMap(c => c.courses)).size, 24);
for (const [row, category] of categories.entries()) {
  const members = category.courses.map(id => courses.find(c => c.code === id));
  assert(members.every(c => c.category === category.id && c.y === 50 + row * 132));
  assert(members.every((c, i) => i === 0 || c.x > members[i - 1].x), 'Left-to-right progression');
}
assert.equal(ids.size, 24);
assert.equal(new Set(edges.map(e => `${e.from}:${e.to}`)).size, edges.length, 'No duplicate or contradictory edge');
for (const edge of edges) {
  assert(ids.has(edge.from) && ids.has(edge.to));
  assert.notEqual(edge.from, edge.to);
  assert(['hard', 'soft'].includes(edge.kind));
  assert(edge.reason.length >= 12, 'Each relationship has an explanation');
}
function verifyDag(list) {
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    assert(!visiting.has(id), `Cycle through ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of list.filter(e => e.from === id)) visit(edge.to);
    visiting.delete(id); visited.add(id);
  }
  for (const id of ids) visit(id);
}
verifyDag(edges.filter(e => e.kind === 'hard'));
verifyDag(edges);
for (const a of courses) for (const b of courses) {
  if (a.code === b.code) continue;
  assert(!(a.x < b.x + 172 && a.x + 172 > b.x && a.y < b.y + 70 && a.y + 70 > b.y), `Nodes overlap: ${a.code}, ${b.code}`);
}
for (const [from, to] of [['MECH','CM'],['EM','ED'],['TH','SM'],['QM','QFT'],['SR','GR'],['DG','GR'],['LA','QM'],['MP','QM']]) {
  assert(edges.some(e => e.from === from && e.to === to && e.kind === 'hard'), `Core foundation ${from} → ${to}`);
}
const lectures = JSON.parse(readFileSync(new URL('../src/data/lectures.json', import.meta.url)));
const counts = courses.map(c => [c.code, lectures.filter(l => l.course.code === c.code && !l.retired).length]);
console.log(`PASS: seven exact categories and rows, left-to-right progression; 24 exact names; ${edges.length} unique explained edges (${edges.filter(e => e.kind === 'hard').length} hard / ${edges.filter(e => e.kind === 'soft').length} soft); both graphs acyclic; 24 non-overlapping nodes; essential directions; ${counts.filter(([, n]) => n).length} courses linked to existing lectures.`);
