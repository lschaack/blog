"use client";

import { useMemo, useState } from "react";

import { BaseTurn, Path } from "@/app/types/exquisiteCorpse";
import { TurnManager } from "./TurnManager";
import { CurveTurnRenderer } from "./CurveTurnRenderer";
import { TrainingExample } from "../api/exquisite-corpse/schemas";
import { TagPicker } from "./TagPicker";
import { ExquisiteCorpseTag } from "@prisma/client";

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
    </div>
  );
};

