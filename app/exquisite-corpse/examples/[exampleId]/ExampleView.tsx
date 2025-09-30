"use client";

import { useMemo } from 'react';
import { renderPathCommandsToSvg } from "@/app/utils/svg";
import { DEFAULT_DIMENSIONS } from "@/app/api/exquisite-corpse/schemas";
import { SVGRenderError } from '../../SVGRenderError';
import { Path } from '@/app/types/exquisiteCorpse';

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

export function ExampleView({ exampleData }: ExampleViewProps) {
  const svg = useMemo(() => {
    try {
      return renderPathCommandsToSvg(
        exampleData.paths as Path[],
        DEFAULT_DIMENSIONS,
      );
    } catch (error) {
      console.error('Failed to parse paths for example:', exampleData.id, error);

      return <SVGRenderError />;
    }
  }, [exampleData.paths, exampleData.id]);

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
          <p className="text-gray-700">{exampleData.sketchDescription}</p>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">Turn Description</h2>
          <p className="text-gray-700">{exampleData.turnDescription}</p>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">Details</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div>
              <dt className="font-medium text-gray-600">ID:</dt>
              <dd className="font-mono text-xs">{exampleData.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Created:</dt>
              <dd>{new Date(exampleData.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-600">Updated:</dt>
              <dd>{new Date(exampleData.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
