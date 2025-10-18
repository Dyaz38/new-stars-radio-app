import React, { memo } from 'react';
import { Calendar, Edit3 } from 'lucide-react';
import type { ScheduleShow } from '../types';

interface ScheduleProps {
  schedule: ScheduleShow[];
  isLoadingSchedule: boolean;
  editingShow: ScheduleShow | null;
  onEditShow: (show: ScheduleShow) => void;
  onUpdateShow: (showId: number, updatedShow: Partial<ScheduleShow>) => void;
  onCancelEdit: () => void;
}

const ScheduleComponent: React.FC<ScheduleProps> = ({
  schedule,
  isLoadingSchedule,
  editingShow,
  onEditShow,
  onUpdateShow,
  onCancelEdit,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Today's Schedule</h3>
        </div>
        {isLoadingSchedule && (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {schedule.map((show) => (
          <div key={show.id}>
            {editingShow?.id === show.id ? (
              /* Edit Mode */
              <div className="bg-blue-500/20 rounded-lg p-3 border-l-4 border-blue-400">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={editingShow.show}
                    onChange={(e) => onUpdateShow(show.id, { show: e.target.value })}
                    className="bg-white/10 rounded px-2 py-1 text-white placeholder-gray-300"
                    placeholder="Show name"
                  />
                  <input
                    type="text"
                    value={editingShow.dj}
                    onChange={(e) => onUpdateShow(show.id, { dj: e.target.value })}
                    className="bg-white/10 rounded px-2 py-1 text-white placeholder-gray-300"
                    placeholder="DJ name"
                  />
                </div>
                <textarea
                  value={editingShow.description}
                  onChange={(e) => onUpdateShow(show.id, { description: e.target.value })}
                  className="w-full bg-white/10 rounded px-2 py-1 text-white placeholder-gray-300 resize-none"
                  placeholder="Description"
                  rows={2}
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={onCancelEdit}
                    className="px-3 py-1 bg-gray-500/50 rounded text-sm hover:bg-gray-500/70 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onUpdateShow(show.id, editingShow);
                      onCancelEdit();
                    }}
                    className="px-3 py-1 bg-green-500/50 rounded text-sm hover:bg-green-500/70 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className={`rounded-lg p-3 flex items-center justify-between transition-all ${
                show.current 
                  ? 'bg-gradient-to-r from-red-500/30 to-pink-500/30 border-l-4 border-red-400' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium">{show.time}</span>
                    {show.current && (
                      <span className="px-2 py-1 bg-red-500 rounded-full text-xs font-bold animate-pulse">
                        ON AIR
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold">{show.show}</h4>
                  <p className="text-sm text-gray-300">{show.dj}</p>
                  <p className="text-xs text-gray-400 mt-1">{show.description}</p>
                </div>
                <button
                  onClick={() => onEditShow(show)}
                  className="p-2 hover:bg-white/20 rounded-full transition-all"
                  aria-label={`Edit ${show.show}`}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Schedule = memo(ScheduleComponent, (prevProps, nextProps) => {
  return (
    prevProps.isLoadingSchedule === nextProps.isLoadingSchedule &&
    prevProps.editingShow?.id === nextProps.editingShow?.id &&
    JSON.stringify(prevProps.schedule) === JSON.stringify(nextProps.schedule)
  );
});

