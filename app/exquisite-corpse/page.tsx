"use client";

import { useRouter } from 'next/navigation';
import { Button } from '../components/Button';

export default function ExquisiteCorpsePage() {
  const router = useRouter();

  // TODO: make these actual links with button styles
  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Exquisite Corpse</h1>
        <p className="text-gray-600">Choose how you want to play</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          label="New AI Game"
          onClick={() => router.push('/exquisite-corpse/new?type=singleplayer')}
          className="w-full text-left justify-start"
        />
        <Button
          label="New Multiplayer Game"
          onClick={() => router.push('/exquisite-corpse/new?type=multiplayer')}
          className="w-full text-left justify-start"
        />
        <Button
          label="Join Existing Game"
          onClick={() => router.push('/exquisite-corpse/join')}
          className="w-full text-left justify-start"
        />
      </div>

      <div className="text-xs text-gray-500 text-center">
        <p>AI games: Play collaborative drawing with AI</p>
        <p>Multiplayer: Play with other people online</p>
      </div>
    </div>
  );
};
