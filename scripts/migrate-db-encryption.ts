import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import mongoose from "mongoose";
import crypto from "crypto";
import { Journal } from "../src/models/Journal";
import { JournalMedia } from "../src/models/JournalMedia";
import { JournalFood } from "../src/models/JournalFood";
import { JournalSpending } from "../src/models/JournalSpending";
import { JournalTasks } from "../src/models/JournalTasks";
import { JournalWorkouts } from "../src/models/JournalWorkouts";
import { WeeklyFocus } from "../src/models/WeeklyFocus";
import { Quote } from "../src/models/Quote";

function parseKeyring(): { activeKid: string; keys: Record<string, Buffer> } {
  const activeKid = String(process.env.DB_ENCRYPTION_ACTIVE_KID || "v1");
  const raw = String(process.env.DB_ENCRYPTION_KEYRING_JSON || "");
  if (!raw) throw new Error("Missing DB_ENCRYPTION_KEYRING_JSON");
  let keyMap: Record<string, string> = {};
  try {
    keyMap = JSON.parse(raw) as Record<string, string>;
  } catch {
    throw new Error("Invalid DB_ENCRYPTION_KEYRING_JSON");
  }
  const keys: Record<string, Buffer> = {};
  for (const [kid, b64] of Object.entries(keyMap)) {
    const buf = Buffer.from(b64, "base64");
    if (buf.length !== 32) throw new Error(`Key ${kid} must decode to 32 bytes`);
    keys[kid] = buf;
  }
  if (!keys[activeKid]) throw new Error(`Active kid ${activeKid} not found in keyring`);
  return { activeKid, keys };
}

function b64u(buf: Buffer): string {
  return buf.toString("base64url");
}

function encryptJsonForDb(value: unknown): string {
  const { activeKid, keys } = parseKeyring();
  const master = keys[activeKid];

  const dek = crypto.randomBytes(32);

  const ivData = crypto.randomBytes(12);
  const cipherData = crypto.createCipheriv("aes-256-gcm", dek, ivData);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ctData = Buffer.concat([cipherData.update(plaintext), cipherData.final()]);
  const tagData = cipherData.getAuthTag();

  const ivKey = crypto.randomBytes(12);
  const cipherKey = crypto.createCipheriv("aes-256-gcm", master, ivKey);
  const ctKey = Buffer.concat([cipherKey.update(dek), cipherKey.final()]);
  const tagKey = cipherKey.getAuthTag();

  return `dfdb:v1:${activeKid}:${b64u(ivData)}:${b64u(ctData)}:${b64u(tagData)}:${b64u(ivKey)}:${b64u(ctKey)}:${b64u(tagKey)}`;
}

async function migrateJournals() {
  const cursor = Journal.find({ $or: [{ enc: { $exists: false } }, { enc: null }, { enc: "" }] }).cursor();
  let n = 0;
  for await (const doc of cursor) {
    const mainTask = String((doc as any).mainTask ?? "");
    const notes = String((doc as any).notes ?? "");
    const mentorsComments = (doc as any).mentorsComments ?? [];
    const hasContent = mainTask.trim().length > 0 || notes.trim().length > 0;
    const enc = encryptJsonForDb({ mainTask, notes, mentorsComments });
    await Journal.updateOne(
      { _id: doc._id },
      { $set: { enc, mainTask: "", notes: "", hasContent }, $unset: { mentorsComments: "" } }
    );
    n += 1;
    if (n % 250 === 0) console.log(`journals migrated: ${n}`);
  }
  console.log(`journals migrated: ${n}`);
}

async function migrateMedia() {
  const cursor = JournalMedia.find({ $or: [{ enc: { $exists: false } }, { enc: null }, { enc: "" }] }).cursor();
  let n = 0;
  for await (const doc of cursor) {
    const images = Array.isArray((doc as any).images) ? (doc as any).images : [];
    const foodImages = Array.isArray((doc as any).foodImages) ? (doc as any).foodImages : [];
    const enc = encryptJsonForDb({ images, foodImages });
    await JournalMedia.updateOne({ _id: doc._id }, { $set: { enc, images: [], foodImages: [] } });
    n += 1;
    if (n % 250 === 0) console.log(`journal_media migrated: ${n}`);
  }
  console.log(`journal_media migrated: ${n}`);
}

async function migrateFood() {
  const cursor = JournalFood.find({ $or: [{ enc: { $exists: false } }, { enc: null }, { enc: "" }] }).cursor();
  let n = 0;
  for await (const doc of cursor) {
    const food = (doc as any).food ?? {};
    const enc = encryptJsonForDb({ food });
    await JournalFood.updateOne({ _id: doc._id }, { $set: { enc, food: {} } });
    n += 1;
    if (n % 250 === 0) console.log(`journal_foods migrated: ${n}`);
  }
  console.log(`journal_foods migrated: ${n}`);
}

async function migrateSpending() {
  const cursor = JournalSpending.find({ $or: [{ enc: { $exists: false } }, { enc: null }, { enc: "" }] }).cursor();
  let n = 0;
  for await (const doc of cursor) {
    const spending = Array.isArray((doc as any).spending) ? (doc as any).spending : [];
    const enc = encryptJsonForDb({ spending });
    await JournalSpending.updateOne({ _id: doc._id }, { $set: { enc, spending: [] } });
    n += 1;
    if (n % 250 === 0) console.log(`journal_spending migrated: ${n}`);
  }
  console.log(`journal_spending migrated: ${n}`);
}

async function migrateTasks() {
  const cursor = JournalTasks.find({ $or: [{ enc: { $exists: false } }, { enc: null }, { enc: "" }] }).cursor();
  let n = 0;
  for await (const doc of cursor) {
    const tasks = Array.isArray((doc as any).tasks) ? (doc as any).tasks : [];
    const enc = encryptJsonForDb({ tasks });
    await JournalTasks.updateOne({ _id: doc._id }, { $set: { enc, tasks: [] } });
    n += 1;
    if (n % 250 === 0) console.log(`journal_tasks migrated: ${n}`);
  }
  console.log(`journal_tasks migrated: ${n}`);
}

async function migrateWorkouts() {
  const cursor = JournalWorkouts.find({ $or: [{ enc: { $exists: false } }, { enc: null }, { enc: "" }] }).cursor();
  let n = 0;
  for await (const doc of cursor) {
    const workouts = Array.isArray((doc as any).workouts) ? (doc as any).workouts : [];
    const notes = String((doc as any).notes ?? "");
    const enc = encryptJsonForDb({ workouts, notes });
    await JournalWorkouts.updateOne({ _id: doc._id }, { $set: { enc, workouts: [], notes: "" } });
    n += 1;
    if (n % 250 === 0) console.log(`journal_workouts migrated: ${n}`);
  }
  console.log(`journal_workouts migrated: ${n}`);
}

async function migrateWeeklyFocus() {
  const cursor = WeeklyFocus.find({ $or: [{ enc: { $exists: false } }, { enc: null }, { enc: "" }] }).cursor();
  let n = 0;
  for await (const doc of cursor) {
    const tasks = (doc as any).tasks ?? { sunday: "", monday: "", tuesday: "", wednesday: "", thursday: "", friday: "", saturday: "" };
    const enc = encryptJsonForDb({ tasks });
    await WeeklyFocus.updateOne(
      { _id: doc._id },
      { $set: { enc, tasks: { sunday: "", monday: "", tuesday: "", wednesday: "", thursday: "", friday: "", saturday: "" } } }
    );
    n += 1;
    if (n % 250 === 0) console.log(`weekly_focus migrated: ${n}`);
  }
  console.log(`weekly_focus migrated: ${n}`);
}

async function migrateQuotes() {
  const cursor = Quote.find({ $or: [{ enc: { $exists: false } }, { enc: null }, { enc: "" }] }).cursor();
  let n = 0;
  for await (const doc of cursor) {
    const content = String((doc as any).content ?? "");
    const enc = encryptJsonForDb({ content });
    await Quote.updateOne({ _id: doc._id }, { $set: { enc, content: "" } });
    n += 1;
    if (n % 250 === 0) console.log(`quotes migrated: ${n}`);
  }
  console.log(`quotes migrated: ${n}`);
}

async function main() {
  const uri = String(process.env.MONGODB_URI || "");
  if (!uri) throw new Error("Missing MONGODB_URI");
  await mongoose.connect(uri);
  console.log("Starting migration: DB encryption backfill");

  await migrateJournals();
  await migrateMedia();
  await migrateFood();
  await migrateSpending();
  await migrateTasks();
  await migrateWorkouts();
  await migrateWeeklyFocus();
  await migrateQuotes();

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

