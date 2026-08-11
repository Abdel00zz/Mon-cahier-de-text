import { memo } from 'react';
import { ScheduleTab } from '@/features/settings/components/ScheduleTab';
import type { AppConfig, ClassInfo } from '@/types';

interface ScheduleStepProps {
    classes: ClassInfo[];
    config: AppConfig;
    onConfigChange: (patch: Partial<AppConfig>) => void;
}

export const ScheduleStep = memo<ScheduleStepProps>(({ classes, config, onConfigChange }) => (
    <div className="space-y-4 animate-fade-in duration-500">
        <ScheduleTab classes={classes} config={config} onChange={onConfigChange} />
    </div>
));

ScheduleStep.displayName = 'ScheduleStep';
