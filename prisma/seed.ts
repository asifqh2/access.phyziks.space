import 'dotenv/config';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — cannot run seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log('🌱 Seeding database…');

  // ── Legacy starter models (keep so existing seed infra doesn't break) ─────
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', name: 'Alice Instructor' },
  });
  await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', name: 'Bob Student' },
  });
  await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: { email: 'carol@example.com', name: 'Carol Admin' },
  });
  await prisma.post.upsert({
    where: { id: 1 },
    update: {},
    create: { title: 'Welcome to Physics – Class 11', content: 'Start with Chapter 1.', published: true, authorId: alice.id },
  });

  // ── LMS Classes ───────────────────────────────────────────────────────────
  const class11 = await prisma.lmsClass.upsert({
    where: { slug: 'class-11' },
    update: {},
    create: { name: 'Class 11', slug: 'class-11', isActive: true, sortOrder: 1 },
  });
  const class12 = await prisma.lmsClass.upsert({
    where: { slug: 'class-12' },
    update: {},
    create: { name: 'Class 12', slug: 'class-12', isActive: true, sortOrder: 2 },
  });

  // ── Subjects ─────────────────────────────────────────────────────────────
  const physics11 = await prisma.subject.upsert({
    where: { classId_slug: { classId: class11.id, slug: 'physics' } },
    update: {},
    create: { classId: class11.id, name: 'Physics', slug: 'physics', isActive: true, sortOrder: 1 },
  });
  const chem11 = await prisma.subject.upsert({
    where: { classId_slug: { classId: class11.id, slug: 'chemistry' } },
    update: {},
    create: { classId: class11.id, name: 'Chemistry', slug: 'chemistry', isActive: true, sortOrder: 2 },
  });
  const maths11 = await prisma.subject.upsert({
    where: { classId_slug: { classId: class11.id, slug: 'mathematics' } },
    update: {},
    create: { classId: class11.id, name: 'Mathematics', slug: 'mathematics', isActive: true, sortOrder: 3 },
  });
  const physics12 = await prisma.subject.upsert({
    where: { classId_slug: { classId: class12.id, slug: 'physics' } },
    update: {},
    create: { classId: class12.id, name: 'Physics', slug: 'physics', isActive: true, sortOrder: 1 },
  });
  const chem12 = await prisma.subject.upsert({
    where: { classId_slug: { classId: class12.id, slug: 'chemistry' } },
    update: {},
    create: { classId: class12.id, name: 'Chemistry', slug: 'chemistry', isActive: true, sortOrder: 2 },
  });
  const maths12 = await prisma.subject.upsert({
    where: { classId_slug: { classId: class12.id, slug: 'mathematics' } },
    update: {},
    create: { classId: class12.id, name: 'Mathematics', slug: 'mathematics', isActive: true, sortOrder: 3 },
  });

  // ── Chapters (Physics Class 11) ───────────────────────────────────────────
  const chapterDefs11Physics = [
    { slug: 'chapter-1-physical-world',        name: 'Chapter 1: Physical World',                            isFree: true,  sortOrder: 1  },
    { slug: 'chapter-2-units-measurements',    name: 'Chapter 2: Units and Measurements',                    isFree: false, sortOrder: 2  },
    { slug: 'chapter-3-motion-straight-line',  name: 'Chapter 3: Motion in a Straight Line',                 isFree: false, sortOrder: 3  },
    { slug: 'chapter-4-motion-plane',          name: 'Chapter 4: Motion in a Plane',                         isFree: false, sortOrder: 4  },
    { slug: 'chapter-5-laws-of-motion',        name: 'Chapter 5: Laws of Motion',                            isFree: false, sortOrder: 5  },
    { slug: 'chapter-6-work-energy-power',     name: 'Chapter 6: Work, Energy and Power',                    isFree: false, sortOrder: 6  },
    { slug: 'chapter-7-system-particles',      name: 'Chapter 7: System of Particles and Rotational Motion', isFree: false, sortOrder: 7  },
    { slug: 'chapter-8-gravitation',           name: 'Chapter 8: Gravitation',                               isFree: false, sortOrder: 8  },
    { slug: 'chapter-9-mechanical-properties', name: 'Chapter 9: Mechanical Properties of Solids',           isFree: false, sortOrder: 9  },
    { slug: 'chapter-10-fluids',               name: 'Chapter 10: Mechanical Properties of Fluids',          isFree: false, sortOrder: 10 },
    { slug: 'chapter-11-thermal-properties',   name: 'Chapter 11: Thermal Properties of Matter',             isFree: false, sortOrder: 11 },
    { slug: 'chapter-12-thermodynamics',       name: 'Chapter 12: Thermodynamics',                           isFree: false, sortOrder: 12 },
    { slug: 'chapter-13-kinetic-theory',       name: 'Chapter 13: Kinetic Theory',                           isFree: false, sortOrder: 13 },
    { slug: 'chapter-14-oscillations',         name: 'Chapter 14: Oscillations',                             isFree: false, sortOrder: 14 },
    { slug: 'chapter-15-waves',                name: 'Chapter 15: Waves',                                     isFree: false, sortOrder: 15 },
    { slug: 'chapter-16-electric-charges',     name: 'Chapter 16: Electric Charges and Fields (Preview)',    isFree: false, sortOrder: 16 },
    { slug: 'chapter-17-current-electricity',  name: 'Chapter 17: Current Electricity (Preview)',            isFree: false, sortOrder: 17 },
    { slug: 'chapter-18-moving-charges',       name: 'Chapter 18: Moving Charges and Magnetism (Preview)',   isFree: false, sortOrder: 18 },
    { slug: 'chapter-19-optics-preview',       name: 'Chapter 19: Ray Optics — Introduction (Preview)',      isFree: false, sortOrder: 19 },
    { slug: 'chapter-20-modern-physics',       name: 'Chapter 20: Modern Physics — Introduction (Preview)',  isFree: false, sortOrder: 20 },
  ];

  const physics11Chapters: Record<string, string> = {};
  for (const ch of chapterDefs11Physics) {
    const record = await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId: physics11.id, slug: ch.slug } },
      update: {},
      create: { subjectId: physics11.id, ...ch },
    });
    physics11Chapters[ch.slug] = record.id;
  }

  // ── Chapters (Chemistry Class 11) ─────────────────────────────────────────
  const chapterDefs11Chem = [
    { slug: 'chem-1-basic-concepts',          name: 'Chapter 1: Some Basic Concepts of Chemistry',          isFree: true,  sortOrder: 1  },
    { slug: 'chem-2-structure-atom',          name: 'Chapter 2: Structure of the Atom',                     isFree: false, sortOrder: 2  },
    { slug: 'chem-3-periodic-table',          name: 'Chapter 3: Classification of Elements and Periodicity',isFree: false, sortOrder: 3  },
    { slug: 'chem-4-chemical-bonding',        name: 'Chapter 4: Chemical Bonding and Molecular Structure',  isFree: false, sortOrder: 4  },
    { slug: 'chem-5-states-of-matter',        name: 'Chapter 5: States of Matter',                          isFree: false, sortOrder: 5  },
    { slug: 'chem-6-thermodynamics',          name: 'Chapter 6: Thermodynamics',                            isFree: false, sortOrder: 6  },
    { slug: 'chem-7-equilibrium',             name: 'Chapter 7: Equilibrium',                               isFree: false, sortOrder: 7  },
    { slug: 'chem-8-redox-reactions',         name: 'Chapter 8: Redox Reactions',                           isFree: false, sortOrder: 8  },
    { slug: 'chem-9-hydrogen',                name: 'Chapter 9: Hydrogen',                                  isFree: false, sortOrder: 9  },
    { slug: 'chem-10-s-block',                name: 'Chapter 10: The s-Block Elements',                     isFree: false, sortOrder: 10 },
    { slug: 'chem-11-p-block',                name: 'Chapter 11: The p-Block Elements',                     isFree: false, sortOrder: 11 },
    { slug: 'chem-12-organic-basic',          name: 'Chapter 12: Organic Chemistry — Basic Principles',     isFree: false, sortOrder: 12 },
    { slug: 'chem-13-hydrocarbons',           name: 'Chapter 13: Hydrocarbons',                             isFree: false, sortOrder: 13 },
    { slug: 'chem-14-environmental',          name: 'Chapter 14: Environmental Chemistry',                  isFree: false, sortOrder: 14 },
    { slug: 'chem-15-solutions',              name: 'Chapter 15: Solutions',                                isFree: false, sortOrder: 15 },
    { slug: 'chem-16-electrochemistry',       name: 'Chapter 16: Electrochemistry',                         isFree: false, sortOrder: 16 },
    { slug: 'chem-17-chemical-kinetics',      name: 'Chapter 17: Chemical Kinetics',                        isFree: false, sortOrder: 17 },
    { slug: 'chem-18-surface-chemistry',      name: 'Chapter 18: Surface Chemistry',                        isFree: false, sortOrder: 18 },
    { slug: 'chem-19-coordination',           name: 'Chapter 19: Coordination Compounds',                   isFree: false, sortOrder: 19 },
    { slug: 'chem-20-biomolecules',           name: 'Chapter 20: Biomolecules',                             isFree: false, sortOrder: 20 },
  ];

  for (const ch of chapterDefs11Chem) {
    await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId: chem11.id, slug: ch.slug } },
      update: {},
      create: { subjectId: chem11.id, ...ch },
    });
  }

  // ── Chapters (Mathematics Class 11) ───────────────────────────────────────
  const chapterDefs11Maths = [
    { slug: 'math-1-sets',                    name: 'Chapter 1: Sets',                                      isFree: true,  sortOrder: 1  },
    { slug: 'math-2-relations-functions',     name: 'Chapter 2: Relations and Functions',                   isFree: false, sortOrder: 2  },
    { slug: 'math-3-trigonometry',            name: 'Chapter 3: Trigonometric Functions',                   isFree: false, sortOrder: 3  },
    { slug: 'math-4-complex-numbers',         name: 'Chapter 4: Complex Numbers and Quadratic Equations',   isFree: false, sortOrder: 4  },
    { slug: 'math-5-linear-inequalities',     name: 'Chapter 5: Linear Inequalities',                       isFree: false, sortOrder: 5  },
    { slug: 'math-6-permutations',            name: 'Chapter 6: Permutations and Combinations',             isFree: false, sortOrder: 6  },
    { slug: 'math-7-binomial-theorem',        name: 'Chapter 7: Binomial Theorem',                          isFree: false, sortOrder: 7  },
    { slug: 'math-8-sequences-series',        name: 'Chapter 8: Sequences and Series',                      isFree: false, sortOrder: 8  },
    { slug: 'math-9-straight-lines',          name: 'Chapter 9: Straight Lines',                            isFree: false, sortOrder: 9  },
    { slug: 'math-10-conic-sections',         name: 'Chapter 10: Conic Sections',                           isFree: false, sortOrder: 10 },
    { slug: 'math-11-3d-geometry',            name: 'Chapter 11: Introduction to 3D Geometry',              isFree: false, sortOrder: 11 },
    { slug: 'math-12-limits-derivatives',     name: 'Chapter 12: Limits and Derivatives',                   isFree: false, sortOrder: 12 },
    { slug: 'math-13-statistics',             name: 'Chapter 13: Statistics',                               isFree: false, sortOrder: 13 },
    { slug: 'math-14-probability',            name: 'Chapter 14: Probability',                              isFree: false, sortOrder: 14 },
    { slug: 'math-15-mathematical-reasoning', name: 'Chapter 15: Mathematical Reasoning',                   isFree: false, sortOrder: 15 },
    { slug: 'math-16-matrices',               name: 'Chapter 16: Matrices',                                 isFree: false, sortOrder: 16 },
    { slug: 'math-17-determinants',           name: 'Chapter 17: Determinants',                             isFree: false, sortOrder: 17 },
    { slug: 'math-18-continuity',             name: 'Chapter 18: Continuity and Differentiability',         isFree: false, sortOrder: 18 },
    { slug: 'math-19-integrals',              name: 'Chapter 19: Integrals',                                isFree: false, sortOrder: 19 },
    { slug: 'math-20-differential-equations', name: 'Chapter 20: Differential Equations',                   isFree: false, sortOrder: 20 },
  ];

  for (const ch of chapterDefs11Maths) {
    await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId: maths11.id, slug: ch.slug } },
      update: {},
      create: { subjectId: maths11.id, ...ch },
    });
  }

  // ── Chapters (Physics Class 12) ───────────────────────────────────────────
  const chapterDefs12Physics = [
    { slug: 'chapter-1-electric-charges',          name: 'Chapter 1: Electric Charges and Fields',               isFree: true,  sortOrder: 1  },
    { slug: 'chapter-2-electrostatic-potential',   name: 'Chapter 2: Electrostatic Potential and Capacitance',   isFree: false, sortOrder: 2  },
    { slug: 'chapter-3-current-electricity',       name: 'Chapter 3: Current Electricity',                       isFree: false, sortOrder: 3  },
    { slug: 'chapter-4-moving-charges',            name: 'Chapter 4: Moving Charges and Magnetism',              isFree: false, sortOrder: 4  },
    { slug: 'chapter-5-magnetism-matter',          name: 'Chapter 5: Magnetism and Matter',                      isFree: false, sortOrder: 5  },
    { slug: 'chapter-6-electromagnetic-induction', name: 'Chapter 6: Electromagnetic Induction',                 isFree: false, sortOrder: 6  },
    { slug: 'chapter-7-alternating-current',       name: 'Chapter 7: Alternating Current',                       isFree: false, sortOrder: 7  },
    { slug: 'chapter-8-em-waves',                  name: 'Chapter 8: Electromagnetic Waves',                     isFree: false, sortOrder: 8  },
    { slug: 'chapter-9-ray-optics',                name: 'Chapter 9: Ray Optics and Optical Instruments',        isFree: false, sortOrder: 9  },
    { slug: 'chapter-10-wave-optics',              name: 'Chapter 10: Wave Optics',                              isFree: false, sortOrder: 10 },
    { slug: 'chapter-11-dual-nature',              name: 'Chapter 11: Dual Nature of Radiation and Matter',      isFree: false, sortOrder: 11 },
    { slug: 'chapter-12-atoms',                    name: 'Chapter 12: Atoms',                                    isFree: false, sortOrder: 12 },
    { slug: 'chapter-13-nuclei',                   name: 'Chapter 13: Nuclei',                                   isFree: false, sortOrder: 13 },
    { slug: 'chapter-14-semiconductors',           name: 'Chapter 14: Semiconductor Electronics',                isFree: false, sortOrder: 14 },
    { slug: 'chapter-15-communication-systems',    name: 'Chapter 15: Communication Systems',                    isFree: false, sortOrder: 15 },
    { slug: 'chapter-16-electric-flux',            name: 'Chapter 16: Gauss\'s Law and Electric Flux',           isFree: false, sortOrder: 16 },
    { slug: 'chapter-17-capacitors-dielectrics',   name: 'Chapter 17: Capacitors and Dielectrics',               isFree: false, sortOrder: 17 },
    { slug: 'chapter-18-kirchhoff-circuits',       name: 'Chapter 18: Kirchhoff\'s Laws and Circuits',           isFree: false, sortOrder: 18 },
    { slug: 'chapter-19-logic-gates',              name: 'Chapter 19: Logic Gates and Digital Electronics',      isFree: false, sortOrder: 19 },
    { slug: 'chapter-20-photoelectric-effect',     name: 'Chapter 20: Photoelectric Effect — Advanced',          isFree: false, sortOrder: 20 },
  ];

  const physics12Chapters: Record<string, string> = {};
  for (const ch of chapterDefs12Physics) {
    const record = await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId: physics12.id, slug: ch.slug } },
      update: {},
      create: { subjectId: physics12.id, ...ch },
    });
    physics12Chapters[ch.slug] = record.id;
  }

  // ── Chapters (Chemistry Class 12) ─────────────────────────────────────────
  const chapterDefs12Chem = [
    { slug: 'chem12-1-solid-state',              name: 'Chapter 1: The Solid State',                            isFree: true,  sortOrder: 1  },
    { slug: 'chem12-2-solutions',                name: 'Chapter 2: Solutions',                                  isFree: false, sortOrder: 2  },
    { slug: 'chem12-3-electrochemistry',         name: 'Chapter 3: Electrochemistry',                           isFree: false, sortOrder: 3  },
    { slug: 'chem12-4-chemical-kinetics',        name: 'Chapter 4: Chemical Kinetics',                          isFree: false, sortOrder: 4  },
    { slug: 'chem12-5-surface-chemistry',        name: 'Chapter 5: Surface Chemistry',                          isFree: false, sortOrder: 5  },
    { slug: 'chem12-6-general-principles',       name: 'Chapter 6: General Principles of Isolation of Metals',  isFree: false, sortOrder: 6  },
    { slug: 'chem12-7-p-block',                  name: 'Chapter 7: The p-Block Elements',                       isFree: false, sortOrder: 7  },
    { slug: 'chem12-8-d-f-block',                name: 'Chapter 8: The d- and f-Block Elements',                isFree: false, sortOrder: 8  },
    { slug: 'chem12-9-coordination-compounds',   name: 'Chapter 9: Coordination Compounds',                     isFree: false, sortOrder: 9  },
    { slug: 'chem12-10-haloalkanes',             name: 'Chapter 10: Haloalkanes and Haloarenes',                isFree: false, sortOrder: 10 },
    { slug: 'chem12-11-alcohols-phenols-ethers', name: 'Chapter 11: Alcohols, Phenols and Ethers',              isFree: false, sortOrder: 11 },
    { slug: 'chem12-12-aldehydes-ketones',       name: 'Chapter 12: Aldehydes, Ketones and Carboxylic Acids',   isFree: false, sortOrder: 12 },
    { slug: 'chem12-13-amines',                  name: 'Chapter 13: Amines',                                    isFree: false, sortOrder: 13 },
    { slug: 'chem12-14-biomolecules',            name: 'Chapter 14: Biomolecules',                              isFree: false, sortOrder: 14 },
    { slug: 'chem12-15-polymers',                name: 'Chapter 15: Polymers',                                  isFree: false, sortOrder: 15 },
    { slug: 'chem12-16-chemistry-everyday-life', name: 'Chapter 16: Chemistry in Everyday Life',                isFree: false, sortOrder: 16 },
    { slug: 'chem12-17-nuclear-chemistry',       name: 'Chapter 17: Nuclear Chemistry',                         isFree: false, sortOrder: 17 },
    { slug: 'chem12-18-analytical-chemistry',    name: 'Chapter 18: Analytical Chemistry',                      isFree: false, sortOrder: 18 },
    { slug: 'chem12-19-green-chemistry',         name: 'Chapter 19: Green Chemistry and Sustainability',        isFree: false, sortOrder: 19 },
    { slug: 'chem12-20-revision-numericals',     name: 'Chapter 20: Revision and Important Numericals',         isFree: false, sortOrder: 20 },
  ];

  for (const ch of chapterDefs12Chem) {
    await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId: chem12.id, slug: ch.slug } },
      update: {},
      create: { subjectId: chem12.id, ...ch },
    });
  }

  // ── Chapters (Mathematics Class 12) ───────────────────────────────────────
  const chapterDefs12Maths = [
    { slug: 'math12-1-relations-functions',      name: 'Chapter 1: Relations and Functions',                    isFree: true,  sortOrder: 1  },
    { slug: 'math12-2-inverse-trig',             name: 'Chapter 2: Inverse Trigonometric Functions',            isFree: false, sortOrder: 2  },
    { slug: 'math12-3-matrices',                 name: 'Chapter 3: Matrices',                                   isFree: false, sortOrder: 3  },
    { slug: 'math12-4-determinants',             name: 'Chapter 4: Determinants',                               isFree: false, sortOrder: 4  },
    { slug: 'math12-5-continuity',               name: 'Chapter 5: Continuity and Differentiability',           isFree: false, sortOrder: 5  },
    { slug: 'math12-6-applications-derivatives', name: 'Chapter 6: Applications of Derivatives',                isFree: false, sortOrder: 6  },
    { slug: 'math12-7-integrals',                name: 'Chapter 7: Integrals',                                  isFree: false, sortOrder: 7  },
    { slug: 'math12-8-applications-integrals',   name: 'Chapter 8: Applications of Integrals',                  isFree: false, sortOrder: 8  },
    { slug: 'math12-9-differential-equations',   name: 'Chapter 9: Differential Equations',                     isFree: false, sortOrder: 9  },
    { slug: 'math12-10-vector-algebra',          name: 'Chapter 10: Vector Algebra',                            isFree: false, sortOrder: 10 },
    { slug: 'math12-11-3d-geometry',             name: 'Chapter 11: Three Dimensional Geometry',                isFree: false, sortOrder: 11 },
    { slug: 'math12-12-linear-programming',      name: 'Chapter 12: Linear Programming',                        isFree: false, sortOrder: 12 },
    { slug: 'math12-13-probability',             name: 'Chapter 13: Probability',                               isFree: false, sortOrder: 13 },
    { slug: 'math12-14-bayes-theorem',           name: 'Chapter 14: Bayes\' Theorem and Random Variables',       isFree: false, sortOrder: 14 },
    { slug: 'math12-15-complex-numbers',         name: 'Chapter 15: Complex Numbers — Advanced',                isFree: false, sortOrder: 15 },
    { slug: 'math12-16-sequences-series',        name: 'Chapter 16: Sequences and Series — Advanced',           isFree: false, sortOrder: 16 },
    { slug: 'math12-17-mathematical-induction',  name: 'Chapter 17: Mathematical Induction',                    isFree: false, sortOrder: 17 },
    { slug: 'math12-18-binomial-advanced',       name: 'Chapter 18: Binomial Theorem — Advanced Applications',  isFree: false, sortOrder: 18 },
    { slug: 'math12-19-coordinate-geometry',     name: 'Chapter 19: Coordinate Geometry — Conics Advanced',     isFree: false, sortOrder: 19 },
    { slug: 'math12-20-revision-board-prep',     name: 'Chapter 20: Board Exam Revision and Problem Solving',   isFree: false, sortOrder: 20 },
  ];

  for (const ch of chapterDefs12Maths) {
    await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId: maths12.id, slug: ch.slug } },
      update: {},
      create: { subjectId: maths12.id, ...ch },
    });
  }

  // ── Plans ─────────────────────────────────────────────────────────────────
  //
  // Plans are region-specific:
  //   - INR plans (no suffix)  → shown to India users, paid via Razorpay
  //   - AED plans (-aed suffix) → shown to UAE users, paid via Stripe
  //
  // pricePaise / priceFilsDubai = price in smallest currency unit
  //   INR: 1 rupee = 100 paise   (₹199 → 19900)
  //   AED: 1 dirham = 100 fils   (AED 10 → 1000)

  type PlanDef = {
    slug: string;
    name: string;
    scopeType: 'CHAPTER' | 'SUBJECT' | 'COMPLETE' | 'CONFIGURABLE' | 'CHAPTER_COMBO' | 'TEST_PANEL';
    pricePaise: number;
    currency: string;
    durationDays: number | null;
    isPermanent: boolean;
    isActive: boolean;
    description: string;
    metadata?: Record<string, unknown>;
  };

  // ── INR plans (India / Razorpay) — INACTIVE: this site runs AED only ────────
  // Kept in DB for historical order records but not shown to users.
  const inrPlanDefs: PlanDef[] = [
    { slug: 'free',              name: 'Free',                        scopeType: 'CHAPTER',      pricePaise: 0,      currency: 'INR', durationDays: null, isPermanent: true,  isActive: false, description: 'INR plan — inactive.' },
    { slug: 'chapter-temp-3d',   name: 'Chapter Access — 3 Days',     scopeType: 'CHAPTER',      pricePaise: 19900,  currency: 'INR', durationDays: 3,    isPermanent: false, isActive: false, description: 'INR plan — inactive.' },
    { slug: 'subject-temp-7d',   name: 'Subject Access — 7 Days',     scopeType: 'SUBJECT',      pricePaise: 49900,  currency: 'INR', durationDays: 7,    isPermanent: false, isActive: false, description: 'INR plan — inactive.' },
    { slug: 'chapter-permanent', name: 'Chapter Access — Permanent',  scopeType: 'CHAPTER',      pricePaise: 69900,  currency: 'INR', durationDays: null, isPermanent: true,  isActive: false, description: 'INR plan — inactive.' },
    { slug: 'subject-permanent', name: 'Subject Access — Permanent',  scopeType: 'SUBJECT',      pricePaise: 159900, currency: 'INR', durationDays: null, isPermanent: true,  isActive: false, description: 'INR plan — inactive.' },
    { slug: 'configurable-3999', name: 'Special Package',             scopeType: 'CONFIGURABLE', pricePaise: 399900, currency: 'INR', durationDays: null, isPermanent: true,  isActive: false, description: 'INR plan — inactive.' },
    { slug: 'complete-lms',      name: 'Complete LMS Package',        scopeType: 'COMPLETE',     pricePaise: 59900,  currency: 'INR', durationDays: null, isPermanent: true,  isActive: false, description: 'INR plan — inactive.' },
  ];

  // ── AED plans (UAE / Stripe) ───────────────────────────────────────────────
  // Prices in fils (1 AED = 100 fils).
  // e.g. AED 100 → 10000 fils
  const aedPlanDefs: PlanDef[] = [
    {
      slug: 'free-aed',
      name: 'Free',
      scopeType: 'CHAPTER',
      pricePaise: 0,        // free — no payment
      currency: 'AED',
      durationDays: null,
      isPermanent: true,    // free plan has no expiry
      isActive: true,
      description: 'Access to free/sample content only.',
    },
    {
      slug: 'chapter-aed',
      name: 'Chapter-wise',
      scopeType: 'CHAPTER',
      pricePaise: 10000,    // AED 100
      currency: 'AED',
      durationDays: 365,    // 12-month access
      isPermanent: false,
      isActive: true,
      description: 'Get access to any one chapter of your choice. 12-month access.',
    },
    {
      slug: 'chapter-combo-aed',
      name: 'Chapter Combo — Any 5',
      scopeType: 'CHAPTER_COMBO',
      pricePaise: 40000,    // AED 400 (5 × AED 100 − 20% off)
      currency: 'AED',
      durationDays: 365,    // 12-month access
      isPermanent: false,
      isActive: true,
      description: 'Get access to any 5 chapters from one subject. Save 20% vs buying individually. 12-month access.',
      metadata: { chapterCount: 5, originalPrice: 50000, discountPercent: 20 },
    },
    {
      slug: 'subject-aed',
      name: 'Subject-wise',
      scopeType: 'SUBJECT',
      pricePaise: 89900,    // AED 899
      currency: 'AED',
      durationDays: 365,    // 12-month access
      isPermanent: false,
      isActive: true,
      description: 'Get access to all chapters in any one subject. 12-month access.',
    },
    {
      slug: 'combo-two-subjects-aed',
      name: 'Combo — Any 2 Subjects',
      scopeType: 'CONFIGURABLE',
      pricePaise: 150000,   // AED 1500
      currency: 'AED',
      durationDays: 365,    // 12-month access
      isPermanent: false,
      isActive: true,
      description: 'Get access to any two subjects of your choice. 12-month access.',
      metadata: { subjectCount: 2 },
    },
    {
      slug: 'complete-lms-aed',
      name: 'Complete Class Package',
      scopeType: 'COMPLETE',
      pricePaise: 399900,   // AED 3999
      currency: 'AED',
      durationDays: 365,    // 12-month access
      isPermanent: false,
      isActive: true,
      description: 'Get access to all subjects and chapters in one full class (Class 11, Class 12, or any class). 12-month access.',
    },
    {
      slug: 'upgrade-subject-aed',
      name: 'Upgrade to Subject Access',
      scopeType: 'SUBJECT',
      pricePaise: 0,        // placeholder — real price set per-user at checkout
      currency: 'AED',
      durationDays: 365,    // 12-month access
      isPermanent: false,
      isActive: false,      // NOT shown on /pricing — only surfaced via upgrade banner
      description: 'Upgrade from chapter purchases to full subject access at a discounted price.',
      metadata: { isDynamicUpgrade: true },
    },
    {
      slug: 'upgrade-to-complete-aed',
      name: 'Upgrade to Complete Class Package',
      scopeType: 'COMPLETE',
      pricePaise: 0,        // placeholder — real price set per-user at checkout
      currency: 'AED',
      durationDays: 365,    // 12-month access
      isPermanent: false,
      isActive: false,      // NOT shown on /pricing — only surfaced via the upgrade banner
      description: 'Upgrade from chapter purchases to the Complete Class Package at a discounted price.',
      metadata: { isDynamicUpgrade: true },
    },
    {
      slug: 'test-panel-aed',
      name: 'Test Panel — Practice Exams',
      scopeType: 'TEST_PANEL',
      pricePaise: 5000,     // AED 50 — standalone test access
      currency: 'AED',
      durationDays: 365,    // 12-month access
      isPermanent: false,
      isActive: true,
      description: 'Unlimited access to all chapter-wise and topic-wise practice tests and exams.',
      metadata: { isTestPanel: true },
    },
  ];

  const planDefs = [...inrPlanDefs, ...aedPlanDefs];
  const planIds: Record<string, string> = {};

  for (const p of planDefs) {
    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {
        name:        p.name,
        pricePaise:  p.pricePaise,
        isActive:    p.isActive,
        description: p.description,
      },
      create: {
        name:        p.name,
        slug:        p.slug,
        scopeType:   p.scopeType,
        pricePaise:  p.pricePaise,
        currency:    p.currency,
        durationDays: p.durationDays,
        isPermanent: p.isPermanent,
        isActive:    p.isActive,
        description: p.description,
        metadata:    p.metadata != null
          ? (p.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    planIds[p.slug] = plan.id;
  }

  // ── CompletePackageItems for the AED 1199 Complete Package ──────────────
  const completePlanAedId = planIds['complete-lms-aed'];
  if (!completePlanAedId) throw new Error('complete-lms-aed plan not found — seed aborted to avoid deleting all CompletePackageItems.');

  await prisma.completePackageItem.deleteMany({ where: { planId: completePlanAedId } });

  await prisma.completePackageItem.createMany({
    data: [
      { planId: completePlanAedId, scope: 'SUBJECT', subjectId: physics11.id },
      { planId: completePlanAedId, scope: 'SUBJECT', subjectId: physics12.id },
      { planId: completePlanAedId, scope: 'SUBJECT', subjectId: chem11.id },
      { planId: completePlanAedId, scope: 'SUBJECT', subjectId: maths11.id },
      { planId: completePlanAedId, scope: 'SUBJECT', subjectId: chem12.id },
      { planId: completePlanAedId, scope: 'SUBJECT', subjectId: maths12.id },
    ],
  });

  // ── CompletePackageItems for the upgrade plan (same coverage as complete) ─
  const upgradePlanAedId = planIds['upgrade-to-complete-aed'];
  if (!upgradePlanAedId) throw new Error('upgrade-to-complete-aed plan not found — seed aborted to avoid deleting all CompletePackageItems.');

  await prisma.completePackageItem.deleteMany({ where: { planId: upgradePlanAedId } });

  await prisma.completePackageItem.createMany({
    data: [
      { planId: upgradePlanAedId, scope: 'SUBJECT', subjectId: physics11.id },
      { planId: upgradePlanAedId, scope: 'SUBJECT', subjectId: physics12.id },
      { planId: upgradePlanAedId, scope: 'SUBJECT', subjectId: chem11.id },
      { planId: upgradePlanAedId, scope: 'SUBJECT', subjectId: maths11.id },
      { planId: upgradePlanAedId, scope: 'SUBJECT', subjectId: chem12.id },
      { planId: upgradePlanAedId, scope: 'SUBJECT', subjectId: maths12.id },
    ],
  });

  console.log('✅ Seeded:');
  console.log(`   Classes  : ${[class11.name, class12.name].join(', ')}`);
  console.log(`   Subjects : Physics 11 (${chapterDefs11Physics.length} ch), Chemistry 11 (${chapterDefs11Chem.length} ch), Mathematics 11 (${chapterDefs11Maths.length} ch), Physics 12 (${chapterDefs12Physics.length} ch), Chemistry 12 (${chapterDefs12Chem.length} ch), Mathematics 12 (${chapterDefs12Maths.length} ch)`);
  console.log(`   INR Plans: all INACTIVE`);
  console.log(`   AED Plans: ${aedPlanDefs.map((p) => `${p.name} (AED ${p.pricePaise / 100})`).join(', ')}`);
  console.log(`   Upgrade plan (subject): upgrade-subject-aed (dynamic price, hidden from public pricing)`);
  console.log(`   Upgrade plan (complete): upgrade-to-complete-aed (dynamic price, hidden from public pricing)`);
  console.log(`   Complete package covers: Physics 11, Chemistry 11, Mathematics 11, Physics 12, Chemistry 12, Mathematics 12`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
