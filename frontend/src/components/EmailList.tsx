import React from 'react';
import { Email } from '../types';
import { Clock, Star, Paperclip } from 'lucide-react';

interface EmailListProps {
  emails: Email[];
  loading: boolean;
  activeTab: 'scheduled' | 'sent';
  onSelectEmail: (email: Email) => void;
  onToggleStar?: (email: Email, e: React.MouseEvent) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  loading,
  activeTab,
  onSelectEmail,
  onToggleStar,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-gray-200/60 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-700">No {activeTab} emails</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          {activeTab === 'scheduled'
            ? 'You have no pending scheduled emails in the queue. Click "+ Compose" to schedule a campaign.'
            : 'No sent emails found in history yet.'}
        </p>
      </div>
    );
  }

  const formatScheduledTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="divide-y divide-gray-100">
      {emails.map((email) => {
        const isScheduled = email.status === 'SCHEDULED' || email.status === 'PROCESSING';
        const hasAttachments = email.attachments && email.attachments.length > 0;

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer group"
          >
            {/* Recipient & Status/Subject */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <span className="text-xs font-semibold text-gray-900 w-36 truncate">
                To: {email.recipient}
              </span>

              {/* Status Tag Pill (Matching Figma) */}
              {isScheduled ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FFF4E5] text-[#D97706] rounded-full text-xs font-medium flex-shrink-0 border border-[#FDE68A]">
                  <Clock className="w-3 h-3" />
                  <span>{formatScheduledTime(email.scheduledAt)}</span>
                  <span className="font-semibold text-gray-800 ml-1 truncate">
                    {email.subject} - Scheduled
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[11px] font-medium flex-shrink-0">
                    {email.status === 'SENT' ? 'Sent' : 'Failed'}
                  </span>
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {email.subject}
                  </span>
                </div>
              )}

              {/* Attachment Icon */}
              {hasAttachments && (
                <span className="flex items-center text-gray-400 flex-shrink-0" title={`${email.attachments!.length} attachment(s)`}>
                  <Paperclip className="w-3.5 h-3.5" />
                </span>
              )}

              {/* Body snippet */}
              <span className="text-xs text-gray-400 truncate flex-1 min-w-0">
                - {email.body}
              </span>
            </div>

            {/* Star Icon */}
            <div className="flex items-center ml-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar && onToggleStar(email, e);
                }}
                className="p-1 rounded-full hover:bg-gray-200/50 transition-colors"
                title={email.isStarred ? 'Unstar' : 'Star'}
              >
                <Star
                  className={`w-4 h-4 transition-colors ${
                    email.isStarred
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300 group-hover:text-amber-400'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
