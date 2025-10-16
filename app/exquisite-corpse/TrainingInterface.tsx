"use client";

import { useCallback, useMemo, useState } from "react";
import { ExquisiteCorpseTag } from "@prisma/client";

import { BaseTurn, Path } from "@/app/types/exquisiteCorpse";
import { TurnManager } from "./TurnManager";
import { CurveTurnRenderer } from "./CurveTurnRenderer";
import { TrainingExample } from "../api/exquisite-corpse/schemas";
import { TagPicker } from "./TagPicker";
import { Button } from "../components/Button";
import type { TrainingExampleService } from "../lib/trainingExampleService";

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

const updateTrainingExample = (example: TrainingExample, id: string) => {
  return fetch(`/api/exquisite-corpse/training-examples/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(example),
  })
}

const deleteTrainingExample = (id: string) => {
  return fetch(`/api/exquisite-corpse/training-examples/${id}`, {
    method: 'DELETE',
  })
}

type TrainingInterfaceProps = {
  tags: ExquisiteCorpseTag[];
  source?: Awaited<ReturnType<TrainingExampleService['getExample']>>;
}
export const TrainingInterface = ({ tags, source }: TrainingInterfaceProps) => {
  const {
    paths: initPaths,
    sketchDescription: initSketchDescription,
    turnDescription: initTurnDescription,
    tags: initTags,
    id: exampleId,
  } = source ?? {};

  const isUpdate = source !== null && source !== undefined;

  const [turns, setTurns] = useState<TrainingTurn[]>(
    initPaths ? (initPaths as Path[]).map<TrainingTurn>(path => ({
      path,
      author: 'training',
      timestamp: new Date().toISOString(),
    })) : []
  );
  const [sketchDescription, setSketchDescription] = useState(initSketchDescription ?? 'A blank canvas');
  const [turnDescription, setTurnDescription] = useState(initTurnDescription ?? '');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    initTags
      ? new Set(initTags.map(({ tag: { name } }) => name))
      : new Set()
  );

  const [error, setError] = useState('');

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
        tags: [...selectedTags],
      });

      reset();
    } catch (e) {
      console.error(e); // TODO: toast or something
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

  const handleUpdateExample = async () => {
    if (exampleId) {
      try {
        await updateTrainingExample({
          paths: turns.map(turn => turn.path),
          sketchDescription,
          turnDescription,
          tags: [...selectedTags],
        }, exampleId);

        // TODO: success toast
      } catch (e) {
        console.error(e); // TODO: toast or something
        if (e instanceof Error) {
          setError(e.message);
        }
      }
    } else {
      console.error('Cannot update example without ID')
    }
  }

  // FIXME: confirmation dialog
  const handleDeleteExample = async () => {
    if (exampleId) {
      try {
        await deleteTrainingExample(exampleId);

        // TODO: success toast
      } catch (e) {
        console.error(e); // TODO: toast or something
        if (e instanceof Error) {
          setError(e.message);
        }
      }
    } else {
      console.error('Cannot delete example without ID')
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
        allowCreate
      />
      {isUpdate ? (
        <div className="flex gap-2">
          <Button
            label="Delete Example"
            onClick={handleDeleteExample}
            danger
          />
          <Button
            label="Update Example"
            onClick={handleUpdateExample}
            friendly
          />
        </div>
      ) : (
        <Button
          label="Submit Example"
          onClick={handleCreateExample}
        />
      )}
    </div>
  );
};

