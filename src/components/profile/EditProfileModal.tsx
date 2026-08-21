import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  MapPin,
  Briefcase,
  GraduationCap,
  Globe,
  Sparkles,
  Check,
  RotateCcw,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserAvatar } from '../common/UserAvatar';

export const EditProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [occupation, setOccupation] = useState(currentUser.occupation || '');
  const [education, setEducation] = useState(currentUser.education || '');
  const [website, setWebsite] = useState(currentUser.website || '');
  const [isPrivate, setIsPrivate] = useState(
    Boolean(currentUser.isPrivate || currentUser.privacySettings?.whoCanSeePosts === 'friends')
  );

  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatarUrl || '');
  const [coverPreview, setCoverPreview] = useState(currentUser.coverUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Invalid File Type', 'Please choose a PNG, JPG, or WEBP image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File Too Large', 'Maximum image size is 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarPreview(event.target.result as string);
        showToast('Avatar Selected', 'New avatar ready. Click Save Changes to apply.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Invalid File Type', 'Please choose a PNG, JPG, or WEBP image.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File Too Large', 'Maximum image size is 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverPreview(event.target.result as string);
        showToast('Cover Selected', 'New cover banner ready. Click Save Changes to apply.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      updateProfile({
        fullName: fullName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        occupation: occupation.trim(),
        education: education.trim(),
        website: website.trim(),
        avatarUrl: avatarPreview.trim(),
        coverUrl: coverPreview.trim(),
        isPrivate,
        privacySettings: {
          ...currentUser.privacySettings,
          isPrivate,
          whoCanSeePosts: isPrivate ? 'friends' : 'public',
          whoCanSendRequests: currentUser.privacySettings?.whoCanSendRequests || 'everyone',
          showOnlineStatus: currentUser.privacySettings?.showOnlineStatus !== false,
        },
      });

      showToast('Profile Updated!', 'Your changes have been saved.', 'success');
      onClose();
    } catch (err) {
      showToast('Error', 'Failed to update profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-extrabold text-slate-900">Edit Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden OS Native File Inputs */}
        <input
          type="file"
          ref={avatarInputRef}
          onChange={handleAvatarFile}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
        />
        <input
          type="file"
          ref={coverInputRef}
          onChange={handleCoverFile}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
        />

        {/* Body Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Visual Media Pickers */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
              Profile Photos & Artwork
            </h4>

            {/* Cover Banner Uploader */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Cover Photo</label>
              <div
                onClick={() => coverInputRef.current?.click()}
                className="relative h-32 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 cursor-pointer group transition-colors flex items-center justify-center"
              >
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Cover Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <ImageIcon className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">
                      Click to choose cover photo from computer
                    </p>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WEBP up to 5MB</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-2 transition-opacity">
                  <Camera className="w-4 h-4" />
                  <span>{coverPreview ? 'Change Cover Photo' : 'Upload Cover Photo'}</span>
                </div>
              </div>

              {coverPreview && (
                <button
                  type="button"
                  onClick={() => setCoverPreview('')}
                  className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 mt-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Remove cover photo</span>
                </button>
              )}
            </div>

            {/* Avatar Photo Uploader */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700">Avatar Image</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 cursor-pointer group transition-colors shrink-0 flex items-center justify-center"
                >
                  <UserAvatar
                    src={avatarPreview}
                    name={fullName || 'User'}
                    size="xl"
                  />

                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-full">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose from PC</span>
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => setAvatarPreview('')}
                      className="text-[11px] text-rose-500 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Remove photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Text Fields */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
              Profile Details
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Faseeh-ur-Rehman"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bio / Headline</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Brief intro about yourself, your tech stack, or interests..."
                className="w-full p-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Occupation / Job</span>
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>University / Education</span>
                </label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. CUST Islamabad"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Location</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Islamabad, Pakistan"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Website / Portfolio URL</span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourportfolio.com"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Profile Visibility Setting (Public vs Private) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Account Privacy</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                      isPrivate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isPrivate
                    ? 'Only your friends can see your posts and photos. Non-friends see a limited preview.'
                    : 'Anyone on Nexus can view your profile, posts, and photos.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivate((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isPrivate
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isPrivate ? 'Make Public' : 'Make Private'}
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
