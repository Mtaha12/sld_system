import React from 'react';
import { Mail, CheckCircle2, Plus } from 'lucide-react';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const SettingsPage = () => {
  return (
    <div className="flex flex-col h-full w-full animate-fade-in gap-6">
      
      <div className="bg-theme-surface rounded-2xl shadow-sm border border-theme-border overflow-hidden flex flex-col relative">
        
        {/* Cover Photo Header */}
        <div className="h-32 md:h-40 w-full bg-theme-surface-alt p-6 m-4 mt-4 mx-4 md:m-6 md:mb-0 rounded-t-xl rounded-b-none lg:rounded-xl opacity-90 border-b border-theme-border/50">
        </div>

        {/* Profile Info Row */}
        <div className="px-6 md:px-10 pb-6 flex flex-col sm:flex-row items-center sm:items-end justify-between relative mt-[-40px] sm:mt-[-50px]">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 z-10 w-full sm:w-auto text-center sm:text-left">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-theme-surface shadow-md bg-theme-surface overflow-hidden shrink-0">
              <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Adam Admin" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col mb-1 sm:mb-2">
              <h2 className="text-xl font-bold text-theme-main">Adam Admin</h2>
              <p className="text-sm text-theme-muted">adam.admin@sldsystem.com</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 z-10">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-8 py-2 text-sm shadow-sm h-[42px]">
              Edit
            </Button>
          </div>
        </div>

        {/* Settings Form */}
        <div className="px-6 md:px-10 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-main">Full Name</label>
              <Input variant="light" defaultValue="Adam Admin" placeholder="Your Full Name" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-main">Username</label>
              <Input variant="light" defaultValue="adam_admin" placeholder="Your Username" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-main">Contact Number</label>
              <Input variant="light" defaultValue="+92 300 1234567" placeholder="Your Contact Number" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-main">City</label>
              <Input variant="light" type="select" options={[{label: 'Karachi', value: 'karachi'}]} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-main">Company Name</label>
              <Input variant="light" defaultValue="SLD Law Firm" placeholder="Your Company Name" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-theme-main">Address</label>
              <Input variant="light" defaultValue="123 Legal Street, Phase 4" placeholder="Your Address" />
            </div>

          </div>

          <div className="mt-10 border-t border-theme-border/50 pt-8">
            <h3 className="text-sm font-semibold text-theme-main mb-4">My email Address</h3>
            
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-100">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-theme-main flex items-center gap-2">
                  adam.admin@sldsystem.com
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </span>
                <span className="text-xs text-theme-muted mt-0.5">1 month ago</span>
              </div>
            </div>

            <Button variant="outline" className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border-none text-sm font-medium h-[40px] px-4 rounded-lg">
              <Plus className="w-4 h-4 mr-1.5" /> Add Email Address
            </Button>
          </div>
        </div>

      </div>

      <AdminFooter />
    </div>
  );
};

export default SettingsPage;
