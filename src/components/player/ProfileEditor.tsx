"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { updatePlayerProfile } from "@/app/actions/player-actions";

export default function ProfileEditor({ user }: { user: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePlayerProfile(user.id, { name, avatarUrl });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 min-w-16 rounded-full bg-gray-800 overflow-hidden border-2 border-[var(--color-indigo-accent)]">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-500 font-bold text-xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user.name}</h2>
          <Button variant="secondary" onClick={() => setIsEditing(true)} className="text-xs mt-2 py-1 px-3">
            Edit Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
        <input 
          required 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          className="w-full bg-[var(--color-background)] border border-gray-700 rounded p-2 text-white outline-none focus:border-[var(--color-indigo-accent)]" 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Avatar / Logo URL</label>
        <input 
          type="url" 
          value={avatarUrl} 
          onChange={e => setAvatarUrl(e.target.value)} 
          placeholder="https://example.com/my-logo.png"
          className="w-full bg-[var(--color-background)] border border-gray-700 rounded p-2 text-white outline-none focus:border-[var(--color-indigo-accent)]" 
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="primary" className="py-2 px-4 shadow shadow-[var(--color-indigo-accent)]/20">Save</Button>
        <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} className="py-2 px-4">Cancel</Button>
      </div>
    </form>
  );
}
