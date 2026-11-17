import mongoose from 'mongoose';
import { DEFAULT_SECTION_ORDER } from '../data/roleProfiles.js';

const { Schema } = mongoose;
const opts = { _id: false };
const str = { type: String, trim: true, default: '' };

const education = new Schema({ id: String, institution: str, degree: str, field: str, location: str, start: str, end: str, score: str, details: str }, opts);
const experience = new Schema({ id: String, role: str, company: str, type: str, location: str, start: str, end: str, bullets: [String] }, opts);
const project = new Schema({ id: String, name: str, tech: str, link: str, start: str, end: str, bullets: [String] }, opts);
const skillGroup = new Schema({ id: String, category: str, items: [String] }, opts);
const certification = new Schema({ id: String, name: str, issuer: str, date: str, link: str }, opts);
const achievement = new Schema({ id: String, text: str }, opts);
const activity = new Schema({ id: String, role: str, organization: str, start: str, end: str, description: str }, opts);

const resumeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, default: 'Untitled CV', maxlength: 100 },
    versionLabel: { type: String, trim: true, default: 'v1', maxlength: 40 },
    parent: { type: Schema.Types.ObjectId, ref: 'Resume', default: null },
    targetRole: { type: String, default: 'general' },
    jobDescription: { type: String, default: '', maxlength: 15000 },
    template: { type: String, enum: ['classic', 'modern', 'minimal'], default: 'classic' },
    design: {
      font: { type: String, default: 'Inter' },
      fontSize: { type: Number, default: 10.5, min: 8, max: 13 },
      accent: { type: String, default: '#1d4ed8', match: /^#[0-9a-fA-F]{6}$/ },
      spacing: { type: String, enum: ['compact', 'normal', 'relaxed'], default: 'normal' }
    },
    personal: {
      fullName: str, headline: str, email: str, phone: str, location: str, linkedin: str, github: str, portfolio: str
    },
    summary: { type: String, default: '', maxlength: 2000 },
    education: [education],
    experience: [experience],
    projects: [project],
    skills: [skillGroup],
    certifications: [certification],
    achievements: [achievement],
    activities: [activity],
    sectionOrder: { type: [String], default: DEFAULT_SECTION_ORDER },
    hiddenSections: { type: [String], default: [] },
    sectionTitles: { type: Map, of: String, default: {} },
    lastScore: { type: Number, default: null }
  },
  { timestamps: true }
);

// Fields a client is allowed to set
export const EDITABLE_FIELDS = ['title', 'versionLabel', 'targetRole', 'jobDescription', 'template', 'design', 'personal', 'summary', 'education', 'experience', 'projects', 'skills', 'certifications', 'achievements', 'activities', 'sectionOrder', 'hiddenSections', 'sectionTitles', 'lastScore'];

export default mongoose.model('Resume', resumeSchema);
