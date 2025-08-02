import { PackedBubbleProps, PackedBubbles } from "@/app/components/PackedBubbles";

export default function Demo(props: Partial<PackedBubbleProps>) {
  return (
    <div className="w-full flex justify-center">
      <PackedBubbles
        randomStrategy="exponential"
        packingStrategy="pop"
        maxWidth={512}
        minRadius={16}
        ratio={8}
        seed={0}
        {...props}
      />
    </div>
  );
}
