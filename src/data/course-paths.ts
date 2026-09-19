import records from './course-paths.json';

export type Course = typeof records.courses[number];
export type CourseEdge = typeof records.edges[number];
export const courses = records.courses;
export const courseCategories = records.categories;
export const categoryById = new Map(courseCategories.map(category => [category.id, category]));
export const graphSize = { width: 1660, height: 984, nodeWidth: 172, nodeHeight: 70, rowHeight: 132 };
export const courseEdges = records.edges;
export const courseByCode = new Map(courses.map(course => [course.code, course]));

/** Direction is always foundation → destination; traversal also guards malformed cycles. */
export function relatedCourses(code: string, edges: CourseEdge[], direction: 'up' | 'down', recursive = false): Set<string> {
  const found = new Set<string>();
  const pending = [code];
  while (pending.length) {
    const current = pending.shift();
    for (const edge of edges) {
      if ((direction === 'up' ? edge.to : edge.from) !== current) continue;
      const next = direction === 'up' ? edge.from : edge.to;
      if (next === code || found.has(next)) continue;
      found.add(next);
      if (recursive) pending.push(next);
    }
  }
  return found;
}
