"use client";

import { useMemo } from 'react';
import { renderPathCommandsToSvg } from "@/app/utils/svg";
import { DEFAULT_DIMENSIONS } from "@/app/api/exquisite-corpse/schemas";
import { SVGRenderError } from '../../SVGRenderError';
import { Path } from '@/app/types/exquisiteCorpse';
import { Button } from '@/app/components/Button';
import { useRouter } from 'next/navigation';

const deleteExample = (exampleId: string) => {
  return fetch(`/api/exquisite-corpse/training-examples/${exampleId}`, {
    method: 'DELETE',
  })
}

type ExampleData = {
  id: string;
  paths: unknown; // JSON from database
  sketchDescription: string;
  turnDescription: string;
  createdAt: Date;
  updatedAt: Date;
}

type ExampleViewProps = {
  exampleData: ExampleData;
}

export function ExampleView({
  exampleData: {
    id,
    paths,
    sketchDescription,
    turnDescription,
    createdAt,
    updatedAt,
  }
}: ExampleViewProps) {
  const router = useRouter();

  const svg = useMemo(() => {
    try {
      return renderPathCommandsToSvg(
        paths as Path[],
        DEFAULT_DIMENSIONS,
      );
    } catch (error) {
      console.error('Failed to parse paths for example:', id, error);

      return <SVGRenderError />;
    }
  }, [paths, id]);

  const handleDelete = async () => {
    try {
      await deleteExample(id);

      router.replace('/exquisite-corpse/examples');
    } catch (e) {
      // TODO: toast or something
      console.error(e);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex justify-center">
        <div
          className="max-w-lg border rounded-lg p-4 bg-white"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      <div className="grid gap-4">
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">Sketch Description</h2>
          <p className="text-gray-700">{sketchDescription}</p>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">Turn Description</h2>
          <p className="text-gray-700">{turnDescription}</p>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">Details</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div>
              <dt className="font-medium text-gray-600">ID:</dt>
              <dd className="font-mono text-xs">{id}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Created:</dt>
              <dd>{new Date(createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Updated:</dt>
              <dd>{new Date(updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        <Button danger onClick={handleDelete} label="DELETE" />
      </div>
    </div>
  );
}
