import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClientFormModal } from '../components/ClientFormModal';
import { Search, Plus, Eye, Edit2, Trash2, Calendar, Phone } from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const { clients, removeClient, setActivePage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const handleAddClick = () => {
    setEditingClientId(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClientId(id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${name}? All attendance logs and membership history will be permanently deleted.`)) {
      try {
        await removeClient(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRowClick = (id: string) => {
    setActivePage('client-detail', id);
  };

  // Helper: calculate days remaining
  const getDaysRemaining = (endStr: string): { days: number; text: string; isExpired: boolean } => {
    if (!endStr) return { days: 0, text: 'No End Date', isExpired: false };
    
    const end = new Date(endStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
      return { days, text: `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`, isExpired: true };
    } else if (days === 0) {
      return { days, text: 'Expires Today', isExpired: false };
    } else {
      return { days, text: `${days} day${days !== 1 ? 's' : ''} left`, isExpired: false };
    }
  };

  // Filter clients by search query and sort by membership number
  const filteredClients = clients
    .filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.membership_number && c.membership_number.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      const memA = a.membership_number || '';
      const memB = b.membership_number || '';
      return memA.localeCompare(memB, undefined, { numeric: true, sensitivity: 'base' });
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col h-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-white tracking-tight">
            Client Directory
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your registered gym members, membership plans, and subscriptions.
          </p>
        </div>

        <button
          onClick={handleAddClick}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/10 hover:bg-emerald-500 transition active:scale-98 dark:bg-emerald-600 dark:hover:bg-emerald-500 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Client
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search clients by name or phone..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900"
        />
      </div>

      {/* Card View (Standard for all devices) */}
      <div className="flex flex-col gap-3 pb-4">
        {filteredClients.length > 0 ? (
          filteredClients.map(client => {
            const isExpanded = expandedClientId === client.id;

            return (
              <div
                key={client.id}
                onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col gap-3 cursor-pointer hover:border-emerald-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-extrabold text-sm uppercase">
                    {client.name.substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-800 dark:text-white text-base leading-tight">
                      {client.name}
                    </p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">{client.membership_number}</p>
                      <p className="flex items-center gap-1 text-sm text-zinc-400 dark:text-zinc-500">
                        <Phone className="h-3.5 w-3.5" />
                        {client.phone || 'No mobile'}
                      </p>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/50 mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(client.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition"
                    >
                      <Eye className="h-4 w-4" /> View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(client.id, e);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-50 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                    >
                      <Edit2 className="h-4 w-4" /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(client.id, client.name, e);
                      }}
                      className="flex-none flex items-center justify-center rounded-xl bg-rose-50 p-2.5 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
              {searchQuery ? 'No matching clients found.' : 'No clients registered yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Form Modal overlay */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientId={editingClientId}
      />
    </div>
  );
};
