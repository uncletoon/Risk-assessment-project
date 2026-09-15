import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, ShieldCheck, Building2 } from 'lucide-react';

export default function EmployeeProfile() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-16">
      {/* Header */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs">
        <h2 className="text-2xl font-bold text-primary tracking-tight">Staff Member Profile</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Official staff credentials, contact info, and departmental role at {user?.organization_name || 'the Enterprise'}.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs p-6 flex flex-col sm:flex-row items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
          {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ER'}
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Full Name</span>
            <p className="text-base font-bold text-primary mt-0.5">{user?.full_name || 'User'}</p>
          </div>

          <div>
            <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Official Email</span>
            <p className="text-sm font-semibold text-primary mt-0.5">{user?.email || '—'}</p>
          </div>

          <div>
            <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Phone Number</span>
            <p className="text-sm font-semibold text-primary mt-0.5">{user?.phone_number || '—'}</p>
          </div>

          <div>
            <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Gender</span>
            <p className="text-sm font-semibold text-primary mt-0.5">{user?.gender || '—'}</p>
          </div>

          <div>
            <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Assigned Role</span>
            <p className="text-sm font-semibold text-secondary mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>

          <div>
            <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Department</span>
            <p className="text-sm font-semibold text-on-surface mt-0.5">{user?.department}</p>
          </div>

          <div>
            <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Enterprise Organization</span>
            <p className="text-sm font-semibold text-on-surface mt-0.5">{user?.organization_name || 'Apex Horizon Global'}</p>
          </div>

          <div>
            <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Account Status</span>
            <p className="text-sm font-semibold text-on-tertiary-container mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Active & Verified
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
