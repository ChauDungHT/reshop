import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ImageItem {
  id: string;
  file?: File;
  preview: string;
}

interface ImageUploaderProps {
  maxImages?: number;
  onChange: (files: File[]) => void;
  onRemoveInitial?: (url: string) => void;
  initialPreviews?: string[];
}

const SortableImage = ({ id, preview, onRemove }: { id: string; preview: string; onRemove: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-900"
    >
      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
      <div 
        {...attributes} 
        {...listeners}
        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <span className="text-white text-[10px] font-bold uppercase tracking-widest">Sắp xếp</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500/90 text-white flex items-center justify-center text-[10px] hover:bg-rose-600 transition-colors z-10 shadow-lg"
      >
        ✕
      </button>
    </div>
  );
};

const ImageUploader: React.FC<ImageUploaderProps> = ({ maxImages = 8, onChange, onRemoveInitial, initialPreviews = [] }) => {
  const [images, setImages] = useState<ImageItem[]>([]);

  useEffect(() => {
    if (initialPreviews.length > 0) {
      setImages(initialPreviews.map((url, i) => ({ id: `initial-${i}`, preview: url })));
    }
  }, [initialPreviews]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const files = images.map(img => img.file).filter((f): f is File => !!f);
    onChange(files);
  }, [images, onChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > maxImages) {
      alert(`Bạn chỉ được chọn tối đa ${maxImages} ảnh.`);
      return;
    }

    const newItems: ImageItem[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages(prev => [...prev, ...newItems]);
    e.target.value = ''; // Reset input
  };

  const handleRemove = (id: string) => {
    setImages(prev => {
      const itemToRemove = prev.find(img => img.id === id);
      if (itemToRemove?.file) {
        URL.revokeObjectURL(itemToRemove.preview);
      } else if (itemToRemove && onRemoveInitial) {
        onRemoveInitial(itemToRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImages(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hình ảnh sản phẩm</label>
        <span className="text-[10px] text-slate-500 font-bold bg-slate-800/50 px-2 py-0.5 rounded-full">{images.length} / {maxImages}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map(i => i.id)} strategy={horizontalListSortingStrategy}>
            {images.map(img => (
              <SortableImage key={img.id} id={img.id} preview={img.preview} onRemove={handleRemove} />
            ))}
          </SortableContext>
        </DndContext>

        {images.length < maxImages && (
          <label className="aspect-square rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center cursor-pointer group bg-slate-900/30">
            <span className="text-2xl text-slate-700 group-hover:text-indigo-400 transition-colors">+</span>
            <span className="text-[9px] font-bold text-slate-600 group-hover:text-slate-400 uppercase tracking-tighter mt-0.5">Tải lên</span>
            <input type="file" multiple accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
          </label>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
