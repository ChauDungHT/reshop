import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosInstance, { BASE_URL } from '../../../../shared-ui/src/lib/axios';
import type { IQAItem, IApiResponse } from '../../../../shared-ui/src/types';

const VendorQAPage = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('all');

  const { data: qas, isLoading } = useQuery<IQAItem[]>({
    queryKey: ['vendor-qa'],
    queryFn: async () => {
      const res = await axiosInstance.get<IApiResponse<IQAItem[]>>('/vendor/qa');
      return res.data.data;
    },
  });

  const answerMutation = useMutation({
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => {
      await axiosInstance.put(`/vendor/qa/${id}/answer`, { answer });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-qa'] });
    },
  });

  const filteredQAs = qas?.filter((qa) => {
    if (filter === 'unanswered') return !qa.answer;
    if (filter === 'answered') return !!qa.answer;
    return true;
  }) || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">Hỏi & Đáp</h2>
          <p className="text-slate-500 mt-1">Trả lời câu hỏi từ khách hàng về sản phẩm của bạn.</p>
        </div>
        
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'unanswered', label: 'Chưa trả lời' },
            { id: 'answered', label: 'Đã trả lời' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as 'all' | 'unanswered' | 'answered')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="p-20 text-center animate-pulse text-slate-600">Đang tải câu hỏi...</div>
        ) : filteredQAs.length === 0 ? (
          <div className="p-20 text-center bg-slate-900 rounded-4xl border border-dashed border-slate-800 text-slate-500">
            Chưa có câu hỏi nào trong mục này.
          </div>
        ) : (
          filteredQAs.map((qa) => (
            <QAItem key={qa.id} qa={qa} answerMutation={answerMutation} />
          ))
        )}
      </div>
    </div>
  );
};

const QAItem = ({ qa, answerMutation }: { qa: IQAItem; answerMutation: UseMutationResult<void, unknown, { id: string; answer: string }, unknown> }) => {
  const [replyText, setReplyText] = useState('');

  return (
    <div className="bg-slate-900 border border-white/5 rounded-4xl overflow-hidden hover:border-indigo-500/30 transition-all group">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/10 shrink-0">
              <img 
                src={qa.user_avatar ? `${BASE_URL}${qa.user_avatar}` : `https://ui-avatars.com/api/?name=${qa.user_name || 'U'}&background=6366f1&color=fff`} 
                alt={qa.user_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-sm">{qa.user_name || 'Khách hàng'}</p>
              <p className="text-xs text-slate-500">{new Date(qa.created_at).toLocaleString('vi-VN')}</p>
            </div>
          </div>
          {qa.answer ? (
            <span className="shrink-0 text-[10px] font-bold px-2 py-1 bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/20">
              Đã trả lời
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-bold px-2 py-1 bg-amber-500/15 text-amber-400 rounded-full border border-amber-500/20">
              Chưa trả lời
            </span>
          )}
        </div>

        <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
          <Link to={`/product/${qa.product_id}`} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition line-clamp-1 mb-2 inline-block">
            Sản phẩm: {qa.product_name}
          </Link>
          <p className="text-slate-300 text-sm">{qa.question}</p>
        </div>

        {qa.answer ? (
          <div className="flex gap-4">
            <div className="w-1 bg-emerald-500/30 rounded-full shrink-0"></div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Shop trả lời</p>
              <p className="text-sm text-slate-300">{qa.answer}</p>
              {qa.answered_at && (
                <p className="text-[10px] text-slate-500">{new Date(qa.answered_at).toLocaleString('vi-VN')}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Nhập câu trả lời của bạn..."
              rows={3}
              className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 resize-none transition"
            />
            <div className="flex justify-end">
              <button
                disabled={!replyText.trim() || answerMutation.isPending}
                onClick={() => {
                  answerMutation.mutate({ id: qa.id, answer: replyText });
                }}
                className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {answerMutation.isPending ? 'Đang gửi...' : 'Gửi trả lời'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorQAPage;
