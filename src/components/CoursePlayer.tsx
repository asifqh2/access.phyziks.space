'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Clock, List, PlayCircle } from 'lucide-react';
import type { Course, Lesson } from '@/lib/courses';

function embedUrl(url: string) {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([^?&/]+)/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : url;
}

export default function CoursePlayer({ course }: { course: Course }) {
  const allLessons = useMemo(() => course.chapters.flatMap((chapter) => chapter.lessons), [course]);
  const [lesson, setLesson] = useState<Lesson>(allLessons[0]);
  const [done, setDone] = useState<string[]>([]);
  const [showOutline, setShowOutline] = useState(false);
  const lessonIndex = allLessons.findIndex((item) => item.id === lesson.id);
  const previousLesson = allLessons[lessonIndex - 1];
  const nextLesson = allLessons[lessonIndex + 1];
  const isYouTube = /(?:youtube\.com|youtu\.be)/.test(lesson.videoUrl);

  const selectLesson = (item: Lesson) => {
    setLesson(item);
    setShowOutline(false);
  };

  return <div className="min-h-screen bg-slate-950">
    <div className="mx-auto grid max-w-7xl lg:grid-cols-[1fr_360px]">
      <main className="min-w-0 bg-white">
        <div className="aspect-video bg-slate-900">{lesson.videoUrl ? (isYouTube ? <iframe className="h-full w-full" src={embedUrl(lesson.videoUrl)} title={lesson.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <video className="h-full w-full" src={lesson.videoUrl} controls />) : <div className="flex h-full flex-col items-center justify-center text-center text-slate-300"><PlayCircle className="mb-3 h-14 w-14 text-indigo-400" /><p className="font-semibold">Video is being prepared</p><p className="mt-1 text-sm text-slate-400">Your instructor will add this lesson shortly.</p></div>}</div>
        <article className="mx-auto max-w-4xl p-6 sm:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div><Link href="/courses" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">All courses</Link><p className="mt-1 text-sm text-slate-500">{course.title}</p></div>
            <button type="button" onClick={() => setShowOutline((visible) => !visible)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 lg:hidden"><List className="h-4 w-4" />{showOutline ? 'Hide outline' : 'Course outline'}</button>
          </div>
          {showOutline && <div className="mb-8 rounded-xl bg-slate-900 p-3 text-white lg:hidden"><CourseOutline course={course} lesson={lesson} done={done} onSelect={selectLesson} /></div>}
          <p className="text-sm font-semibold text-indigo-600">Lesson {lessonIndex + 1} of {allLessons.length}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{lesson.title}</h1>
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-500"><Clock className="h-4 w-4" />{lesson.duration}</div>
          <p className="mt-7 text-base leading-7 text-slate-700">{lesson.description || 'Watch this lesson, then continue to the next item in the chapter.'}</p>
          <button onClick={() => setDone((items) => items.includes(lesson.id) ? items.filter((id) => id !== lesson.id) : [...items, lesson.id])} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"><CheckCircle2 className="h-5 w-5" />{done.includes(lesson.id) ? 'Completed' : 'Mark as complete'}</button>
          <div className="mt-10 grid grid-cols-2 gap-3 border-t border-slate-200 pt-6">
            <button type="button" disabled={!previousLesson} onClick={() => previousLesson && selectLesson(previousLesson)} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="h-4 w-4 shrink-0" /><span className="truncate">{previousLesson ? previousLesson.title : 'Previous lesson'}</span></button>
            <button type="button" disabled={!nextLesson} onClick={() => nextLesson && selectLesson(nextLesson)} className="flex min-w-0 items-center justify-end gap-2 rounded-xl bg-slate-900 px-3 py-3 text-right text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><span className="truncate">{nextLesson ? nextLesson.title : 'Course complete'}</span><ArrowRight className="h-4 w-4 shrink-0" /></button>
          </div>
        </article>
      </main>
      <aside className="hidden border-l border-slate-800 bg-slate-900 p-4 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto"><CourseOutline course={course} lesson={lesson} done={done} onSelect={selectLesson} /></aside>
    </div>
  </div>;
}

function CourseOutline({ course, lesson, done, onSelect }: { course: Course; lesson: Lesson; done: string[]; onSelect: (item: Lesson) => void }) {
  return <><div className="flex items-center justify-between px-2 py-3"><h2 className="text-lg font-bold">Course content</h2><span className="text-xs text-slate-400">{done.length}/{course.chapters.flatMap((chapter) => chapter.lessons).length} complete</span></div>{course.chapters.map((chapter) => <details key={chapter.id} open className="border-t border-slate-800"><summary className="flex cursor-pointer list-none items-center justify-between px-2 py-4 font-semibold"><span>{chapter.title}</span><ChevronDown className="h-4 w-4" /></summary><div className="pb-2">{chapter.lessons.map((item) => <button key={item.id} onClick={() => onSelect(item)} className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-sm ${lesson.id === item.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><PlayCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{item.title}<span className="mt-1 block text-xs opacity-70">{item.duration}</span></span>{done.includes(item.id) && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}</button>)}</div></details>)}</>;
}
