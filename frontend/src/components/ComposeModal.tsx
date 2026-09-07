import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Sender } from '../types';
import { getSenders, scheduleEmails, getSlackStatus, devConnectSlack } from '../services/api';
import { X, Upload, Clock, Slack, CheckCircle, AlertCircle, Send, Paperclip } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [toInput, setToInput] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');

  // Schedule settings
  const [showSendLaterPopover, setShowSendLaterPopover] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>('');
  const [delaySec, setDelaySec] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);

  // Slack Status
  const [slackConnected, setSlackConnected] = useState<boolean>(false);
  const [slackTeamName, setSlackTeamName] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchSenders();
      fetchSlackStatus();
    }
  }, [isOpen]);

  const fetchSenders = async () => {
    try {
      const res = await getSenders();
      setSenders(res.senders || []);
      if (res.senders && res.senders.length > 0) {
        setSelectedSenderId(res.senders[0].id);
      }
    } catch (err) {
      console.error('Error fetching senders:', err);
    }
  };

  const fetchSlackStatus = async () => {
    try {
      const res = await getSlackStatus();
      setSlackConnected(res.connected);
      if (res.connection) {
        setSlackTeamName(res.connection.teamName);
      }
    } catch (err) {
      console.error('Error fetching Slack status:', err);
    }
  };

  const handleAddRecipient = (emailStr: string) => {
    const cleaned = emailStr.trim().toLowerCase();
    if (cleaned && !recipients.includes(cleaned) && cleaned.includes('@')) {
      setRecipients([...recipients, cleaned]);
    }
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddRecipient(toInput);
      setToInput('');
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  // CSV File upload & parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const extractedEmails: string[] = [];
        results.data.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (typeof cell === 'string' && cell.includes('@')) {
                extractedEmails.push(cell.trim().toLowerCase());
              }
            });
          } else if (typeof row === 'object' && row !== null) {
            Object.values(row).forEach((val) => {
              if (typeof val === 'string' && val.includes('@')) {
                extractedEmails.push(val.trim().toLowerCase());
              }
            });
          }
        });

        const uniqueEmails = Array.from(new Set([...recipients, ...extractedEmails]));
        setRecipients(uniqueEmails);
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        setError('Failed to parse CSV file');
      },
    });
  };

  // Quick Preset Handlers for "Send Later" popover (Matching Figma Screenshot 3)
  const setTomorrowPreset = (hour: number) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, 0, 0, 0);
    // Format YYYY-MM-THH:mm for datetime-local
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const hours = String(tomorrow.getHours()).padStart(2, '0');
    const mins = '00';
    setStartTime(`${year}-${month}-${day}T${hours}:${mins}`);
  };

  const handleDevConnectSlack = async () => {
    try {
      await devConnectSlack();
      await fetchSlackStatus();
    } catch (err) {
      console.error('Dev connect slack error:', err);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let finalRecipients = [...recipients];
    if (toInput.trim() && toInput.includes('@')) {
      finalRecipients.push(toInput.trim().toLowerCase());
    }

    if (finalRecipients.length === 0) {
      setError('Please add at least one recipient email.');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a subject line.');
      return;
    }
    if (!body.trim()) {
      setError('Please enter email body text.');
      return;
    }

    setLoading(true);

    try {
      await scheduleEmails({
        subject,
        body,
        recipients: finalRecipients,
        startTime: startTime || undefined,
        delay: delaySec * 1000,
        hourlyLimit,
        senderId: selectedSenderId || undefined,
      });

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || 'Failed to schedule emails');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative">
        
        {/* Header matching Figma Screenshots 3-7 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-base">Compose New Email</span>
          </div>

          <div className="flex items-center gap-3">
            {/* CSV Attachment Icon (Matching Figma top bar) */}
            <label className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-full hover:bg-gray-100 cursor-pointer transition-colors" title="Attach CSV file">
              <Paperclip className="w-5 h-5" />
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* "Send Later" Clock Icon (Matching Figma top bar) */}
            <button
              type="button"
              onClick={() => setShowSendLaterPopover(!showSendLaterPopover)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                showSendLaterPopover || startTime ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-100'
              }`}
              title="Send Later Options"
            >
              <Clock className="w-5 h-5" />
            </button>

            {/* Main Action Button */}
            <button
              onClick={handleScheduleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-[#00A859] hover:bg-[#008746] text-white font-medium text-xs rounded-full transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Scheduling...' : startTime ? 'Schedule' : 'Send'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating "Send Later" Popover Menu (Matching Figma Screenshot 3 exactly!) */}
        {showSendLaterPopover && (
          <div className="absolute top-16 right-6 z-50 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-900">Send Later</span>
              <button
                type="button"
                onClick={() => setShowSendLaterPopover(false)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-gray-500 block">Pick date & time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Presets matching Figma Screenshot 3 */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Presets</span>
              <button
                type="button"
                onClick={() => setTomorrowPreset(9)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 text-xs text-gray-600 rounded-lg transition-colors"
              >
                Tomorrow, 9:00 AM
              </button>
              <button
                type="button"
                onClick={() => setTomorrowPreset(10)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 text-xs text-gray-600 rounded-lg transition-colors"
              >
                Tomorrow, 10:00 AM
              </button>
              <button
                type="button"
                onClick={() => setTomorrowPreset(11)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 text-xs text-gray-600 rounded-lg transition-colors"
              >
                Tomorrow, 11:00 AM
              </button>
              <button
                type="button"
                onClick={() => setTomorrowPreset(15)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 text-xs text-gray-600 rounded-lg transition-colors"
              >
                Tomorrow, 3:00 PM
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setStartTime('');
                  setShowSendLaterPopover(false);
                }}
                className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowSendLaterPopover(false)}
                className="px-4 py-1.5 bg-[#00A859] hover:bg-[#008746] text-white text-xs font-semibold rounded-full"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 px-6 py-2.5 text-xs flex items-center gap-2 border-b border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleScheduleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Sender Selector */}
          <div className="flex items-center gap-3">
            <label className="w-16 text-xs font-semibold text-gray-500">From:</label>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="flex-1 bg-[#F8F9FA] border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-emerald-500"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ? `${s.name} <${s.email}>` : s.email} (Limit: {s.hourlyLimit}/hr)
                </option>
              ))}
            </select>
          </div>

          {/* To Field & CSV File Upload */}
          <div className="flex items-start gap-3">
            <label className="w-16 text-xs font-semibold text-gray-500 pt-2.5">To:</label>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#F8F9FA] border border-gray-200 rounded-lg focus-within:border-emerald-500 min-h-[42px] items-center">
                {recipients.map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9] px-2.5 py-1 rounded-full text-xs font-medium"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(idx)}
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={recipients.length === 0 ? "Enter email or press Enter..." : "Add more..."}
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={handleToKeyDown}
                  className="bg-transparent text-xs outline-none flex-1 min-w-[120px] py-1 px-1"
                />
              </div>

              {/* Upload CSV button & detected badge */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <label className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload CSV/Text File</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {recipients.length > 0 && (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    {recipients.length} email addresses detected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Subject Field */}
          <div className="flex items-center gap-3">
            <label className="w-16 text-xs font-semibold text-gray-500">Subject:</label>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-[#F8F9FA] border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
          </div>

          {/* Delay & Hourly Limit Inline Row (Matching Figma Screenshot 3) */}
          <div className="flex items-center gap-6 bg-[#F8F9FA] p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Delay between emails:</label>
              <input
                type="number"
                min={1}
                max={60}
                value={delaySec}
                onChange={(e) => setDelaySec(parseInt(e.target.value, 10) || 2)}
                className="w-16 bg-white border border-gray-300 rounded-md px-2 py-1 text-xs text-center font-medium"
              />
              <span className="text-xs text-gray-400">sec</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Hourly Limit:</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 100)}
                className="w-20 bg-white border border-gray-300 rounded-md px-2 py-1 text-xs text-center font-medium"
              />
              <span className="text-xs text-gray-400">emails/hr</span>
            </div>

            {/* Slack Badge */}
            <div className="ml-auto">
              {slackConnected ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 font-medium px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle className="w-3 h-3" />
                  <span>Slack: {slackTeamName || 'Connected'}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleDevConnectSlack}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-emerald-700 bg-white border border-gray-200 px-2.5 py-1 rounded-full hover:bg-gray-50 transition-colors"
                >
                  <Slack className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Connect Slack</span>
                </button>
              )}
            </div>
          </div>

          {/* Body Text Area */}
          <div className="flex flex-col gap-2">
            <textarea
              rows={8}
              placeholder="Type Your Reply..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-gray-200 rounded-lg p-3 text-xs outline-none focus:border-emerald-500 resize-none font-sans"
            />
          </div>

          {/* Active Schedule Time Badge if set */}
          {startTime && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-emerald-600" />
                Scheduled for: <strong>{new Date(startTime).toLocaleString()}</strong>
              </span>
              <button
                type="button"
                onClick={() => setStartTime('')}
                className="text-xs text-emerald-700 underline font-semibold hover:text-emerald-900"
              >
                Clear Schedule
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
