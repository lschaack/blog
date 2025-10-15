"use client";

import { useCallback, useMemo, useState } from "react";

import { BaseTurn, Path } from "@/app/types/exquisiteCorpse";
import { TurnManager } from "./TurnManager";
import { CurveTurnRenderer } from "./CurveTurnRenderer";
import { TrainingExample } from "../api/exquisite-corpse/schemas";
import { TagPicker } from "./TagPicker";
import { ExquisiteCorpseTag } from "@prisma/client";
import { Button } from "../components/Button";

const dimensions = { width: 512, height: 512 };

export type TrainingTurn = BaseTurn & {
  path: Path;
};

const createTrainingExample = (example: TrainingExample) => {
  return fetch('/api/exquisite-corpse/training-examples', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(example),
  })
}

type TrainingInterfaceProps = {
  tags: ExquisiteCorpseTag[];
}
export const TrainingInterface = ({ tags }: TrainingInterfaceProps) => {
  const [turns, setTurns] = useState<TrainingTurn[]>([]);
  const [error, setError] = useState('');
  const [sketchDescription, setSketchDescription] = useState('A blank canvas');
  const [turnDescription, setTurnDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const tagNames = useMemo(() => tags.map(({ name }) => name), [tags]);

  const reset = useCallback(() => {
    setTurns([]);
    setSketchDescription('A blank canvas');
    setTurnDescription('');
    setSelectedTags(new Set());
  }, []);

  const handleCreateExample = async () => {
    try {
      await createTrainingExample({
        paths: turns.map(turn => turn.path),
        sketchDescription,
        turnDescription,
        tags: tags.map(tag => tag.name),
      });

      reset();
    } catch (e) {
      console.error(e); // TODO: toast or something
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TurnManager
        handleAddPath={path => setTurns(prev => [
          ...prev,
          {
            path,
            author: 'training',
            timestamp: new Date().toISOString(),
          }
        ])}
        dimensions={dimensions}
        turns={turns}
        TurnRenderer={CurveTurnRenderer}
      />
      <div className="flex flex-col">
        <label htmlFor="sketch-description" className="font-geist-mono font-medium text-base/loose">
          Sketch Description
        </label>
        <textarea
          id="sketch-description"
          className="p-2 bg-deep-100 rounded-lg border-2 border-deep-500"
          value={sketchDescription}
          onChange={e => setSketchDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="turn-description" className="font-geist-mono font-medium text-base/loose">
          Turn Description
        </label>
        <textarea
          id="turn-description"
          className="p-2 bg-deep-100 rounded-lg border-2 border-deep-500"
          value={turnDescription}
          onChange={e => setTurnDescription(e.target.value)}
        />
      </div>
      <TagPicker
        tags={tagNames}
        selectedTags={selectedTags}
        onSelect={tag => {
          selectedTags.add(tag);
          setSelectedTags(new Set(selectedTags));
        }}
        onDeselect={tag => {
          selectedTags.delete(tag);
          setSelectedTags(new Set(selectedTags));
        }}
      />
      <Button
        label="Submit Example"
        onClick={handleCreateExample}
      />
    </div>
  );
};

