import { useState } from "react";
import { addDays, subDays } from "date-fns";
import DeepWorkHeader from "@/components/deep-work/deep-work-header";
import WeeklyCalendar from "@/components/deep-work/weekly-calendar";
import DeepWorkQueue from "@/components/deep-work/deep-work-queue";
import SlotDetailModal from "@/components/deep-work/slot-detail-modal";
import TaskPickerModal from "@/components/deep-work/task-picker-modal";
import FocusSessionTimer from "@/components/deep-work/focus-session-timer";

export default function DeepWork() {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [slotModalState, setSlotModalState] = useState<{
    isOpen: boolean;
    date: Date | null;
    slot: string | null;
  }>({
    isOpen: false,
    date: null,
    slot: null,
  });
  const [taskPickerState, setTaskPickerState] = useState<{
    isOpen: boolean;
    date: Date | null;
    slot: string | null;
    preSelectedTaskId?: string | null;
  }>({
    isOpen: false,
    date: null,
    slot: null,
    preSelectedTaskId: null,
  });

  const goToPreviousWeek = () => {
    setSelectedWeek((prev) => subDays(prev, 7));
  };

  const goToNextWeek = () => {
    setSelectedWeek((prev) => addDays(prev, 7));
  };

  const goToThisWeek = () => {
    setSelectedWeek(new Date());
  };

  const handleCellClick = (date: Date, slot: string) => {
    setSlotModalState({
      isOpen: true,
      date,
      slot,
    });
  };

  const handleScheduleTask = (date?: Date, slot?: string) => {
    // If called from header, open task picker without pre-selected slot
    // If called from queue, open task picker
    setTaskPickerState({
      isOpen: true,
      date: date || null,
      slot: slot || null,
      preSelectedTaskId: null,
    });
  };

  const handleScheduleTaskFromQueue = (taskId: string) => {
    // Open task picker with this task pre-selected
    // For simplicity, we'll just open the task picker without pre-selection
    // User can select the task and choose slot
    setTaskPickerState({
      isOpen: true,
      date: null,
      slot: null,
      preSelectedTaskId: taskId,
    });
  };

  const handleSlotModalAddTask = () => {
    // Open task picker with the same date/slot
    setTaskPickerState({
      isOpen: true,
      date: slotModalState.date,
      slot: slotModalState.slot,
      preSelectedTaskId: null,
    });
    // Keep slot modal open in background
  };

  const handleCloseSlotModal = () => {
    setSlotModalState({
      isOpen: false,
      date: null,
      slot: null,
    });
  };

  const handleCloseTaskPicker = () => {
    setTaskPickerState({
      isOpen: false,
      date: null,
      slot: null,
      preSelectedTaskId: null,
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 pb-32">
      {/* Header */}
      <DeepWorkHeader
        selectedWeek={selectedWeek}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onThisWeek={goToThisWeek}
        onScheduleTask={() => handleScheduleTask()}
      />

      {/* Main Content: Calendar + Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <WeeklyCalendar
            selectedWeek={selectedWeek}
            onCellClick={handleCellClick}
          />
        </div>

        <div>
          <DeepWorkQueue
            onScheduleTask={handleScheduleTaskFromQueue}
          />
        </div>
      </div>

      {/* Focus Session Timer */}
      <FocusSessionTimer />

      {/* Modals */}
      <SlotDetailModal
        isOpen={slotModalState.isOpen}
        onClose={handleCloseSlotModal}
        date={slotModalState.date}
        slot={slotModalState.slot}
        onAddTask={handleSlotModalAddTask}
      />

      <TaskPickerModal
        isOpen={taskPickerState.isOpen}
        onClose={handleCloseTaskPicker}
        date={taskPickerState.date}
        slot={taskPickerState.slot}
      />
    </div>
  );
}
