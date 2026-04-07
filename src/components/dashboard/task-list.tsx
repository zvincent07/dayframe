'use client';

import { useOptimistic, useTransition, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Loader2, Clock, ChevronLeft, ChevronRight, CheckSquare, CheckCircle2, Circle, MoreHorizontal } from 'lucide-react';
import { createTask, updateTask, deleteTask, getCompletedTasksByDate, getIncompleteTasksByDate } from '@/actions/tasks';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Task {
  _id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
}

type TaskOptimisticUpdate =
  | { type: 'reset' }
  | { type: 'add'; id: string; title: string; duration: string }
  | { type: 'toggle'; id: string; value: boolean }
  | { type: 'remove'; id: string }
  | { type: 'restore'; task: Task }
  | { type: 'replace'; tempId: string; task: Task };

function taskReducer(state: Task[], update: TaskOptimisticUpdate): Task[] {
  switch (update.type) {
    case 'reset':
      return state;
    case 'add':
      return [...state, { _id: update.id, title: update.title, duration: update.duration, isCompleted: false }];
    case 'toggle':
      return state.map((t) => (t._id === update.id ? { ...t, isCompleted: update.value } : t));
    case 'remove':
      return state.filter((t) => t._id !== update.id);
    case 'restore':
      return [...state, update.task];
    case 'replace':
      return state.map((t) => (t._id === update.tempId ? { ...update.task } : t));
    default:
      return state;
  }
}

export function TaskList({ initialTasks, initialDateStr }: { initialTasks: Task[]; initialDateStr?: string }) {
  const [optimisticTasks, addOptimistic] = useOptimistic(initialTasks, taskReducer);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'today';
  const [historyDate, setHistoryDate] = useState<Date>(() => {
    const param = searchParams.get('historyDate');
    if (param) {
      const d = new Date(param);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (initialDateStr) {
      const [y, m, dstr] = initialDateStr.split('-');
      return new Date(Number(y), Number(m) - 1, Number(dstr));
    }
    return new Date();
  });
  type HistoryItemBase = { _id: string; title: string; duration: string };
  type HistoryItem = HistoryItemBase & { isCompleted: boolean };
  // Unused states kept for fetchHistory compatibility
  const [historyAll, setHistoryAll] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'completed' | 'incomplete'>('completed');

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const dateStr = format(historyDate, 'yyyy-MM-dd');
      const tasks = await getCompletedTasksByDate(dateStr);
      const incomplete = await getIncompleteTasksByDate(dateStr);
      const mapItem = (t: { _id: string; title: string; duration?: string }): HistoryItemBase => ({
        _id: t._id,
        title: t.title,
        duration: t.duration || '',
      });
      const completedMapped: HistoryItem[] = tasks.map(mapItem).map((x: HistoryItemBase): HistoryItem => ({ ...x, isCompleted: true }));
      const incompleteMapped: HistoryItem[] = incomplete.map(mapItem).map((x: HistoryItemBase): HistoryItem => ({ ...x, isCompleted: false }));
      setHistoryAll([...completedMapped, ...incompleteMapped]);
    } catch {
      setHistoryAll([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const refreshHistoryIfToday = () => {
    const todayStr = initialDateStr || format(new Date(), 'yyyy-MM-dd');
    const historyStr = format(historyDate, 'yyyy-MM-dd');
    if (todayStr === historyStr) {
      fetchHistory();
    }
  };

  const goPrevDay = () => {
    setHistoryDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const goNextDay = () => {
    setHistoryDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      const today = new Date();
      if (d > today) return prev;
      return d;
    });
  };

  const handleCreate = () => {
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    const duration = newTaskDuration;
    const tempId = `temp-${Date.now()}`;
    setNewTaskTitle('');
    setNewTaskDuration('');

    startTransition(async () => {
      addOptimistic({ type: 'add', id: tempId, title, duration });
      const result = await createTask(title, duration);
      if (result.success && result.task) {
        addOptimistic({ type: 'replace', tempId, task: result.task as unknown as Task });
        toast.success('Task added');
        refreshHistoryIfToday();
      } else {
        addOptimistic({ type: 'remove', id: tempId });
        toast.error('Failed to add task');
      }
    });
  };

  const handleToggle = (taskId: string, newCompleted: boolean) => {
    const previous = optimisticTasks.find((t) => t._id === taskId)?.isCompleted ?? false;
    startTransition(async () => {
      addOptimistic({ type: 'toggle', id: taskId, value: newCompleted });
      const result = await updateTask(taskId, { isCompleted: newCompleted });
      if (!result.success) {
        addOptimistic({ type: 'toggle', id: taskId, value: previous });
        toast.error('Failed to update task');
      } else {
        refreshHistoryIfToday();
      }
    });
  };

  const handleDelete = (taskId: string) => {
    const removed = optimisticTasks.find((t) => t._id === taskId);
    startTransition(async () => {
      addOptimistic({ type: 'remove', id: taskId });
      const result = await deleteTask(taskId);
      if (!result.success) {
        if (removed) addOptimistic({ type: 'restore', task: removed });
        toast.error('Failed to delete task');
      } else {
        toast.success('Task deleted');
        refreshHistoryIfToday();
      }
    });
  };

  const handleEditStart = (task: Task | HistoryItem) => {
    setEditingTaskId(task._id);
    setEditTitle(task.title);
    setEditDuration(task.duration);
  };

  const handleEditCancel = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDuration('');
  };

  const handleEditSave = (taskId: string, isHistory: boolean = false) => {
    if (!editTitle.trim()) return;
    const dateStr = isHistory ? format(historyDate, 'yyyy-MM-dd') : undefined;
    
    startTransition(async () => {
      const result = await updateTask(taskId, { 
        title: editTitle.trim(), 
        duration: editDuration,
        completedDateKey: dateStr 
      });
      if (result.success) {
        toast.success('Task updated');
        setEditingTaskId(null);
        if (isHistory) fetchHistory();
        router.refresh();
      } else {
        toast.error('Failed to update task');
      }
    });
  };

  const handleHistoryToggle = (taskId: string, currentCompleted: boolean) => {
    const dateStr = format(historyDate, 'yyyy-MM-dd');
    const task = historyAll.find(t => t._id === taskId);
    if (!task) return;

    startTransition(async () => {
      const result = await updateTask(taskId, { 
        isCompleted: !currentCompleted, 
        completedDateKey: dateStr,
        title: task.title 
      });
      if (!result.success) {
        toast.error('Failed to update task history');
      } else {
        fetchHistory();
        const todayStr = initialDateStr || format(new Date(), 'yyyy-MM-dd');
        if (dateStr === todayStr) {
           router.refresh();
        }
      }
    });
  };

  const tasks = optimisticTasks;
  const filteredHistory = historyAll.filter((t) => t.isCompleted === (historyFilter === 'completed'));
  
  // Calculate progress bar percentage
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const markAllDone = () => {
    const toComplete = optimisticTasks.filter((t) => !t.isCompleted);
    if (toComplete.length === 0) return;
    startTransition(async () => {
      await Promise.all(
        toComplete.map((t) =>
          updateTask(t._id, { isCompleted: true })
        )
      );
      toast.success('Marked all tasks as done');
      refreshHistoryIfToday();
    });
  };

  const clearCompleted = () => {
    const toClear = optimisticTasks.filter((t) => t.isCompleted);
    if (toClear.length === 0) return;
    startTransition(async () => {
      await Promise.all(toClear.map((t) => updateTask(t._id, { isCompleted: false })));
      toast.success('Cleared completed tasks');
      refreshHistoryIfToday();
    });
  };

  const isToday = format(historyDate, "yyyy-MM-dd") === (initialDateStr || format(new Date(), "yyyy-MM-dd"));

  return (
    <Card className="flex flex-col h-[450px] overflow-hidden p-0 border border-border/50 bg-card">
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <Tabs 
          value={activeTab} 
          onValueChange={(v) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', v);
            router.push(`?${params.toString()}`);
          }} 
          className="w-full flex-1 min-h-0 flex flex-col"
        >
          <div className="flex shrink-0 flex-col gap-3 border-b border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h3 className="flex shrink-0 items-center gap-2 text-base font-semibold sm:text-lg">
                <CheckSquare className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                Tasks
              </h3>
              <TabsList className="grid h-9 w-full grid-cols-2 bg-muted/40 sm:inline-flex sm:h-10 sm:w-auto sm:justify-start border border-border/60">
                <TabsTrigger value="today" className="px-2 text-xs sm:px-6 sm:text-sm">
                  Today
                </TabsTrigger>
                <TabsTrigger value="history" className="px-2 text-xs sm:px-6 sm:text-sm">
                  History
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="today" className="mt-0 shrink-0 data-[state=inactive]:hidden">
              <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="hidden items-center gap-2 sm:flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-muted-foreground hover:text-foreground"
                    onClick={markAllDone}
                  >
                    Mark all done
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-muted-foreground hover:text-foreground"
                    onClick={clearCompleted}
                  >
                    Clear completed
                  </Button>
                </div>
                <div className="flex justify-end sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 px-3 text-xs"
                        aria-label="Task actions"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={markAllDone}>Mark all done</DropdownMenuItem>
                      <DropdownMenuItem onClick={clearCompleted}>Clear completed</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </TabsContent>
          </div>
          <div className="h-1 w-full shrink-0 bg-muted">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <TabsContent value="today" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 overflow-y-auto p-4 overscroll-contain touch-pan-y [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className="group flex w-full items-center gap-3 rounded-md px-2 py-1 -mx-2 transition-colors hover:bg-muted/40"
                >
                  <Checkbox
                    checked={task.isCompleted}
                    onCheckedChange={(checked) => handleToggle(task._id, checked === true)}
                    className="size-5 shrink-0 rounded-full border border-zinc-500 bg-transparent hover:border-zinc-400 data-[state=checked]:bg-emerald-500/20 data-[state=checked]:border-emerald-500/50 data-[state=checked]:text-emerald-500 data-[state=checked]:hover:bg-emerald-500/30"
                    aria-label={task.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                  />
                  {editingTaskId === task._id ? (
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <input
                        type="text"
                        className="flex-1 min-w-0 bg-muted/50 border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave(task._id)}
                        autoFocus
                      />
                      <input
                        type="text"
                        className="w-12 bg-muted/50 border border-border rounded px-2 py-1 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        placeholder="0m"
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave(task._id)}
                      />
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={handleEditCancel}>Cancel</Button>
                        <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleEditSave(task._id)}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`min-w-0 flex-1 truncate text-sm font-medium transition-all cursor-pointer ${task.isCompleted ? 'line-through text-zinc-600 dark:text-zinc-500' : 'text-foreground'}`}
                        onClick={() => handleEditStart(task)}
                      >
                        {task.title}
                      </span>
                      <span
                        className={`shrink-0 font-mono text-xs tabular-nums cursor-pointer ${task.isCompleted ? 'text-zinc-600 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-500'}`}
                        onClick={() => handleEditStart(task)}
                      >
                        {task.duration || '—'}
                      </span>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                    onClick={() => handleDelete(task._id)}
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-auto shrink-0 p-3 border-t border-border/50 bg-transparent">
              <div className="relative flex items-center bg-muted/30 border border-border/80 rounded-lg overflow-hidden focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600 transition-all shadow-sm">
                <input
                  type="text"
                  className="flex-1 h-10 bg-transparent border-none px-3 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  aria-label="New task title"
                />
                <div className="flex items-center gap-1.5 pr-1.5">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 hover:bg-muted transition-colors focus-within:bg-muted focus-within:ring-1 focus-within:ring-zinc-600">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-8 bg-transparent border-none p-0 text-xs text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-0 font-mono"
                      placeholder="0m"
                      value={newTaskDuration}
                      onChange={(e) => setNewTaskDuration(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      aria-label="New task duration"
                    />
                  </div>
                  <button
                    type="button"
                    className="p-1.5 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 rounded-md transition-all"
                    onClick={handleCreate}
                    disabled={isPending || !newTaskTitle.trim()}
                    aria-label="Add task"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="history" className="flex-1 flex flex-col min-h-0">
            <div className="flex shrink-0 flex-col gap-3 border-b border-border/50 bg-card/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="flex items-center justify-center gap-3 text-sm font-medium text-foreground sm:justify-start">
                <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:h-8 sm:w-8" onClick={goPrevDay} aria-label="Previous day">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-0 flex-1 truncate text-center sm:flex-none sm:text-left">{format(historyDate, 'PP')}</span>
                <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:h-8 sm:w-8" onClick={goNextDay} aria-label="Next day">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <Tabs value={historyFilter} onValueChange={(v) => setHistoryFilter(v as 'completed' | 'incomplete')}>
                <TabsList className="grid h-9 w-full grid-cols-2 bg-muted/40 sm:inline-flex sm:h-10 sm:w-auto border border-border/60">
                  <TabsTrigger value="completed" className="px-2 text-xs sm:px-5 sm:text-sm">
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="incomplete" className="px-2 text-xs sm:px-5 sm:text-sm">
                    Incomplete
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2 overscroll-contain touch-pan-y [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {historyLoading ? (
                <div className="flex items-center justify-center py-3 text-sm text-zinc-500 italic">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-sm text-zinc-500 italic py-4 text-center">
                  {historyFilter === 'completed' ? 'No completed tasks for this date.' : 'No incomplete tasks recorded.'}
                </div>
              ) : (
                <ul>
                  {filteredHistory.map((t) => (
                    <li key={t._id} className="h-10 flex items-center justify-between gap-2 rounded-md px-2 border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {!isToday && (
                          <Checkbox
                            checked={t.isCompleted}
                            onCheckedChange={() => handleHistoryToggle(t._id, t.isCompleted)}
                            className="size-4 shrink-0 rounded-full border border-zinc-500 bg-transparent hover:border-zinc-400 data-[state=checked]:bg-emerald-500/20 data-[state=checked]:border-emerald-500/50 data-[state=checked]:text-emerald-500 data-[state=checked]:hover:bg-emerald-500/30"
                            aria-label={t.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                          />
                        )}
                        {editingTaskId === t._id ? (
                          <div className="flex flex-1 items-center gap-2 min-w-0 py-1">
                            <input
                              type="text"
                              className="flex-1 min-w-0 bg-muted/50 border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleEditSave(t._id, true)}
                              autoFocus
                            />
                            <input
                              type="text"
                              className="w-12 bg-muted/50 border border-border rounded px-2 py-1 text-xs font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                              value={editDuration}
                              onChange={(e) => setEditDuration(e.target.value)}
                              placeholder="0m"
                              onKeyDown={(e) => e.key === 'Enter' && handleEditSave(t._id, true)}
                            />
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={handleEditCancel}>Cancel</Button>
                              <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleEditSave(t._id, true)}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span 
                              className={`text-sm truncate font-medium cursor-pointer ${t.isCompleted ? 'line-through text-zinc-600' : 'text-foreground'}`}
                              onClick={() => handleEditStart(t)}
                            >
                              {t.title}
                            </span>
                          </>
                        )}
                      </div>
                      {!editingTaskId && (
                        <span 
                          className="font-mono text-xs tabular-nums text-muted-foreground shrink-0 cursor-pointer"
                          onClick={() => handleEditStart(t)}
                        >
                          {t.duration || '—'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
