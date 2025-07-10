import { CirclePacker } from "@/app/utils/circlePacker";

const WIDTH = 1024;
const HEIGHT = 1024;

const packer = new CirclePacker({
  width: WIDTH,
  height: HEIGHT,
  minRadius: 16,
  maxRadius: 64,
});

packer.pack();

export default function Demo() {
  return (
    <div style={{ width: WIDTH, height: HEIGHT, position: 'relative' }}>
      {packer.placedCircles.map(({ x, y, r }, i) => (
        <div
          key={`circle-${i}`}
          className="absolute rounded-full bg-deep-700"
          style={{
            top: y,
            left: x,
            padding: r,
          }}
        />
      ))}
    </div>
  );
}
