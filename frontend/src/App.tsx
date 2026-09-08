import React, { useState, useEffect } from 'react';
import { User, Email } from './types';
import { getMe, getScheduledEmails, getSentEmails, searchEmails, toggleStarEmail, deleteEmail } from './services/api';
import { Login } from './pages/Login';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EmailList } from './components/EmailList';
import { EmailDetailModal } from './components/EmailDetailModal';
import { ComposeModal } from './components/ComposeModal';

export function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [scheduledEmails, setScheduledEmails] = useState<Email[]>([]);
  const [sentEmails, setSentEmails] = useState<Email[]>([]);
  const [displayedEmails, setDisplayedEmails] = useState<Email[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);

  // Parse token from URL if returned from Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      localStorage.setItem('token', tokenParam);
      setToken(tokenParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Auto load user profile
  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => setUser(res.user))
        .catch(() => {
          // If auth error, clear token
          localStorage.removeItem('token');
          setToken(null);
        });
    }
  }, [token]);

  const fetchEmails = async (tab?: 'scheduled' | 'sent') => {
    const currentTab = tab ?? activeTab;
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await searchEmails(searchQuery);
        const filtered = res.emails.filter((e) =>
          currentTab === 'scheduled'
            ? e.status === 'SCHEDULED' || e.status === 'PROCESSING'
            : e.status === 'SENT' || e.status === 'FAILED'
        );
        setDisplayedEmails(filtered);
      } else {
        const [schedRes, sentRes] = await Promise.all([
          getScheduledEmails(),
          getSentEmails(),
        ]);

        setScheduledEmails(schedRes.emails || []);
        setSentEmails(sentRes.emails || []);

        setDisplayedEmails(
          currentTab === 'scheduled' ? schedRes.emails || [] : sentRes.emails || []
        );
      }
    } catch (err) {
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch emails on tab or search change
  useEffect(() => {
    if (token) fetchEmails(activeTab);
  }, [token, activeTab, searchQuery]);

  const handleToggleStar = async (email: Email) => {
    // Optimistic UI update
    const updatedStarred = !email.isStarred;
    const updateList = (list: Email[]) =>
      list.map((e) => (e.id === email.id ? { ...e, isStarred: updatedStarred } : e));

    setDisplayedEmails(updateList);
    setScheduledEmails(updateList);
    setSentEmails(updateList);
    if (selectedEmail && selectedEmail.id === email.id) {
      setSelectedEmail({ ...selectedEmail, isStarred: updatedStarred });
    }

    try {
      await toggleStarEmail(email.id);
    } catch (err) {
      console.error('Failed to toggle star:', err);
      // Revert on error
      fetchEmails();
    }
  };

  const handleDeleteEmail = async (email: Email) => {
    try {
      await deleteEmail(email.id);
      setSelectedEmail(null);
      fetchEmails();
    } catch (err) {
      console.error('Failed to delete email:', err);
    }
  };

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F5F6F8]">
      {/* Sidebar matching Figma */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSearchQuery('');
          fetchEmails(tab);
        }}
        onOpenCompose={() => setIsComposeOpen(true)}
        onLogout={handleLogout}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={fetchEmails}
        />

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          <EmailList
            emails={displayedEmails}
            loading={loading}
            activeTab={activeTab}
            onSelectEmail={(email) => setSelectedEmail(email)}
            onToggleStar={handleToggleStar}
          />
        </div>
      </div>

      {/* Detail View Drawer */}
      <EmailDetailModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        onToggleStar={handleToggleStar}
        onDelete={handleDeleteEmail}
      />

      {/* Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchEmails}
      />
    </div>
  );
}
