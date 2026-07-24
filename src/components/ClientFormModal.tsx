import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X } from 'lucide-react';
import { CustomDatePicker } from './CustomDatePicker';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null; // null means we are adding a new client
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({ isOpen, onClose, clientId }) => {
  const { clients, addNewClient, editClient } = useApp();
  
  const [membershipNumber, setMembershipNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipStart, setMembershipStart] = useState('');
  const [membershipEnd, setMembershipEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form if editing
  useEffect(() => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setMembershipNumber(client.membership_number || '');
        setName(client.name);
        setPhone(client.phone || '');
        setMembershipStart(client.membership_start || '');
        setMembershipEnd(client.membership_end || '');
        setNotes(client.notes || '');
      }
    } else {
      // Clear form if adding new
      setMembershipNumber('');
      setName('');
      setPhone('+91 ');
      setMembershipStart(new Date().toISOString().split('T')[0]); // Default start date to today
      setMembershipEnd('');
      setNotes('');
    }
  }, [clientId, clients, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipNumber.trim() || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const clientData = {
        membership_number: membershipNumber.trim(),
        name: name.trim(),
        phone: phone.trim(),
        membership_start: membershipStart,
        membership_end: membershipEnd,
        notes: notes.trim(),
      };

      if (clientId) {
        await editClient(clientId, clientData);
      } else {
        await addNewClient(clientData);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-800 dark:text-white">
            {clientId ? 'Edit Client Details' : 'Add New Client'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Membership Number
            </label>
            <input
              type="text"
              required
              value={membershipNumber}
              onChange={e => setMembershipNumber(e.target.value)}
              placeholder=""
              className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm outline-none transition duration-150 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder=""
              className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm outline-none transition duration-150 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm outline-none transition duration-150 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Membership Start Date
              </label>
              <CustomDatePicker
                value={membershipStart}
                onChange={setMembershipStart}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Membership End Date
              </label>
              <CustomDatePicker
                value={membershipEnd}
                onChange={setMembershipEnd}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter health conditions, targets, or custom training schedules..."
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm outline-none transition duration-150 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-800 dark:focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-5 mt-6 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400 shadow-md shadow-emerald-600/10"
            >
              {isSubmitting ? 'Saving...' : clientId ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
