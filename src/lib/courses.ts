import fs from 'fs';
import path from 'path';

export type Lesson = { id: string; title: string; duration: string; videoUrl: string; description?: string; notes?: string };
export type Chapter = { id: string; title: string; notesLink?: string; lessons: Lesson[] };
export type Course = { id: string; slug: string; title: string; description: string; level: string; instructor: string; cover: string; chapters: Chapter[] };
const file = path.join(process.cwd(), 'data', 'courses.json');
const seed: Course[] = [{ id: 'physics-12', slug: 'physics-class-12', title: 'Class 12 Physics: Complete Course', description: 'Build a strong foundation with clear video lessons, chapter notes and practice.', level: 'Class 12', instructor: 'Phyziks Faculty', cover: 'from-indigo-600 to-violet-700', chapters: [{ id: 'electrostatics', title: '1. Electrostatics', lessons: [{ id: 'electric-charge', title: 'Electric charge and Coulomb’s law', duration: '18 min', videoUrl: 'https://www.youtube.com/watch?v=Rj0s7iZ6bKg', description: 'Understand charge, force and the inverse-square law.' }, { id: 'electric-field', title: 'Electric field and field lines', duration: '22 min', videoUrl: '', description: 'Visualise electric fields with worked examples.' }] }, { id: 'current-electricity', title: '2. Current Electricity', lessons: [{ id: 'ohms-law', title: 'Ohm’s law and resistance', duration: '20 min', videoUrl: '', description: 'Learn circuits, resistance and practical applications.' }] }] }];
export function getCourses(): Course[] {
  // Serverless deployments have a read-only filesystem. Render the seed
  // catalogue safely when a local course data file has not been created yet.
  if (!fs.existsSync(file)) return seed;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error('Could not read course catalogue; using starter catalogue.', error);
    return seed;
  }
}
export function getCourse(slug: string) { return getCourses().find((course) => course.slug === slug); }
function saveCourses(courses: Course[]) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(courses, null, 2)); }
function requireText(value: unknown, label: string) { const text = String(value ?? '').trim(); if (!text) throw new Error(`${label} is required`); return text; }
function findCourse(courses: Course[], slug: string) { const course = courses.find((item) => item.slug === slug); if (!course) throw new Error('Course not found'); return course; }
export function addLesson(courseSlug: string, chapterTitle: string, lesson: Omit<Lesson, 'id'>) { const courses = getCourses(); const course = findCourse(courses, courseSlug); const title = requireText(chapterTitle, 'Chapter title'); let chapter = course.chapters.find((item) => item.title.toLowerCase() === title.toLowerCase()); if (!chapter) { chapter = { id: crypto.randomUUID(), title, lessons: [] }; course.chapters.push(chapter); } chapter.lessons.push({ ...lesson, id: crypto.randomUUID() }); saveCourses(courses); return course; }
export function updateCourse(slug: string, changes: Partial<Pick<Course, 'title' | 'description' | 'level' | 'instructor' | 'cover'>>) { const courses = getCourses(); const course = findCourse(courses, slug); Object.assign(course, changes); course.title = requireText(course.title, 'Course title'); saveCourses(courses); return course; }
export function addChapter(courseSlug: string, title: string, notesLink?: string) { const courses = getCourses(); const course = findCourse(courses, courseSlug); course.chapters.push({ id: crypto.randomUUID(), title: requireText(title, 'Chapter title'), notesLink: String(notesLink || '').trim(), lessons: [] }); saveCourses(courses); return course; }
export function updateChapter(courseSlug: string, chapterId: string, changes: Partial<Pick<Chapter, 'title' | 'notesLink'>>) { const courses = getCourses(); const course = findCourse(courses, courseSlug); const chapter = course.chapters.find((item) => item.id === chapterId); if (!chapter) throw new Error('Chapter not found'); Object.assign(chapter, changes); chapter.title = requireText(chapter.title, 'Chapter title'); saveCourses(courses); return course; }
export function deleteChapter(courseSlug: string, chapterId: string) { const courses = getCourses(); const course = findCourse(courses, courseSlug); const chapter = course.chapters.find((item) => item.id === chapterId); if (!chapter) throw new Error('Chapter not found'); course.chapters = course.chapters.filter((item) => item.id !== chapterId); saveCourses(courses); return course; }
export function updateLesson(courseSlug: string, lessonId: string, changes: Partial<Omit<Lesson, 'id'>>) { const courses = getCourses(); const course = findCourse(courses, courseSlug); const lesson = course.chapters.flatMap((chapter) => chapter.lessons).find((item) => item.id === lessonId); if (!lesson) throw new Error('Lesson not found'); Object.assign(lesson, changes); lesson.title = requireText(lesson.title, 'Lesson title'); saveCourses(courses); return course; }
export function deleteLesson(courseSlug: string, lessonId: string) { const courses = getCourses(); const course = findCourse(courses, courseSlug); const chapter = course.chapters.find((item) => item.lessons.some((lesson) => lesson.id === lessonId)); if (!chapter) throw new Error('Lesson not found'); chapter.lessons = chapter.lessons.filter((lesson) => lesson.id !== lessonId); saveCourses(courses); return course; }
