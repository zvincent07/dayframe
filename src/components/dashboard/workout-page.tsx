"use client";

import { useCallback, useEffect, useMemo, useState, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, GripVertical, Trash2, Check, Download, MoreHorizontal, FileJson, Upload, Settings2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { WorkoutHistoryFeed } from "@/components/dashboard/workout-history-feed";
import type { WorkoutDoc } from "@/components/dashboard/workout-history-feed";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { saveWorkoutRoutines, saveWorkoutSchedule, saveWorkoutLog, createWorkoutPlan, switchWorkoutPlan, deleteWorkoutPlan, getWorkoutHistory } from "@/actions/workout";
import { toast } from "sonner";
import { DAY_LABELS, DEFAULT_WEEKLY_SCHEDULE, LB_PER_KG } from "@/lib/constants";
import type {
  ActiveExercise,
  ActiveSession,
  DayOfWeek,
  Exercise,
  ExerciseCategory,
  Routine,
  RoutineExercise,
  RoutineId,
  WeeklySchedule,
  WorkoutSet,
} from "@/types/workout";

interface WorkoutPageProps {
  initialConfig: {
    routines: Routine[];
    schedule: {
      sunday: string;
      monday: string;
      tuesday: string;
      wednesday: string;
      thursday: string;
      friday: string;
      saturday: string;
    } | null;
    title?: string;
    activePlanId?: string;
    plans?: Array<{ id: string; title?: string; isActive: boolean; schedule: WeeklySchedule }>;
  } | null;
  today: string;
  initialLog: {
    exercise: string;
    sets?: number;
    reps?: string;
    rpe?: number;
    weight?: number;
    notes?: string;
    history?: {
      set: number;
      targetWeight?: number;
      actualWeight?: number;
      targetReps?: number;
      actualReps?: number;
      completed?: boolean;
    }[];
  }[];
  initialFinished?: boolean;
  initialNotes?: string;
  preferredUnits?: "metric" | "imperial";
}

const parseWeightPlan = (plan?: string | null): { weights: (number | string)[]; unit: "kg" | "lbs" } => {
  if (!plan) return { weights: [], unit: "kg" };
  const s = String(plan).toLowerCase();
  const matches = [...s.matchAll(/(\d+(?:\.\d+)?)(kg|lbs|lb|p|bp)?|(bw|max|full)/g)];
  const weights: (number | string)[] = [];
  let unit: "kg" | "lbs" = "kg";
  for (const m of matches) {
    if (m[3]) {
      weights.push(m[3] === 'full' ? 'max' : m[3]);
      continue;
    }
    const value = parseFloat(m[1]);
    const suffix = (m[2] || "").toLowerCase();
    if (isNaN(value)) continue;
    if (suffix === "lbs" || suffix === "lb") {
      unit = "lbs";
      weights.push(Math.round(value * 0.453592 * 100) / 100);
    } else if (suffix === "bp") {
      weights.push(Math.round(value * 10 * 0.453592 * 100) / 100);
    } else if (suffix === "p") {
      weights.push(Math.round(value * 5 * 0.453592 * 100) / 100);
    } else {
      if (suffix === "kg") unit = "kg";
      weights.push(value);
    }
  }
  return { weights, unit };
};

const getPlannedWeightForSet = (weights: (number | string)[], index: number): number | string | undefined => {
  if (!weights.length) return undefined;
  if (index < weights.length) return weights[index];
  return weights[weights.length - 1];
};

function parseRepsRange(input: string): { min: number; max: number } {
  if (!input) return { min: 0, max: 0 };
  const matches = input.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return { min: 0, max: 0 };
  const nums = matches.map((m) => parseFloat(m));
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function parseTargetReps(input: string): number {
  const r = parseRepsRange(input);
  return r.max;
}

/** Stored weights are always kg strings internally; convert for display when user prefers imperial. */
function kgStorageStringToDisplayWeight(kgStr: string, weightUnit: "metric" | "imperial"): string {
  const t = String(kgStr || "").trim();
  if (!t) return "";
  if (t.toLowerCase() === "bw") return "bw";
  if (t.toLowerCase() === "max") return "max";
  const kg = parseFloat(t);
  if (Number.isNaN(kg)) return kgStr;
  if (weightUnit === "imperial") {
    return String(Math.round(kg * LB_PER_KG * 10) / 10);
  }
  return t;
}

function normalizeWeightInput(raw: string, exerciseId?: string, weightUnit: "metric" | "imperial" = "metric"): string {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "b" || s === "bw") return "bw";
  if (s === "max" || s === "full") return "max";
  if (s === "none") {
    const id = String(exerciseId || "").toLowerCase();
    const isBw = id.includes("pullup") || id.includes("chinup") || id.includes("pushup") || id.includes("dip") || id.includes("archer-pull");
    return isBw ? "bw" : "";
  }
  if (s.endsWith("kg")) {
    const v = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(v) ? "" : String(v);
  }
  if (s.endsWith("lb") || s.endsWith("lbs")) {
    const v = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (isNaN(v)) return "";
    const kg = Math.round(v * 0.453592 * 100) / 100;
    return String(kg);
  }
  if (s.endsWith("bp")) {
    const p = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (isNaN(p)) return "";
    const kg = Math.round(p * 10 * 0.453592 * 100) / 100;
    return String(kg);
  }
  if (s.endsWith("p")) {
    const p = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (isNaN(p)) return "";
    const kg = Math.round(p * 5 * 0.453592 * 100) / 100;
    return String(kg);
  }
  const plain = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (!isNaN(plain)) {
    if (weightUnit === "imperial") {
      return String(Math.round(plain * 0.453592 * 100) / 100);
    }
    return String(plain);
  }
  return raw;
}

function toKg(weightStr: string): number {
  const s = String(weightStr || "").trim().toLowerCase();
  if (!s) return 0;
  if (s === "bw") return 0;
  if (s === "max") return 0;
  if (s.endsWith("bp")) {
    const p = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(p) ? 0 : p * 10 * 0.453592;
  }
  if (s.endsWith("p")) {
    const p = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(p) ? 0 : p * 5 * 0.453592;
  }
  if (s.includes("lb")) {
    const v = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(v) ? 0 : v * 0.453592;
  }
  const v = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(v) ? 0 : v;
}

const EXERCISES: Exercise[] = [
  // Pull (back / biceps)
  { id: "wg-pulldown", name: "Wide-Grip Pulldown", targetMuscle: "Lats", category: "pull" },
  { id: "closegrip-pulldown", name: "Close-Grip Pulldown", targetMuscle: "Lats / Mid Back", category: "pull" },
  { id: "mag-neutral-pulldown", name: "Mag Grip Pulldown (Neutral)", targetMuscle: "Lats", category: "pull" },
  { id: "mag-wide-pulldown", name: "Mag Grip Pulldown (Wide)", targetMuscle: "Lats", category: "pull" },
  { id: "mag-close-pulldown", name: "Mag Grip Pulldown (Close)", targetMuscle: "Lats", category: "pull" },
  { id: "row-cable", name: "Seated Cable Row", targetMuscle: "Mid Back", category: "pull" },
  { id: "row-chest", name: "Chest-Supported Row", targetMuscle: "Upper Back", category: "pull" },
  { id: "row-barbell", name: "Barbell Row", targetMuscle: "Lats / Mid Back", category: "pull" },
  { id: "row-pendlay", name: "Pendlay Row", targetMuscle: "Mid Back", category: "pull" },
  { id: "row-singlearm-db", name: "Single-Arm DB Row", targetMuscle: "Lats", category: "pull" },
  { id: "tbar-row", name: "T-Bar Row", targetMuscle: "Mid Back", category: "pull" },
  { id: "seated-row", name: "Seated Row (Machine)", targetMuscle: "Mid Back", category: "pull" },
  { id: "pullup", name: "Pull-Up", targetMuscle: "Lats / Biceps", category: "pull" },
  { id: "chinup", name: "Chin-Up", targetMuscle: "Lats / Biceps", category: "pull" },
  { id: "supinated-pull-up", name: "Supinated Pull-Up", targetMuscle: "Lats / Biceps", category: "pull" },
  { id: "weighted-pullup", name: "Weighted Pull-Up", targetMuscle: "Lats / Biceps", category: "pull" },
  { id: "weighted-chinup", name: "Weighted Chin-Up", targetMuscle: "Lats / Biceps", category: "pull" },
  { id: "archer-pullup", name: "Archer Pull-Up", targetMuscle: "Lats / Biceps", category: "pull" },
  { id: "singlearm-lat-pulldown", name: "Single-Arm Lat Pulldown", targetMuscle: "Lats", category: "pull" },
  { id: "row-singlearm-cable", name: "Single-Arm Cable Row", targetMuscle: "Lats / Mid Back", category: "pull" },
  { id: "lat-pullover", name: "Cable Pullover", targetMuscle: "Lats", category: "pull" },
  { id: "face-pull", name: "Face Pull", targetMuscle: "Rear Delts / Upper Back", category: "pull" },
  { id: "archer-pull", name: "Archer Pull", targetMuscle: "Rear Delts", category: "pull" },
  { id: "reverse-fly", name: "Reverse Fly", targetMuscle: "Rear Delts", category: "pull" },
  { id: "curl-db", name: "DB Curl", targetMuscle: "Biceps", category: "pull" },
  { id: "curl-barbell", name: "Barbell Curl", targetMuscle: "Biceps", category: "pull" },
  { id: "curl-machine", name: "Bicep Curl (Machine)", targetMuscle: "Biceps", category: "pull" },
  { id: "curl-incline-db", name: "Incline DB Curl", targetMuscle: "Biceps", category: "pull" },
  { id: "curl-hammer", name: "Hammer Curl", targetMuscle: "Brachialis", category: "pull" },
  { id: "preacher-curl", name: "Preacher Curl", targetMuscle: "Biceps", category: "pull" },
  { id: "reverse-curl", name: "Reverse Curl", targetMuscle: "Brachioradialis / Forearms", category: "pull" },
  { id: "wrist-curl", name: "Wrist Curl", targetMuscle: "Forearms (Flexors)", category: "pull" },
  { id: "wrist-extension", name: "Wrist Extension", targetMuscle: "Forearms (Extensors)", category: "pull" },

  // Push (chest / shoulders / triceps)
  { id: "bench-flat", name: "Barbell Bench Press", targetMuscle: "Chest", category: "push" },
  { id: "bench-flat-db", name: "Flat DB Bench Press", targetMuscle: "Chest", category: "push" },
  { id: "bench-machine", name: "Chest Press (Machine)", targetMuscle: "Chest", category: "push" },
  { id: "bench-smith", name: "Smith Machine Bench Press", targetMuscle: "Chest", category: "push" },
  { id: "incline-db-bench", name: "Incline DB Bench Press", targetMuscle: "Upper Chest", category: "push" },
  { id: "incline-bench-barbell", name: "Incline Barbell Bench Press", targetMuscle: "Upper Chest", category: "push" },
  { id: "incline-bench-smith", name: "Smith Machine Incline Press", targetMuscle: "Upper Chest", category: "push" },
  { id: "closegrip-bench", name: "Close-Grip Bench Press", targetMuscle: "Chest / Triceps", category: "push" },
  { id: "pushup", name: "Push-Up", targetMuscle: "Chest / Triceps", category: "push" },
  { id: "weighted-pushup", name: "Weighted Push-Up", targetMuscle: "Chest / Triceps", category: "push" },
  { id: "dip", name: "Parallel Bar Dips", targetMuscle: "Chest / Triceps", category: "push" },
  { id: "dip-assisted", name: "Assisted Dip (Machine)", targetMuscle: "Chest / Triceps", category: "push" },
  { id: "weighted-dip", name: "Weighted Dips", targetMuscle: "Chest / Triceps", category: "push" },
  { id: "ring-dip", name: "Ring Dips", targetMuscle: "Chest / Triceps / Shoulders", category: "push" },
  { id: "press-ohp", name: "Standing Barbell OHP", targetMuscle: "Shoulders", category: "push" },
  { id: "military-press", name: "Military Press", targetMuscle: "Shoulders", category: "push" },
  { id: "shoulder-press-machine", name: "Shoulder Press (Machine)", targetMuscle: "Shoulders", category: "push" },
  { id: "seated-db-press", name: "Seated DB Shoulder Press", targetMuscle: "Shoulders", category: "push" },
  { id: "arnold-press", name: "Arnold Press", targetMuscle: "Shoulders", category: "push" },
  { id: "lat-raise-db", name: "DB Lateral Raise", targetMuscle: "Side Delts", category: "push" },
  { id: "lat-raise-cable", name: "Cable Lateral Raise", targetMuscle: "Side Delts", category: "push" },
  { id: "lat-raise-machine", name: "Machine Lateral Raise", targetMuscle: "Side Delts", category: "push" },
  { id: "flies-cable", name: "Cable Flyes", targetMuscle: "Chest", category: "push" },
  { id: "flies-machine", name: "Machine Chest Fly", targetMuscle: "Chest", category: "push" },
  { id: "pushdown", name: "Cable Pushdown", targetMuscle: "Triceps", category: "push" },
  { id: "pushdown-straightbar", name: "Straight Bar Pushdown (SB)", targetMuscle: "Triceps", category: "push" },
  { id: "skullcrusher", name: "Skull Crusher", targetMuscle: "Triceps", category: "push" },
  { id: "overhead-tricep-ext", name: "Overhead Triceps Extension", targetMuscle: "Triceps", category: "push" },
  { id: "overhead-tricep-ext-machine", name: "Tricep Extension (Machine)", targetMuscle: "Triceps", category: "push" },

  // Legs (quads / hamstrings / glutes / calves)
  { id: "squat-hs", name: "Hack Squat", targetMuscle: "Quads", category: "legs" },
  { id: "back-squat", name: "Back Squat", targetMuscle: "Quads / Glutes", category: "legs" },
  { id: "back-squat-smith", name: "Smith Machine Squat", targetMuscle: "Quads / Glutes", category: "legs" },
  { id: "front-squat", name: "Front Squat", targetMuscle: "Quads", category: "legs" },
  { id: "zercher-squat", name: "Zercher Squat", targetMuscle: "Quads / Glutes", category: "legs" },
  { id: "pendulum-squat", name: "Pendulum Squat", targetMuscle: "Quads", category: "legs" },
  { id: "rdl", name: "Romanian Deadlift", targetMuscle: "Hamstrings", category: "legs" },
  { id: "deadlift-conv", name: "Conventional Deadlift", targetMuscle: "Posterior Chain", category: "legs" },
  { id: "deadlift-sumo", name: "Sumo Deadlift", targetMuscle: "Posterior Chain", category: "legs" },
  { id: "leg-press", name: "Leg Press (45 Degree)", targetMuscle: "Quads / Glutes", category: "legs" },
  { id: "leg-press-horizontal", name: "Leg Press (Horizontal Machine)", targetMuscle: "Quads / Glutes", category: "legs" },
  { id: "leg-ext", name: "Leg Extension", targetMuscle: "Quads", category: "legs" },
  { id: "leg-ext-single", name: "Single-Leg Leg Extension (SL)", targetMuscle: "Quads", category: "legs" },
  { id: "leg-curl", name: "Lying Leg Curl", targetMuscle: "Hamstrings", category: "legs" },
  { id: "leg-curl-seated", name: "Seated Leg Curl", targetMuscle: "Hamstrings", category: "legs" },
  { id: "good-morning", name: "Good Morning", targetMuscle: "Hamstrings / Glutes", category: "legs" },
  { id: "lunge-db", name: "DB Lunge", targetMuscle: "Quads / Glutes", category: "legs" },
  { id: "lunge-walking", name: "Walking Lunge", targetMuscle: "Quads / Glutes", category: "legs" },
  { id: "split-squat-bulgarian", name: "Bulgarian Split Squat", targetMuscle: "Quads / Glutes", category: "legs" },
  { id: "pistol-squat", name: "Pistol Squat", targetMuscle: "Quads / Glutes", category: "legs" },
  { id: "hip-thrust-barbell", name: "Barbell Hip Thrust", targetMuscle: "Glutes / Hamstrings", category: "legs" },
  { id: "hip-thrust-machine", name: "Machine Hip Thrust", targetMuscle: "Glutes", category: "legs" },
  { id: "hip-thrust-singleleg", name: "Single-Leg Hip Thrust (SL)", targetMuscle: "Glutes / Hamstrings", category: "legs" },
  { id: "glute-bridge-bw", name: "Bodyweight Glute Bridge", targetMuscle: "Glutes", category: "legs" },
  { id: "calf-raise", name: "Standing Calf Raise", targetMuscle: "Calves", category: "legs" },
  { id: "calf-raise-seated", name: "Seated Calf Raise", targetMuscle: "Calves", category: "legs" },
  { id: "calf-press-legpress", name: "Calf Press (on Leg Press)", targetMuscle: "Calves", category: "legs" },
  { id: "adductor", name: "Adductor (Inner Thigh Machine)", targetMuscle: "Adductors", category: "legs" },
  { id: "abductor", name: "Abductor (Glute Machine)", targetMuscle: "Glutes / Abductors", category: "legs" },
  { id: "back-extension", name: "Back Extension", targetMuscle: "Lower Back / Glutes", category: "legs" },

  // Core
  { id: "plank", name: "Plank", targetMuscle: "Core", category: "core" },
  { id: "side-plank", name: "Side Plank", targetMuscle: "Obliques", category: "core" },
  { id: "weighted-plank", name: "Weighted Plank", targetMuscle: "Core", category: "core" },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", targetMuscle: "Lower Abs", category: "core" },
  { id: "toes-to-bar", name: "Toes to Bar", targetMuscle: "Abs / Hip Flexors", category: "core" },
  { id: "cable-crunch", name: "Cable Crunch", targetMuscle: "Abs", category: "core" },
  { id: "machine-crunch", name: "Ab Crunch (Machine)", targetMuscle: "Abs", category: "core" },
  { id: "ab-wheel", name: "Ab Wheel Rollout", targetMuscle: "Core", category: "core" },
  { id: "russian-twist", name: "Russian Twist", targetMuscle: "Obliques", category: "core" },
   { id: "cable-rotation", name: "Cable Rotation", targetMuscle: "Obliques / Core", category: "core" },
];

interface RoutineEditorProps {
  initialRoutines: Routine[];
  onSaveRoutines: (routines: Routine[], closeAfter?: boolean) => Promise<void>;
  onCancel: () => void;
}

function RoutineEditor({ initialRoutines, onSaveRoutines, onCancel }: RoutineEditorProps) {
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);

  const [selectedRoutineId, setSelectedRoutineId] = useState<RoutineId>(
    routines[0]?.routineId ?? "CUSTOM_1"
  );
  const [exerciseFilter, setExerciseFilter] = useState<"all" | ExerciseCategory>("all");

  const selectedRoutine =
    routines.find((r) => r.routineId === selectedRoutineId) ?? routines[0];

  const handleRoutineNameChange = (name: string) => {
    setRoutines((prev) =>
      prev.map((routine) =>
        routine.routineId === selectedRoutineId ? { ...routine, name } : routine
      )
    );
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !selectedRoutine) return;
    
    const { source, destination } = result;
    if (source.index === destination.index) return;

    const newExercises = Array.from(selectedRoutine.exercises);
    const [removed] = newExercises.splice(source.index, 1);
    newExercises.splice(destination.index, 0, removed);

    setRoutines((prev) =>
      prev.map((routine) =>
        routine.routineId === selectedRoutineId
          ? { ...routine, exercises: newExercises }
          : routine
      )
    );
  };

  const handleAddRoutine = () => {
    const existingIds = routines.map((r) => r.routineId);
    let counter = 1;
    let newId: RoutineId = `CUSTOM_${counter}`;
    while (existingIds.includes(newId)) {
      counter += 1;
      newId = `CUSTOM_${counter}`;
    }
    const next: Routine = {
      routineId: newId,
      name: `Custom ${counter}`,
      exercises: [],
    };
    setRoutines((prev) => [...prev, next]);
    setSelectedRoutineId(newId);
  };

  const handleDeleteRoutineLocal = () => {
    if (!selectedRoutine) return;
    if (routines.length <= 1) return;
    const filtered = routines.filter((r) => r.routineId !== selectedRoutineId) as Routine[];
    setRoutines(() => filtered);
    setSelectedRoutineId(filtered[0]?.routineId ?? "CUSTOM_1");
  };

  const handleExerciseChange = (
    index: number,
    field: keyof RoutineExercise,
    value: string | number
  ) => {
    setRoutines((prev) =>
      prev.map((routine) => {
        if (routine.routineId !== selectedRoutineId) return routine;
        const exercises = routine.exercises.map((ex, i) =>
          i === index ? { ...ex, [field]: value } : ex
        );
        return { ...routine, exercises };
      })
    );
  };

  const handleExerciseIdChange = (index: number, exerciseId: string) => {
    setRoutines((prev) =>
      prev.map((routine) => {
        if (routine.routineId !== selectedRoutineId) return routine;
        const exercises = routine.exercises.map((ex, i) =>
          i === index ? { ...ex, exerciseId } : ex
        );
        return { ...routine, exercises };
      })
    );
  };

  const handleAddExercise = () => {
    const defaultExerciseId = EXERCISES[0]?.id ?? "wg-pulldown";
    setRoutines((prev) =>
      prev.map((routine) =>
        routine.routineId !== selectedRoutineId
          ? routine
          : {
              ...routine,
              exercises: [
                ...routine.exercises,
                {
                  id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  exerciseId: defaultExerciseId,
                  targetSets: 3,
                  targetReps: "8-10",
                  targetRPE: 8,
                  targetWeight: "",
                  restTime: "90s",
                },
              ],
            }
      )
    );
  };

  const handleRemoveExercise = (index: number) => {
    setRoutines((prev) =>
      prev.map((routine) =>
        routine.routineId !== selectedRoutineId
          ? routine
          : {
              ...routine,
              exercises: routine.exercises.filter((_, i) => i !== index),
            }
      )
    );
  };

  const previousWeightsRef = useRef<Record<number, string>>({});

  const handleAppendWeight = (index: number, currentVal: string, increment: number) => {
    previousWeightsRef.current[index] = currentVal;

    if (!currentVal.trim()) {
      handleExerciseChange(index, "targetWeight", `${increment}kg`);
      return;
    }

    const newStr = currentVal.replace(/([\d.]+)/g, (match) => {
      const val = parseFloat(match);
      if (isNaN(val)) return match;
      return String(parseFloat((val + increment).toFixed(2)));
    });

    handleExerciseChange(index, "targetWeight", newStr);
  };

  const handleUndoWeight = (index: number) => {
    const prev = previousWeightsRef.current[index];
    if (prev !== undefined) {
      handleExerciseChange(index, "targetWeight", prev);
      // Keep the ref so undo always reverts to pre-increment state
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Select
            value={selectedRoutineId}
            onValueChange={(val) => {
              if (val === "__new") {
                handleAddRoutine();
                return;
              }
              setSelectedRoutineId(val as RoutineId);
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-[180px] justify-between border-border/60 bg-background/60"
            >
              <SelectValue placeholder="Select routine" />
            </SelectTrigger>
            <SelectContent>
              {routines.map((routine) => (
                <SelectItem key={routine.routineId} value={routine.routineId}>
                  {routine.name}
                </SelectItem>
              ))}
              <SelectItem value="__new">+ Create new routine</SelectItem>
            </SelectContent>
          </Select>

          {selectedRoutine && (
            <input
              type="text"
              className="h-9 w-full rounded-md bg-transparent px-0 text-sm font-semibold outline-none border-none focus-visible:ring-0 focus-visible:outline-none"
              value={selectedRoutine.name}
              onChange={(e) => handleRoutineNameChange(e.target.value)}
              placeholder="Routine title"
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
          <span className="text-muted-foreground uppercase tracking-wide">
            Exercises for this routine
          </span>
          <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Filter
            </span>
            {["all", "push", "pull", "legs", "core"].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${
                  exerciseFilter === cat
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/40"
                }`}
                onClick={() => setExerciseFilter(cat as "all" | ExerciseCategory)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        {/* Column headers – keep grid template in sync with rows below */}
        <div className="hidden sm:grid sm:grid-cols-[auto_minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,1.8fr)_minmax(0,0.8fr)] items-center gap-2 border-b border-border/60 pb-2 text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wide">
          <div className="flex items-center justify-center text-muted-foreground">
            <GripVertical className="h-3 w-3 opacity-0" aria-hidden />
          </div>
          <span className="pl-0.5">Exercise</span>
          <span>Sets</span>
          <span>Reps</span>
          <span>RPE</span>
          <span>Weight</span>
          <span>Rest</span>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="exercises">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-0"
              >
                {selectedRoutine?.exercises.map((exercise, index) => {
                  const exId = exercise.id || `${selectedRoutineId}-ex-${index}`;
                  const exerciseMeta = EXERCISES.find((e) => e.id === exercise.exerciseId);
                  const optionsForRow =
                    exerciseFilter === "all"
                      ? EXERCISES
                      : EXERCISES.filter(
                          (e) =>
                            e.category === exerciseFilter || e.id === exercise.exerciseId
                        );

                  const renderExerciseContent = (draggableProvided: any, snapshot: any) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      style={{
                        ...draggableProvided.draggableProps.style,
                      }}
                      className={`flex flex-col gap-3 sm:grid sm:grid-cols-[auto_minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,1.8fr)_minmax(0,0.8fr)] sm:items-center gap-2 border-b border-border/40 py-2 last:border-b-0 transition-colors ${
                        snapshot.isDragging 
                          ? 'bg-zinc-900 border border-zinc-700/50 shadow-2xl rounded-lg h-fit z-[9999] opacity-100 ring-2 ring-emerald-500/20' 
                          : 'bg-transparent'
                      }`}
                    >
                      <div 
                        {...draggableProvided.dragHandleProps}
                        className="flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing hover:text-emerald-500 transition-colors px-1"
                      >
                        <GripVertical className="h-4 w-4 opacity-100" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Select
                          value={exercise.exerciseId}
                          onValueChange={(val) => handleExerciseIdChange(index, val)}
                        >
                          <SelectTrigger className="h-9 w-full justify-between border-border/60 bg-background/60">
                            <SelectValue placeholder="Exercise" />
                          </SelectTrigger>
                          <SelectContent>
                            {(["push", "pull", "legs", "core"] as const).map((cat, catIdx, arr) => {
                              const exercisesInCat = optionsForRow.filter((e) => e.category === cat);
                              if (exercisesInCat.length === 0) return null;
                              return (
                                <SelectGroup key={cat}>
                                  <SelectLabel className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{cat}</SelectLabel>
                                  {exercisesInCat.map((ex) => (
                                    <SelectItem key={ex.id} value={ex.id}>
                                      {ex.name}
                                    </SelectItem>
                                  ))}
                                  {catIdx < arr.length - 1 && <SelectSeparator />}
                                </SelectGroup>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <span className="text-[11px] text-muted-foreground px-1">
                          {exerciseMeta?.targetMuscle}
                        </span>
                      </div>

                      <input
                        type="number"
                        min={1}
                        className="h-9 w-full rounded-md border border-border/60 bg-background/60 px-2 text-xs"
                        value={exercise.targetSets}
                        onChange={(e) =>
                          handleExerciseChange(index, "targetSets", Number(e.target.value) || 0)
                        }
                      />
                      <input
                        type="text"
                        className="h-9 w-full rounded-md border border-border/60 bg-background/60 px-2 text-xs"
                        value={exercise.targetReps}
                        onChange={(e) => handleExerciseChange(index, "targetReps", e.target.value)}
                      />
                      <input
                        type="number"
                        min={5}
                        max={10}
                        className="h-9 w-full rounded-md border border-border/60 bg-background/60 px-2 text-xs"
                        value={exercise.targetRPE}
                        onChange={(e) =>
                          handleExerciseChange(index, "targetRPE", Number(e.target.value) || 0)
                        }
                      />
                      <div className="flex flex-col gap-1 w-full">
                        <input
                          type="text"
                          className="h-9 w-full rounded-md border border-border/60 bg-background/60 px-2 text-xs"
                          placeholder="e.g. 60 70 80 or max"
                          value={exercise.targetWeight ?? ""}
                          onChange={(e) => handleExerciseChange(index, "targetWeight", e.target.value)}
                        />
                        <div className="flex items-center gap-1 pl-1">
                          <button type="button" onClick={() => handleAppendWeight(index, exercise.targetWeight ?? "", 2.5)} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400 border border-border/30 transition-colors">+2.5</button>
                          <button type="button" onClick={() => handleAppendWeight(index, exercise.targetWeight ?? "", 5)} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400 border border-border/30 transition-colors">+5</button>
                          <button type="button" onClick={() => { previousWeightsRef.current[index] = exercise.targetWeight ?? ""; handleExerciseChange(index, "targetWeight", "max"); }} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400 border border-border/30 transition-colors">Max</button>
                          <button type="button" onClick={() => { previousWeightsRef.current[index] = exercise.targetWeight ?? ""; handleExerciseChange(index, "targetWeight", "bw"); }} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground hover:bg-blue-500/20 hover:text-blue-400 border border-border/30 transition-colors">BW</button>
                          <button type="button" onClick={() => handleUndoWeight(index)} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 border border-border/30 transition-colors" title="Undo last change">↺</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-start gap-2">
                        <input
                          type="text"
                          className="h-9 w-full rounded-md border border-border/60 bg-background/60 px-2 text-xs"
                          value={exercise.restTime}
                          onChange={(e) => handleExerciseChange(index, "restTime", e.target.value)}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveExercise(index)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  );

                  return (
                    <Draggable key={exId} draggableId={exId} index={index}>
                      {(provided, snapshot) => {
                        const child = renderExerciseContent(provided, snapshot);
                        if (snapshot.isDragging) {
                          return createPortal(
                            <div className="dayframe-dnd-portal fixed inset-0 pointer-events-none z-[9999]">
                              {child}
                            </div>,
                            document.body
                          );
                        }
                        return child;
                      }}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {selectedRoutine?.exercises.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No exercises yet. Click &quot;Add exercise&quot; to start building this routine.
          </p>
        )}

        <button
          type="button"
          onClick={handleAddExercise}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-muted/50 hover:text-foreground"
        >
          + Add exercise
        </button>

        <div className="mt-4 flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!selectedRoutine || routines.length <= 1}
              onClick={handleDeleteRoutineLocal}
              className="text-red-500 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete routine
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!selectedRoutine}
              onClick={() => {
                if (!selectedRoutine) return;
                const newId = `CUSTOM_${Date.now()}`;
                const newRoutine = {
                  ...selectedRoutine,
                  routineId: newId,
                  name: `${selectedRoutine.name} (Copy)`,
                  exercises: selectedRoutine.exercises.map((e) => ({ ...e, id: `${newId}-ex-${Math.random().toString(36).substr(2, 9)}` })),
                };
                setRoutines([...routines, newRoutine]);
                setSelectedRoutineId(newId);
                toast.success("Routine duplicated");
              }}
              className="text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              Duplicate routine
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                await onSaveRoutines(routines, true);
                onCancel();
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkoutPage({ initialConfig, today, initialLog, initialFinished = false, initialNotes = "", preferredUnits = "metric" }: WorkoutPageProps) {
  const weightUnitPref: "metric" | "imperial" = preferredUnits === "imperial" ? "imperial" : "metric";
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [todayFinished, setTodayFinished] = useState(initialFinished);
  const todayIndex = useMemo(() => new Date(today).getDay() as DayOfWeek, [today]);
  
  useEffect(() => {
    setTodayFinished(initialFinished);
  }, [initialFinished, today]);

  const [customTitle, setCustomTitle] = useState(initialConfig?.title ?? "Push/Pull/Legs split");
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(() => {
    if (initialConfig?.schedule) {
      const s = initialConfig.schedule;
      const map: WeeklySchedule = {
        0: (s.sunday as RoutineId) ?? "REST",
        1: (s.monday as RoutineId) ?? "REST",
        2: (s.tuesday as RoutineId) ?? "REST",
        3: (s.wednesday as RoutineId) ?? "REST",
        4: (s.thursday as RoutineId) ?? "REST",
        5: (s.friday as RoutineId) ?? "REST",
        6: (s.saturday as RoutineId) ?? "REST",
      };
      return map;
    }
    return DEFAULT_WEEKLY_SCHEDULE;
  });

  // Sync state with server props when they change (optimistic hydration)
  useEffect(() => {
    if (initialConfig?.activePlanId && initialConfig.plans) {
      const activePlan = initialConfig.plans.find(p => p.id === initialConfig.activePlanId);
      if (activePlan) {
        setCustomTitle(activePlan.title || "Push/Pull/Legs split");
        const newSchedule: WeeklySchedule = {
          0: "REST", 1: "REST", 2: "REST", 3: "REST", 4: "REST", 5: "REST", 6: "REST"
        };
        
        if (activePlan.schedule) {
          const s = activePlan.schedule as Record<string, unknown>;
          newSchedule[0] = (s.sunday as RoutineId) ?? "REST";
          newSchedule[1] = (s.monday as RoutineId) ?? "REST";
          newSchedule[2] = (s.tuesday as RoutineId) ?? "REST";
          newSchedule[3] = (s.wednesday as RoutineId) ?? "REST";
          newSchedule[4] = (s.thursday as RoutineId) ?? "REST";
          newSchedule[5] = (s.friday as RoutineId) ?? "REST";
          newSchedule[6] = (s.saturday as RoutineId) ?? "REST";
        }
        
        setWeeklySchedule(newSchedule);
      }
    }
    
    if (initialConfig?.routines) {
      setRoutines(initialConfig.routines);
    }
  }, [initialConfig]);

  // Removed unused logNotes and setLogs to satisfy linter; session state is tracked via activeSession.
  const [routines, setRoutines] = useState<Routine[]>(
    initialConfig?.routines && initialConfig.routines.length > 0
      ? initialConfig.routines
      : [
          {
            routineId: "CUSTOM_1",
            name: "Custom 1",
            exercises: [],
          },
        ]
  );

  const routineById = useMemo(() => {
    const map: Record<RoutineId, Routine> = {};
    routines.forEach((routine) => {
      map[routine.routineId] = routine;
    });
    return map;
  }, [routines]);

  const todayKey = useMemo(
    () => (todayIndex >= 0 && todayIndex <= 6 ? todayIndex : (new Date().getDay() as DayOfWeek)),
    [todayIndex]
  );

  const todayRoutineId = weeklySchedule[todayKey];
  const activeRoutine =
    todayRoutineId === "REST" ? undefined : routineById[todayRoutineId];

  const todayLabel = useMemo(() => {
    const [y, m, d] = today.split("-").map(Number);
    return format(new Date(y, m - 1, d), "EEEE, MMMM d");
  }, [today]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeRoutineRef = useRef(activeRoutine);
  activeRoutineRef.current = activeRoutine;
  const todayFinishedRef = useRef(todayFinished);
  todayFinishedRef.current = todayFinished;

  const [activeSession, setActiveSession] = useState<ActiveSession>({
    startTime: null,
    exercises: [],
  });

  const touchedSessionRef = useRef(false);

  // Hydrate session from logs/routine on load, or localStorage if available
  useEffect(() => {
    if (touchedSessionRef.current) return;
    
    if (!activeRoutine && initialLog.length === 0) {
      setActiveSession({
        startTime: null,
        exercises: [],
      });
      return;
    }

    if (todayFinished) return;

    const storageKey = `workout-session-${today}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ActiveSession;
        // Ensure stored session matches the *current* active routine structure!
        // If the user switched plans, the stored session might belong to the old plan's routine for today.
        const storedRoutineId = parsed?.exercises?.[0]?.id?.split(":")[0];
        if (parsed?.exercises?.length > 0 && activeRoutine && storedRoutineId === activeRoutine.routineId) {
          let startTime: Date | null = null;
          if (parsed.startTime != null) {
            const d = new Date(parsed.startTime as unknown as string | number | Date);
            startTime = Number.isNaN(d.getTime()) ? new Date() : d;
          }
          setActiveSession({ ...parsed, startTime });
          return;
        }
      }
    } catch {
      // Failed to load session from storage, ignore
    }
    
    // Hydrate session from logs and active routine
    const exercises: ActiveExercise[] = [];
    const exerciseMap = new Map<string, ActiveExercise>();

    // 1. First, populate from active routine (targets)
    if (activeRoutine) {
      activeRoutine.exercises.forEach((item, index) => {
        const exerciseDef = resolveExercise(item.exerciseId);
        const name = exerciseDef?.name ?? item.exerciseId;
        const exerciseKey = `${activeRoutine.routineId}:${item.exerciseId}:${index}`;
        
        // Find logs for this specific exercise name
        const logEntry = initialLog.find(l => l.exercise === name);
        const existingSetsLogs = logEntry?.history ?? [];
        
        const { weights } = parseWeightPlan(item.targetWeight);
        const targetReps = item.targetReps || "0";
        const targetSetsCount = item.targetSets || 3;
        const setCount = Math.max(existingSetsLogs.length, targetSetsCount);
        
        const sets: WorkoutSet[] = Array.from({ length: setCount }).map((_, i) => {
          const log = existingSetsLogs[i];
          const targetW = getPlannedWeightForSet(weights, i);
          
          return {
            id: `${exerciseKey}-set-${i}`,
            targetWeight: targetW ? String(targetW) : "",
            targetReps: targetReps,
            actualWeight: log?.actualWeight ? String(log.actualWeight) : (targetW ? String(targetW) : ""),
            actualReps: log?.actualReps ? String(log.actualReps) : "",
            isCompleted: !!log?.completed,
            userAdded: i >= targetSetsCount,
          };
        });

        const activeEx: ActiveExercise = {
          id: exerciseKey,
          exerciseId: item.exerciseId,
          name,
          sets,
        };
        exercises.push(activeEx);
        exerciseMap.set(name, activeEx);
      });
    }

    // 2. Second, add exercises from initialLog that WEREN'T in the routine
    initialLog.forEach((logEntry) => {
      if (exerciseMap.has(logEntry.exercise)) return;
      
      const exerciseDef = EXERCISES.find(e => e.name === logEntry.exercise);
      const exerciseId = exerciseDef?.id ?? logEntry.exercise;
      const exerciseKey = `manual:${exerciseId}:${Date.now()}`;
      
      const existingSetsLogs = logEntry.history ?? [];
      const sets: WorkoutSet[] = existingSetsLogs.map((log, i) => ({
        id: `${exerciseKey}-set-${i}`,
        targetWeight: "",
        targetReps: "0",
        actualWeight: log?.actualWeight ? String(log.actualWeight) : "",
        actualReps: log?.actualReps ? String(log.actualReps) : "",
        isCompleted: !!log?.completed,
        userAdded: true,
      }));

      exercises.push({
        id: exerciseKey,
        exerciseId,
        name: logEntry.exercise,
        sets
      });
    });

    setActiveSession({
      startTime: exercises.some(ex => ex.sets.some(s => s.isCompleted)) ? (activeSession.startTime || new Date()) : new Date(),
      exercises,
    });
  }, [activeRoutine, initialLog, today, todayFinished]);

  const [sessionNotes, setSessionNotes] = useState(initialNotes);
  const touchedNotesRef = useRef(false);

  useEffect(() => {
    if (!touchedNotesRef.current) {
      setSessionNotes(initialNotes);
    }
  }, [initialNotes]);

  useEffect(() => {
    touchedNotesRef.current = false;
    touchedSessionRef.current = false;
    setSessionNotes(initialNotes);
  }, [today]);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [hasDirtyWorkout, setHasDirtyWorkout] = useState(false);
  const [isRoutinesModalOpen, setIsRoutinesModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<Array<{ _id: string; date: string; workouts: Array<Record<string, unknown>>; finished?: boolean; notes?: string }>>([]);
  const [importDialogData, setImportDialogData] = useState<{planName: string, data: any, properSchedule: any} | null>(null);
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | "new">("new");
  const [planName, setPlanName] = useState("");
  const [modalSchedule, setModalSchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);

  useEffect(() => {
    if (isScheduleModalOpen && initialConfig?.activePlanId) {
      const activePlan = initialConfig.plans?.find(p => p.id === initialConfig.activePlanId);
      if (activePlan) {
        setSelectedPlanId(activePlan.id);
        setPlanName(activePlan.title || "");
        
        const newSchedule: WeeklySchedule = {
          0: "REST", 1: "REST", 2: "REST", 3: "REST", 4: "REST", 5: "REST", 6: "REST"
        };
        
        if (activePlan.schedule) {
          const s = activePlan.schedule as Record<string, unknown>;
          newSchedule[0] = (s.sunday as RoutineId) ?? "REST";
          newSchedule[1] = (s.monday as RoutineId) ?? "REST";
          newSchedule[2] = (s.tuesday as RoutineId) ?? "REST";
          newSchedule[3] = (s.wednesday as RoutineId) ?? "REST";
          newSchedule[4] = (s.thursday as RoutineId) ?? "REST";
          newSchedule[5] = (s.friday as RoutineId) ?? "REST";
          newSchedule[6] = (s.saturday as RoutineId) ?? "REST";
        }
        setModalSchedule(newSchedule);
      }
    } else if (isScheduleModalOpen) {
      // Fallback for brand new users
      setSelectedPlanId('new');
      setPlanName('');
      setModalSchedule(DEFAULT_WEEKLY_SCHEDULE);
    }
  }, [isScheduleModalOpen, initialConfig]);

  const openPlanModal = () => {
    setIsScheduleModalOpen(true);
  };
  const openHistoryModal = async () => {
    // Flush any pending debounced auto-save so today's workout appears immediately
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (hasDirtyWorkout && !todayFinishedRef.current && activeRoutineRef.current) {
      await saveWorkout();
    }
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const docs = await getWorkoutHistory({ limit: 0 });
      const safe = Array.isArray(docs)
        ? docs.map((d: Record<string, unknown>) => {
            const finished =
              typeof (d as { finished?: unknown }).finished === "boolean"
                ? ((d as { finished?: boolean }).finished as boolean)
                : false;
            return {
              _id: d?._id?.toString?.() ?? String(d?._id ?? ""),
              date: typeof d?.date === "string" ? d.date : String(d?.date ?? ""),
              workouts: Array.isArray(d?.workouts) ? d.workouts : [],
              finished,
              notes: typeof d?.notes === "string" ? d.notes : undefined,
            };
          })
        : [];
      setHistoryEntries(safe as Array<{ _id: string; date: string; workouts: Array<Record<string, unknown>>; finished?: boolean; notes?: string }>);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePlanSelect = (val: string) => {
    setSelectedPlanId(val);
    if (val === "new") {
      setPlanName("");
      setModalSchedule(DEFAULT_WEEKLY_SCHEDULE);
    } else {
      const plan = initialConfig?.plans?.find(p => p.id === val);
      if (plan) {
        setPlanName(plan.title || "");
        const newSchedule: WeeklySchedule = {
          0: "REST", 1: "REST", 2: "REST", 3: "REST", 4: "REST", 5: "REST", 6: "REST"
        };
        
        if (plan.schedule) {
          const s = plan.schedule as Record<string, unknown>;
          newSchedule[0] = (s.sunday as RoutineId) ?? "REST";
          newSchedule[1] = (s.monday as RoutineId) ?? "REST";
          newSchedule[2] = (s.tuesday as RoutineId) ?? "REST";
          newSchedule[3] = (s.wednesday as RoutineId) ?? "REST";
          newSchedule[4] = (s.thursday as RoutineId) ?? "REST";
          newSchedule[5] = (s.friday as RoutineId) ?? "REST";
          newSchedule[6] = (s.saturday as RoutineId) ?? "REST";
        }
        setModalSchedule(newSchedule);
      }
    }
  };

  // Helper function to convert WeeklySchedule to WorkoutScheduleInput format
  const convertWeeklyScheduleToInput = (weeklySchedule: WeeklySchedule) => ({
    sunday: weeklySchedule[0] ?? "REST",
    monday: weeklySchedule[1] ?? "REST",
    tuesday: weeklySchedule[2] ?? "REST",
    wednesday: weeklySchedule[3] ?? "REST",
    thursday: weeklySchedule[4] ?? "REST",
    friday: weeklySchedule[5] ?? "REST",
    saturday: weeklySchedule[6] ?? "REST",
  });

  // Save active session to localStorage whenever it changes (skip if already finished)
  useEffect(() => {
    if (todayFinished) return;
    if (!activeSession.exercises.length) return;
    const storageKey = `workout-session-${today}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(activeSession));
    } catch {
      // storage full or unavailable
    }
  }, [activeSession, today, todayFinished]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasDirtyWorkout) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDirtyWorkout]);

  const resolveExercise = (exerciseId: string) =>
    EXERCISES.find((e) => e.id === exerciseId);

  const [, setPlanSeedVersion] = useState(0);

  const parseRestSeconds = (input: string) => {
    if (!input) return 90;
    const str = input.trim().toLowerCase();
    const isMinutes =
      str.includes("min") ||
      str.includes("mins") ||
      str.includes("minute") ||
      str.includes("minutes") ||
      str.includes(" m") ||
      str.endsWith("m");
    const numeric = str.replace(/[^0-9.\-]/g, "");
    if (!numeric) return 90;
    if (numeric.includes("-")) {
      const [a, b] = numeric.split("-");
      const fa = parseFloat(a);
      const fb = parseFloat(b);
      const avg = !isNaN(fa) && !isNaN(fb) ? (fa + fb) / 2 : !isNaN(fa) ? fa : 90;
      return isMinutes ? avg * 60 : avg;
    } else {
      const val = parseFloat(numeric);
      if (isNaN(val)) return 90;
      return isMinutes ? val * 60 : val;
    }
  };

  const estimatedTime = useMemo(() => {
    if (!activeRoutine) return "—";
    
    let totalMinutes = 0;
    
    activeRoutine.exercises.forEach(ex => {
      const sets = ex.targetSets || 3;
      const restStr = ex.restTime || "90s";
      const restSeconds = parseRestSeconds(restStr);
      const secondsPerSet = 45 + restSeconds;
      totalMinutes += (sets * secondsPerSet) / 60;
    });
    
    const hrs = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  }, [activeRoutine]);

  // Derived Stats: Volume & Completion
  // Calculated on every render to ensure immediate updates
  const totalVolume = activeSession.exercises.reduce((acc, ex) => {
    return acc + ex.sets.reduce((setAcc, set) => {
      if (!set.isCompleted) return setAcc;
      
      const w = toKg(set.actualWeight);

      // Reps logic: use actual, fallback to target
      let r = parseFloat(set.actualReps);
      if (isNaN(r) || r === 0) {
        r = parseTargetReps(set.targetReps) || 0;
      }
      
      return setAcc + (w * r);
    }, 0);
  }, 0);

  const { completedSetsCount, totalSetsCount } = activeSession.exercises.reduce((acc, ex) => {
    ex.sets.forEach(set => {
      acc.totalSetsCount++;
      if (set.isCompleted) acc.completedSetsCount++;
    });
    return acc;
  }, { completedSetsCount: 0, totalSetsCount: 0 });

  const progressPercent = totalSetsCount > 0 
    ? Math.round((completedSetsCount / totalSetsCount) * 100) 
    : 0;
    
  const volumeStat =
    weightUnitPref === "imperial"
      ? Math.round(totalVolume * LB_PER_KG)
      : Math.round(totalVolume);
  const volumeUnitLabel = weightUnitPref === "imperial" ? "lb" : "kg";

  const currentStats = {
    volume: volumeStat,
    volumeUnitLabel,
    completedSets: completedSetsCount,
    totalSets: totalSetsCount,
    progressPercent,
  };

  // Removed legacy sessionStats based on deprecated setLogs

  // --- Step 3: Interactive Logic ---

  const handleSetChange = (exerciseId: string, setId: string, field: "actualWeight" | "actualReps", value: string) => {
    touchedSessionRef.current = true;
    setActiveSession(prev => {
      const nextExercises = prev.exercises.map(ex => {
        if (ex.exerciseId !== exerciseId) return ex;
        let normalized = value;
        if (field === "actualWeight") {
          normalized = normalizeWeightInput(value, exerciseId, weightUnitPref);
        }
        
        return {
          ...ex,
          sets: ex.sets.map(set => {
            if (set.id !== setId) return set;
            return { ...set, [field]: normalized };
          })
        };
      });
      
      const propagated = nextExercises.map(ex => {
        if (ex.exerciseId !== exerciseId) return ex;
        const currentSet = ex.sets.find(s => s.id === setId);
        if (!currentSet) return ex;
        if (field !== "actualWeight") return ex;
        const v = currentSet.actualWeight;
        if (!v) return ex;
        const newSets = ex.sets.map(s => {
          if (s.id === setId) return s;
          if (String(s.actualWeight || "").trim().length > 0) return s;
          return { ...s, actualWeight: v };
        });
        return { ...ex, sets: newSets };
      });

      return { ...prev, exercises: propagated };
    });
    setHasDirtyWorkout(true);
    
    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (!todayFinishedRef.current) void saveWorkout();
    }, 2000);
  };

  const handleToggleSetComplete = (exerciseId: string, setId: string) => {
    touchedSessionRef.current = true;
    setActiveSession(prev => {
      const nextExercises = prev.exercises.map(ex => {
        if (ex.exerciseId !== exerciseId) return ex;
        
        return {
          ...ex,
          sets: ex.sets.map(set => {
            if (set.id !== setId) return set;
            
            const nextCompleted = !set.isCompleted;
            let nextWeight = set.actualWeight;
            let nextReps = set.actualReps;

            // Auto-fill logic: if completing and fields are empty, fill from targets
            if (nextCompleted) {
              if (!nextWeight && set.targetWeight) nextWeight = set.targetWeight;
              if (!nextReps && set.targetReps) nextReps = String(parseTargetReps(set.targetReps));
            }

            // TODO: Fire DB Upsert for Set
            // saveSet(exerciseId, set.id, { ...set, isCompleted: nextCompleted, actualWeight: nextWeight, actualReps: nextReps })

            return {
              ...set,
              isCompleted: nextCompleted,
              actualWeight: nextWeight,
              actualReps: nextReps,
            };
          })
        };
      });
      
      return { ...prev, exercises: nextExercises };
    });
    setHasDirtyWorkout(true);
    
    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (!todayFinishedRef.current) void saveWorkout();
    }, 2000);
  };

  const handleAddSet = (exerciseId: string) => {
    touchedSessionRef.current = true;
    setActiveSession(prev => {
      const nextExercises = prev.exercises.map(ex => {
        if (ex.exerciseId !== exerciseId) return ex;
        
        const newSetIndex = ex.sets.length;
        const routineExercise = activeRoutine?.exercises.find((e) => e.exerciseId === exerciseId);
        const { weights } = parseWeightPlan(routineExercise?.targetWeight || "");
        const plannedWeight = getPlannedWeightForSet(weights, newSetIndex);
        const targetRepsForRow = routineExercise?.targetReps || ex.sets[newSetIndex - 1]?.targetReps || "0";

        const newSet: WorkoutSet = {
          id: `${ex.id}-set-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          targetWeight: plannedWeight != null ? String(plannedWeight) : (ex.sets[newSetIndex - 1]?.targetWeight || ""),
          targetReps: targetRepsForRow,
          actualWeight: "",
          actualReps: "",
          isCompleted: false,
          userAdded: true,
        };

        return {
          ...ex,
          sets: [...ex.sets, newSet]
        };
      });
      
      return { ...prev, exercises: nextExercises };
    });
    setHasDirtyWorkout(true);
    
    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (!todayFinishedRef.current) void saveWorkout();
    }, 2000);
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    touchedSessionRef.current = true;
    setActiveSession(prev => {
      const nextExercises = prev.exercises.map(ex => {
        if (ex.exerciseId !== exerciseId) return ex;
        const target = ex.sets.find(s => s.id === setId);
        if (target && !target.userAdded) {
          return ex; // do not delete planned/hydrated sets
        }
        return {
          ...ex,
          sets: ex.sets.filter(s => s.id !== setId)
        };
      });
      
      return { ...prev, exercises: nextExercises };
    });
    setHasDirtyWorkout(true);
    
    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (!todayFinishedRef.current) void saveWorkout();
    }, 2000);
  };

  const buildSessionFromRoutine = (): ActiveSession => {
    if (!activeRoutine) return { startTime: null, exercises: [] };
    const exercises: ActiveExercise[] = activeRoutine.exercises.map((item, index) => {
      const exerciseDef = resolveExercise(item.exerciseId);
      const name = exerciseDef?.name ?? item.exerciseId;
      const exerciseKey = `${activeRoutine.routineId}:${item.exerciseId}:${index}`;
      const existingLogs = initialLog.find(l => l.exercise === name)?.history ?? [];
      const { weights } = parseWeightPlan(item.targetWeight);
      const targetReps = item.targetReps || "0";
      const targetSetsCount = item.targetSets || 3;
      const setCount = existingLogs.length > 0 ? existingLogs.length : targetSetsCount;
      const sets: WorkoutSet[] = Array.from({ length: setCount }).map((_, i) => {
        const log = existingLogs[i];
        const targetW = getPlannedWeightForSet(weights, i);
        return {
          id: `${exerciseKey}-set-${i}`,
          targetWeight: targetW ? String(targetW) : "",
          targetReps: targetReps,
          actualWeight: log?.actualWeight ? String(log.actualWeight) : (targetW ? String(targetW) : ""),
          actualReps: log?.actualReps ? String(log.actualReps) : "",
          isCompleted: !!log?.completed,
          userAdded: false,
        };
      });
      return { id: exerciseKey, exerciseId: item.exerciseId, name, sets };
    });
    return { startTime: new Date(), exercises };
  };

  const handleSaveRoutines = async (current: Routine[]) => {
    try {
      startTransition(() => {
        void (async () => {
          await saveWorkoutRoutines(
            current.map((routine) => ({
              routineId: routine.routineId,
              name: routine.name,
              exercises: routine.exercises,
            }))
          );
        })();
      });
      // When routines (and their target weights) change, bump the plan seed version
      // so the Today view re-seeds from the updated plan without running on every keystroke.
      setHasDirtyWorkout(false);
      setPlanSeedVersion((v: number) => v + 1);
      try {
        const storageKey = `workout-session-${today}`;
        localStorage.removeItem(storageKey);
      } catch {}
      setActiveSession(buildSessionFromRoutine());
      toast.success("Routines saved");
    } catch {
      toast.error("Failed to save routines");
    }
  };

  const handleSaveSchedule = async () => {
    const schedulePayload = convertWeeklyScheduleToInput(modalSchedule);
    
    // Optimistic Update
    setWeeklySchedule(modalSchedule);
    setCustomTitle(planName);
    setIsScheduleModalOpen(false);

    try {
      startTransition(() => {
        void (async () => {
          if (selectedPlanId === "new") {
            const result = await createWorkoutPlan({ title: planName, schedule: schedulePayload });
            if (result.error) {
              toast.error(`Failed to create plan: ${result.error}`);
              return;
            }
            toast.success("New workout plan created and activated");
          } else {
            const result = await switchWorkoutPlan({
              planId: selectedPlanId,
              title: planName,
              schedule: schedulePayload,
            });
            if (result.error) {
              toast.error(`Failed to update plan: ${result.error}`);
              return;
            }
            toast.success("Workout plan updated and activated");
          }
          router.refresh();
        })();
      });
    } catch {
      toast.error("Failed to save workout plan");
      // Revert on error could be implemented here, but typically page refresh is safer
    }
  };


  const handleDeletePlan = async () => {
    if (selectedPlanId === 'new') return;
    
    try {
      let hasError = false;
      startTransition(() => {
        void (async () => {
          const result = await deleteWorkoutPlan(selectedPlanId);
          if (result.error) {
            hasError = true;
            toast.error(`Failed to delete plan: ${result.error}`);
            return;
          }
          toast.success("Workout plan deleted");
          setSelectedPlanId('new');
          setPlanName('');
          setModalSchedule(DEFAULT_WEEKLY_SCHEDULE);
          router.refresh();
        })();
      });
      if (hasError) return;
    } catch {
      toast.error("Failed to delete workout plan");
    }
  };

  const exportWorkoutPlanJSON = () => {
    const data = {
      title: customTitle,
      routines,
      schedule: weeklySchedule,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dayframe-workout-plan-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importWorkoutPlanJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== "string") return;
        
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          toast.error("Invalid JSON file format");
          return;
        }

        // Enhanced validation logic
        if (!data || typeof data !== 'object') {
          toast.error("File must contain a valid workout plan object");
          return;
        }

        if (!Array.isArray(data.routines)) {
          toast.error("File must contain a 'routines' array");
          return;
        }

        if (!data.schedule) {
          toast.error("File must contain a 'schedule' object");
          return;
        }

        // Convert imported schedule to proper format
        const importedSchedule = data.schedule;
        let properSchedule;

        // Handle different schedule formats
        if (Array.isArray(importedSchedule) && importedSchedule.length === 7) {
          // Array format [0,1,2,3,4,5,6] - convert to object
          properSchedule = convertWeeklyScheduleToInput(importedSchedule as unknown as WeeklySchedule);
        } else if (typeof importedSchedule === 'object' && !Array.isArray(importedSchedule)) {
          // Object format - check if it has numeric or string keys
          if (importedSchedule.hasOwnProperty('0') || importedSchedule.hasOwnProperty(0)) {
            // Numeric keys format - convert using helper
            const numericSchedule = importedSchedule as Record<string, unknown>;
            properSchedule = convertWeeklyScheduleToInput([
              numericSchedule[0] || numericSchedule['0'],
              numericSchedule[1] || numericSchedule['1'],
              numericSchedule[2] || numericSchedule['2'],
              numericSchedule[3] || numericSchedule['3'],
              numericSchedule[4] || numericSchedule['4'],
              numericSchedule[5] || numericSchedule['5'],
              numericSchedule[6] || numericSchedule['6']
            ] as unknown as WeeklySchedule);
          } else {
            // String keys format - validate all required days
            const requiredDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const missingDays = requiredDays.filter(day => !importedSchedule.hasOwnProperty(day));
            
            if (missingDays.length > 0) {
              toast.error(`Missing required schedule days: ${missingDays.join(', ')}`);
              return;
            }
            
            properSchedule = {
              sunday: importedSchedule.sunday || "REST",
              monday: importedSchedule.monday || "REST",
              tuesday: importedSchedule.tuesday || "REST",
              wednesday: importedSchedule.wednesday || "REST",
              thursday: importedSchedule.thursday || "REST",
              friday: importedSchedule.friday || "REST",
              saturday: importedSchedule.saturday || "REST"
            };
          }
        } else {
          toast.error("Schedule must be either an array of 7 items or an object with day names");
          return;
        }

        // Ask user if they want to create a new plan or overwrite current one
        const planName = data.title || "Imported Plan";
        setImportDialogData({ planName, data, properSchedule });

      } catch {
        toast.error("Failed to import workout plan - unexpected error occurred");
      }
      // Reset input
      if (event.target) event.target.value = "";
    };
    reader.readAsText(file);
  };

  const executeImportWorkoutPlan = async (shouldCreateNew: boolean) => {
    if (!importDialogData) return;
    const { planName, data, properSchedule } = importDialogData;
    setImportDialogData(null);

    try {
      if (shouldCreateNew) {
        // Create new plan
        const result = await createWorkoutPlan({ title: planName, schedule: properSchedule });
        if (result.error) {
          toast.error(`Failed to create plan: ${result.error}`);
          return;
        }
        // Save routines to the new plan (they'll be associated with the active plan)
        const routinesResult = await saveWorkoutRoutines(data.routines);
        if ('error' in routinesResult && routinesResult.error) {
          toast.error(`Failed to import routines: ${routinesResult.error}`);
          return;
        }
        toast.success(`Created new plan "${planName}" and imported routines`);
      } else {
        // Overwrite current plan
        // Save routines
        const routinesResult = await saveWorkoutRoutines(data.routines);
        if ('error' in routinesResult && routinesResult.error) {
          toast.error(`Failed to import routines: ${routinesResult.error}`);
          return;
        }

        // Save schedule and title to current plan
        const scheduleResult = await saveWorkoutSchedule({ schedule: properSchedule, title: planName });
        if ('error' in scheduleResult && scheduleResult.error) {
          toast.error(`Failed to import schedule: ${scheduleResult.error}`);
          return;
        }

        // Update local state
        setRoutines(data.routines);
        const s = properSchedule as Record<string, unknown>;
        const newWeeklySchedule: WeeklySchedule = {
          0: (s.sunday as RoutineId) ?? "REST",
          1: (s.monday as RoutineId) ?? "REST",
          2: (s.tuesday as RoutineId) ?? "REST",
          3: (s.wednesday as RoutineId) ?? "REST",
          4: (s.thursday as RoutineId) ?? "REST",
          5: (s.friday as RoutineId) ?? "REST",
          6: (s.saturday as RoutineId) ?? "REST"
        };
        setWeeklySchedule(newWeeklySchedule);
        setCustomTitle(planName);
        
        toast.success("Workout plan imported successfully");
      }
    } catch {
        toast.error("Failed to import workout plan - unexpected error occurred");
    }
  };

  const saveWorkout = useCallback(async (sessionOverride?: ActiveSession, opts?: { finished?: boolean }): Promise<boolean> => {
    const routine = activeRoutineRef.current;
    if (!routine) return false;
    const sessionData = sessionOverride ?? activeSession;
    if (sessionData.exercises.length === 0) return false;

    setIsSavingWorkout(true);
    try {
      /** Persist the live session — mapping only `routine.exercises` dropped everything when the routine template was empty or IDs diverged. */
      const payload = sessionData.exercises.map((sessionEx) => {
        const exerciseDef = resolveExercise(sessionEx.exerciseId);
        const name = sessionEx.name || exerciseDef?.name || sessionEx.exerciseId;
        const routineItem = routine.exercises.find((e) => e.exerciseId === sessionEx.exerciseId);

        const { weights: targetWeights } = parseWeightPlan(routineItem?.targetWeight ?? "");
        const targetRepsNumber =
          routineItem?.targetReps && typeof routineItem.targetReps === "string"
            ? parseTargetReps(routineItem.targetReps)
            : undefined;

        const history = sessionEx.sets.map((set, i) => ({
          set: i + 1,
          targetWeight: getPlannedWeightForSet(targetWeights, i),
          actualWeight: set.actualWeight && set.actualWeight.trim() !== "" 
            ? (isNaN(Number(set.actualWeight)) ? set.actualWeight.toLowerCase() : Number(set.actualWeight)) 
            : undefined,
          targetReps: targetRepsNumber,
          actualReps: set.actualReps && set.actualReps.trim() !== "" ? Number(set.actualReps) : undefined,
          completed: !!set.isCompleted,
        }));

        return {
          exercise: name,
          sets: history.length || routineItem?.targetSets,
          reps: routineItem?.targetReps,
          rpe: routineItem?.targetRPE,
          weight: undefined,
          history: history.length > 0 ? history : undefined,
        };
      });

      const dateForSave = today;
      const notesTrimmed = sessionNotes.trim();
      const enrichedPayload = notesTrimmed
        ? { finished: !!opts?.finished, workouts: payload, notes: notesTrimmed }
        : opts?.finished
          ? { finished: true, workouts: payload }
          : payload;
      const attempt = async () => {
        const res = await saveWorkoutLog(dateForSave, enrichedPayload);
        return !!(res && typeof res === "object" && "success" in res);
      };
      let ok = await attempt();
      if (!ok) {
        await new Promise((r) => setTimeout(r, 500));
        ok = await attempt();
      }
      if (!ok) throw new Error("Workout save failed");
      setHasDirtyWorkout(false);
      return true;
    } catch {
      toast.error("Failed to save workout");
      return false;
    } finally {
      setIsSavingWorkout(false);
    }
  }, [activeSession, today, sessionNotes]);

  const finishWorkout = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (!activeRoutineRef.current || activeSession.exercises.length === 0) {
      toast.error("Nothing to save — today has no workout session. Check your plan has exercises for this day.");
      return;
    }

    const finalized: ActiveSession = {
      startTime: activeSession.startTime,
      exercises: activeSession.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((set) => {
          let nextWeight = set.actualWeight;
          let nextReps = set.actualReps;
          if (!nextWeight && set.targetWeight) nextWeight = set.targetWeight;
          if (!nextReps && set.targetReps) nextReps = String(parseTargetReps(set.targetReps));
          return {
            ...set,
            actualWeight: nextWeight,
            actualReps: nextReps,
            isCompleted: true,
          };
        }),
      })),
    };

    todayFinishedRef.current = true;
    setTodayFinished(true);
    setHasDirtyWorkout(false);
    setActiveSession(finalized);

    const saved = await saveWorkout(finalized, { finished: true });
    if (!saved) {
      todayFinishedRef.current = false;
      setTodayFinished(false);
      setHasDirtyWorkout(true);
      return;
    }

    // Clear storage
    const storageKey = `workout-session-${today}`;
    localStorage.removeItem(storageKey);
    toast.success("Workout finished!");
    
    // Immediately show updated history for all time so pagination works
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const docs = await getWorkoutHistory({ limit: 0 });
      const safe = Array.isArray(docs)
        ? docs.map((d: Record<string, unknown>) => {
            const finished =
              typeof (d as { finished?: unknown }).finished === "boolean"
                ? ((d as { finished?: boolean }).finished as boolean)
                : false;
            return {
              _id: d?._id?.toString?.() ?? String(d?._id ?? ""),
              date: typeof d?.date === "string" ? d.date : String(d?.date ?? ""),
              workouts: Array.isArray(d?.workouts) ? d.workouts : [],
              finished,
              notes: typeof d?.notes === "string" ? d.notes : undefined,
            };
          })
        : [];
      setHistoryEntries(safe as Array<{ _id: string; date: string; workouts: Array<Record<string, unknown>>; finished?: boolean; notes?: string }>);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  const exportWeeklyPlan = useCallback(() => {
    const dayLabels = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const rows = dayLabels.map((label, index) => {
      const routineId = weeklySchedule[index as DayOfWeek];
      const routine = routineId === "REST" ? undefined : routineById[routineId as RoutineId];
      const routineName = routine ? routine.name : "REST";
      const exercises = routine
        ? routine.exercises.map((ex) => {
            const resolved = resolveExercise(ex.exerciseId);
            const name = resolved?.name ?? ex.exerciseId;
            const weightLabel = (ex.targetWeight && String(ex.targetWeight).trim().length > 0) ? String(ex.targetWeight).trim() : "—";
            return `${name} • Sets: ${ex.targetSets} • Weight: ${weightLabel} • Reps: ${ex.targetReps} • RPE: ${ex.targetRPE} • Rest: ${ex.restTime}`;
          })
        : [];
      return { label, routineName, exercises };
    });
    const styles = `
      :root{
        --accent:#10b981;
        --text:#111827;
        --muted:#6b7280;
        --border:#e5e7eb;
        --bg:#ffffff;
        --surface:#f8fafc;
        --chip-bg: rgba(16,185,129,.08);
        --chip-border: rgba(16,185,129,.30);
      }
      *{box-sizing:border-box}
      html,body{height:100%}
      body{
        font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',sans-serif;
        color:var(--text);
        background:var(--bg);
        margin:24px;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
      }
      .container{max-width:940px;margin:0 auto}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
      h1{font-size:24px;margin:0}
      .meta{color:var(--muted);font-size:12px;margin-top:4px}
      .brand{display:flex;align-items:center;gap:8px;color:var(--accent);font-weight:700}
      .brand-dot{height:10px;width:10px;border-radius:50%;background:var(--accent)}
      .summary{
        border:1px solid var(--border);
        border-radius:12px;
        padding:12px;
        margin:16px 0;
        background: var(--surface);
      }
      .summary table{width:100%;border-collapse:collapse;font-size:12px}
      .summary th,.summary td{padding:8px;border-bottom:1px solid var(--border);text-align:left}
      .summary th{font-weight:600;color:var(--text)}
      .day-card{
        border:1px solid var(--border);
        border-radius:12px;
        padding:16px;
        margin-bottom:12px;
        background:var(--surface);
        box-shadow:0 1px 2px rgba(17,24,39,.06);
        break-inside:avoid;
      }
      .day-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
      .day-title{font-size:14px;font-weight:700}
      .chip{
        display:inline-flex;align-items:center;gap:6px;
        padding:4px 8px;border-radius:999px;font-size:11px;font-weight:600;
        border:1px solid var(--chip-border);background:var(--chip-bg);color:#065f46;
      }
      .rest{color:var(--muted);font-weight:600}
      .ex-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
      .ex-table thead th{color:var(--text);font-weight:600;background:#eef2f7}
      .ex-table th,.ex-table td{padding:6px 8px;border-bottom:1px solid var(--border);text-align:left}
      .ex-table tbody tr:nth-child(even){background:#fafafa}
      .ex-name{font-weight:600}
      footer{margin-top:18px;font-size:11px;color:var(--muted)}
      @page{margin:12mm}
      @media print { body{margin:0} }
    `;
    const dNow = new Date(today);
    const mdy = `${dNow.getMonth() + 1}/${dNow.getDate()}/${dNow.getFullYear()}`;
    const todayStr = mdy;
    const docTitle = `Weekly Workout Plan - ${mdy}`;
    const summaryRows = rows
      .map((r) => `<tr><td>${r.label}</td><td>${r.routineName}</td></tr>`)
      .join("");
    const dayCards = rows
      .map((row) => {
        const hasExercises = row.exercises.length > 0;
        const exercisesTable = hasExercises
          ? `
            <table class="ex-table">
          <thead>
            <tr>
              <th style="width:40%">Exercise</th>
              <th style="width:12%">Sets</th>
              <th style="width:16%">Weight</th>
              <th style="width:14%">Reps</th>
              <th style="width:10%">RPE</th>
              <th style="width:8%">Rest</th>
            </tr>
          </thead>
              <tbody>
                ${row.exercises
                  .map((e) => {
                    const [namePart, ...rest] = e.split(" • ");
                    const parts = Object.fromEntries(
                      rest.map((kv) => {
                    const [k, v] = kv.split(": ").map((x) => x.trim());
                        return [k.toLowerCase(), v];
                      })
                    );
                    return `
                      <tr>
                        <td class="ex-name">${namePart}</td>
                        <td>${parts["sets"] ?? "—"}</td>
                    <td>${parts["weight"] ?? "—"}</td>
                        <td>${parts["reps"] ?? "—"}</td>
                        <td>${parts["rpe"] ?? "—"}</td>
                        <td>${parts["rest"] ?? "—"}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          `
          : `<div class="rest">No exercises (REST)</div>`;
        const chip = hasExercises
          ? `<span class="chip">Routine • ${row.routineName}</span>`
          : `<span class="chip">REST</span>`;
        return `
          <section class="day-card">
            <div class="day-head">
              <div>
                <div class="day-title">${row.label}</div>
              </div>
              ${chip}
            </div>
            ${exercisesTable}
          </section>
        `;
      })
      .join("");
    const html = `
      <html>
        <head>
          <title>${docTitle}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>${styles}</style>
        </head>
        <body>
          <div class="container">
            <header>
              <div>
                <h1>Weekly Workout Plan</h1>
                <div class="meta">Generated for ${todayStr}</div>
              </div>
              <div class="brand"><span class="brand-dot"></span> Dayframe</div>
            </header>
            <section class="summary">
              <table>
                <thead><tr><th>Day</th><th>Routine</th></tr></thead>
                <tbody>${summaryRows}</tbody>
              </table>
            </section>
            ${dayCards}
            <footer>Tip: Use “Save as PDF” in the print dialog.</footer>
          </div>
        </body>
      </html>
    `;
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);
      const frameDoc = iframe.contentDocument || iframe.ownerDocument;
      frameDoc?.open();
      frameDoc?.write(html);
      frameDoc?.close();
      iframe.onload = () => {
        try {
          if (iframe.contentDocument) {
            iframe.contentDocument.title = docTitle;
          }
          const prevTitle = document.title;
          document.title = docTitle;
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.title = prevTitle;
          }, 500);
        } catch {
          const blob = new Blob([html], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Weekly Workout Plan - ${todayStr}.html`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
        setTimeout(() => {
          iframe.remove();
        }, 1000);
      };
    } catch {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Weekly Workout Plan - ${todayStr}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }, [weeklySchedule, routineById, today]);

  useEffect(() => {
    if (!activeRoutine) return;
    if (!hasDirtyWorkout) return;
    if (todayFinishedRef.current) return;

    const timeout = setTimeout(() => {
      if (todayFinishedRef.current) return;
      void saveWorkout();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [activeRoutine, hasDirtyWorkout, saveWorkout]);

  // Removed legacy per-set logs seeding (superseded by activeSession seeding from routine + initialLog)

  return (
    <div className="space-y-4 pb-10 md:space-y-8 md:pb-0 w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
            Workout Plan
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={() => {
                const [y, m, d] = today.split("-").map(Number);
                const dateObj = new Date(y, m - 1, d);
                dateObj.setDate(dateObj.getDate() - 1);
                const prevDate = format(dateObj, "yyyy-MM-dd");
                router.push(`?date=${prevDate}`);
              }}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 min-w-0">
              <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">
                {activeRoutine ? activeRoutine.name : "REST"} • {todayLabel}
              </span>
            </p>
            <button
              onClick={() => {
                const [y, m, d] = today.split("-").map(Number);
                const dateObj = new Date(y, m - 1, d);
                dateObj.setDate(dateObj.getDate() + 1);
                const nextDate = format(dateObj, "yyyy-MM-dd");
                router.push(`?date=${nextDate}`);
              }}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportWeeklyPlan}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportWorkoutPlanJSON}>
                <FileJson className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById('import-plan-input')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            id="import-plan-input"
            className="hidden"
            accept=".json"
            onChange={importWorkoutPlanJSON}
          />
          <Button variant="outline" size="sm" className="self-start sm:self-auto w-full sm:w-auto" onClick={() => setIsRoutinesModalOpen(true)}>
            Manage routines
          </Button>
          <Modal
            isOpen={isRoutinesModalOpen}
            onClose={setIsRoutinesModalOpen}
            title="Manage workout routines"
            description="Configure the exercises, volume, and intensity for each routine. Changes apply immediately to today's plan."
            size="responsive"
          >
            <div className="mt-2 pr-1">
              {isRoutinesModalOpen && (
                <RoutineEditor initialRoutines={routines} onSaveRoutines={handleSaveRoutines} onCancel={() => setIsRoutinesModalOpen(false)} />
              )}
            </div>
          </Modal>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">
        {/* Left column: weekly split + exercises */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          {/* Weekly strip */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                {customTitle}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openPlanModal}>
                  <Settings2 className="w-4 h-4 mr-2" /> Manage Split
                </Button>
              </div>
            </div>
            <Modal
              isOpen={isScheduleModalOpen}
              onClose={setIsScheduleModalOpen}
              title="Set workout plan"
              description="Choose which routine you run on each day. Your weekly plan is saved to your account."
              size="md"
              footer={
                <div className="flex w-full justify-between items-center">
                  <div>
                    {selectedPlanId !== 'new' && (
                      <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-950/20" onClick={handleDeletePlan}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setIsScheduleModalOpen(false)}>
                      Cancel
                    </Button>
                  <Button variant="default" onClick={handleSaveSchedule} disabled={!planName.trim()}>
                    Save
                  </Button>
                  </div>
        </div>
      }
    >
      <div className="space-y-4 mb-4 border-b border-border/50 pb-4">
        <div className="grid gap-2">
          <Select value={selectedPlanId} onValueChange={handlePlanSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan to edit..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" className="text-emerald-400 font-medium">
                        + Create New Plan
                      </SelectItem>
                      {initialConfig?.plans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.title || "Untitled Plan"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan-title">Plan Name</Label>
                  <Input
                    id="plan-title"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Push/Pull/Legs split"
                  />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {DAY_LABELS.map((label, index) => {
                  const dayIndex = index as DayOfWeek;
                  const value = modalSchedule[dayIndex];
                  const isTodayRow = dayIndex === todayKey;
                  return (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0"
                    >
                      <span
                        className={`w-16 text-xs font-semibold uppercase tracking-widest ${
                          isTodayRow ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"
                        }`}
                      >
                        {label}
                      </span>
                      <Select
                        value={value}
                        onValueChange={(val) =>
                          setModalSchedule((prev) => ({
                            ...prev,
                            [dayIndex]: val as WeeklySchedule[DayOfWeek],
                          }))
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-[180px] justify-between border-border/60 bg-background/60 text-sm"
                        >
                          <SelectValue placeholder="Select routine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REST">REST</SelectItem>
                          {routines.map((routine) => (
                            <SelectItem key={routine.routineId} value={routine.routineId}>
                              {routine.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </Modal>
            <div className="flex flex-wrap gap-2 mt-3">
              {DAY_LABELS.map((label, index) => {
                const dayIndex = index as DayOfWeek;
                const isToday = dayIndex === todayKey;
                return (
                  <span
                    key={label}
                    className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-widest border ${
                      isToday
                        ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                        : "border-border bg-transparent text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Active workout view */}
          {activeRoutine && todayFinished ? (
            <Card className="bg-card border-border shadow-sm p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-foreground">{activeRoutine.name} — Complete</p>
                <p className="text-sm text-muted-foreground">You&apos;ve finished today&apos;s workout. Come back tomorrow!</p>
              </div>
            </Card>
          ) : activeRoutine ? (
            <div className="flex flex-col gap-6 w-full">
              {activeSession.exercises.map((activeExercise, idx) => {
                const exerciseDef = resolveExercise(activeExercise.exerciseId);
                const name = activeExercise.name;
                const routineExercise = activeRoutine.exercises.find(
                  (e) => e.exerciseId === activeExercise.exerciseId
                );
                const targetRPE = routineExercise?.targetRPE ?? "—";
                const restTime = routineExercise?.restTime ?? "—";
                const indexLabel =
                  activeRoutine.exercises.findIndex(
                    (e) => e.exerciseId === activeExercise.exerciseId
                  ) + 1;

                return (
                  <Card key={activeExercise.id ?? `${activeExercise.exerciseId}:${idx}`} className="bg-card border-border shadow-sm">
                    <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground/80 shrink-0">
                          {indexLabel}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground truncate">{name}</h2>
                          <p className="text-xs text-muted-foreground">{exerciseDef?.targetMuscle}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
                        <Badge variant="outline" className="rounded-md border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          RPE: {targetRPE}
                        </Badge>
                        <Badge variant="outline" className="rounded-md border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          Rest: {restTime}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {activeExercise.sets.map((set, i) => {
                          const setNumber = i + 1;
                          const completed = set.isCompleted;
                          const targetReps = set.targetReps;
                          return (
                            <div
                              key={set.id}
                              className="group flex flex-col gap-3 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:py-2.5"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-4 sm:w-1/3 sm:flex-none">
                                <span className="w-10 shrink-0 text-sm font-medium text-muted-foreground">Set {setNumber}</span>
                                <span className="text-xs text-muted-foreground">
                                  Goal: <span className="text-foreground/80">{targetReps || ""}</span>
                                </span>
                              </div>
                                  <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-1/2 sm:flex-nowrap sm:justify-end">
                                    <div className="flex flex-1 items-center justify-center gap-2 sm:flex-none sm:justify-end">
                                      <div className="relative flex h-10 w-[88px] items-center overflow-hidden rounded-md border border-input bg-muted/60 transition-all focus-within:ring-1 focus-within:ring-ring sm:h-9 sm:w-[84px]">
                                        <input
                                          type="text"
                                          className="h-full w-full bg-transparent px-1 text-center text-sm text-foreground focus:outline-none"
                                          placeholder="-"
                                          value={kgStorageStringToDisplayWeight(set.actualWeight, weightUnitPref)}
                                          onChange={(e) =>
                                            handleSetChange(
                                              activeExercise.exerciseId,
                                              set.id,
                                              "actualWeight",
                                              e.target.value
                                            )
                                          }
                                        />

                                        <span className={`flex h-full select-none items-center border-l border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground transition-all duration-200 ${
                                          (set.actualWeight?.toLowerCase() === 'bw' || set.actualWeight?.toLowerCase() === 'max' || set.actualWeight?.toLowerCase() === 'full') 
                                            ? 'bg-emerald-500/10 text-emerald-500' 
                                            : ''
                                        }`}>
                                          {set.actualWeight?.toLowerCase() === 'bw' 
                                            ? 'BW' 
                                            : (set.actualWeight?.toLowerCase() === 'max' || set.actualWeight?.toLowerCase() === 'full') 
                                              ? 'MAX' 
                                              : (weightUnitPref === "imperial" ? "LB" : "KG")}
                                        </span>
                                      </div>
                                  <div className="flex h-10 w-[88px] items-center overflow-hidden rounded-md border border-input bg-muted/60 transition-all focus-within:ring-1 focus-within:ring-ring sm:h-9 sm:w-[84px]">
                                    <input
                                      type="text"
                                      className="h-full w-full bg-transparent px-1 text-center text-sm text-foreground focus:outline-none"
                                      placeholder="-"
                                      value={set.actualReps}
                                      onChange={(e) =>
                                        handleSetChange(
                                          activeExercise.exerciseId,
                                          set.id,
                                          "actualReps",
                                          e.target.value
                                        )
                                      }
                                    />
                                    <span className="flex h-full select-none items-center border-l border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground">REPS</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
                                <button
                                  type="button"
                                  className={`flex min-h-10 min-w-10 items-center justify-center rounded-md transition-all sm:h-8 sm:w-8 ${
                                    completed
                                      ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                  aria-label="Toggle complete"
                                  onClick={() => handleToggleSetComplete(activeExercise.exerciseId, set.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                {set.userAdded && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
                                    aria-label="Remove set"
                                    onClick={() => handleDeleteSet(activeExercise.exerciseId, set.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-muted-foreground"
                        onClick={() => handleAddSet(activeExercise.exerciseId)}
                      >
                        + Add set
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Session Notes */}
              <div className="mt-2">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Session Notes
                </label>
                <textarea
                  className="w-full min-h-[96px] rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                  placeholder="How did the session feel? Any PRs, form cues, or things to remember next time…"
                  value={sessionNotes}
                  onChange={(e) => {
                    touchedNotesRef.current = true;
                    setSessionNotes(e.target.value);
                    setHasDirtyWorkout(true);
                  }}
                />
              </div>
            </div>
          ) : (
            <Card className="border border-dashed border-border/60 bg-muted/40 px-4 py-6 text-sm">
              <p className="font-medium">Rest day scheduled</p>
              <p className="mt-1 text-xs text-muted-foreground">
                According to your current {customTitle}, today is a rest
                day. Recovery is part of progress.
              </p>
            </Card>
          )}
        </div>

        {/* Right column: context panel (visible on mobile; sticky on lg) */}
        <div className="flex flex-col gap-6 lg:col-span-4 lg:sticky lg:top-6 order-first lg:order-none">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                {todayFinished ? "Workout Complete" : "Current Session"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {todayFinished ? "Great job! You finished today\u2019s workout." : "Snapshot of today\u2019s workout."}
              </p>
            </CardHeader>
            <CardContent>
              {todayFinished ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeRoutine?.name ?? "Workout"} — done for today
                  </p>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={openHistoryModal}>
                    View history
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated time</p>
                      <p className="mt-1 text-2xl font-mono text-foreground">
                        {estimatedTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">
                        {currentStats.volume.toLocaleString()}{" "}
                        <span className="text-xs text-muted-foreground">{currentStats.volumeUnitLabel}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sets done</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {currentStats.completedSets}{" "}
                        <span className="text-xs text-muted-foreground">
                          / {currentStats.totalSets}
                        </span>
                      </p>
                      <div className="h-1.5 mt-2 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded transition-all duration-500 ease-out"
                          style={{ width: `${currentStats.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Routine</p>
                      <p className="mt-1 text-sm font-medium text-foreground truncate">
                        {activeRoutine?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    className={`mt-4 w-full min-h-11 sm:min-h-10 ${currentStats.completedSets === currentStats.totalSets ? "bg-emerald-600 font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-primary-foreground dark:hover:bg-emerald-400" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
                    disabled={isSavingWorkout || activeSession.exercises.length === 0}
                    onClick={finishWorkout}
                  >
                    {isSavingWorkout ? "Saving..." : "Finish workout"}
                  </Button>
                  <div className="mt-2 flex justify-center">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={openHistoryModal}>
                      View history
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={setIsHistoryModalOpen}
        size="responsive"
        className="max-w-4xl w-[95vw] h-[80vh] flex flex-col p-0 overflow-hidden"
      >
        <WorkoutHistoryFeed initialHistory={historyEntries as unknown as WorkoutDoc[]} isLoading={historyLoading} />
      </Modal>

      <AlertDialog open={!!importDialogData} onOpenChange={(open) => !open && setImportDialogData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Workout Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to customize your imported plan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => executeImportWorkoutPlan(false)}>Overwrite Current</Button>
            <Button onClick={() => executeImportWorkoutPlan(true)}>Create New Plan</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
