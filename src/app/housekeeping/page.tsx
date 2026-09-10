"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatDate, sessionTypeLabel } from "@/lib/utils";
import { CheckSquare, Clock, Check, Circle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface BookingWithTasks {
  id: number;
  bookingRef: string;
  eventDate: string;
  sessionType: string;
  eventType: string;
  status: string;
  hallName: string;
  customerName: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  dueTime: string;
  staffName: string;
  completedAt: string;
}

export default function HousekeepingPage() {
  const [bookings, setBookings] = useState<BookingWithTasks[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const nextWeek = tomorrow.toISOString().split("T")[0];

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bookings?from=${today}&to=${nextWeek}&status=confirmed`);
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings || []);
      if (data.bookings?.length > 0 && !selectedBooking) {
        setSelectedBooking(data.bookings[0].id);
      }
    }
    setLoading(false);
  }, [today, nextWeek, selectedBooking]);

  const fetchTasks = useCallback(async () => {
    if (!selectedBooking) return;
    setTaskLoading(true);
    const res = await fetch(`/api/tasks?bookingId=${selectedBooking}`);
    if (res.ok) setTasks((await res.json()).tasks || []);
    setTaskLoading(false);
  }, [selectedBooking]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleTaskStatus = async (taskId: number, status: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchTasks();
  };

  const selectedBookingData = bookings.find((b) => b.id === selectedBooking);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Housekeeping</h1>
          <p className="text-sm text-slate-500">Task management for upcoming events</p>
        </div>

        <div className="grid grid-cols-4 gap-5">
          {/* Bookings List */}
          <div className="col-span-1">
            <Card padding={false}>
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-sm">Upcoming Events</h3>
                <p className="text-xs text-slate-500">Next 7 days</p>
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 animate-pulse">
                      <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  ))
                ) : bookings.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">No upcoming events</div>
                ) : (
                  bookings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBooking(b.id)}
                      className={`w-full text-left p-4 transition-colors ${selectedBooking === b.id ? "bg-indigo-50 border-l-4 border-indigo-500" : "hover:bg-slate-50"}`}
                    >
                      <p className="font-semibold text-sm text-slate-900">{b.bookingRef}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{b.eventType}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(b.eventDate)} · {sessionTypeLabel(b.sessionType)}</p>
                      <p className="text-xs text-slate-400">{b.hallName}</p>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Task Details */}
          <div className="col-span-3">
            {selectedBookingData ? (
              <div className="space-y-4">
                {/* Header */}
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedBookingData.bookingRef}</h2>
                      <p className="text-sm text-slate-500">
                        {selectedBookingData.eventType} · {selectedBookingData.hallName} ·{" "}
                        {formatDate(selectedBookingData.eventDate)} · {sessionTypeLabel(selectedBookingData.sessionType)}
                      </p>
                    </div>
                    <Link href={`/bookings/${selectedBookingData.id}`}>
                      <Button size="sm" variant="outline">View Booking</Button>
                    </Link>
                  </div>

                  {/* Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                      <span>{doneTasks}/{totalTasks} tasks completed</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Status Summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { status: "pending", count: tasks.filter(t => t.status === "pending").length, color: "bg-slate-50 text-slate-700" },
                    { status: "in_progress", count: tasks.filter(t => t.status === "in_progress").length, color: "bg-blue-50 text-blue-700" },
                    { status: "done", count: tasks.filter(t => t.status === "done").length, color: "bg-emerald-50 text-emerald-700" },
                  ].map(({ status, count, color }) => (
                    <div key={status} className={`rounded-xl p-3 text-center ${color}`}>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm capitalize">{status.replace("_", " ")}</div>
                    </div>
                  ))}
                </div>

                {/* Task List */}
                <Card>
                  <h3 className="font-semibold text-slate-900 mb-4">Tasks</h3>
                  {taskLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-indigo-600" size={24} />
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <CheckSquare size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No tasks for this booking</p>
                      <Link href={`/bookings/${selectedBooking}`}>
                        <Button size="sm" className="mt-3">Add Tasks in Booking</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                          <div className="flex gap-1.5">
                            {[
                              { status: "pending", icon: Circle, color: "text-slate-300 hover:text-slate-500" },
                              { status: "in_progress", icon: Clock, color: "text-blue-400 hover:text-blue-600" },
                              { status: "done", icon: Check, color: "text-emerald-500 hover:text-emerald-700" },
                            ].map(({ status, icon: Icon, color }) => (
                              <button
                                key={status}
                                onClick={() => handleTaskStatus(task.id, status)}
                                className={`${task.status === status ? color : "text-slate-200 hover:text-slate-400"} transition-colors`}
                              >
                                <Icon size={20} />
                              </button>
                            ))}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-slate-400" : "text-slate-900"}`}>
                              {task.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {task.staffName && `👤 ${task.staffName}`}{task.dueTime && ` · ⏰ ${task.dueTime}`}
                              {task.completedAt && ` · ✅ Done at ${new Date(task.completedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                          </div>
                          <Badge label={task.status.replace("_", " ")} status={task.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <CheckSquare size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Select an event to view tasks</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
