import { useState } from 'react';
import { CornerDownLeft, Plus } from 'lucide-react';
import type { Priority } from '../types';
import { useApp } from '../store/AppStore';
import { clampEstimate } from '../lib/validation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRIORITY_WORDS: Record<string, Priority> = {
  '1': 'urgent', khan: 'urgent', gap: 'urgent', urgent: 'urgent',
  '2': 'high', cao: 'high', high: 'high',
  '3': 'medium', tb: 'medium', vua: 'medium', medium: 'medium',
  '4': 'low', thap: 'low', low: 'low',
};

/** Phân tích cú pháp nhanh: "Viết báo cáo !cao @09:00 ~90 #công-việc" */
export function parseQuick(raw: string) {
  let priority: Priority = 'medium';
  let startTime: string | undefined;
  let estimateMin: number | undefined;
  const tags: string[] = [];

  const title = raw
    .replace(/!([\p{L}\d]+)/gu, (m, word: string) => {
      const hit = PRIORITY_WORDS[word.toLowerCase()];
      if (!hit) return m;
      priority = hit;
      return '';
    })
    .replace(/@(\d{1,2}):(\d{2})/g, (_m, h: string, mi: string) => {
      startTime = `${h.padStart(2, '0')}:${mi}`;
      return '';
    })
    .replace(/~(\d+)\s*(p|ph|phut|phút|m|min)?\b/gi, (_m, n: string) => {
      estimateMin = Number(n);
      return '';
    })
    .replace(/#([\p{L}\d_-]+)/gu, (_m, tag: string) => {
      tags.push(tag);
      return '';
    })
    .replace(/\s+/g, ' ')
    .trim();

  return { title, priority, startTime, estimateMin, tags };
}

const HINTS: { syntax: string; meaning: string }[] = [
  { syntax: '!cao', meaning: 'ưu tiên' },
  { syntax: '@09:00', meaning: 'giờ bắt đầu' },
  { syntax: '~90', meaning: 'số phút' },
  { syntax: '#nhãn', meaning: 'gắn nhãn' },
];

export default function QuickAdd({ date }: { date: string }) {
  const { addTask, notify } = useApp();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const parsed = parseQuick(value);
    if (!parsed.title) return;
    addTask({
      title: parsed.title,
      date,
      priority: parsed.priority,
      startTime: parsed.startTime,
      estimateMin: clampEstimate(parsed.estimateMin ?? 30),
      tags: parsed.tags,
    });
    notify(`Đã thêm: ${parsed.title}`);
    setValue('');
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border bg-card pr-1.5 pl-3.5 transition-colors',
          focused ? 'border-primary ring-primary/20 ring-2' : 'border-border',
        )}
      >
        <Plus className="text-primary size-4 shrink-0" strokeWidth={2.5} />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Thêm nhanh nhiệm vụ..."
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
        />
        <Button size="sm" className="h-8 gap-1.5" onClick={submit} disabled={!value.trim()}>
          Thêm <CornerDownLeft className="size-3.5" />
        </Button>
      </div>
      {focused && (
        <div className="animate-rise text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-[11px]">
          {HINTS.map((h) => (
            <span key={h.syntax} className="inline-flex items-center gap-1">
              <code className="bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-[10.5px]">{h.syntax}</code>
              {h.meaning}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
