import React from 'react';
import { Email } from '../types';
import { ArrowLeft, Star, Trash2, Archive, ExternalLink, MailCheck, Paperclip, FileText, Download, Image as ImageIcon } from 'lucide-react';

interface EmailDetailModalProps {
  email: Email | null;
  onClose: () => void;
  onToggleStar?: (email: Email) => void;
  onDelete?: (email: Email) => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({
  email,
  onClose,
  onToggleStar,
  onDelete,
}) => {
  if (!email) return null;

  const senderLabel = email.senderEmail || 'scheduler@reachinbox.ai';
  const senderInitial = senderLabel.charAt(0).toUpperCase();

  const formattedDate = email.sentAt
    ? new Date(email.sentAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : new Date(email.scheduledAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-gray-900 truncate">
              {email.subject}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-gray-400">
            {/* Interactive Star */}
            <button
              type="button"
              onClick={() => onToggleStar && onToggleStar(email)}
              className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
              title={email.isStarred ? 'Unstar' : 'Star'}
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-400 hover:text-amber-400'
                }`}
              />
            </button>

            {/* Archive */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
              title="Archive"
            >
              <Archive className="w-5 h-5" />
            </button>

            {/* Interactive Delete */}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this email?')) {
                  onDelete && onDelete(email);
                }
              }}
              className="p-1.5 rounded-full hover:bg-red-50 cursor-pointer transition-colors text-gray-400 hover:text-red-500"
              title="Delete Email"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          {/* Ethereal Fake SMTP Explanation Notice (Addressing user question) */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <MailCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-1">
              <p className="font-bold">Ethereal Fake SMTP Protection Active</p>
              <p className="leading-relaxed">
                As required by the assignment specs, emails are sent through <strong>Ethereal Email (Fake SMTP)</strong> to prevent spamming real personal inboxes.
              </p>
              <a
                href="https://ethereal.email/messages"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline pt-1"
              >
                <span>View Ethereal Fake Inbox</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Sender & Meta Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00A859] text-white flex items-center justify-center font-bold text-sm">
                {senderInitial}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900">ReachInbox Sender</span>
                  <span className="text-xs text-gray-400">&lt;{senderLabel}&gt;</span>
                </div>
                <span className="text-xs text-gray-400">to {email.recipient}</span>
              </div>
            </div>
            <span className="text-xs text-gray-400">{formattedDate}</span>
          </div>

          {/* Email Body */}
          <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-line pt-2">
            {email.body}
          </div>

          {/* Inline Image Previews for Image Attachments */}
          {email.attachments &&
            email.attachments.some(
              (att) => att.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.filename)
            ) && (
              <div className="space-y-3 pt-2">
                {email.attachments
                  .filter(
                    (att) => att.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.filename)
                  )
                  .map((imgAtt, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 max-w-md shadow-xs">
                      {imgAtt.content && (
                        <img
                          src={`data:${imgAtt.contentType || 'image/png'};base64,${imgAtt.content}`}
                          alt={imgAtt.filename}
                          className="max-h-72 w-full object-contain bg-white"
                        />
                      )}
                      <div className="px-3 py-1.5 bg-gray-50 flex items-center justify-between border-t border-gray-100 text-xs text-gray-500">
                        <span className="truncate flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          {imgAtt.filename}
                        </span>
                        <span>{Math.round(imgAtt.size / 1024)} KB</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

          {/* Attachments Section */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="border-t border-gray-100 pt-4 mt-2">
              <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                <span>Attachments ({email.attachments.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {email.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-white rounded-lg border border-gray-200 text-emerald-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate max-w-[170px]" title={att.filename}>
                          {att.filename}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {Math.round(att.size / 1024)} KB
                        </p>
                      </div>
                    </div>

                    {att.content && (
                      <a
                        href={`data:${att.contentType || 'application/octet-stream'};base64,${att.content}`}
                        download={att.filename}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all flex items-center gap-1"
                        title={`Download ${att.filename}`}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Banner Box (Matching Figma Screenshot 4 styling) */}
          <div className="bg-[#FFFDF0] border-l-4 border-amber-400 p-4 rounded-r-lg shadow-xs my-6">
            <p className="text-xs font-semibold text-amber-900">
              ⚡ Status: <span className="uppercase">{email.status}</span>
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Scheduled At: {new Date(email.scheduledAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
