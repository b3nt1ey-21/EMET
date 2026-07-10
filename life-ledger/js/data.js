/* Life Ledger — data.js
 * All game content lives here as plain data: traits, cities, difficulties,
 * education, careers, skills, housing, vehicles, businesses, market assets,
 * lifestyle options and insurance. Adding content means adding entries here —
 * the simulation code never hard-codes specific careers/assets.
 * (Random events and achievements live in events.js / engine.js because they
 * need behaviour, not just numbers.)
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const D = (LL.DATA = {});

  // ------------------------------------------------------------- skills ----
  // value 0..100, learned by doing. `decay` per day when unused (above 20).
  D.SKILLS = {
    programming:   { name: 'Programming',   icon: '💻', group: 'tech' },
    communication: { name: 'Communication', icon: '🗣️', group: 'people' },
    negotiation:   { name: 'Negotiation',   icon: '🤝', group: 'people' },
    leadership:    { name: 'Leadership',    icon: '🧭', group: 'people' },
    marketing:     { name: 'Marketing',     icon: '📣', group: 'business' },
    design:        { name: 'Design & Media',icon: '🎨', group: 'creative' },
    cooking:       { name: 'Cooking',       icon: '🍳', group: 'craft' },
    mechanics:     { name: 'Mechanics',     icon: '🔧', group: 'craft' },
    fitness:       { name: 'Fitness',       icon: '💪', group: 'body' },
    investing:     { name: 'Investing',     icon: '📈', group: 'business' },
  };

  // ------------------------------------------------------------- traits ----
  // mods multiply base rates; systems look mods up via State.mod(state,key).
  D.TRAITS = {
    hard_worker: { name: 'Hard Worker', icon: '🐝', desc: '+25% job performance & work XP, work is a bit more tiring.',
      mods: { workXp: 1.25, performance: 1.2, workEnergy: 1.1 } },
    lazy: { name: 'Laid Back', icon: '🛋️', desc: 'Work stresses you 20% less, but performance and work XP suffer.',
      mods: { workXp: 0.8, performance: 0.85, workStress: 0.8 } },
    analytical: { name: 'Analytical', icon: '🧮', desc: '+30% XP for tech & finance skills.',
      mods: { techXp: 1.3 } },
    creative: { name: 'Creative', icon: '✨', desc: '+30% XP for creative skills, businesses feel fresher (+10% revenue).',
      mods: { creativeXp: 1.3, bizRev: 1.1 } },
    frugal: { name: 'Frugal', icon: '🪙', desc: 'Living expenses cost 10% less.',
      mods: { expense: 0.9 } },
    impulsive: { name: 'Impulsive', icon: '🎲', desc: 'Expenses run 10% higher, but bold moves excite you (+happiness from wins).',
      mods: { expense: 1.1, winJoy: 1.4 } },
    risk_taker: { name: 'Risk Taker', icon: '🪂', desc: '+15% interview confidence, investments swing 25% harder both ways.',
      mods: { interview: 1.15, investVol: 1.25 } },
    introvert: { name: 'Introvert', icon: '📚', desc: '+15% study XP, but friendships build 25% slower.',
      mods: { studyXp: 1.15, socialGain: 0.75 } },
    extrovert: { name: 'Extrovert', icon: '🎉', desc: '+30% friendship gains, +10% interviews, -5% study XP.',
      mods: { socialGain: 1.3, interview: 1.1, studyXp: 0.95 } },
    optimist: { name: 'Optimist', icon: '🌤️', desc: 'Stress fades 20% faster and happiness drifts upward.',
      mods: { stressRelief: 1.2, moodDrift: 1 } },
    pessimist: { name: 'Pessimist', icon: '🌧️', desc: 'A little gloomier, but you never fall for scams.',
      mods: { moodDrift: -1, scamImmune: 1 } },
    disciplined: { name: 'Disciplined', icon: '⏱️', desc: '+10% all skill XP, healthier routines (+health drift).',
      mods: { skillXp: 1.1, healthDrift: 1 } },
  };

  // ------------------------------------------------------------- cities ----
  D.CITIES = {
    brookford: { name: 'Brookford', desc: 'Quiet small town. Cheap living, modest pay.',
      col: 0.8, salary: 0.85, rent: 0.72, homePrice: 0.62, stateTax: 0.03 },
    harborton: { name: 'Harborton', desc: 'Balanced mid-size city. The benchmark.',
      col: 1.0, salary: 1.0, rent: 1.0, homePrice: 1.0, stateTax: 0.045 },
    meridian: { name: 'Meridian City', desc: 'Big metro. Higher pay, higher rent, more opportunity.',
      col: 1.2, salary: 1.18, rent: 1.45, homePrice: 1.5, stateTax: 0.06 },
    bayview: { name: 'Bayview', desc: 'Coastal tech hub. Top salaries, brutal cost of living.',
      col: 1.4, salary: 1.42, rent: 2.1, homePrice: 2.4, stateTax: 0.0 },
  };

  // -------------------------------------------------------- difficulties ---
  D.DIFFICULTIES = {
    easy: { name: 'Easy', desc: 'Parents help out, jobs pay more, fewer disasters.',
      startCash: 8000, salary: 1.15, tax: 0.85, rent: 0.9, badEvents: 0.7,
      investDrift: 0.012, stipend: 400, stipendUntil: 25, illness: 0.7 },
    normal: { name: 'Normal', desc: 'A realistic, balanced economy.',
      startCash: 2500, salary: 1.0, tax: 1.0, rent: 1.0, badEvents: 1.0,
      investDrift: 0, stipend: 0, stipendUntil: 0, illness: 1.0 },
    hard: { name: 'Hard', desc: 'Lower pay, higher taxes, layoffs and recessions bite.',
      startCash: 800, salary: 0.92, tax: 1.1, rent: 1.1, badEvents: 1.35,
      investDrift: -0.005, stipend: 0, stipendUntil: 0, illness: 1.25 },
    extreme: { name: 'Extreme', desc: 'Everything is realistic. Failure is common.',
      startCash: 300, salary: 0.85, tax: 1.15, rent: 1.2, badEvents: 1.7,
      investDrift: -0.01, stipend: 0, stipendUntil: 0, illness: 1.5, startRecession: true },
  };

  // ---------------------------------------------------------- education ----
  // hours = total focused study-hours to complete. cost is charged monthly,
  // spread over the expected duration (student loans can cover it).
  // rank: 1 hs, 1.5 cert, 2 trade/associate, 3 bachelor, 4 master, 5 doctorate.
  D.EDUCATION = {
    cert_it:    { name: 'IT Certification', short: 'Cert', rank: 1.5, tag: 'cs', cost: 1800, hours: 200,
      skills: { programming: 12 }, desc: 'Online cert. Quick on-ramp into tech.' },
    cert_mkt:   { name: 'Marketing Certificate', short: 'Cert', rank: 1.5, tag: 'bus', cost: 900, hours: 150,
      skills: { marketing: 12 }, desc: 'Digital marketing bootcamp.' },
    trade_elec: { name: 'Trade School — Electrical', short: 'Trade', rank: 2, tag: 'trade', cost: 9000, hours: 700,
      skills: { mechanics: 25 }, desc: 'Licensed electrician training.' },
    trade_mech: { name: 'Trade School — Automotive', short: 'Trade', rank: 2, tag: 'trade', cost: 7500, hours: 650,
      skills: { mechanics: 22 }, desc: 'Automotive technician program.' },
    assoc:      { name: 'Community College (Associate)', short: 'Assoc.', rank: 2, tag: 'gen', cost: 14000, hours: 900,
      skills: { communication: 10 }, desc: 'Two-year associate degree.' },
    bach_gen:   { name: 'University — Liberal Arts', short: 'B.A.', rank: 3, tag: 'gen', cost: 52000, hours: 1900,
      skills: { communication: 15 }, desc: 'Four-year bachelor degree.' },
    bach_cs:    { name: 'University — Computer Science', short: 'B.S. CS', rank: 3, tag: 'cs', cost: 60000, hours: 2000,
      skills: { programming: 30 }, desc: 'Unlocks top software careers.' },
    bach_bus:   { name: 'University — Business & Finance', short: 'B.B.A.', rank: 3, tag: 'bus', cost: 56000, hours: 1900,
      skills: { investing: 15, marketing: 15 }, desc: 'Unlocks finance & marketing careers.' },
    bach_sci:   { name: 'University — Science & Engineering', short: 'B.S.', rank: 3, tag: 'sci', cost: 58000, hours: 2000,
      skills: { mechanics: 10 }, desc: 'Unlocks engineering & health careers.' },
    mba:        { name: 'MBA', short: 'MBA', rank: 4, tag: 'bus', cost: 70000, hours: 1100, reqRank: 3,
      skills: { leadership: 20, negotiation: 15 }, desc: 'Executive track. Requires a bachelor.' },
    ms:         { name: 'Master of Science', short: 'M.S.', rank: 4, tag: 'sci', cost: 45000, hours: 1200, reqRank: 3,
      skills: {}, desc: 'Research track. Requires a bachelor.' },
    law:        { name: 'Law School (J.D.)', short: 'J.D.', rank: 5, tag: 'law', cost: 120000, hours: 2200, reqRank: 3,
      skills: { negotiation: 25, communication: 15 }, desc: 'Requires a bachelor. Objection-ready.' },
    med:        { name: 'Medical School (M.D.)', short: 'M.D.', rank: 5, tag: 'med', cost: 210000, hours: 3200, reqRank: 3,
      skills: {}, desc: 'Requires a bachelor. The long road to Doctor.' },
  };

  // ------------------------------------------------------------ careers ----
  // req: { rank: minimum education rank, tags: any-of education tags,
  //        skills: {skill: min} to get hired at tier 0 }.
  // Tiers: promotion needs `years` in tier + `skills` mins + decent performance.
  // salary = national base; multiplied by city & difficulty & inflation.
  // stress/energy are per-work-hour pressures; hours = weekly schedule.
  D.CAREERS = {
    retail: { name: 'Retail', icon: '🛒', req: {}, hours: 40, stress: 1.6, xp: { communication: 1 },
      tiers: [
        { title: 'Cashier', salary: 24000 },
        { title: 'Senior Associate', salary: 29000, years: 1, skills: { communication: 15 } },
        { title: 'Shift Lead', salary: 34000, years: 1, skills: { communication: 25, leadership: 15 } },
        { title: 'Store Manager', salary: 48000, years: 2, skills: { leadership: 35 } },
        { title: 'District Manager', salary: 74000, years: 3, skills: { leadership: 60 } },
      ] },
    food: { name: 'Food Service', icon: '🍽️', req: {}, hours: 42, stress: 1.9, xp: { cooking: 1.2 },
      tiers: [
        { title: 'Dishwasher', salary: 22000 },
        { title: 'Line Cook', salary: 28000, years: 1, skills: { cooking: 15 } },
        { title: 'Chef de Partie', salary: 38000, years: 1, skills: { cooking: 35 } },
        { title: 'Sous Chef', salary: 52000, years: 2, skills: { cooking: 55 } },
        { title: 'Head Chef', salary: 78000, years: 2, skills: { cooking: 75, leadership: 40 } },
      ] },
    logistics: { name: 'Logistics', icon: '📦', req: {}, hours: 40, stress: 1.5, xp: { mechanics: 0.6 },
      tiers: [
        { title: 'Warehouse Worker', salary: 30000 },
        { title: 'Forklift Operator', salary: 36000, years: 1, skills: { mechanics: 15 } },
        { title: 'Dispatcher', salary: 44000, years: 1, skills: { communication: 25 } },
        { title: 'Ops Supervisor', salary: 58000, years: 2, skills: { leadership: 35 } },
        { title: 'Ops Manager', salary: 80000, years: 3, skills: { leadership: 55 } },
      ] },
    construction: { name: 'Construction', icon: '🏗️', req: {}, hours: 44, stress: 1.8, xp: { mechanics: 1, fitness: 0.5 },
      tiers: [
        { title: 'Laborer', salary: 32000 },
        { title: 'Skilled Tradesman', salary: 42000, years: 1, skills: { mechanics: 25 } },
        { title: 'Foreman', salary: 56000, years: 2, skills: { mechanics: 40, leadership: 30 } },
        { title: 'Site Superintendent', salary: 78000, years: 2, skills: { leadership: 50 } },
        { title: 'Project Manager', salary: 96000, years: 2, skills: { leadership: 65 } },
      ] },
    office: { name: 'Office Administration', icon: '🗂️', req: { rank: 1 }, hours: 40, stress: 1.3, xp: { communication: 0.9 },
      tiers: [
        { title: 'Receptionist', salary: 28000 },
        { title: 'Admin Assistant', salary: 34000, years: 1, skills: { communication: 20 } },
        { title: 'Office Coordinator', salary: 42000, years: 1, skills: { communication: 35 } },
        { title: 'Office Manager', salary: 56000, years: 2, skills: { leadership: 35 } },
        { title: 'Operations Director', salary: 86000, years: 3, skills: { leadership: 60 } },
      ] },
    sales: { name: 'Sales', icon: '📞', req: { rank: 1 }, hours: 42, stress: 2.0, xp: { negotiation: 1.1, communication: 0.7 },
      tiers: [
        { title: 'Sales Rep', salary: 38000, skills: { communication: 15 } },
        { title: 'Senior Rep', salary: 52000, years: 1, skills: { negotiation: 30 } },
        { title: 'Account Executive', salary: 72000, years: 1, skills: { negotiation: 45 } },
        { title: 'Sales Manager', salary: 96000, years: 2, skills: { leadership: 50 } },
        { title: 'VP of Sales', salary: 145000, years: 3, skills: { negotiation: 70, leadership: 70 } },
      ] },
    electrician: { name: 'Electrician', icon: '⚡', req: { tags: ['trade'] }, hours: 42, stress: 1.5, xp: { mechanics: 1.2 },
      tiers: [
        { title: 'Apprentice Electrician', salary: 36000 },
        { title: 'Journeyman', salary: 52000, years: 1, skills: { mechanics: 35 } },
        { title: 'Electrician', salary: 68000, years: 2, skills: { mechanics: 50 } },
        { title: 'Master Electrician', salary: 88000, years: 2, skills: { mechanics: 70 } },
        { title: 'Electrical Contractor', salary: 118000, years: 2, skills: { mechanics: 80, leadership: 40 } },
      ] },
    mechanic: { name: 'Auto Mechanic', icon: '🔩', req: { tags: ['trade'] }, hours: 42, stress: 1.5, xp: { mechanics: 1.2 },
      tiers: [
        { title: 'Lube Tech', salary: 30000 },
        { title: 'Mechanic', salary: 44000, years: 1, skills: { mechanics: 35 } },
        { title: 'Senior Mechanic', salary: 58000, years: 2, skills: { mechanics: 55 } },
        { title: 'Shop Foreman', salary: 72000, years: 2, skills: { leadership: 35 } },
        { title: 'Master Technician', salary: 88000, years: 2, skills: { mechanics: 80 } },
      ] },
    police: { name: 'Law Enforcement', icon: '🚓', req: { rank: 1, skills: { fitness: 20 } }, hours: 44, stress: 2.3, xp: { fitness: 0.8, communication: 0.5 },
      tiers: [
        { title: 'Cadet', salary: 42000 },
        { title: 'Police Officer', salary: 56000, years: 1 },
        { title: 'Detective', salary: 72000, years: 2, skills: { communication: 40 } },
        { title: 'Sergeant', salary: 86000, years: 2, skills: { leadership: 50 } },
        { title: 'Captain', salary: 108000, years: 3, skills: { leadership: 70 } },
      ] },
    teacher: { name: 'Education', icon: '🍎', req: { rank: 3 }, hours: 42, stress: 1.9, xp: { communication: 1.1 },
      tiers: [
        { title: 'Substitute Teacher', salary: 34000 },
        { title: 'Teacher', salary: 48000, years: 1, skills: { communication: 35 } },
        { title: 'Senior Teacher', salary: 58000, years: 3, skills: { communication: 50 } },
        { title: 'Department Head', salary: 70000, years: 2, skills: { leadership: 45 } },
        { title: 'Principal', salary: 98000, years: 3, skills: { leadership: 65 } },
      ] },
    nursing: { name: 'Nursing', icon: '🩺', req: { rank: 2, tags: ['sci', 'gen'] }, hours: 44, stress: 2.2, xp: { communication: 0.7, fitness: 0.3 },
      tiers: [
        { title: 'Nursing Assistant', salary: 34000 },
        { title: 'Licensed Nurse', salary: 50000, years: 1, skills: { communication: 25 } },
        { title: 'Registered Nurse', salary: 74000, years: 2, skills: { communication: 40 } },
        { title: 'Nurse Practitioner', salary: 108000, years: 3, skills: { communication: 55 } },
        { title: 'Director of Nursing', salary: 134000, years: 3, skills: { leadership: 60 } },
      ] },
    software: { name: 'Software Development', icon: '💻', req: { tags: ['cs'], altSkills: { programming: 45 } },
      hours: 40, stress: 1.7, xp: { programming: 1.3 },
      tiers: [
        { title: 'Junior Developer', salary: 68000, skills: { programming: 25 } },
        { title: 'Developer', salary: 96000, years: 1, skills: { programming: 45 } },
        { title: 'Senior Developer', salary: 132000, years: 2, skills: { programming: 65 } },
        { title: 'Staff Engineer', salary: 172000, years: 2, skills: { programming: 80 } },
        { title: 'Principal Engineer', salary: 215000, years: 3, skills: { programming: 90, leadership: 50 } },
      ] },
    finance: { name: 'Finance', icon: '🏦', req: { tags: ['bus'] }, hours: 48, stress: 2.2, xp: { investing: 1.2, negotiation: 0.5 },
      tiers: [
        { title: 'Financial Analyst', salary: 62000, skills: { investing: 20 } },
        { title: 'Senior Analyst', salary: 86000, years: 1, skills: { investing: 40 } },
        { title: 'Associate', salary: 118000, years: 2, skills: { investing: 55, negotiation: 40 } },
        { title: 'Vice President', salary: 165000, years: 3, skills: { investing: 70, leadership: 50 } },
        { title: 'Managing Director', salary: 265000, years: 3, skills: { investing: 80, leadership: 70 } },
      ] },
    marketing: { name: 'Marketing', icon: '🎯', req: { tags: ['bus', 'gen'] }, hours: 42, stress: 1.7, xp: { marketing: 1.2, design: 0.4 },
      tiers: [
        { title: 'Marketing Coordinator', salary: 42000, skills: { marketing: 15 } },
        { title: 'Marketing Specialist', salary: 56000, years: 1, skills: { marketing: 35 } },
        { title: 'Marketing Manager', salary: 80000, years: 2, skills: { marketing: 55 } },
        { title: 'Marketing Director', salary: 112000, years: 2, skills: { marketing: 70, leadership: 50 } },
        { title: 'Chief Marketing Officer', salary: 175000, years: 3, skills: { marketing: 85, leadership: 70 } },
      ] },
    engineering: { name: 'Engineering', icon: '📐', req: { tags: ['sci'] }, hours: 42, stress: 1.7, xp: { mechanics: 0.9, programming: 0.3 },
      tiers: [
        { title: 'Engineer I', salary: 66000 },
        { title: 'Engineer II', salary: 84000, years: 1, skills: { mechanics: 35 } },
        { title: 'Senior Engineer', salary: 106000, years: 2, skills: { mechanics: 55 } },
        { title: 'Principal Engineer', salary: 132000, years: 3, skills: { mechanics: 70 } },
        { title: 'Engineering Director', salary: 162000, years: 3, skills: { leadership: 65 } },
      ] },
    law_career: { name: 'Law', icon: '⚖️', req: { tags: ['law'] }, hours: 52, stress: 2.5, xp: { negotiation: 1.1, communication: 0.7 },
      tiers: [
        { title: 'Junior Associate', salary: 92000, skills: { communication: 40 } },
        { title: 'Associate', salary: 132000, years: 2, skills: { negotiation: 50 } },
        { title: 'Senior Associate', salary: 172000, years: 2, skills: { negotiation: 65 } },
        { title: 'Partner', salary: 265000, years: 3, skills: { negotiation: 75, leadership: 50 } },
        { title: 'Senior Partner', salary: 400000, years: 4, skills: { negotiation: 85, leadership: 70 } },
      ] },
    medicine: { name: 'Medicine', icon: '🏥', req: { tags: ['med'] }, hours: 55, stress: 2.6, xp: { communication: 0.6 },
      tiers: [
        { title: 'Medical Intern', salary: 60000 },
        { title: 'Resident', salary: 68000, years: 2 },
        { title: 'Attending Physician', salary: 225000, years: 3, skills: { communication: 45 } },
        { title: 'Senior Physician', salary: 285000, years: 3, skills: { communication: 60 } },
        { title: 'Chief of Medicine', salary: 355000, years: 4, skills: { leadership: 65 } },
      ] },
    photography: { name: 'Photography', icon: '📷', req: { skills: { design: 12 } }, hours: 38, stress: 1.4, xp: { design: 1.3 },
      tiers: [
        { title: 'Photo Assistant', salary: 26000 },
        { title: 'Photographer', salary: 38000, years: 1, skills: { design: 35 } },
        { title: 'Senior Photographer', salary: 55000, years: 2, skills: { design: 55 } },
        { title: 'Studio Lead', salary: 76000, years: 2, skills: { design: 70, leadership: 30 } },
        { title: 'Renowned Photographer', salary: 122000, years: 3, skills: { design: 85 } },
      ] },
    creator: { name: 'Content Creation', icon: '🎬', req: { skills: { design: 10 } }, hours: 36, stress: 1.6, xp: { design: 0.8, marketing: 0.9 },
      tiers: [
        { title: 'Aspiring Creator', salary: 14000 },
        { title: 'Part-time Creator', salary: 32000, years: 1, skills: { marketing: 30 } },
        { title: 'Full-time Creator', salary: 66000, years: 1, skills: { marketing: 50, communication: 40 } },
        { title: 'Influencer', salary: 132000, years: 2, skills: { marketing: 70 } },
        { title: 'Media Mogul', salary: 300000, years: 3, skills: { marketing: 85, communication: 70 } },
      ] },
    science: { name: 'Research Science', icon: '🔬', req: { rank: 4, tags: ['sci'] }, hours: 42, stress: 1.6, xp: { programming: 0.4 },
      tiers: [
        { title: 'Research Assistant', salary: 48000 },
        { title: 'Scientist', salary: 72000, years: 1 },
        { title: 'Senior Scientist', salary: 96000, years: 2 },
        { title: 'Lead Scientist', salary: 122000, years: 3, skills: { leadership: 40 } },
        { title: 'Research Director', salary: 158000, years: 3, skills: { leadership: 60 } },
      ] },
  };

  // ------------------------------------------------------------ housing ----
  // Rentals: monthly rent at city multiplier 1.0 (scaled by inflation & city).
  D.RENTALS = {
    parents: { name: "Parents' Place", rent: 0, quality: -6, desc: 'Free, but cramped and a little demoralizing past 25.' },
    room:    { name: 'Shared Room', rent: 620, quality: -3, desc: 'A room with roommates. Cheap, noisy.' },
    studio:  { name: 'Studio Apartment', rent: 980, quality: 0, desc: 'Your own place. Finally.' },
    apt1:    { name: '1-Bed Apartment', rent: 1450, quality: 3, desc: 'Comfortable one-bedroom.' },
    apt2:    { name: '2-Bed Apartment', rent: 1950, quality: 5, desc: 'Room for a family or an office.' },
    lux:     { name: 'Luxury High-Rise', rent: 3600, quality: 10, desc: 'Skyline views, gym, concierge.' },
  };
  // Purchasable property. price at city multiplier 1.0; scales w/ housing index.
  // rentYield: monthly rent as a fraction of value if let out.
  D.PROPERTIES = {
    condo:    { name: 'City Condo', price: 185000, quality: 4, rentYield: 0.0062, hoa: 320 },
    starter:  { name: 'Starter House', price: 280000, quality: 6, rentYield: 0.0058, hoa: 0 },
    town:     { name: 'Townhome', price: 350000, quality: 7, rentYield: 0.0055, hoa: 180 },
    family:   { name: 'Family House', price: 460000, quality: 9, rentYield: 0.0052, hoa: 0 },
    luxury:   { name: 'Luxury Home', price: 920000, quality: 13, rentYield: 0.0046, hoa: 0 },
    mansion:  { name: 'Hillside Mansion', price: 2500000, quality: 18, rentYield: 0.0040, hoa: 0 },
    duplex:   { name: 'Duplex (Investment)', price: 390000, quality: 5, rentYield: 0.0068, hoa: 0 },
    fourplex: { name: 'Fourplex (Investment)', price: 720000, quality: 5, rentYield: 0.0074, hoa: 0 },
  };

  // ----------------------------------------------------------- vehicles ----
  D.VEHICLES = {
    transit: { name: 'Public Transit', price: 0, monthly: 85, insurance: 0, quality: 0, dep: 0,
      desc: 'Bus pass. Reliable-ish.' },
    bike:    { name: 'Bicycle', price: 350, monthly: 10, insurance: 0, quality: 1, dep: 0.1,
      desc: 'Free cardio, no gas. +fitness on your commute.' },
    beater:  { name: 'Used Beater', price: 6000, monthly: 220, insurance: 110, quality: 2, dep: 0.12,
      desc: 'Runs. Usually. Expect repairs.' , breakdown: 0.06 },
    sedan:   { name: 'New Sedan', price: 26000, monthly: 240, insurance: 140, quality: 4, dep: 0.13,
      desc: 'Dependable commuter.', breakdown: 0.01 },
    ev:      { name: 'Electric Crossover', price: 44000, monthly: 130, insurance: 160, quality: 6, dep: 0.14,
      desc: 'Cheap to run, fun to drive.', breakdown: 0.008 },
    luxury:  { name: 'Luxury Sedan', price: 92000, monthly: 320, insurance: 280, quality: 9, dep: 0.16,
      desc: 'Turns heads at the valet.', breakdown: 0.008 },
    sports:  { name: 'Exotic Sports Car', price: 165000, monthly: 420, insurance: 450, quality: 12, dep: 0.15,
      desc: 'Utterly impractical. Utterly glorious.', breakdown: 0.015 },
  };

  // --------------------------------------------------------- businesses ----
  // startCost buys the base setup. Revenue model in business.js:
  //   customers drift toward a cap set by marketing + quality + economy.
  D.BUSINESSES = {
    ecommerce: { name: 'Online Store', icon: '🛍️', startCost: 6000, skill: 'marketing',
      revPer: 34, baseCap: 260, capPerEmployee: 220, wage: 3200, fixed: 700,
      desc: 'Dropship-to-brand pipeline. Cheap to start, marketing-hungry.' },
    cleaning: { name: 'Cleaning Service', icon: '🧽', startCost: 11000, skill: 'leadership',
      revPer: 130, baseCap: 46, capPerEmployee: 55, wage: 2900, fixed: 900,
      desc: 'Steady contracts, scales with crews.' },
    food_truck: { name: 'Food Truck', icon: '🌮', startCost: 28000, skill: 'cooking',
      revPer: 15, baseCap: 900, capPerEmployee: 500, wage: 2800, fixed: 1800,
      desc: 'Street food with a cult following.' },
    web_agency: { name: 'Web Design Agency', icon: '🖥️', startCost: 9000, skill: 'programming',
      revPer: 950, baseCap: 7, capPerEmployee: 6, wage: 5200, fixed: 1100,
      desc: 'High-ticket client work. Skill is everything.' },
    coffee: { name: 'Coffee Shop', icon: '☕', startCost: 85000, skill: 'cooking',
      revPer: 8.5, baseCap: 2400, capPerEmployee: 1400, wage: 2900, fixed: 5200,
      desc: 'A neighborhood third place.' },
    gym: { name: 'Fitness Gym', icon: '🏋️', startCost: 150000, skill: 'fitness',
      revPer: 55, baseCap: 220, capPerEmployee: 160, wage: 3100, fixed: 7800,
      desc: 'Memberships compound like interest.' },
    restaurant: { name: 'Restaurant', icon: '🍷', startCost: 220000, skill: 'cooking',
      revPer: 42, baseCap: 850, capPerEmployee: 420, wage: 3300, fixed: 12500,
      desc: 'High risk, high prestige.' },
    saas: { name: 'Software Startup', icon: '🚀', startCost: 35000, skill: 'programming',
      revPer: 29, baseCap: 700, capPerEmployee: 900, wage: 7800, fixed: 2400,
      desc: 'Recurring revenue, brutal competition, giant upside.' },
  };

  // ------------------------------------------------------------- market ----
  // drift = expected annual return, vol = annualized volatility.
  D.MARKET = [
    { sym: 'TMF', name: 'Total Market Fund', type: 'fund', price: 100, drift: 0.075, vol: 0.15, div: 0.016 },
    { sym: 'TEC', name: 'Tech Growth Fund', type: 'fund', price: 100, drift: 0.10, vol: 0.24, div: 0.004 },
    { sym: 'AGG', name: 'Bond Fund', type: 'bond', price: 100, drift: 0.038, vol: 0.05, div: 0.032 },
    { sym: 'NMB', name: 'Nimbus Cloud', type: 'stock', price: 142, drift: 0.12, vol: 0.34, div: 0 },
    { sym: 'VLT', name: 'Voltaic Motors', type: 'stock', price: 61, drift: 0.11, vol: 0.48, div: 0 },
    { sym: 'OMN', name: 'OmniMart', type: 'stock', price: 88, drift: 0.07, vol: 0.18, div: 0.024 },
    { sym: 'PTC', name: 'PetroCore Energy', type: 'stock', price: 47, drift: 0.06, vol: 0.28, div: 0.045 },
    { sym: 'HLX', name: 'Helix Biotech', type: 'stock', price: 33, drift: 0.13, vol: 0.55, div: 0 },
    { sym: 'CRW', name: 'Crunchwave Games', type: 'stock', price: 24, drift: 0.09, vol: 0.42, div: 0 },
    { sym: 'AUR', name: 'Aurora Airlines', type: 'stock', price: 19, drift: 0.05, vol: 0.36, div: 0.012 },
    { sym: 'RLT', name: 'BrickYard REIT', type: 'stock', price: 54, drift: 0.065, vol: 0.22, div: 0.05 },
    { sym: 'CNX', name: 'CoinX', type: 'crypto', price: 3800, drift: 0.16, vol: 0.85, div: 0 },
    { sym: 'MEME', name: 'MemeCoin', type: 'crypto', price: 0.42, drift: 0.0, vol: 1.6, div: 0 },
  ];

  // ---------------------------------------------------------- lifestyle ----
  D.DIET = {
    cheap:    { name: 'Instant Noodle Budget', cost: 260, health: -0.035, desc: 'Cheap calories, slow toll on health.' },
    standard: { name: 'Standard Groceries', cost: 460, health: 0, desc: 'Balanced enough.' },
    healthy:  { name: 'Fresh & Healthy', cost: 720, health: 0.045, desc: 'Costs more, pays you back in health.' },
  };
  D.HEALTH_INSURANCE = {
    none:    { name: 'Uninsured', cost: 0, cover: 0, desc: 'Pray nothing happens.' },
    basic:   { name: 'Basic Plan', cost: 190, cover: 0.6, desc: 'Covers 60% of medical bills.' },
    premium: { name: 'Premium Plan', cost: 430, cover: 0.9, desc: 'Covers 90% of medical bills.' },
  };

  // Loans available on demand. Rates are spreads over the fed rate.
  D.LOAN_TYPES = {
    personal: { name: 'Personal Loan', spread: 0.065, maxTerm: 60, minCredit: 580 },
    auto:     { name: 'Auto Loan', spread: 0.028, maxTerm: 72, minCredit: 560 },
    student:  { name: 'Student Loan', spread: 0.012, maxTerm: 240, minCredit: 0 },
    mortgage: { name: 'Mortgage', spread: 0.017, maxTerm: 360, minCredit: 620 },
    business: { name: 'Business Loan', spread: 0.045, maxTerm: 120, minCredit: 640 },
  };

  D.SIDE_HUSTLES = {
    rideshare: { name: 'Rideshare Driving', icon: '🚗', base: 14, skill: null, needsCar: true,
      desc: 'Needs a car. Steady per-hour cash.' },
    freelance_code: { name: 'Freelance Coding', icon: '⌨️', base: 12, skill: 'programming', perSkill: 0.55,
      desc: 'Pays with programming skill.' },
    freelance_design: { name: 'Freelance Design', icon: '🖌️', base: 10, skill: 'design', perSkill: 0.45,
      desc: 'Pays with design skill.' },
    tutoring: { name: 'Tutoring', icon: '📖', base: 11, skill: 'communication', perSkill: 0.35,
      desc: 'Pays with communication skill.' },
    handyman: { name: 'Handyman Gigs', icon: '🪚', base: 12, skill: 'mechanics', perSkill: 0.40,
      desc: 'Pays with mechanics skill.' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
