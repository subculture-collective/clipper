import { useState } from 'react';
import { Button } from '../ui/Button';
import { ReportModal } from './ReportModal';

interface ReportButtonProps {
  reportableType: 'clip' | 'comment' | 'user';
  reportableId: string;
  className?: string;
}

export function ReportButton({ reportableType, reportableId, className }: ReportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className={className}
        aria-label={`Report this ${reportableType}`}
      >
        <svg
          className="h-4 w-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
          />
        </svg>
        Report
      </Button>

      <ReportModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reportableType={reportableType}
        reportableId={reportableId}
      />
    </>
  );
}
