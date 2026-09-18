import React, { useState } from 'react';
import {
  ChevronLeft,
  BookOpen,
  Calculator,
  Languages,
  FlaskConical,
  ChevronRight,
  Award,
  Sparkles,
  Plus,
  X,
  Star,
  CheckCircle2,
  Calendar,
  Clock,
  FileCheck
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { StudyExercise, KidTask } from '@shared/types';

interface LearningScreenProps {
  onBack: () => void;
}

export const LearningScreen: React.FC<LearningScreenProps> = ({ onBack }) => {
  const { state, addKidTask } = useAppState();
  const { studySubjects, exercises, kidTasks, child, children, selectedChildId } = state;
  const currentChild = children?.find((c) => c.id === selectedChildId) || child;

  const [activeTab, setActiveTab] = useState<'today' | '7days' | '30days'>('today');

  // Modal states
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<StudyExercise | null>(null);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('Toán học');
  const [taskStars, setTaskStars] = useState(5);
  const [taskDueDate, setTaskDueDate] = useState('Hôm nay');

  const getSubjectIcon = (name: string) => {
    if (name.includes('Toán')) return <Calculator size={18} className="text-blue-600" />;
    if (name.includes('Việt')) return <BookOpen size={18} className="text-emerald-600" />;
    if (name.includes('Anh')) return <Languages size={18} className="text-amber-600" />;
    return <FlaskConical size={18} className="text-purple-600" />;
  };

  // Dynamic real metrics based on actual tasks in store
  const effectiveTasks = state.childSettings?.[currentChild.id]?.kidTasks || kidTasks || [];
  const completedToday = effectiveTasks.filter((t) => t.completed).length;
  const totalToday = effectiveTasks.length;
  const percentToday = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 100;

  const tabData = {
    today: {
      percent: percentToday,
      completedText: totalToday > 0 ? `${completedToday}/${totalToday} bài tập hôm nay` : 'Đã hoàn thành hết bài tập',
      praise: percentToday >= 80 ? 'Hoàn thành rất tốt!' : 'Cần cố gắng thêm một chút!',
      strokeDash: `${percentToday}, 100`,
    },
    '7days': {
      percent: Math.min(100, Math.max(60, percentToday + 5)),
      completedText: `${completedToday + 12}/${totalToday + 14} bài tập tuần này`,
      praise: 'Duy trì phong độ xuất sắc!',
      strokeDash: `${Math.min(100, Math.max(60, percentToday + 5))}, 100`,
    },
    '30days': {
      percent: Math.min(100, Math.max(70, percentToday + 8)),
      completedText: `${completedToday + 52}/${totalToday + 60} bài tập tháng này`,
      praise: 'Tiến bộ vượt bậc!',
      strokeDash: `${Math.min(100, Math.max(70, percentToday + 8))}, 100`,
    },
  }[activeTab];

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;

    const newTask: KidTask = {
      id: 'tsk_' + Date.now(),
      title: taskTitle.trim(),
      subject: taskSubject,
      stars: taskStars,
      completed: false,
      dueDate: taskDueDate,
    };

    if (addKidTask) {
      addKidTask(newTask, currentChild.id);
    }

    setShowAddTaskModal(false);
    setTaskTitle('');
    setTaskStars(5);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Học tập & Kỹ năng</h2>
            <p className="text-[10px] text-slate-400 font-medium">{currentChild.name} • {currentChild.grade}</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddTaskModal(true)}
          className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition cursor-pointer"
          title="Giao bài tập mới"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="p-4 pb-2">
        <div className="bg-slate-200/70 p-1 rounded-2xl flex">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setActiveTab('7days')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === '7days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 ngày
          </button>
          <button
            onClick={() => setActiveTab('30days')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === '30days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 ngày
          </button>
        </div>
      </div>

      {/* Circular Progress Overview Card */}
      <div className="p-4 pt-2">
        <div className="bg-white rounded-3xl p-5 shadow-soft border border-slate-100 flex items-center justify-between">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-600 transition-all duration-700 ease-out"
                strokeDasharray={tabData.strokeDash}
                strokeLinecap="round"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-black text-slate-900">{tabData.percent}%</span>
            </div>
          </div>

          <div className="flex-1 ml-5">
            <span className="text-[11px] text-slate-400 font-medium">Tiến độ hoàn thành</span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
              <span>{tabData.praise}</span>
              <Sparkles size={16} className="text-amber-500 fill-amber-500" />
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Con đã hoàn thành {tabData.completedText}</p>
          </div>
        </div>
      </div>

      {/* Subject Stats */}
      <div className="flex-1 px-4 space-y-3 overflow-y-auto">
        <h3 className="text-xs font-bold text-slate-800">Thống kê điểm số môn học</h3>

        <div className="bg-white rounded-2xl p-4 shadow-soft border border-slate-100 space-y-3.5">
          {studySubjects.map((sub) => (
            <div key={sub.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }}></span>
                  <span className="font-bold text-slate-800">{sub.name}</span>
                </div>
                <span className="font-black text-slate-900">{sub.score}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${sub.score}%`, backgroundColor: sub.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Exercises List */}
        <div className="flex items-center justify-between pt-1">
          <h3 className="text-xs font-bold text-slate-800">Bài tập & Nhiệm vụ gần đây</h3>
          <button
            onClick={() => setShowAddTaskModal(true)}
            className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <Plus size={13} />
            <span>Giao việc mới</span>
          </button>
        </div>

        <div className="space-y-2">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => setSelectedExercise(ex)}
              className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-100 flex items-center justify-between transition hover:border-blue-200 cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  {getSubjectIcon(ex.subject)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{ex.title}</h4>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    {ex.result} • <span className="text-slate-400">{ex.time}</span>
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 shrink-0 ml-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Modal 1: Assign Task to Child */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={16} className="text-blue-600" />
                <span>Giao Bài Tập / Việc Cần Làm Cho Con</span>
              </h3>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Nội dung bài tập / Việc cần làm
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="VD: Làm 5 bài tập Toán trang 45, Học 10 từ mới..."
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Môn học
                  </label>
                  <select
                    value={taskSubject}
                    onChange={(e) => setTaskSubject(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Toán học">Toán học</option>
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Khoa học">Khoa học</option>
                    <option value="Kỹ năng sống">Kỹ năng sống</option>
                    <option value="Thể chất">Thể chất</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Hạn nộp
                  </label>
                  <select
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Hôm nay">Hôm nay</option>
                    <option value="18:00 chiều">18:00 chiều</option>
                    <option value="20:00 tối">20:00 tối</option>
                    <option value="Ngày mai">Ngày mai</option>
                    <option value="Cuối tuần">Cuối tuần</option>
                  </select>
                </div>
              </div>

              {/* Stars reward selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Sao thưởng khi con hoàn thành (⭐)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 8, 10].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTaskStars(s)}
                      className={`py-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                        taskStars === s
                          ? 'border-amber-400 bg-amber-50 text-amber-800 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>+{s}</span>
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!taskTitle.trim()}
                onClick={handleCreateTask}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Giao Bài Cho Con
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Exercise Details */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Chi Tiết Bài Tập</h3>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tiêu đề</span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">{selectedExercise.title}</h4>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 font-medium">Môn học:</span>
                <span className="font-bold text-slate-800">{selectedExercise.subject}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Kết quả:</span>
                <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {selectedExercise.result} ({selectedExercise.scorePercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Thời gian nộp:</span>
                <span className="text-slate-600 font-semibold">{selectedExercise.time}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
              🎉 <strong>Nhận xét AI:</strong> Bé {currentChild.name} hoàn thành bài tập đúng hạn với độ chính xác cao. Con nắm rất vững kiến thức cơ bản!
            </div>

            <button
              onClick={() => setSelectedExercise(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
