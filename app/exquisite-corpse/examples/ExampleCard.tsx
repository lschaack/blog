"use client";

import { motion } from 'motion/react';
import { renderPathCommandsToSvg } from "@/app/utils/svg";
import { useMemo } from 'react';
import { PathSchema } from "@/app/api/exquisite-corpse/schemas";
import { DEFAULT_DIMENSIONS } from "@/app/api/exquisite-corpse/schemas";

type ExampleData = {
  id: string;
  paths: unknown; // JSON from database
  sketchDescription: string;
  turnDescription: string;
  createdAt: Date;
  updatedAt: Date;
}

type ExampleCardProps = {
  exampleData: ExampleData;
}

export function ExampleCard({ exampleData }: ExampleCardProps) {
  const svg = useMemo(() => {
    try {
      // Parse and validate the paths from the database JSON
      const parsedPaths = PathSchema.array().parse(exampleData.paths);
      return renderPathCommandsToSvg(
        parsedPaths,
        DEFAULT_DIMENSIONS,
        0.5
      );
    } catch (error) {
      console.error('Failed to parse paths for example:', exampleData.id, error);
      return '<svg></svg>'; // Empty SVG fallback
    }
  }, [exampleData.paths, exampleData.id]);

  return (
    <motion.a
      href={`/exquisite-corpse/examples/${exampleData.id}`}
      className="card p-0! block"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 1 }}
      title={`${exampleData.sketchDescription} - ${exampleData.turnDescription}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
