import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Mail, 
  CheckCircle2, 
  Plus, 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Save, 
  Camera,
  Trash2
} from 'lucide-react';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { PAKISTAN_CITIES } from '../constants/cities';
import { profileSettingsSchema, addEmailSchema } from '../features/auth/validation/settingsSchema';

const SettingsPage = () => {
  const { themePreference, setThemePreference } = useTheme();
  const { user, updateAvatar, updateProfile, resetAvatar, DEFAULT_AVATAR } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const avatarInputRef = useRef(null);

  const [emails, setEmails] = useState([
    {
      id: 1,
      email: user.email || 'adam.admin@sldsystem.com',
      isPrimary: true,
      isVerified: true,
      addedDate: '1 month ago',
    }
  ]);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    watch: watchProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      fullName: user.fullName || 'Adam Admin',
      username: user.username || 'adam_admin',
      contactNumber: user.contactNumber || '+92 300 1234567',
      city: user.city || 'Karachi',
      companyName: user.companyName || 'SLD Law Firm',
      address: user.address || '123 Legal Street, Phase 4, Clifton',
    }
  });

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    reset: resetEmail,
    formState: { errors: emailErrors },
  } = useForm({
    resolver: zodResolver(addEmailSchema),
    defaultValues: {
      email: '',
    }
  });

  // Keep form in sync if user changes
  useEffect(() => {
    resetProfile({
      fullName: user.fullName || 'Adam Admin',
      username: user.username || 'adam_admin',
      contactNumber: user.contactNumber || '+92 300 1234567',
      city: user.city || 'Karachi',
      companyName: user.companyName || 'SLD Law Firm',
      address: user.address || '123 Legal Street, Phase 4, Clifton',
    });
  }, [user, resetProfile]);

  const watchedValues = watchProfile();

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setToastMessage('Image size must be less than 3MB.');
      setTimeout(() => setToastMessage(''), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      updateAvatar(event.target.result);
      setToastMessage('Profile photo updated successfully across all pages!');
      setTimeout(() => setToastMessage(''), 3500);
    };
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleRemoveAvatar = (e) => {
    e.stopPropagation();
    resetAvatar();
    setToastMessage('Profile photo reset to default.');
    setTimeout(() => setToastMessage(''), 3500);
  };

  const onSaveProfile = (data) => {
    updateProfile(data);
    setIsEditing(false);
    setToastMessage('Profile settings saved successfully across all pages!');
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  const onAddEmailSubmit = (data) => {
    setEmails(prev => [
      ...prev,
      {
        id: Date.now(),
        email: data.email,
        isPrimary: false,
        isVerified: false,
        addedDate: 'Just now',
      }
    ]);
    resetEmail();
    setIsAddingEmail(false);
    setToastMessage('New email address added successfully!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  const themeOptions = [
    {
      id: 'light',
      label: 'Light',
      description: 'Clean and bright interface',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark',
      description: 'Easy on the eyes in low light',
      icon: Moon,
    },
    {
      id: 'system',
      label: 'System',
      description: 'Sync with your device theme',
      icon: Monitor,
    },
  ];

  return (
    <div className="flex flex-col h-full w-full animate-fade-in space-y-6 pb-6">
      
      {/* Feedback Toast */}
      {toastMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Avatar */}
      <input 
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />

      {/* Main Content Sections */}
      <div className="space-y-6">

        {/* 1. Profile Information Card */}
        <div className="bg-theme-surface rounded-2xl border border-theme-border shadow-sm overflow-hidden">
          
          {/* Card Header & Compact Profile Bar */}
          <div className="p-6 border-b border-theme-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              
              {/* Avatar with Change Photo overlay */}
              <div 
                onClick={() => avatarInputRef.current?.click()}
                className="relative shrink-0 cursor-pointer group"
                title="Click to change profile photo"
              >
                <div className="w-16 h-16 rounded-full border-2 border-theme-border overflow-hidden bg-theme-surface-alt shadow-sm group-hover:ring-2 ring-brand-orange transition-all">
                  <img 
                    src={user.avatarUrl} 
                    alt={watchedValues.fullName || user.fullName} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                
                {/* Camera badge overlay */}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Camera className="w-5 h-5" />
                </div>

                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-brand-orange text-white shadow-sm border-2 border-theme-surface">
                  <Camera className="w-3 h-3" />
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-bold text-theme-main truncate">{watchedValues.fullName || user.fullName}</h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                    Administrator
                  </span>
                </div>
                <p className="text-xs text-theme-muted mt-0.5 truncate">{watchedValues.companyName || user.companyName} • {watchedValues.city || user.city}</p>
                <p className="text-xs text-theme-muted">{emails[0]?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-theme-main hover:text-brand-orange"
              >
                <Camera className="w-3.5 h-3.5 text-brand-orange" /> Change Photo
              </Button>

              {user.avatarUrl !== DEFAULT_AVATAR && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  title="Reset to default photo"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              )}

              <Button
                variant={isEditing ? 'outline' : 'primary'}
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    resetProfile();
                  }
                  setIsEditing(!isEditing);
                }}
                className={!isEditing ? 'bg-brand-orange hover:bg-brand-orange-hover text-white' : ''}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </div>

          {/* Profile Form (2-column responsive) */}
          <form onSubmit={handleSubmitProfile(onSaveProfile)} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <FormField label="Full Name">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  placeholder="Enter your full name"
                  disabled={!isEditing}
                  error={profileErrors.fullName}
                  {...registerProfile('fullName')}
                />
              </FormField>

              <FormField label="Username">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  placeholder="Enter username"
                  disabled={!isEditing}
                  error={profileErrors.username}
                  {...registerProfile('username')}
                />
              </FormField>

              <FormField label="Contact Number">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  placeholder="+92 300 1234567"
                  disabled={!isEditing}
                  error={profileErrors.contactNumber}
                  {...registerProfile('contactNumber')}
                />
              </FormField>

              <FormField label="City">
                <Input 
                  variant="light" 
                  type="select" 
                  inputSize="sm"
                  options={PAKISTAN_CITIES.slice(1)}
                  disabled={!isEditing}
                  error={profileErrors.city}
                  {...registerProfile('city')}
                />
              </FormField>

              <FormField label="Company Name">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  placeholder="Enter company or firm name"
                  disabled={!isEditing}
                  error={profileErrors.companyName}
                  {...registerProfile('companyName')}
                />
              </FormField>

              <FormField label="Address">
                <Input 
                  variant="light" 
                  inputSize="sm"
                  placeholder="Enter complete office address"
                  disabled={!isEditing}
                  error={profileErrors.address}
                  {...registerProfile('address')}
                />
              </FormField>

            </div>

            {isEditing && (
              <div className="mt-6 pt-5 border-t border-theme-border/50 flex justify-end gap-3 animate-fade-in">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    resetProfile();
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  className="bg-brand-orange hover:bg-brand-orange-hover text-white"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Save Changes
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* 2. Email Addresses Card */}
        <div className="bg-theme-surface rounded-2xl border border-theme-border shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2 text-theme-main font-semibold text-base">
                <Mail className="w-4 h-4 text-brand-orange" />
                Email Addresses
              </div>
              <p className="text-xs text-theme-muted mt-0.5">
                Manage email addresses linked to your account for notifications and authentication.
              </p>
            </div>
            
            {!isAddingEmail && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddingEmail(true)}
                className="self-start sm:self-auto text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Email Address
              </Button>
            )}
          </div>

          {/* Email List */}
          <div className="space-y-3">
            {emails.map((item) => (
              <div 
                key={item.id} 
                className="p-4 rounded-xl border border-theme-border bg-theme-surface-alt/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-brand-orange/10 text-brand-orange border border-theme-border/50 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-theme-main truncate">{item.email}</span>
                      {item.isPrimary && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                          Primary
                        </span>
                      )}
                      {item.isVerified ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50">
                          Pending Verification
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-theme-muted mt-0.5">Added {item.addedDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Email Inline Form */}
          {isAddingEmail && (
            <form onSubmit={handleSubmitEmail(onAddEmailSubmit)} className="mt-4 p-4 rounded-xl border border-theme-border bg-theme-surface-hover/50 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-theme-main mb-1.5">New Email Address</label>
                  <Input 
                    variant="light"
                    inputSize="sm"
                    type="email"
                    placeholder="Enter email address"
                    autoFocus
                    error={emailErrors.email}
                    {...registerEmail('email')}
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setIsAddingEmail(false); resetEmail(); }}
                    className="flex-1 sm:flex-initial"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    size="sm"
                    className="flex-1 sm:flex-initial bg-brand-orange hover:bg-brand-orange-hover text-white"
                  >
                    Save Email
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* 3. Appearance Section */}
        <div className="bg-theme-surface rounded-2xl border border-theme-border shadow-sm p-6">
          <div className="mb-5">
            <div className="flex items-center gap-2 text-theme-main font-semibold text-base">
              <Palette className="w-4 h-4 text-brand-orange" />
              Appearance
            </div>
            <p className="text-xs text-theme-muted mt-0.5">
              Choose your preferred interface theme for the SLD System.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {themeOptions.map((opt) => {
              const isSelected = themePreference === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setThemePreference(opt.id)}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between h-full ${
                    isSelected 
                      ? 'border-brand-orange bg-brand-orange/5 dark:bg-brand-orange/10 ring-1 ring-brand-orange shadow-sm' 
                      : 'border-theme-border bg-theme-surface hover:border-theme-border-hover hover:bg-theme-surface-hover'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`p-2 rounded-lg border ${
                      isSelected 
                        ? 'bg-brand-orange text-white border-brand-orange' 
                        : 'bg-theme-surface-alt text-theme-muted border-theme-border'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-orange" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold mb-0.5 ${isSelected ? 'text-brand-orange' : 'text-theme-main'}`}>
                      {opt.label}
                    </h4>
                    <p className="text-xs text-theme-muted leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      <AdminFooter />
    </div>
  );
};

export default SettingsPage;

